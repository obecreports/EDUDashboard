#!/usr/bin/env node
/**
 * Batch-upload school media into Supabase Storage (`school-covers`).
 * Uses ASCII-only object keys (Supabase rejects Thai path/file names).
 *
 * Local folders may still use Thai names — this script maps them:
 *   ป้ายโรงเรียน.*     → schools/{id}/sign.{ext}
 *   แผนผังโรงเรียน.*   → schools/{id}/blueprint.{ext}
 *   อาคาร/  or buildings/
 *     001_อาคารเรียน_รูปหลัก.jpg → schools/{id}/Building/001_classroom_main.jpg
 *     002_อาคารหอประชุม_รูปหลัก.jpg → …/Building/002_auditorium_main.jpg
 *
 * DB: categorize Thai; building_number integer (filename keeps 3-digit pad).
 *
 * Usage:
 *   node scripts/upload-school-media.mjs --dir "C:/path/to/1039760340"
 *   node scripts/upload-school-media.mjs --root "C:/path/to/schools-media"
 *   node scripts/upload-school-media.mjs --dir "..." --set-cover
 *   node scripts/upload-school-media.mjs --dir "..." --dry-run
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUCKET = 'school-covers';
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const CATEGORY_TH_TO_SLUG = {
  อาคารเรียน: 'classroom',
  อาคารหอประชุม: 'auditorium',
  อาคารอเนกประสงค์: 'multipurpose',
  โรงอาหาร: 'cafeteria',
  ห้องน้ำ: 'toilet',
  ห้องสมุด: 'library',
  สำนักงาน: 'office',
  หอพัก: 'dorm',
  โรงฝึกงาน: 'workshop',
  โรงยิม: 'gym',
  อื่นๆ: 'other',
};

const SIDE_TH_TO_SLUG = {
  รูปหลัก: 'main',
  ด้านขวา: 'right',
  ด้านซ้าย: 'left',
  ด้านหน้า: 'front',
  ด้านหลัง: 'back',
  ด้านบน: 'top',
  อื่นๆ: 'other',
};

const CATEGORY_SLUG_TO_TH = Object.fromEntries(
  Object.entries(CATEGORY_TH_TO_SLUG).map(([th, en]) => [en, th])
);

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

function parseArgs(argv) {
  const out = { dir: null, root: null, setCover: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i];
    else if (a === '--root') out.root = argv[++i];
    else if (a === '--set-cover') out.setCover = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function contentType(ext) {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

function categoryToSlug(raw) {
  const t = String(raw || '').trim();
  if (CATEGORY_TH_TO_SLUG[t]) return CATEGORY_TH_TO_SLUG[t];
  const lower = t.toLowerCase();
  if (CATEGORY_SLUG_TO_TH[lower]) return lower;
  if (/^[a-z0-9-]+$/i.test(t)) return lower;
  return 'other';
}

function sideToSlug(raw) {
  const t = String(raw || '').trim();
  if (SIDE_TH_TO_SLUG[t]) return SIDE_TH_TO_SLUG[t];
  const lower = t.toLowerCase();
  if (
    lower === 'main' ||
    lower === 'right' ||
    lower === 'left' ||
    lower === 'front' ||
    lower === 'back' ||
    lower === 'top' ||
    lower === 'other'
  ) {
    return lower;
  }
  if (/^[a-z0-9-]+$/i.test(t)) return lower;
  return 'other';
}

function categoryToThai(slugOrThai) {
  const t = String(slugOrThai || '').trim();
  if (CATEGORY_TH_TO_SLUG[t]) return t;
  return CATEGORY_SLUG_TO_TH[t.toLowerCase()] || t || 'อาคาร';
}

function normalizeBuildingNumber(raw) {
  const n = Number(String(raw ?? '').trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function padBuildingNumber(n) {
  return String(Math.trunc(n)).padStart(3, '0');
}

function parseBuildingPhotoName(filename) {
  const base = filename.replace(/\.[^.]+$/, '').trim();
  const parts = base.split('_');
  if (parts.length < 3) return null;
  const building_number = normalizeBuildingNumber(parts[0]);
  const sideRaw = parts[parts.length - 1].trim();
  const catRaw = parts.slice(1, -1).join('_').trim();
  if (building_number == null || !catRaw || !sideRaw) return null;
  return {
    building_number,
    pad: padBuildingNumber(building_number),
    categorize_th: categoryToThai(catRaw),
    category_slug: categoryToSlug(catRaw),
    side_slug: sideToSlug(sideRaw),
  };
}

function publicUrl(supabaseUrl, objectPath) {
  const encoded = objectPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

async function listFilesRecursive(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await listFilesRecursive(full)));
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

function isBuildingsRel(rel) {
  const n = rel.replace(/\\/g, '/');
  return (
    n.startsWith('อาคาร/') ||
    n.startsWith('buildings/') ||
    n.startsWith('Building/') ||
    n.includes('/อาคาร/') ||
    n.includes('/buildings/') ||
    n.includes('/Building/')
  );
}

function isSignBase(base) {
  return (
    base.startsWith('ป้ายโรงเรียน') ||
    /^sign\./i.test(base) ||
    /^sign$/i.test(base.replace(/\.[^.]+$/, ''))
  );
}

function isBlueprintBase(base) {
  return (
    base.startsWith('แผนผังโรงเรียน') ||
    /^blueprint\./i.test(base) ||
    /^blueprint$/i.test(base.replace(/\.[^.]+$/, ''))
  );
}

async function uploadSchoolFolder(supabase, supabaseUrl, schoolDir, opts) {
  const schoolId = path.basename(schoolDir).trim();
  if (!/^\d+$/.test(schoolId)) {
    console.warn(`skip (folder name is not school_id): ${schoolDir}`);
    return;
  }

  console.log(`\n== school ${schoolId} ==`);
  const files = await listFilesRecursive(schoolDir);
  const buildingMeta = new Map();
  let signPublicUrl = null;

  for (const filePath of files) {
    const rel = path.relative(schoolDir, filePath).split(path.sep).join('/');
    const ext = path.extname(filePath).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const base = path.basename(filePath);
    let storagePath = null;

    if (isSignBase(base) && !rel.includes('/')) {
      storagePath = `schools/${schoolId}/sign${ext}`;
    } else if (isBlueprintBase(base) && !rel.includes('/')) {
      storagePath = `schools/${schoolId}/blueprint${ext}`;
    } else if (isBuildingsRel(rel)) {
      const name = path.basename(filePath);
      const parsed = parseBuildingPhotoName(name);
      if (!parsed) {
        console.warn(`  skip (bad building name): ${rel}`);
        continue;
      }
      const asciiName = `${parsed.pad}_${parsed.category_slug}_${parsed.side_slug}${ext}`;
      storagePath = `schools/${schoolId}/Building/${asciiName}`;
      if (!buildingMeta.has(parsed.building_number)) {
        buildingMeta.set(parsed.building_number, parsed.categorize_th);
      }
    } else {
      continue;
    }

    console.log(`  upload ${rel} → ${storagePath}`);
    if (opts.dryRun) {
      if (storagePath.includes('/sign.')) {
        signPublicUrl = publicUrl(supabaseUrl, storagePath);
      }
      continue;
    }

    const buf = await fs.readFile(filePath);
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
      upsert: true,
      contentType: contentType(ext),
      cacheControl: '86400',
    });
    if (error) {
      console.error(`  FAIL ${storagePath}: ${error.message}`);
      continue;
    }
    if (storagePath.includes('/sign.')) {
      signPublicUrl = publicUrl(supabaseUrl, storagePath);
    }
  }

  for (const [building_number, categorize] of buildingMeta) {
    console.log(
      `  upsert building ${building_number} (${categorize}) [file ${padBuildingNumber(building_number)}]`
    );
    if (opts.dryRun) continue;
    const { error } = await supabase.from('school_buildings').upsert(
      {
        school_id: Number(schoolId),
        building_number: Number(building_number),
        categorize,
      },
      { onConflict: 'school_id,building_number' }
    );
    if (error) {
      console.error(`  FAIL building upsert ${building_number}: ${error.message}`);
    }
  }

  if (opts.setCover && signPublicUrl) {
    console.log(`  set cover_image_url ← sign`);
    if (!opts.dryRun) {
      const { error } = await supabase
        .from('School_Basic')
        .update({ cover_image_url: signPublicUrl })
        .eq('school_id', Number(schoolId));
      if (error) console.error(`  FAIL cover update: ${error.message}`);
    }
  }
}

async function main() {
  await loadEnvLocal();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.dir && !opts.root)) {
    console.log(`Usage:
  node scripts/upload-school-media.mjs --dir "C:/path/to/1039760340"
  node scripts/upload-school-media.mjs --root "C:/path/to/schools-media"

Storage keys are ASCII-only (Supabase rejects Thai names).
DB categorize stays Thai. Local Thai folders/files map automatically:
  ป้ายโรงเรียน.jpg                    → schools/{id}/sign.jpg
  แผนผังโรงเรียน.jpg                  → schools/{id}/blueprint.jpg
  อาคาร/001_อาคารเรียน_รูปหลัก.jpg     → …/Building/001_classroom_main.jpg  (DB #: 1, categorize: อาคารเรียน)
  อาคาร/002_อาคารหอประชุม_รูปหลัก.jpg → …/Building/002_auditorium_main.jpg (DB #: 2, categorize: อาคารหอประชุม)

Options:
  --set-cover   Also set School_Basic.cover_image_url from sign
  --dry-run     Log actions without uploading`);
    process.exit(opts.help ? 0 : 1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key)'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const folders = [];
  if (opts.dir) folders.push(path.resolve(opts.dir));
  if (opts.root) {
    const root = path.resolve(opts.root);
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && /^\d+$/.test(ent.name)) {
        folders.push(path.join(root, ent.name));
      }
    }
  }

  if (!folders.length) {
    console.error('No school folders found');
    process.exit(1);
  }

  for (const folder of folders) {
    await uploadSchoolFolder(supabase, url, folder, opts);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
