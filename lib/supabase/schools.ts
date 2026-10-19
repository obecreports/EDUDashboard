import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type {
  SchoolFull,
  PillarScores,
  ThreePillarScores,
  SchoolCompareYearScores,
  CompareScoresByYear,
} from '@/lib/types';

export type {
  SchoolCompareYearScores,
  SchoolComparePrevScores,
  CompareScoresByYear,
} from '@/lib/types';
import { createAnonClient } from '@/lib/supabase/anon';
import {
  EMPTY_THREE_PILLAR,
  fetchAllPillarScores,
  fetchPillarScoreBySchoolId,
  mapPillarRow,
  type SchoolPillarScoreRow,
} from '@/lib/supabase/school-pillars';
import {
  normalizeScoreYearCe,
  pickScoreRowExactYear,
  pickScoreRowForYear,
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
} from '@/lib/scores/years';
import { fetchDirectorsByIds } from '@/lib/supabase/directors';
import type { SchoolDirector } from '@/lib/types';

/**
 * Map DB rows using the legacy schema (select '*') — do not hardcode
 * optional columns like school_name_en / director_name that may not exist.
 */
function toSchoolFull(
  raw: Record<string, any>,
  threePillarScores: ThreePillarScores = EMPTY_THREE_PILLAR
): SchoolFull {
  const basic = raw;
  const score = raw.School_Score || {};
  const people = raw.School_People || {};
  const gov = raw.Gov_Domain || {};

  const pillarScores: PillarScores = {
    learner: parseFloat(String(score.G01 ?? score.g01 ?? 0)) || 0,
    participation: parseFloat(String(score.G02 ?? score.g02 ?? 0)) || 0,
    teacherAdmin: parseFloat(String(score.G03 ?? score.g03 ?? 0)) || 0,
    curriculum: parseFloat(String(score.G04 ?? score.g04 ?? 0)) || 0,
    infrastructure: parseFloat(String(score.G05 ?? score.g05 ?? 0)) || 0,
  };

  const overallFromDb = parseFloat(String(score.overall ?? ''));
  const overallScore = Number.isFinite(overallFromDb)
    ? overallFromDb
    : (pillarScores.learner +
        pillarScores.participation +
        pillarScores.teacherAdmin +
        pillarScores.curriculum +
        pillarScores.infrastructure) /
      5;

  const legacyDirector =
    basic.director_name ||
    people.director_name ||
    people.teacher_director_name ||
    people.director ||
    '';
  const directorId =
    basic.director_id != null && String(basic.director_id).trim()
      ? String(basic.director_id)
      : null;
  const joinedDirector =
    (raw.director as SchoolDirector | null | undefined) ?? null;

  return {
    school_id: basic.school_id,
    school_name_th: basic.school_name ?? basic.school_name_th ?? '',
    subdistrict: basic.subdistrict_name ?? basic.subdistrict ?? '',
    district: basic.district_name ?? basic.district ?? '',
    province: basic.province_name ?? basic.province ?? '',
    moo: basic.moo ?? '',
    village_name: basic.village_name ?? '',
    area_id: basic.area_id ?? '',
    area_name: gov.area_name ?? basic.area_name ?? '',
    zone: basic.zone ?? '',
    zipcode: basic.zip_code ?? basic.zipcode ?? '',
    phone: basic.phone_number ?? basic.phone ?? '',
    school_size: basic.school_size ?? '',
    area_special: basic.area_special ?? null,
    latitude: basic.lat ?? basic.latitude ?? null,
    longitude: basic.long ?? basic.lng ?? basic.longitude ?? null,
    director_id: directorId,
    director: joinedDirector,
    director_name:
      typeof legacyDirector === 'string'
        ? legacyDirector
        : String(legacyDirector || ''),
    coverImageUrl:
      (typeof basic.cover_image_url === 'string' && basic.cover_image_url.trim()) ||
      (typeof basic.coverImageUrl === 'string' && basic.coverImageUrl.trim()) ||
      null,
    scores: score,
    pillarScores,
    threePillarScores,
    lastActivityAt: null,
    visitStatus: 'never',
    overallScore: Number.isFinite(overallScore) ? overallScore : 0,
    studentSummary: {
      totalStudents: Number(people.sum_student ?? people.student_count ?? 0),
    },
    personnelSummary: {
      totalPersonnel: Number(people.actual_teacher ?? people.staff_assigned ?? 0),
      teacherDirector: Number(people.teacher_director ?? 0),
    },
    School_Score: score,
    School_People: people,
    Gov_Domain: gov,
  };
}

export function formatFetchError(e: unknown): string {
  if (!e) return 'Unknown error';
  if (e instanceof Error) {
    const cause = (e as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) return `${e.message}: ${cause.message}`;
    if (cause && typeof cause === 'object' && 'code' in cause) {
      return `${e.message}: ${(cause as { code?: string }).code}`;
    }
    return e.message;
  }
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const msg = String((e as { message: unknown }).message);
    const code = 'code' in e ? String((e as { code: unknown }).code) : '';
    return code ? `${msg} (${code})` : msg;
  }
  return String(e);
}

/** Reference tables — long TTL (rarely change) */
const loadGovDomainsRaw = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('Gov_Domain')
      .select('area_id, area_name, province_name');
    if (error) throw error;
    return data ?? [];
  },
  ['gov-domains-v2-province'],
  { revalidate: 3600, tags: ['gov-domains'] }
);

const loadLabelLookupRaw = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('Label_Lookup')
      .select('label_code, label_name');
    if (error) throw error;
    return data ?? [];
  },
  ['label-lookup-v1'],
  { revalidate: 3600, tags: ['label-lookup'] }
);

/**
 * Legacy-compatible loader: School_Basic / Score / People via select('*')
 * (same pattern as maplibre-dashboard/js/schools-api.js).
 */
async function loadAllSchools(): Promise<SchoolFull[]> {
  const supabase = createAnonClient();

  const [basicsRes, scoresRes, peopleRes, govRows, labelRows, pillarMap] = await Promise.all([
    supabase.from('School_Basic').select('*'),
    supabase.from('School_Score').select('*'),
    supabase.from('School_People').select('*'),
    loadGovDomainsRaw(),
    loadLabelLookupRaw(),
    fetchAllPillarScores(),
  ]);

  if (basicsRes.error) throw basicsRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (peopleRes.error) throw peopleRes.error;

  const basics = basicsRes.data ?? [];
  if (!basics.length) return [];

  const govMap = new Map<
    string,
    { area_id: string; area_name: string; province_name?: string | null }
  >();
  govRows.forEach((g) => {
    if (g.area_id != null) govMap.set(String(g.area_id), g);
  });

  const labelMap: Record<string, string> = {};
  labelRows.forEach((l) => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  const scoreBySchool = new Map<string, Record<string, unknown>[]>();
  (scoresRes.data ?? []).forEach((s) => {
    if (s.school_id == null) return;
    const id = String(s.school_id);
    const list = scoreBySchool.get(id) ?? [];
    list.push(s as Record<string, unknown>);
    scoreBySchool.set(id, list);
  });
  const scoreMap = new Map<string, Record<string, unknown>>();
  for (const [id, rows] of scoreBySchool) {
    // Exact current year first; fall back only when no 2026/current row exists
    const picked =
      pickScoreRowExactYear(
        rows as { school_year?: string | null }[],
        SCORE_YEAR_CURRENT
      ) ??
      pickScoreRowForYear(
        rows as { school_year?: string | null }[],
        SCORE_YEAR_CURRENT
      );
    if (picked) scoreMap.set(id, picked as Record<string, unknown>);
  }

  const peopleMap = new Map<string, Record<string, unknown>>();
  (peopleRes.data ?? []).forEach((p) => {
    if (p.school_id != null) {
      peopleMap.set(String(p.school_id), p as Record<string, unknown>);
    }
  });

  const directorIds = basics
    .map((b) => (b.director_id != null ? String(b.director_id) : ''))
    .filter(Boolean);
  const directorMap = await fetchDirectorsByIds(directorIds).catch(
    () => new Map<string, SchoolDirector>()
  );

  return basics.map((basic) => {
    const id = String(basic.school_id);
    const pillarRow = pillarMap.get(id) as SchoolPillarScoreRow | undefined;
    const did = basic.director_id != null ? String(basic.director_id) : '';
    const full = toSchoolFull(
      {
        ...basic,
        director: did ? directorMap.get(did) ?? null : null,
        School_Score: scoreMap.get(id) ?? {},
        School_People: peopleMap.get(id) ?? {},
        Gov_Domain: basic.area_id != null ? govMap.get(String(basic.area_id)) ?? {} : {},
      },
      mapPillarRow(pillarRow)
    );
    full.labelLookup = labelMap;
    return full;
  });
}

async function loadSchoolById(schoolId: string): Promise<SchoolFull | null> {
  const supabase = createAnonClient();
  const id = Number(schoolId);

  const [basicRes, scoreRes, peopleRes, govRows, labelRows, pillarRow, pillarPrevRow] =
    await Promise.all([
      supabase.from('School_Basic').select('*').eq('school_id', id).maybeSingle(),
      supabase.from('School_Score').select('*').eq('school_id', id),
      supabase.from('School_People').select('*').eq('school_id', id).maybeSingle(),
      loadGovDomainsRaw(),
      loadLabelLookupRaw(),
      fetchPillarScoreBySchoolId(id, SCORE_YEAR_CURRENT),
      fetchPillarScoreBySchoolId(id, SCORE_YEAR_PREVIOUS, { exact: true }),
    ]);

  if (basicRes.error) throw basicRes.error;
  if (!basicRes.data) return null;

  const labelMap: Record<string, string> = {};
  labelRows.forEach((l) => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  const gov =
    basicRes.data.area_id != null
      ? govRows.find((g) => String(g.area_id) === String(basicRes.data!.area_id))
      : null;

  const scoreRows = (scoreRes.data ?? []) as { school_year?: string | null }[];
  const scoreRow = pickScoreRowForYear(scoreRows, SCORE_YEAR_CURRENT) ?? {};
  const scorePrevRow = pickScoreRowExactYear(scoreRows, SCORE_YEAR_PREVIOUS);

  const did =
    basicRes.data.director_id != null
      ? String(basicRes.data.director_id)
      : '';
  const directorMap = did
    ? await fetchDirectorsByIds([did]).catch(() => new Map<string, SchoolDirector>())
    : new Map<string, SchoolDirector>();

  const full = toSchoolFull(
    {
      ...basicRes.data,
      director: did ? directorMap.get(did) ?? null : null,
      School_Score: scoreRow,
      School_People: peopleRes.data ?? {},
      Gov_Domain: gov ?? {},
    },
    mapPillarRow(pillarRow)
  );
  full.labelLookup = labelMap;
  full.School_Score_Previous = scorePrevRow
    ? (scorePrevRow as Record<string, number | string>)
    : null;
  full.threePillarScoresPrevious = pillarPrevRow ? mapPillarRow(pillarPrevRow) : null;
  return full;
}

const SCHOOLS_REVALIDATE = 120;

/** Deduped per-request + ISR cache across navigations */
export const fetchSchools = cache(async (): Promise<SchoolFull[]> => {
  return unstable_cache(loadAllSchools, ['schools-legacy-star-v7-directors', SCORE_YEAR_CURRENT], {
    revalidate: SCHOOLS_REVALIDATE,
    tags: ['schools', 'school-pillars'],
  })();
});

export const fetchSchoolById = cache(async (schoolId: string | number): Promise<SchoolFull | null> => {
  const id = String(schoolId);
  return unstable_cache(
    () => loadSchoolById(id),
    ['school-by-id-legacy-v5-yoy', SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS, id],
    {
      revalidate: SCHOOLS_REVALIDATE,
      tags: ['schools', 'school-pillars', `school-${id}`],
    }
  )();
});

export const fetchGovDomains = cache(async () => loadGovDomainsRaw());

/** CE year + Buddhist Era string variants for DB filters. */
function yearFilterValues(ce: string): string[] {
  const n = Number(ce);
  if (!Number.isFinite(n)) return [ce];
  return [String(n), String(n + 543)];
}

function numScore(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** SMS angles from School_Score G01–G05 (same mapping as school detail). */
function smsFromSchoolScoreRow(score: Record<string, unknown>): {
  sms: PillarScores;
  overall: number;
} {
  const sms: PillarScores = {
    learner: numScore(score.G01 ?? score.g01),
    participation: numScore(score.G02 ?? score.g02),
    teacherAdmin: numScore(score.G03 ?? score.g03),
    curriculum: numScore(score.G04 ?? score.g04),
    infrastructure: numScore(score.G05 ?? score.g05),
  };
  const overallFromDb = numScore(score.overall);
  const overall =
    overallFromDb > 0
      ? overallFromDb
      : (sms.learner +
          sms.participation +
          sms.teacherAdmin +
          sms.curriculum +
          sms.infrastructure) /
        5;
  return { sms, overall: Number.isFinite(overall) ? overall : 0 };
}

/** 3 pillars from school_pillar_scores pillar_1–pillar_3 only (no indicator fallback). */
function threeFromPillarRow(row: SchoolPillarScoreRow | null | undefined): ThreePillarScores {
  if (!row) return { ...EMPTY_THREE_PILLAR };
  const qualitySchool = numScore(row.pillar_1);
  const qualityGraduation = numScore(row.pillar_2);
  const disciplineMorality = numScore(row.pillar_3);
  const overallFromDb = numScore(row.overall);
  const overall =
    overallFromDb > 0
      ? overallFromDb
      : qualitySchool || qualityGraduation || disciplineMorality
        ? Math.round(((qualitySchool + qualityGraduation + disciplineMorality) / 3) * 10) / 10
        : 0;
  return { qualitySchool, qualityGraduation, disciplineMorality, overall };
}

const EMPTY_SMS: PillarScores = {
  learner: 0,
  participation: 0,
  teacherAdmin: 0,
  curriculum: 0,
  infrastructure: 0,
};

/** Paginate Supabase reads (default max 1000 rows/request). */
async function fetchAllPaged<T extends Record<string, unknown>>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) break;
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

/**
 * Load compare maps for one CE year from:
 * - school_pillar_scores: pillar_1..pillar_3 + school_year
 * - School_Score: G01..G05 + school_year
 */
async function loadCompareScoresForYear(
  yearCe: string
): Promise<Record<string, SchoolCompareYearScores>> {
  const supabase = createAnonClient();
  const yearVals = yearFilterValues(yearCe);
  const out: Record<string, SchoolCompareYearScores> = {};

  const [smsRows, pillarRows] = await Promise.all([
    fetchAllPaged<Record<string, unknown>>(async (from, to) =>
      supabase
        .from('School_Score')
        .select('school_id, school_year, G01, G02, G03, G04, G05, overall')
        .in('school_year', yearVals)
        .range(from, to)
    ),
    fetchAllPaged<SchoolPillarScoreRow & Record<string, unknown>>(async (from, to) =>
      supabase
        .from('school_pillar_scores')
        .select('school_id, school_year, pillar_1, pillar_2, pillar_3, overall')
        .in('school_year', yearVals)
        .range(from, to)
    ),
  ]);

  for (const row of smsRows) {
    if (row.school_id == null) continue;
    // Guard: only keep rows that normalize to this CE year
    if (normalizeScoreYearCe(row.school_year as string | number | null) !== yearCe) continue;
    const id = String(row.school_id);
    const { sms, overall } = smsFromSchoolScoreRow(row);
    const prev = out[id];
    out[id] = {
      three: prev?.three ?? { ...EMPTY_THREE_PILLAR },
      sms,
      overall,
    };
  }

  for (const row of pillarRows) {
    if (row.school_id == null) continue;
    if (normalizeScoreYearCe(row.school_year) !== yearCe) continue;
    const id = String(row.school_id);
    const three = threeFromPillarRow(row);
    const prev = out[id];
    out[id] = {
      three,
      sms: prev?.sms ?? { ...EMPTY_SMS },
      overall: prev?.overall ?? three.overall,
    };
  }

  return out;
}

/**
 * Exact-year SMS + 3-pillar maps for YoY compare (2024 + 2025).
 * Paginates past Supabase 1000-row limit; filters by school_year (CE or BE).
 */
export const fetchCompareScoresByYear = cache(async (): Promise<CompareScoresByYear> => {
  return unstable_cache(
    async () => {
      const [prev, curr] = await Promise.all([
        loadCompareScoresForYear(SCORE_YEAR_PREVIOUS),
        loadCompareScoresForYear(SCORE_YEAR_CURRENT),
      ]);
      return {
        [SCORE_YEAR_PREVIOUS]: prev,
        [SCORE_YEAR_CURRENT]: curr,
      };
    },
    ['schools-compare-by-year-v5', SCORE_YEAR_CURRENT, SCORE_YEAR_PREVIOUS],
    { revalidate: SCHOOLS_REVALIDATE, tags: ['schools', 'school-pillars'] }
  )();
});

/** Previous year only — kept for callers; prefer fetchCompareScoresByYear. */
export const fetchPreviousYearCompareScores = cache(
  async (): Promise<Record<string, SchoolCompareYearScores>> => {
    const byYear = await fetchCompareScoresByYear();
    return byYear[SCORE_YEAR_PREVIOUS] ?? {};
  }
);
