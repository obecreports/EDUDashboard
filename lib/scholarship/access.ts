import {
  canAccessSection,
  canModifySensitivity,
  canViewSensitivity,
  type ContentAccessMap,
  type ContentResourceId,
  type SensitivityLevel,
} from '@/lib/auth/content-access';
import type {
  ScholarshipFamilyMember,
  ScholarshipStudent,
} from '@/lib/mock/scholarship-students';
import {
  fieldsForSection,
  metaForKey,
  type ScholarshipFieldKey,
} from '@/lib/scholarship/field-meta';

const STUDENT_SCALAR_KEYS: ScholarshipFieldKey[] = [
  'photo_url',
  'full_name',
  'student_code',
  'grade_level',
  'generation',
  'school_name',
  'status',
  'terminated_remark_1',
  'terminated_remark_2',
  'overseer_level',
  'gender',
  'career_goal',
  'birthday',
  'tribe',
  'address',
  'travel_method',
  'personal_id',
  'can_contact_supervisor',
  'phone',
  'email',
  'facebook',
  'line_id',
  'advisor_name',
  'advisor_phone',
  'supervisor_name',
  'supervisor_phone',
  'educational_risk',
  'behavioral_risk',
  'risk_information',
  'extra_work',
  'extra_work_frequency',
  'problems_obstacles',
  'annual_family_income',
  'family_work_assistance',
  'welfare',
  'contactable_guardian',
  'friend_name_1',
  'friend_name_2',
  'health_status',
  'health_details',
  'other_benefits',
  'benefit_period',
  'average_gpa',
  'job_history',
  'remaining_budget',
  'disbursed',
  'tuition_fee_disbursed',
  'individual_disbursement',
  'total_scholarship',
  'origin_school',
  'scholarship_origin',
];

const FAMILY_KEY_MAP: {
  field: ScholarshipFieldKey;
  prop: keyof ScholarshipFamilyMember;
}[] = [
  { field: 'fm_relationship', prop: 'relationship' },
  { field: 'fm_full_name', prop: 'full_name' },
  { field: 'fm_age', prop: 'age' },
  { field: 'fm_race', prop: 'race' },
  { field: 'fm_nationality', prop: 'nationality' },
  { field: 'fm_tribe', prop: 'tribe' },
  { field: 'fm_highest_education', prop: 'highest_education' },
  { field: 'fm_occupation', prop: 'occupation' },
  { field: 'fm_monthly_income', prop: 'monthly_income' },
  { field: 'fm_current_address', prop: 'current_address' },
  { field: 'fm_national_id', prop: 'national_id' },
  { field: 'fm_phone', prop: 'phone' },
];

export function canViewScholarshipField(
  role: string | null | undefined,
  key: ScholarshipFieldKey,
  map: ContentAccessMap
): boolean {
  const meta = metaForKey(key);
  if (!meta) return false;
  if (
    !canAccessSection(role, 'scholarship_students', meta.section, 'view', map)
  ) {
    return false;
  }
  return canViewSensitivity(role, meta.section, meta.sensitivity, map);
}

export function canModifyScholarshipField(
  role: string | null | undefined,
  key: ScholarshipFieldKey,
  map: ContentAccessMap
): boolean {
  const meta = metaForKey(key);
  if (!meta) return false;
  if (
    !canAccessSection(role, 'scholarship_students', meta.section, 'modify', map)
  ) {
    return false;
  }
  return canModifySensitivity(role, meta.section, meta.sensitivity, map);
}

export function anyScholarshipFieldModifiable(
  role: string | null | undefined,
  map: ContentAccessMap
): boolean {
  return STUDENT_SCALAR_KEYS.some((k) =>
    canModifyScholarshipField(role, k, map)
  ) ||
    FAMILY_KEY_MAP.some(({ field }) =>
      canModifyScholarshipField(role, field, map)
    );
}

/** Strip fields the role cannot view before sending to the client. */
export function redactScholarshipStudent(
  student: ScholarshipStudent,
  role: string | null | undefined,
  map: ContentAccessMap
): ScholarshipStudent {
  const out: ScholarshipStudent = {
    ...student,
    family_members: student.family_members.map((m) => ({ ...m })),
  };

  for (const key of STUDENT_SCALAR_KEYS) {
    if (canViewScholarshipField(role, key, map)) continue;
    if (key === 'full_name') continue; // always keep display name shell
    if (key === 'student_code') continue;
    if (key === 'status') continue;
    if (key === 'school_name') continue;
    if (key === 'grade_level') continue;
    (out as Record<string, unknown>)[key] = undefined;
  }

  // Sync legacy gpa
  if (out.average_gpa == null) out.gpa = undefined;
  else out.gpa = out.average_gpa;

  out.family_members = out.family_members.map((member) => {
    const next: ScholarshipFamilyMember = { id: member.id, relationship: '', full_name: '' };
    for (const { field, prop } of FAMILY_KEY_MAP) {
      if (!canViewScholarshipField(role, field, map)) continue;
      (next as Record<string, unknown>)[prop] = member[prop];
    }
    if (!next.full_name) next.full_name = '—';
    if (!next.relationship) next.relationship = '—';
    return next;
  });

  // Drop family cards if no L1 name/relationship visible and nothing else
  const canSeeFamilyCard =
    canViewScholarshipField(role, 'fm_full_name', map) ||
    canViewScholarshipField(role, 'fm_relationship', map);
  if (!canSeeFamilyCard) {
    out.family_members = [];
  }

  return out;
}

export function visibleFieldsInSection(
  section: ContentResourceId,
  role: string | null | undefined,
  map: ContentAccessMap,
  opts?: { familyMember?: boolean }
) {
  return fieldsForSection(section, opts).filter((f) =>
    canViewScholarshipField(role, f.key, map)
  );
}

export function editableFieldKeys(
  role: string | null | undefined,
  map: ContentAccessMap
): ScholarshipFieldKey[] {
  return [
    ...STUDENT_SCALAR_KEYS.filter((k) =>
      canModifyScholarshipField(role, k, map)
    ),
    ...FAMILY_KEY_MAP.map((x) => x.field).filter((k) =>
      canModifyScholarshipField(role, k, map)
    ),
  ];
}

export function visibleFieldKeys(
  role: string | null | undefined,
  map: ContentAccessMap
): ScholarshipFieldKey[] {
  const all = [
    ...STUDENT_SCALAR_KEYS,
    ...FAMILY_KEY_MAP.map((x) => x.field),
  ];
  return all.filter((k) => canViewScholarshipField(role, k, map));
}

export function fieldSensitivity(
  key: ScholarshipFieldKey
): SensitivityLevel | null {
  return metaForKey(key)?.sensitivity ?? null;
}
