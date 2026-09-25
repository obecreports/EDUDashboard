import type { SchoolFull, PillarScores } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

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

  return {
    school_id: basic.school_id,
    school_name_th: basic.school_name ?? '',
    school_name_en: basic.school_name_en ?? '',
    subdistrict: basic.subdistrict_name ?? '',
    district: basic.district_name ?? '',
    province: basic.province_name ?? '',
    moo: basic.moo ?? '',
    village_name: basic.village_name ?? '',
    area_id: basic.area_id ?? '',
    area_name: gov.area_name ?? '',
    zone: basic.zone ?? '',
    zipcode: basic.zip_code ?? '',
    phone: basic.phone_number ?? '',
    school_size: basic.school_size ?? '',
    latitude: basic.lat ?? null,
    longitude: basic.long ?? null,
    scores: score,
    pillarScores,
    overallScore: Number.isFinite(overallScore) ? overallScore : 0,
    studentSummary: {
      totalStudents: Number(people.sum_student ?? 0),
    },
    personnelSummary: {
      totalPersonnel: Number(people.actual_teacher ?? 0),
    },
    School_Score: score,
    School_People: people,
    Gov_Domain: gov,
  };
}

/**
 * Load all schools from School_Basic + join People / Score / Gov_Domain / Label_Lookup.
 */
export async function fetchSchools(filters?: {
  province?: string;
  zone?: string;
}): Promise<SchoolFull[]> {
  const supabase = await createClient();

  let basicQuery = supabase.from('School_Basic').select('*');
  if (filters?.province) basicQuery = basicQuery.eq('province_name', filters.province);
  if (filters?.zone) basicQuery = basicQuery.eq('zone', filters.zone);

  const { data: basics, error: basicError } = await basicQuery;
  if (basicError) throw basicError;
  if (!basics?.length) return [];

  const schoolIds = basics.map((b) => b.school_id);

  const [scoreRes, peopleRes, govRes, labelRes] = await Promise.all([
    supabase.from('School_Score').select('*').in('school_id', schoolIds),
    supabase.from('School_People').select('*').in('school_id', schoolIds),
    supabase.from('Gov_Domain').select('area_id, area_name'),
    supabase.from('Label_Lookup').select('label_code, label_name'),
  ]);

  const govMap = new Map<string, { area_id: string; area_name: string }>();
  (govRes.data ?? []).forEach((g) => {
    if (g.area_id) govMap.set(String(g.area_id), g);
  });

  const labelMap: Record<string, string> = {};
  (labelRes.data ?? []).forEach((l) => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  const scoreMap = new Map<string | number, Record<string, unknown>>();
  (scoreRes.data ?? []).forEach((s) => {
    if (s.school_id != null) scoreMap.set(s.school_id, s);
  });

  const peopleMap = new Map<string | number, Record<string, unknown>>();
  (peopleRes.data ?? []).forEach((p) => {
    if (p.school_id != null) peopleMap.set(p.school_id, p);
  });

  return basics.map((basic) => {
    const full = toSchoolFull({
      ...basic,
      School_Score: scoreMap.get(basic.school_id) ?? {},
      School_People: peopleMap.get(basic.school_id) ?? {},
      Gov_Domain: basic.area_id ? govMap.get(String(basic.area_id)) ?? {} : {},
    });
    full.labelLookup = labelMap;
    return full;
  });
}

export async function fetchSchoolById(schoolId: string | number): Promise<SchoolFull | null> {
  const supabase = await createClient();
  const id = Number(schoolId);

  const { data: basic, error } = await supabase
    .from('School_Basic')
    .select('*')
    .eq('school_id', id)
    .maybeSingle();

  if (error) throw error;
  if (!basic) return null;

  const [scoreRes, peopleRes, govRes, labelRes] = await Promise.all([
    supabase.from('School_Score').select('*').eq('school_id', id).maybeSingle(),
    supabase.from('School_People').select('*').eq('school_id', id).maybeSingle(),
    basic.area_id
      ? supabase.from('Gov_Domain').select('area_id, area_name').eq('area_id', basic.area_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('Label_Lookup').select('label_code, label_name'),
  ]);

  const labelMap: Record<string, string> = {};
  (labelRes.data ?? []).forEach((l: { label_code: string; label_name: string }) => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  const full = toSchoolFull({
    ...basic,
    School_Score: scoreRes.data ?? {},
    School_People: peopleRes.data ?? {},
    Gov_Domain: govRes.data ?? {},
  });
  full.labelLookup = labelMap;
  return full;
}

export async function fetchGovDomains() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('Gov_Domain').select('area_id, area_name');
  if (error) throw error;
  return data ?? [];
}
