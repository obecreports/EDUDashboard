#!/usr/bin/env node
/**
 * Wipe + import scholarship students + family members from Excel.
 *
 * Prerequisites:
 *   - Migration 032_scholarship_students.sql applied
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon)
 *
 * Usage:
 *   node scripts/import-scholarship.mjs --students "C:/Webapp/ConED_DB/Scholarship_student.xlsx" --family "C:/Webapp/ConED_DB/scholarship_family_members.xlsx" --wipe
 *   node scripts/import-scholarship.mjs ... --wipe --dry-run
 *
 * Mapping:
 *   student_id → id (+ student_code)
 *   ยังคงเป็นนักเรียนทุน / blank → กำลังศึกษา
 *   birthday Thai BE → CE date
 *   can_contact_supervisor: ใช่/ไม่ใช่ → boolean
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

const STUDENT_TEXT_COLS = [
  'full_name',
  'gender',
  'generation',
  'personal_id',
  'phone',
  'email',
  'facebook',
  'line_id',
  'tribe',
  'grade_level',
  'school_name',
  'origin_school',
  'address',
  'terminated_remark_1',
  'terminated_remark_2',
  'educational_risk',
  'behavioral_risk',
  'risk_information',
  'health_status',
  'health_details',
  'extra_work',
  'extra_work_frequency',
  'problems_obstacles',
  'family_work_assistance',
  'welfare',
  'other_benefits',
  'benefit_period',
  'friend_name_1',
  'friend_name_2',
  'contactable_guardian',
  'job_history',
  'travel_method',
  'career_goal',
  'advisor_name',
  'advisor_phone',
  'supervisor_name',
  'supervisor_phone',
];

const STUDENT_NUM_COLS = [
  'annual_family_income',
  'remaining_budget',
  'disbursed',
  'tuition_fee_disbursed',
  'individual_disbursement',
  'total_scholarship',
  'average_gpa',
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
    students: null,
    family: null,
    wipe: false,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--students') out.students = argv[++i];
    else if (a === '--family') out.family = argv[++i];
    else if (a === '--wipe') out.wipe = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function cell(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
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

function parseNumber(raw) {
  const t = String(raw ?? '')
    .trim()
    .replace(/,/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseSchoolId(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function mapStatus(raw) {
  const t = String(raw ?? '').trim();
  if (t === 'พ้นสภาพ') return 'พ้นสภาพ';
  if (t === 'สำเร็จการศึกษา') return 'สำเร็จการศึกษา';
  if (t === 'พักการเรียน') return 'พักการเรียน';
  if (t === 'กำลังศึกษา') return 'กำลังศึกษา';
  // Excel: ยังคงเป็นนักเรียนทุน / blank
  return 'กำลังศึกษา';
}

function mapGender(raw) {
  const t = String(raw ?? '').trim();
  if (t === 'ชาย' || t === 'หญิง') return t;
  return null;
}

function mapYesNoBool(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  if (t === 'ใช่' || t.toLowerCase() === 'true' || t === '1') return true;
  if (t === 'ไม่ใช่' || t.toLowerCase() === 'false' || t === '0') return false;
  return null;
}

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

function readExcelRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error(`Excel has no sheets: ${filePath}`);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return { sheetName, rows };
}

async function wipeScholarship(supabase, dryRun) {
  console.log('\n== wipe ==');
  if (dryRun) {
    console.log(
      '  (dry-run) would DELETE scholarship_family_members, scholarship_students'
    );
    return;
  }
  {
    const { error } = await supabase
      .from('scholarship_family_members')
      .delete()
      .neq('id', '');
    if (error) throw new Error(`delete family: ${errMsg(error)}`);
    console.log('  deleted scholarship_family_members');
  }
  {
    const { error } = await supabase
      .from('scholarship_students')
      .delete()
      .neq('id', '');
    if (error) throw new Error(`delete students: ${errMsg(error)}`);
    console.log('  deleted scholarship_students');
  }
}

function parseStudentRow(row, excelRow) {
  const student_id = cell(row, 'student_id', 'id');
  const full_name = cell(row, 'full_name');
  if (!student_id) {
    return { skip: `row ${excelRow}: missing student_id` };
  }
  if (!full_name) {
    return { skip: `row ${excelRow}: missing full_name (${student_id})` };
  }

  const payload = {
    id: student_id,
    student_code: student_id,
    full_name,
    school_id: parseSchoolId(cell(row, 'school_id')),
    status: mapStatus(cell(row, 'status')),
    gender: mapGender(cell(row, 'gender')),
    birthday: parseThaiBirthDateToYmd(cell(row, 'birthday', 'birth date')),
    can_contact_supervisor: mapYesNoBool(cell(row, 'can_contact_supervisor')),
  };

  for (const col of STUDENT_TEXT_COLS) {
    if (col === 'full_name' || col === 'gender') continue;
    payload[col] = textOrNull(cell(row, col));
  }
  for (const col of STUDENT_NUM_COLS) {
    payload[col] = parseNumber(cell(row, col));
  }

  return { payload };
}

function parseFamilyRow(row, excelRow, studentIds, counters) {
  const student_id = cell(row, 'student_id');
  const relationship = cell(row, 'relationship') || 'ผู้ปกครอง';
  const full_name = cell(row, 'full_name');
  if (!student_id) {
    return { skip: `row ${excelRow}: missing student_id` };
  }
  if (!studentIds.has(student_id)) {
    return {
      skip: `row ${excelRow}: student_id ${student_id} not in students import`,
    };
  }
  if (!full_name) {
    return { skip: `row ${excelRow}: missing full_name (${student_id})` };
  }
  const n = (counters.get(student_id) || 0) + 1;
  counters.set(student_id, n);
  return {
    payload: {
      id: `${student_id}-fm-${n}`,
      student_id,
      relationship,
      full_name,
      national_id: textOrNull(cell(row, 'national_id')),
      age: (() => {
        const a = parseNumber(cell(row, 'age'));
        return a == null ? null : Math.trunc(a);
      })(),
      race: textOrNull(cell(row, 'race')),
      nationality: textOrNull(cell(row, 'nationality')),
      tribe: textOrNull(cell(row, 'tribe')),
      highest_education: textOrNull(cell(row, 'highest_education')),
      occupation: textOrNull(cell(row, 'occupation')),
      monthly_income: parseNumber(cell(row, 'monthly_income')),
      phone: textOrNull(cell(row, 'phone')),
      current_address: textOrNull(cell(row, 'current_address')),
      sort_order: n,
    },
  };
}

async function upsertInChunks(supabase, table, rows, chunkSize = 100) {
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, {
      onConflict: 'id',
    });
    if (error) {
      console.error(`  FAIL ${table} chunk ${i}: ${errMsg(error)}`);
      // retry one-by-one
      for (const row of chunk) {
        const retry = await supabase.from(table).upsert(row, {
          onConflict: 'id',
        });
        if (retry.error) {
          console.error(`    FAIL ${table} ${row.id}: ${retry.error.message}`);
          fail += 1;
        } else {
          ok += 1;
        }
      }
    } else {
      ok += chunk.length;
    }
  }
  return { ok, fail };
}

async function main() {
  await loadEnvLocal();
  applyLocalTlsRelax();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.students || !opts.family) {
    console.log(`Usage:
  node scripts/import-scholarship.mjs --students "C:/Webapp/ConED_DB/Scholarship_student.xlsx" --family "C:/Webapp/ConED_DB/scholarship_family_members.xlsx" --wipe

Options:
  --wipe      Delete all scholarship_family_members + scholarship_students first
  --dry-run   Log actions without writing`);
    process.exit(opts.help ? 0 : 1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    console.error(`Missing in .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`  Supabase: ${url}`);
  console.log(
    `  Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`
  );

  {
    const ping = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch((e) => ({ ok: false, statusText: errMsg(e) }));
    if (!ping.ok && ping.status == null) {
      console.error(`\nCannot reach Supabase: ${ping.statusText}`);
      console.error('Try CONED_RELAX_TLS=1 in .env.local');
      process.exit(1);
    }
  }

  for (const f of [opts.students, opts.family]) {
    const p = path.resolve(f);
    try {
      await fs.access(p);
    } catch {
      console.error(`File not found: ${p}`);
      process.exit(1);
    }
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (opts.wipe) {
    await wipeScholarship(supabase, opts.dryRun);
  }

  console.log(`\n== read students ${opts.students} ==`);
  const studentsFile = readExcelRows(path.resolve(opts.students));
  console.log(
    `  sheet: ${studentsFile.sheetName}, rows: ${studentsFile.rows.length}`
  );

  const studentSkips = [];
  const studentPayloads = [];
  const studentIds = new Set();
  for (let i = 0; i < studentsFile.rows.length; i++) {
    const parsed = parseStudentRow(studentsFile.rows[i], i + 2);
    if (parsed.skip) {
      studentSkips.push(parsed.skip);
      continue;
    }
    if (studentIds.has(parsed.payload.id)) {
      studentSkips.push(
        `row ${i + 2}: duplicate student_id ${parsed.payload.id}`
      );
      continue;
    }
    studentIds.add(parsed.payload.id);
    studentPayloads.push(parsed.payload);
  }

  console.log(`\n== read family ${opts.family} ==`);
  const familyFile = readExcelRows(path.resolve(opts.family));
  console.log(
    `  sheet: ${familyFile.sheetName}, rows: ${familyFile.rows.length}`
  );

  const familySkips = [];
  const familyPayloads = [];
  const counters = new Map();
  for (let i = 0; i < familyFile.rows.length; i++) {
    const parsed = parseFamilyRow(
      familyFile.rows[i],
      i + 2,
      studentIds,
      counters
    );
    if (parsed.skip) {
      familySkips.push(parsed.skip);
      continue;
    }
    familyPayloads.push(parsed.payload);
  }

  console.log(`\n== import students ${studentPayloads.length} ==`);
  let studentOk = 0;
  let studentFail = 0;
  if (opts.dryRun) {
    studentOk = studentPayloads.length;
    console.log(
      `  (dry-run) sample: ${studentPayloads
        .slice(0, 3)
        .map((s) => `${s.id}/${s.status}/school=${s.school_id ?? 'null'}`)
        .join(' · ')}`
    );
  } else {
    const res = await upsertInChunks(
      supabase,
      'scholarship_students',
      studentPayloads
    );
    studentOk = res.ok;
    studentFail = res.fail;
  }

  console.log(`\n== import family ${familyPayloads.length} ==`);
  let familyOk = 0;
  let familyFail = 0;
  if (opts.dryRun) {
    familyOk = familyPayloads.length;
  } else {
    const res = await upsertInChunks(
      supabase,
      'scholarship_family_members',
      familyPayloads
    );
    familyOk = res.ok;
    familyFail = res.fail;
  }

  console.log('\n== summary ==');
  console.log(`  students excel:  ${studentsFile.rows.length}`);
  console.log(`  students ok:     ${studentOk} · fail ${studentFail} · skip ${studentSkips.length}`);
  console.log(`  family excel:    ${familyFile.rows.length}`);
  console.log(`  family ok:       ${familyOk} · fail ${familyFail} · skip ${familySkips.length}`);
  if (studentSkips.length) {
    console.log('  student skips:');
    for (const s of studentSkips.slice(0, 30)) console.log(`    - ${s}`);
    if (studentSkips.length > 30) {
      console.log(`    … +${studentSkips.length - 30} more`);
    }
  }
  if (familySkips.length) {
    console.log('  family skips:');
    for (const s of familySkips.slice(0, 30)) console.log(`    - ${s}`);
    if (familySkips.length > 30) {
      console.log(`    … +${familySkips.length - 30} more`);
    }
  }
  if (opts.dryRun) console.log('\n(dry-run: no DB writes)');
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
