import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { SchoolFull, PillarScores } from '@/lib/types';
import { createAnonClient } from '@/lib/supabase/anon';

/**
 * Map DB rows using the legacy schema (select '*') — do not hardcode
 * optional columns like school_name_en / director_name that may not exist.
 */
function toSchoolFull(raw: Record<string, any>): SchoolFull {
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

  const director =
    basic.director_name ||
    people.director_name ||
    people.teacher_director_name ||
    people.director ||
    '';

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
    director_name: typeof director === 'string' ? director : String(director || ''),
    scores: score,
    pillarScores,
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
    const { data, error } = await supabase.from('Gov_Domain').select('area_id, area_name');
    if (error) throw error;
    return data ?? [];
  },
  ['gov-domains-v1'],
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

  const [basicsRes, scoresRes, peopleRes, govRows, labelRows] = await Promise.all([
    supabase.from('School_Basic').select('*'),
    supabase.from('School_Score').select('*'),
    supabase.from('School_People').select('*'),
    loadGovDomainsRaw(),
    loadLabelLookupRaw(),
  ]);

  if (basicsRes.error) throw basicsRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (peopleRes.error) throw peopleRes.error;

  const basics = basicsRes.data ?? [];
  if (!basics.length) return [];

  const govMap = new Map<string, { area_id: string; area_name: string }>();
  govRows.forEach((g) => {
    if (g.area_id != null) govMap.set(String(g.area_id), g);
  });

  const labelMap: Record<string, string> = {};
  labelRows.forEach((l) => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  const scoreMap = new Map<string, Record<string, unknown>>();
  (scoresRes.data ?? []).forEach((s) => {
    if (s.school_id != null) {
      scoreMap.set(String(s.school_id), s as Record<string, unknown>);
    }
  });

  const peopleMap = new Map<string, Record<string, unknown>>();
  (peopleRes.data ?? []).forEach((p) => {
    if (p.school_id != null) {
      peopleMap.set(String(p.school_id), p as Record<string, unknown>);
    }
  });

  return basics.map((basic) => {
    const id = String(basic.school_id);
    const full = toSchoolFull({
      ...basic,
      School_Score: scoreMap.get(id) ?? {},
      School_People: peopleMap.get(id) ?? {},
      Gov_Domain: basic.area_id != null ? govMap.get(String(basic.area_id)) ?? {} : {},
    });
    full.labelLookup = labelMap;
    return full;
  });
}

async function loadSchoolById(schoolId: string): Promise<SchoolFull | null> {
  const supabase = createAnonClient();
  const id = Number(schoolId);

  const [basicRes, scoreRes, peopleRes, govRows, labelRows] = await Promise.all([
    supabase.from('School_Basic').select('*').eq('school_id', id).maybeSingle(),
    supabase.from('School_Score').select('*').eq('school_id', id).maybeSingle(),
    supabase.from('School_People').select('*').eq('school_id', id).maybeSingle(),
    loadGovDomainsRaw(),
    loadLabelLookupRaw(),
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

  const full = toSchoolFull({
    ...basicRes.data,
    School_Score: scoreRes.data ?? {},
    School_People: peopleRes.data ?? {},
    Gov_Domain: gov ?? {},
  });
  full.labelLookup = labelMap;
  return full;
}

const SCHOOLS_REVALIDATE = 120;

/** Deduped per-request + ISR cache across navigations */
export const fetchSchools = cache(async (): Promise<SchoolFull[]> => {
  return unstable_cache(loadAllSchools, ['schools-legacy-star-v1'], {
    revalidate: SCHOOLS_REVALIDATE,
    tags: ['schools'],
  })();
});

export const fetchSchoolById = cache(async (schoolId: string | number): Promise<SchoolFull | null> => {
  const id = String(schoolId);
  return unstable_cache(() => loadSchoolById(id), ['school-by-id-legacy-v1', id], {
    revalidate: SCHOOLS_REVALIDATE,
    tags: ['schools', `school-${id}`],
  })();
});

export const fetchGovDomains = cache(async () => loadGovDomainsRaw());
