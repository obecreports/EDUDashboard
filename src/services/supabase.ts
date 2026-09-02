// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { SchoolFull } from "../types/school";



function toSchoolFull(raw: any): SchoolFull {
  // Basic info from School_Basic
  const basic = raw;
  const score = raw.School_Score || {};
  const people = raw.School_People || {};
  const gov = raw.Gov_Domain || {};

  // Map to the field names expected by the UI
  const mapped: any = {
    // Core school fields
    school_id: basic.school_id ?? '',
    school_name_th: basic.school_name ?? '', // using the same column for Thai name
    school_name_en: basic.school_name_en ?? '',
    subdistrict: basic.subdistrict_name ?? '',
    district: basic.district_name ?? '',
    province: basic.province_name ?? '',
    moo: basic.moo ?? '',
    village_name: basic.village_name ?? '',
    area_name: gov.area_name ?? basic.area_name ?? basic.organize_domain ?? '',
    zipcode: basic.zip_code ?? '',
    phone: basic.phone_number ?? basic.phone ?? '',
    organize_domain: basic.organize_domain ?? '',
    school_size: basic.school_size ?? '',
    latitude: basic.lat ?? '',
    longitude: basic.long ?? '',
    // Director info (if present in the basic table)
    director_name: basic.director_name ?? '',
    director_title: basic.director_title ?? '',
    director_phone: basic.director_phone ?? '',
    // Scores – expose as a flat object
    scores: score,
    pillarScores: {
      learner: parseFloat(score.G01 ?? score.g01 ?? score.G1 ?? 0) || 0,
      participation: parseFloat(score.G02 ?? score.g02 ?? score.G2 ?? 0) || 0,
      teacherAdmin: parseFloat(score.G03 ?? score.g03 ?? score.G3 ?? 0) || 0,
      curriculum: parseFloat(score.G04 ?? score.g04 ?? score.G4 ?? 0) || 0,
      infrastructure: parseFloat(score.G05 ?? score.g05 ?? score.G5 ?? 0) || 0,
    },
    // People summary – use a few key columns for quick UI display
    studentSummary: {
      totalStudents: people.sum_student ?? 0,
      totalMale: (people.kinder_1_b ?? 0) + (people.primary_1_b ?? 0) + (people.middle_1_b ?? 0) + (people.highschool_1_b ?? 0),
      totalFemale: (people.kinder_1_g ?? 0) + (people.primary_1_g ?? 0) + (people.middle_1_g ?? 0) + (people.highschool_1_g ?? 0),
      totalClassrooms: people.kinder_all ?? 0,
    },
    personnelSummary: {
      totalPersonnel: people.actual_teacher ?? people.actual_tea ?? 0,
      totalMale: people.teacher_d ?? 0,
      totalFemale: 0,
    },
    // Infrastructure placeholder (no separate table now)
    infrastructure: {
      buildings_count: basic.building_count ?? 0,
      room_count: basic.room_count ?? 0,
      area: basic.area ?? 0,
      infrastructure_desc: basic.infrastructure ?? '',
    },
    // Weaknesses – not present in new schema, default empty
    weaknesses: [],
    // Assessment – map any score fields that exist in School_Score
    assessment: {
      // you can extend this with specific assessment fields if needed
    },
    // Keep any other raw fields for future use
    ...basic,
  } as SchoolFull;

  return mapped;
}

/* Initialise the Supabase client – values come from .env (Vite injects them) */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// FETCH ONLY TOTAL SCHOOL COUNT
export async function fetchSchoolCount(): Promise<{ count: number; debugInfo: any }> {
  const res = await supabase
    .from('School_Basic')
    .select('school_id', { count: 'exact' });

  console.log('Supabase response for School_Basic:', res);

  if (res.error) {
    console.error('Supabase fetchSchoolCount error:', res.error);
    throw res.error;
  }

  const finalCount = res.count ?? res.data?.length ?? 0;
  return {
    count: finalCount,
    debugInfo: {
      status: res.status,
      statusText: res.statusText,
      count: res.count,
      dataLength: res.data?.length ?? 0,
      sampleData: res.data?.slice(0, 2)
    }
  };
}

// FETCH ALL SCHOOLS (optional filters)
export async function fetchSchools(filters?: { province?: string; organizeDomain?: string }) {
  // Fetch basic school records
  let basicQuery = supabase.from('School_Basic').select('*');
  if (filters?.province) basicQuery = basicQuery.eq('province_name', filters.province);
  if (filters?.organizeDomain) basicQuery = basicQuery.eq('organize_domain', filters.organizeDomain);

  const { data: basics, error: basicError } = await basicQuery;
  if (basicError) {
    console.error('Supabase fetchSchools (basic) error:', basicError);
    throw basicError;
  }

  // Extract school IDs for related queries
  const schoolIds = (basics ?? []).map(b => b.school_id);
  if (schoolIds.length === 0) {
    return [];
  }

  // Fetch related tables in parallel using the list of IDs
  const [scoreRes, peopleRes, govRes, labelRes] = await Promise.all([
    supabase.from('School_Score').select('*').in('school_id', schoolIds),
    supabase.from('School_People').select('*').in('school_id', schoolIds),
    supabase.from('Gov_Domain').select('area_id, area_name'),
    supabase.from('Label_Lookup').select('label_code, label_name'),
  ]);

  if (scoreRes.error) console.warn('Supabase fetchSchools (score) warning:', scoreRes.error);
  if (peopleRes.error) console.warn('Supabase fetchSchools (people) warning:', peopleRes.error);
  if (govRes.error) console.warn('Supabase fetchSchools (gov) warning:', govRes.error);

  // Create lookup maps for quick association
  const scoreMap = new Map<string, any>();
  (scoreRes.data ?? []).forEach(s => { if (s.school_id) scoreMap.set(s.school_id, s); });

  const peopleMap = new Map<string, any>();
  (peopleRes.data ?? []).forEach(p => { if (p.school_id) peopleMap.set(p.school_id, p); });

  const govMap = new Map<string, any>();
  (govRes.data ?? []).forEach(g => { if (g.area_id) govMap.set(g.area_id, g); });

  // Combine basic records with related data
  const combined = (basics ?? []).map(basic => ({
    ...basic,
    School_Score: scoreMap.get(basic.school_id) ?? {},
    School_People: peopleMap.get(basic.school_id) ?? {},
    Gov_Domain: basic.area_id ? (govMap.get(basic.area_id) ?? {}) : {},
  }));

  // Build label lookup map (code -> name)
  const labelMap: Record<string, string> = {};
  (labelRes.data ?? []).forEach(l => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  // Transform to the full UI type, adding labelLookup and overallScore (average of G01‑G05)
  return combined.map(item => {
    const full = toSchoolFull(item);
    // attach label lookup
    (full as any).labelLookup = labelMap;
    // compute overallScore as average of pillar averages (G01‑G05) already in full.pillarScores
    const { learner, participation, teacherAdmin, curriculum, infrastructure } = full.pillarScores ?? {};
    const overall = [learner, participation, teacherAdmin, curriculum, infrastructure]
      .filter(v => typeof v === 'number')
      .reduce((sum, v) => sum + v, 0) / 5;
    (full as any).overallScore = Number.isFinite(overall) ? overall : 0;
    return full;
  });
}


/* FETCH ONE SCHOOL BY ID (used in SchoolDetail) */
export async function fetchSchoolById(schoolId: string) {
  // Fetch basic record
  const { data: basic, error: basicError } = await supabase
    .from('School_Basic')
    .select('*')
    .eq('school_id', Number(schoolId))
    .maybeSingle();

  if (basicError) {
    console.error(`Supabase fetchSchoolById(${schoolId}) basic error:`, basicError);
    throw basicError;
  }

  if (!basic) {
    return null;
  }

  // Fetch related tables
  const [scoreRes, peopleRes, govRes, labelRes] = await Promise.all([
    supabase.from('School_Score').select('*').eq('school_id', Number(schoolId)),
    supabase.from('School_People').select('*').eq('school_id', Number(schoolId)),
    supabase.from('Gov_Domain').select('area_id, area_name'),
    supabase.from('Label_Lookup').select('label_code, label_name'),
  ]);

  if (scoreRes.error) console.warn('Supabase fetchSchoolById (score) warning:', scoreRes.error);
  if (peopleRes.error) console.warn('Supabase fetchSchoolById (people) warning:', peopleRes.error);
  if (govRes.error) console.warn('Supabase fetchSchoolById (gov) warning:', govRes.error);
  if (labelRes.error) console.warn('Supabase fetchSchoolById (label) warning:', labelRes.error);

  // Build label lookup map
  const labelMap: Record<string, string> = {};
  (labelRes.data ?? []).forEach(l => {
    if (l.label_code) labelMap[l.label_code] = l.label_name ?? '';
  });

  // Combine basic with related data
  const combined = {
    ...basic,
    School_Score: (scoreRes.data?.[0]) ?? {},
    School_People: (peopleRes.data?.[0]) ?? {},
    Gov_Domain: basic.area_id
      ? (govRes.data?.find(g => g.area_id === basic.area_id) ?? {})
      : {},
  };

  const full = toSchoolFull(combined);
  // attach label lookup
  (full as any).labelLookup = labelMap;
  // compute overallScore as average of pillar scores
  const { learner, participation, teacherAdmin, curriculum, infrastructure } = full.pillarScores ?? {};
  const overall = [learner, participation, teacherAdmin, curriculum, infrastructure]
    .filter(v => typeof v === 'number')
    .reduce((sum, v) => sum + v, 0) / 5;
  (full as any).overallScore = Number.isFinite(overall) ? overall : 0;

  return full;
}