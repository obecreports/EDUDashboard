#!/usr/bin/env node
/**
 * Wipe + import school directors from Excel.
 *
 * Prerequisites:
 *   - Run migration 040_directors_remark.sql in Supabase
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon)
 *
 * Usage:
 *   node scripts/import-directors.mjs --file "C:/Webapp/ConED_DB/Directors.xlsx" --wipe
 *   node scripts/import-directors.mjs --file "C:/Webapp/ConED_DB/Directors.xlsx" --wipe --dry-run
 *
 * Excel columns:
 *   name_prefix, full_name, position_name, gender, phone, remark, school_id
 *
 * Rules:
 *   - gender blank / unknown → NULL
 *   - dedupe people by (name_prefix, full_name, phone)
 *   - one director → many schools via School_Basic.director_id + director_school_history
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

/** Match next.config.js local TLS workaround (corporate proxy / Windows CA). */
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

function normalizeGender(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (!t) return null;
  if (t === 'male' || t === 'm' || t === 'ชาย' || t === 'ช') return 'male';
  if (t === 'female' || t === 'f' || t === 'หญิง' || t === 'ญ') return 'female';
  if (t === 'other' || t === 'อื่นๆ' || t === 'อื่น') return 'other';
  return null;
}

function personKey(namePrefix, fullName, phone) {
  return [
    (namePrefix || '').trim().toLowerCase(),
    (fullName || '').trim().toLowerCase(),
    (phone || '').trim().toLowerCase(),
  ].join('|');
}

function displayName(namePrefix, fullName) {
  return [namePrefix, fullName].filter(Boolean).join(' ').trim() || fullName;
}

async function wipeDirectors(supabase, dryRun) {
  console.log('\n== wipe ==');
  if (dryRun) {
    console.log('  (dry-run) would NULL School_Basic.director_id / director_name');
    console.log('  (dry-run) would DELETE director_school_history, directors');
    return;
  }

  // Clear FK only on rows that currently have a director
  {
    let { error } = await supabase
      .from('School_Basic')
      .update({ director_id: null, director_name: null })
      .not('director_id', 'is', null);
    if (error && /director_name/i.test(error.message)) {
      ({ error } = await supabase
        .from('School_Basic')
        .update({ director_id: null })
        .not('director_id', 'is', null));
    }
    if (error) throw new Error(`clear School_Basic: ${errMsg(error)}`);
    console.log('  cleared School_Basic.director_id');
  }

  {
    const { error } = await supabase
      .from('director_school_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`delete history: ${errMsg(error)}`);
    console.log('  deleted director_school_history');
  }

  {
    const { error } = await supabase
      .from('directors')
      .delete()
      .neq('director_id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`delete directors: ${errMsg(error)}`);
    console.log('  deleted directors');
  }
}

function readExcelRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel has no sheets');
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return { sheetName, rows };
}

async function main() {
  await loadEnvLocal();
  applyLocalTlsRelax();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    console.log(`Usage:
  node scripts/import-directors.mjs --file "C:/Webapp/ConED_DB/Directors.xlsx" --wipe

Options:
  --wipe      Clear School_Basic.director_id, director_school_history, directors first
  --dry-run   Log actions without writing

Rules:
  - Blank gender → NULL
  - Dedupe by name_prefix + full_name + phone
  - Assign each school_id to that director (history + School_Basic)`);
    process.exit(opts.help ? 0 : 1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key) in .env.local'
    );
    process.exit(1);
  }

  console.log(`  Supabase: ${url}`);
  console.log(
    `  Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`
  );

  // Connectivity check before wipe
  {
    const ping = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch((e) => ({ ok: false, statusText: errMsg(e) }));
    if (!ping.ok && ping.status == null) {
      console.error(`\nCannot reach Supabase: ${ping.statusText}`);
      console.error(
        'Try in .env.local: CONED_RELAX_TLS=1   (local TLS / proxy workaround)'
      );
      console.error('Also confirm URL/key and network access to *.supabase.co');
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
    await wipeDirectors(supabase, opts.dryRun);
  }

  console.log(`\n== read ${filePath} ==`);
  const { sheetName, rows: rawRows } = readExcelRows(filePath);
  console.log(`  sheet: ${sheetName}, rows: ${rawRows.length}`);

  /** @type {Map<string, { name_prefix: string, full_name: string, position_name: string, gender: string|null, phone: string|null, remark: string|null, schoolIds: number[] }>} */
  const people = new Map();
  const skips = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRow = i + 2; // header is row 1
    const name_prefix = cell(row, 'name_prefix');
    const full_name = cell(row, 'full_name');
    const position_name =
      cell(row, 'position_name') || 'ผู้อำนวยการโรงเรียน';
    const gender = normalizeGender(cell(row, 'gender'));
    const phone = cell(row, 'phone') || null;
    const remark = cell(row, 'remark') || null;
    const schoolRaw = cell(row, 'school_id');
    const school_id = Number(schoolRaw);

    if (!full_name) {
      skips.push(`row ${excelRow}: missing full_name`);
      continue;
    }
    if (!Number.isFinite(school_id) || school_id <= 0) {
      skips.push(`row ${excelRow}: invalid school_id "${schoolRaw}" (${full_name})`);
      continue;
    }

    const key = personKey(name_prefix, full_name, phone || '');
    const existing = people.get(key);
    if (existing) {
      if (!existing.schoolIds.includes(school_id)) {
        existing.schoolIds.push(school_id);
      }
      if (!existing.remark && remark) existing.remark = remark;
      if (!existing.position_name && position_name) {
        existing.position_name = position_name;
      }
    } else {
      people.set(key, {
        name_prefix,
        full_name,
        position_name,
        gender,
        phone,
        remark,
        schoolIds: [school_id],
      });
    }
  }

  console.log(`\n== import ${people.size} unique directors ==`);
  let inserted = 0;
  let assigned = 0;
  let assignFail = 0;

  for (const person of people.values()) {
    const label = displayName(person.name_prefix, person.full_name);
    console.log(
      `  + ${label} · schools [${person.schoolIds.join(', ')}] · gender=${person.gender ?? 'null'}`
    );

    if (opts.dryRun) {
      inserted += 1;
      assigned += person.schoolIds.length;
      continue;
    }

    const insertPayload = {
      name_prefix: person.name_prefix || null,
      full_name: person.full_name,
      position_name: person.position_name || 'ผู้อำนวยการโรงเรียน',
      gender: person.gender,
      picture_url: null,
      phone: person.phone,
      remark: person.remark,
    };

    let { data: director, error } = await supabase
      .from('directors')
      .insert(insertPayload)
      .select('director_id, name_prefix, full_name')
      .maybeSingle();

    if (error && /remark/i.test(error.message)) {
      delete insertPayload.remark;
      const retry = await supabase
        .from('directors')
        .insert(insertPayload)
        .select('director_id, name_prefix, full_name')
        .maybeSingle();
      director = retry.data;
      error = retry.error;
    }
    if (error) {
      console.error(`    FAIL insert ${label}: ${error.message}`);
      continue;
    }
    if (!director?.director_id) {
      console.error(`    FAIL insert ${label}: no director_id returned`);
      continue;
    }
    inserted += 1;
    const directorId = director.director_id;
    const directorName = displayName(person.name_prefix, person.full_name);

    for (const schoolId of person.schoolIds) {
      // End any active history for this school (should be none after wipe)
      await supabase
        .from('director_school_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('school_id', schoolId)
        .is('ended_at', null);

      const { error: schoolErr } = await supabase
        .from('School_Basic')
        .update({ director_id: directorId, director_name: directorName })
        .eq('school_id', schoolId);
      if (schoolErr) {
        const retry = await supabase
          .from('School_Basic')
          .update({ director_id: directorId })
          .eq('school_id', schoolId);
        if (retry.error) {
          console.error(
            `    FAIL assign school ${schoolId}: ${retry.error.message}`
          );
          assignFail += 1;
          continue;
        }
      }

      const { error: histErr } = await supabase
        .from('director_school_history')
        .insert({
          director_id: directorId,
          school_id: schoolId,
          started_at: new Date().toISOString(),
          ended_at: null,
        });
      if (histErr && !/unique|duplicate/i.test(histErr.message)) {
        console.error(
          `    FAIL history school ${schoolId}: ${histErr.message}`
        );
        assignFail += 1;
        continue;
      }
      assigned += 1;
    }
  }

  console.log('\n== summary ==');
  console.log(`  excel rows:     ${rawRows.length}`);
  console.log(`  unique people:  ${people.size}`);
  console.log(`  directors in:   ${inserted}`);
  console.log(`  school assigns: ${assigned}`);
  console.log(`  assign fails:   ${assignFail}`);
  console.log(`  skipped rows:   ${skips.length}`);
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
