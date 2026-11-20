import { createAnonClient } from '@/lib/supabase/anon';
import type {
  ScholarshipFamilyMember,
  ScholarshipStudent,
  ScholarshipStudentStatus,
} from '@/lib/mock/scholarship-students';

/** Use `*` so Supabase client types resolve (long column lists → GenericStringError). */
const STUDENT_SELECT = '*';
const FAMILY_SELECT = '*';

function text(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapStatus(raw: unknown): ScholarshipStudentStatus {
  const t = String(raw ?? '').trim();
  if (
    t === 'กำลังศึกษา' ||
    t === 'สำเร็จการศึกษา' ||
    t === 'พักการเรียน' ||
    t === 'พ้นสภาพ'
  ) {
    return t;
  }
  return 'กำลังศึกษา';
}

function mapGender(raw: unknown): 'ชาย' | 'หญิง' {
  return String(raw ?? '').trim() === 'หญิง' ? 'หญิง' : 'ชาย';
}

function mapFamily(row: Record<string, unknown>): ScholarshipFamilyMember {
  return {
    id: String(row.id),
    relationship: text(row.relationship) || 'ผู้ปกครอง',
    full_name: text(row.full_name) || '—',
    age: num(row.age),
    race: text(row.race),
    nationality: text(row.nationality),
    tribe: text(row.tribe),
    highest_education: text(row.highest_education),
    occupation: text(row.occupation),
    monthly_income: num(row.monthly_income),
    current_address: text(row.current_address),
    national_id: text(row.national_id),
    phone: text(row.phone),
  };
}

function mapStudent(
  row: Record<string, unknown>,
  family: ScholarshipFamilyMember[] = []
): ScholarshipStudent {
  const gpa = num(row.average_gpa);
  return {
    id: String(row.id),
    student_code: text(row.student_code) || String(row.id),
    full_name: text(row.full_name) || '—',
    name_prefix: text(row.name_prefix),
    photo_url: text(row.photo_url) ?? null,
    gender: mapGender(row.gender),
    grade_level: text(row.grade_level) || '—',
    generation: text(row.generation),
    school_id: row.school_id != null ? String(row.school_id) : '',
    school_name: text(row.school_name) || '—',
    province: text(row.province) || '',
    district: text(row.district) || '',
    scholarship_type: text(row.scholarship_type) || text(row.scholarship_origin) || '—',
    scholarship_year: text(row.scholarship_year),
    status: mapStatus(row.status),
    terminated_remark_1: (text(row.terminated_remark_1) as ScholarshipStudent['terminated_remark_1']) ?? null,
    terminated_remark_2: text(row.terminated_remark_2) ?? null,
    overseer_level: text(row.overseer_level),
    career_goal: text(row.career_goal),
    birthday: row.birthday != null ? String(row.birthday).slice(0, 10) : undefined,
    tribe: text(row.tribe),
    address: text(row.address),
    travel_method: text(row.travel_method),
    personal_id: text(row.personal_id),
    can_contact_supervisor:
      row.can_contact_supervisor == null
        ? undefined
        : Boolean(row.can_contact_supervisor),
    phone: text(row.phone),
    email: text(row.email),
    facebook: text(row.facebook),
    line_id: text(row.line_id),
    advisor_name: text(row.advisor_name),
    advisor_phone: text(row.advisor_phone),
    supervisor_name: text(row.supervisor_name),
    supervisor_phone: text(row.supervisor_phone),
    educational_risk: text(row.educational_risk),
    behavioral_risk: text(row.behavioral_risk),
    risk_information: text(row.risk_information),
    extra_work: text(row.extra_work),
    extra_work_frequency: text(row.extra_work_frequency),
    problems_obstacles: text(row.problems_obstacles),
    annual_family_income: num(row.annual_family_income),
    family_work_assistance: text(row.family_work_assistance),
    welfare: text(row.welfare),
    contactable_guardian: text(row.contactable_guardian),
    family_members: family,
    friend_name_1: text(row.friend_name_1),
    friend_name_2: text(row.friend_name_2),
    health_status: text(row.health_status),
    health_details: text(row.health_details),
    other_benefits: text(row.other_benefits),
    benefit_period: text(row.benefit_period),
    average_gpa: gpa,
    gpa,
    job_history: text(row.job_history),
    remaining_budget: num(row.remaining_budget),
    disbursed: num(row.disbursed),
    tuition_fee_disbursed: num(row.tuition_fee_disbursed),
    individual_disbursement: num(row.individual_disbursement),
    total_scholarship: num(row.total_scholarship),
    origin_school: text(row.origin_school),
    scholarship_origin: text(row.scholarship_origin),
    notes: text(row.notes),
  };
}

async function fetchFamilyByStudentIds(
  studentIds: string[]
): Promise<Map<string, ScholarshipFamilyMember[]>> {
  const map = new Map<string, ScholarshipFamilyMember[]>();
  const unique = [...new Set(studentIds.filter(Boolean))];
  if (!unique.length) return map;
  try {
    const supabase = createAnonClient();
    // Chunk .in() queries to avoid URL limits
    const chunkSize = 200;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('scholarship_family_members')
        .select(FAMILY_SELECT)
        .in('student_id', chunk)
        .order('sort_order', { ascending: true });
      if (error || !data) continue;
      for (const row of data as unknown as Record<string, unknown>[]) {
        const sid = String(row.student_id);
        const list = map.get(sid) ?? [];
        list.push(mapFamily(row));
        map.set(sid, list);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function fetchScholarshipStudents(): Promise<ScholarshipStudent[]> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('scholarship_students')
      .select(STUDENT_SELECT)
      .order('full_name', { ascending: true });
    if (error || !data) return [];
    const rows = data as unknown as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.id));
    const familyMap = await fetchFamilyByStudentIds(ids);
    return rows.map((r) => mapStudent(r, familyMap.get(String(r.id)) ?? []));
  } catch {
    return [];
  }
}

export async function fetchScholarshipStudentById(
  id: string
): Promise<ScholarshipStudent | null> {
  const sid = id.trim();
  if (!sid) return null;
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('scholarship_students')
      .select(STUDENT_SELECT)
      .eq('id', sid)
      .maybeSingle();
    if (error || !data) return null;
    const familyMap = await fetchFamilyByStudentIds([sid]);
    return mapStudent(
      data as unknown as Record<string, unknown>,
      familyMap.get(sid) ?? []
    );
  } catch {
    return null;
  }
}

export async function fetchScholarshipStudentsBySchoolId(
  schoolId: string | number
): Promise<ScholarshipStudent[]> {
  const sid = String(schoolId).trim();
  if (!sid) return [];
  const n = Number(sid);
  if (!Number.isFinite(n)) return [];
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('scholarship_students')
      .select(STUDENT_SELECT)
      .eq('school_id', n)
      .order('full_name', { ascending: true });
    if (error || !data) return [];
    const rows = data as unknown as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.id));
    const familyMap = await fetchFamilyByStudentIds(ids);
    return rows.map((r) => mapStudent(r, familyMap.get(String(r.id)) ?? []));
  } catch {
    return [];
  }
}
