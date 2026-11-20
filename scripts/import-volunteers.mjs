#!/usr/bin/env node
/**
 * Wipe + import VL volunteers from Excel → VL001… with volunteer_profiles detail.
 *
 * Prerequisites:
 *   - Run migration 041_volunteer_profiles.sql in Supabase
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/import-volunteers.mjs --file "C:/Webapp/ConED_DB/VL_Role_Upload.xlsx" --wipe
 *   node scripts/import-volunteers.mjs --file "..." --wipe --dry-run
 *
 * Wipe targets (email/login OR role):
 *   - email starts with VL (case-insensitive)
 *   - legacy OS##T## (regex ^OS\d+T\d+$)
 *   - role = staff (all staff are test users)
 *   - VL roles still present: volunteer_center|volunteer_border|special_volunteer
 *
 * Does NOT delete real overseer logins like OS10 / OS01 (no T segment).
 *
 * Default password: login1234 · must_change_password = true
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TEMP_PASSWORD = 'login1234';
const VL_ROLES = new Set([
  'volunteer_center',
  'volunteer_border',
  'special_volunteer',
]);

const ROLE_POSITION = {
  volunteer_center: 'อาสาสมัครส่วนกลาง',
  volunteer_border: 'อาสาสมัครประจำพื้นที่',
  special_volunteer: 'อาสาสมัครเฉพาะกิจ',
};

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

async function loadEnvLocal() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function applyLocalTlsRelax() {
  if (
    process.env.CONED_RELAX_TLS === '1' ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('  TLS: NODE_TLS_REJECT_UNAUTHORIZED=0 (local relax)');
  }
}

function errMsg(e) {
  if (!e) return 'unknown error';
  if (typeof e === 'string') return e;
  const parts = [e.message || String(e)];
  if (e.cause?.message) parts.push(`cause: ${e.cause.message}`);
  if (e.details) parts.push(String(e.details));
  if (e.hint) parts.push(String(e.hint));
  return parts.join(' | ');
}

function parseArgs(argv) {
  const out = {
    file: null,
    wipe: false,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--wipe') out.wipe = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function cell(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
    const hit = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.toLowerCase()
    );
    if (hit != null && row[hit] != null && String(row[hit]).trim() !== '') {
      return String(row[hit]).trim();
    }
  }
  return '';
}

function textOrNull(v) {
  const t = String(v ?? '').trim();
  return t.length ? t : null;
}

function parseRole(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (VL_ROLES.has(t)) return t;
  return null;
}

function parseProvinces(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return t
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** `28-สิงหาคม-2504` / `28 สิงหาคม 2504` / DD/MM/YYYY → YYYY-MM-DD (CE) */
function parseThaiBirthDateToYmd(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[-\s/]+([ก-๙A-Za-z.]+)[-\s/]+(\d{4})$/u);
  if (m) {
    const dd = Number(m[1]);
    const monthRaw = m[2].trim();
    let yyyy = Number(m[3]);
    if (yyyy >= 2400) yyyy -= 543;
    const monthIndex = THAI_MONTHS.findIndex(
      (name) => name === monthRaw || name.startsWith(monthRaw)
    );
    if (monthIndex < 0 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2200) {
      return null;
    }
    const d = new Date(yyyy, monthIndex, dd);
    if (
      d.getFullYear() !== yyyy ||
      d.getMonth() !== monthIndex ||
      d.getDate() !== dd
    ) {
      return null;
    }
    return `${yyyy}-${String(monthIndex + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  const m2 = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m2) return null;
  const dd = Number(m2[1]);
  const mm = Number(m2[2]);
  let yyyy = Number(m2[3]);
  if (yyyy >= 2400) yyyy -= 543;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2200) {
    return null;
  }
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
    return null;
  }
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function isWipeTarget(profile) {
  const email = String(profile.email || '').trim();
  const local = email.includes('@') ? email.split('@')[0] : email;
  const role = String(profile.role || '').trim();
  if (/^vl/i.test(local)) return true;
  if (/^OS\d+T\d+$/i.test(local)) return true;
  if (role === 'staff') return true;
  if (VL_ROLES.has(role)) return true;
  return false;
}

function readExcelRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel has no sheets');
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return { sheetName, rows };
}

async function listAllProfiles(supabase) {
  const all = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, role, full_name')
      .range(from, from + page - 1);
    if (error) throw new Error(`list profiles: ${errMsg(error)}`);
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < page) break;
    from += page;
  }
  return all;
}

async function wipeTargets(supabase, dryRun) {
  console.log('\n== wipe ==');
  const profiles = await listAllProfiles(supabase);
  const targets = profiles.filter(isWipeTarget);
  console.log(`  matched ${targets.length} / ${profiles.length} profiles`);
  for (const t of targets.slice(0, 20)) {
    console.log(`    - ${t.email} · ${t.role} · ${t.full_name || ''}`);
  }
  if (targets.length > 20) console.log(`    … +${targets.length - 20} more`);

  if (dryRun) {
    console.log('  (dry-run) would delete auth.users + user_profiles for matches');
    return targets;
  }

  let deleted = 0;
  let fail = 0;
  for (const t of targets) {
    const id = t.id;
    // Prefer Auth Admin delete (clears auth.users + identities)
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr && !/not found|User not found/i.test(authErr.message || '')) {
      console.error(`    FAIL auth delete ${t.email}: ${authErr.message}`);
    }
    const { error: profErr } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);
    if (profErr) {
      console.error(`    FAIL profile delete ${t.email}: ${profErr.message}`);
      fail += 1;
      continue;
    }
    deleted += 1;
  }
  console.log(`  deleted profiles: ${deleted} · fails: ${fail}`);
  return targets;
}

async function createVlUser(supabase, { loginId, full_name, name_prefix, role, provinces }) {
  const authEmail = `${loginId.toLowerCase()}@edu.local`;
  const position = ROLE_POSITION[role] || ROLE_POSITION.volunteer_border;

  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: authEmail,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        login_id: loginId,
        name_prefix: name_prefix || null,
      },
    });
  if (createErr) throw new Error(`auth create ${loginId}: ${errMsg(createErr)}`);
  const userId = created?.user?.id;
  if (!userId) throw new Error(`auth create ${loginId}: no user id`);

  const { error: profErr } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      email: loginId,
      full_name,
      name_prefix: name_prefix || null,
      position,
      role,
      assigned_zone: null,
      assigned_provinces: provinces,
      assigned_districts: [],
      assigned_schools: [],
      reports_to: null,
      disabled: false,
      must_change_password: true,
      overseer_tier: null,
    },
    { onConflict: 'id' }
  );
  if (profErr) {
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(`profile upsert ${loginId}: ${errMsg(profErr)}`);
  }
  return userId;
}

async function main() {
  await loadEnvLocal();
  applyLocalTlsRelax();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    console.log(`Usage:
  node scripts/import-volunteers.mjs --file "C:/Webapp/ConED_DB/VL_Role_Upload.xlsx" --wipe

Options:
  --wipe      Delete VL* / OS##T## / staff / existing VL-role profiles first
  --dry-run   Log actions without writing

Import creates VL001… with password ${TEMP_PASSWORD} (must_change_password=true).`);
    process.exit(opts.help ? 0 : 1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    console.error(`Missing in .env.local: ${missing.join(', ')}`);
    if (!key) {
      console.error(
        'Add the service_role secret from Supabase → Project Settings → API'
      );
      console.error(
        '(anon key cannot wipe/create auth users — do not use NEXT_PUBLIC_SUPABASE_ANON_KEY here)'
      );
    }
    process.exit(1);
  }

  console.log(`  Supabase: ${url}`);
  console.log('  Key: service_role');

  {
    const ping = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch((e) => ({ ok: false, statusText: errMsg(e) }));
    if (!ping.ok && ping.status == null) {
      console.error(`\nCannot reach Supabase: ${ping.statusText}`);
      console.error(
        'Try in .env.local: CONED_RELAX_TLS=1   (local TLS / proxy workaround)'
      );
      process.exit(1);
    }
  }

  const filePath = path.resolve(opts.file);
  try {
    await fs.access(filePath);
  } catch {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (opts.wipe) {
    await wipeTargets(supabase, opts.dryRun);
  }

  console.log(`\n== read ${filePath} ==`);
  const { sheetName, rows: rawRows } = readExcelRows(filePath);
  console.log(`  sheet: ${sheetName}, rows: ${rawRows.length}`);

  const skips = [];
  const parsed = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRow = i + 2;
    const role = parseRole(cell(row, 'role_level', 'role'));
    const full_name = cell(row, 'full_name');
    if (!role) {
      skips.push(`row ${excelRow}: invalid role_level "${cell(row, 'role_level')}"`);
      continue;
    }
    if (!full_name) {
      skips.push(`row ${excelRow}: missing full_name`);
      continue;
    }
    parsed.push({
      excelRow,
      name_prefix: textOrNull(cell(row, 'name_prefix')),
      full_name,
      role,
      provinces: parseProvinces(cell(row, 'assigned_provinces')),
      contact_address: textOrNull(cell(row, 'contact_address')),
      contact_tel: textOrNull(cell(row, 'contact_tel')),
      contact_email: textOrNull(cell(row, 'contact_email')),
      duty: textOrNull(cell(row, 'duty')),
      last_position_title: textOrNull(cell(row, 'last_position_title')),
      last_position_year: textOrNull(cell(row, 'last_position_year')),
      last_position_affiliation: textOrNull(
        cell(row, 'last_position_affiliation')
      ),
      education_bachelor: textOrNull(cell(row, 'education_bachelor')),
      education_master: textOrNull(cell(row, 'education_master')),
      birth_date: parseThaiBirthDateToYmd(cell(row, 'birth date', 'birth_date')),
    });
  }

  console.log(`\n== import ${parsed.length} volunteers as VL001… ==`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    const loginId = `VL${String(i + 1).padStart(3, '0')}`;
    const label = [p.name_prefix, p.full_name].filter(Boolean).join(' ');
    console.log(
      `  + ${loginId} · ${p.role} · ${label} · provinces=[${p.provinces.join(', ')}]`
    );

    if (opts.dryRun) {
      ok += 1;
      continue;
    }

    try {
      const userId = await createVlUser(supabase, {
        loginId,
        full_name: p.full_name,
        name_prefix: p.name_prefix,
        role: p.role,
        provinces: p.provinces,
      });

      const { error: vlErr } = await supabase.from('volunteer_profiles').upsert(
        {
          user_id: userId,
          contact_address: p.contact_address,
          contact_tel: p.contact_tel,
          contact_email: p.contact_email,
          duty: p.duty,
          last_position_title: p.last_position_title,
          last_position_year: p.last_position_year,
          last_position_affiliation: p.last_position_affiliation,
          education_bachelor: p.education_bachelor,
          education_master: p.education_master,
          birth_date: p.birth_date,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (vlErr) {
        console.error(`    FAIL volunteer_profiles ${loginId}: ${vlErr.message}`);
        fail += 1;
        continue;
      }
      ok += 1;
    } catch (e) {
      console.error(`    FAIL ${loginId}: ${errMsg(e)}`);
      fail += 1;
    }
  }

  console.log('\n== summary ==');
  console.log(`  excel rows:   ${rawRows.length}`);
  console.log(`  parsed:       ${parsed.length}`);
  console.log(`  imported ok:  ${ok}`);
  console.log(`  fails:        ${fail}`);
  console.log(`  skipped:      ${skips.length}`);
  if (skips.length) {
    console.log('  skips:');
    for (const s of skips.slice(0, 40)) console.log(`    - ${s}`);
    if (skips.length > 40) console.log(`    … +${skips.length - 40} more`);
  }
  if (opts.dryRun) console.log('\n(dry-run: no DB writes)');
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
