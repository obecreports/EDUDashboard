import type {
  ContentResourceId,
  SensitivityLevel,
} from '@/lib/auth/content-access';

export type ScholarshipFieldKey =
  // banner
  | 'photo_url'
  | 'full_name'
  | 'student_code'
  | 'grade_level'
  | 'generation'
  | 'school_name'
  | 'status'
  | 'terminated_remark_1'
  | 'terminated_remark_2'
  | 'overseer_level'
  // general
  | 'gender'
  | 'career_goal'
  | 'birthday'
  | 'tribe'
  | 'address'
  | 'travel_method'
  | 'personal_id'
  // contact
  | 'can_contact_supervisor'
  | 'phone'
  | 'email'
  | 'facebook'
  | 'line_id'
  // teacher
  | 'advisor_name'
  | 'advisor_phone'
  | 'supervisor_name'
  | 'supervisor_phone'
  // behavior
  | 'educational_risk'
  | 'behavioral_risk'
  | 'risk_information'
  | 'extra_work'
  | 'extra_work_frequency'
  | 'problems_obstacles'
  // family household
  | 'annual_family_income'
  | 'family_work_assistance'
  | 'welfare'
  | 'contactable_guardian'
  // family member
  | 'fm_relationship'
  | 'fm_full_name'
  | 'fm_age'
  | 'fm_race'
  | 'fm_nationality'
  | 'fm_tribe'
  | 'fm_highest_education'
  | 'fm_occupation'
  | 'fm_monthly_income'
  | 'fm_current_address'
  | 'fm_national_id'
  | 'fm_phone'
  // friends
  | 'friend_name_1'
  | 'friend_name_2'
  // health
  | 'health_status'
  | 'health_details'
  | 'other_benefits'
  | 'benefit_period'
  // performance
  | 'average_gpa'
  | 'job_history'
  // fund
  | 'remaining_budget'
  | 'disbursed'
  | 'tuition_fee_disbursed'
  | 'individual_disbursement'
  | 'total_scholarship'
  // project
  | 'origin_school'
  | 'scholarship_origin';

export type ScholarshipFieldMeta = {
  key: ScholarshipFieldKey;
  label: string;
  section: ContentResourceId;
  sensitivity: SensitivityLevel;
  /** Family-member-only field */
  familyMember?: boolean;
};

export const SCHOLARSHIP_FIELD_META: ScholarshipFieldMeta[] = [
  // Banner — Level 1
  { key: 'photo_url', label: 'รูปโปรไฟล์', section: 'ss_banner', sensitivity: 1 },
  { key: 'full_name', label: 'ชื่อ-นามสกุล', section: 'ss_banner', sensitivity: 1 },
  { key: 'student_code', label: 'รหัสนักเรียน', section: 'ss_banner', sensitivity: 1 },
  { key: 'grade_level', label: 'ชั้นเรียน', section: 'ss_banner', sensitivity: 1 },
  { key: 'generation', label: 'รุ่นที่', section: 'ss_banner', sensitivity: 1 },
  { key: 'school_name', label: 'โรงเรียนปัจจุบัน', section: 'ss_banner', sensitivity: 1 },
  { key: 'status', label: 'สถานะ', section: 'ss_banner', sensitivity: 1 },
  {
    key: 'terminated_remark_1',
    label: 'หมายเหตุการพ้นสภาพ 1',
    section: 'ss_banner',
    sensitivity: 1,
  },
  {
    key: 'terminated_remark_2',
    label: 'หมายเหตุการพ้นสภาพ 2',
    section: 'ss_banner',
    sensitivity: 1,
  },
  {
    key: 'overseer_level',
    label: 'ระดับผู้ดูแล',
    section: 'ss_banner',
    sensitivity: 1,
  },
  // General
  { key: 'gender', label: 'เพศ', section: 'ss_general', sensitivity: 1 },
  { key: 'career_goal', label: 'เป้าหมายอาชีพ', section: 'ss_general', sensitivity: 1 },
  { key: 'birthday', label: 'วันเกิด', section: 'ss_general', sensitivity: 2 },
  { key: 'tribe', label: 'เผ่า', section: 'ss_general', sensitivity: 2 },
  { key: 'address', label: 'ที่อยู่', section: 'ss_general', sensitivity: 2 },
  {
    key: 'travel_method',
    label: 'วิธีการเดินทาง',
    section: 'ss_general',
    sensitivity: 2,
  },
  {
    key: 'personal_id',
    label: 'เลขประจำตัวประชาชน',
    section: 'ss_general',
    sensitivity: 3,
  },
  // Contact
  {
    key: 'can_contact_supervisor',
    label: 'สามารถติดต่อผู้ดูแลได้',
    section: 'ss_contact',
    sensitivity: 2,
  },
  { key: 'phone', label: 'โทรศัพท์', section: 'ss_contact', sensitivity: 3 },
  { key: 'email', label: 'อีเมล', section: 'ss_contact', sensitivity: 3 },
  { key: 'facebook', label: 'Facebook', section: 'ss_contact', sensitivity: 3 },
  { key: 'line_id', label: 'Line', section: 'ss_contact', sensitivity: 3 },
  // Teacher
  { key: 'advisor_name', label: 'ชื่ออาจารย์ที่ปรึกษา', section: 'ss_teacher', sensitivity: 1 },
  {
    key: 'advisor_phone',
    label: 'โทรศัพท์อาจารย์ที่ปรึกษา',
    section: 'ss_teacher',
    sensitivity: 2,
  },
  {
    key: 'supervisor_name',
    label: 'ชื่อผู้ดูแล',
    section: 'ss_teacher',
    sensitivity: 1,
  },
  {
    key: 'supervisor_phone',
    label: 'โทรศัพท์ผู้ดูแล',
    section: 'ss_teacher',
    sensitivity: 2,
  },
  // Behavior
  {
    key: 'educational_risk',
    label: 'ความเสี่ยงด้านการศึกษา',
    section: 'ss_behavior',
    sensitivity: 2,
  },
  {
    key: 'behavioral_risk',
    label: 'ความเสี่ยงด้านพฤติกรรม',
    section: 'ss_behavior',
    sensitivity: 2,
  },
  {
    key: 'risk_information',
    label: 'ข้อมูลความเสี่ยง',
    section: 'ss_behavior',
    sensitivity: 2,
  },
  { key: 'extra_work', label: 'งานพิเศษ', section: 'ss_behavior', sensitivity: 2 },
  {
    key: 'extra_work_frequency',
    label: 'ความถี่งานพิเศษ',
    section: 'ss_behavior',
    sensitivity: 2,
  },
  {
    key: 'problems_obstacles',
    label: 'ปัญหาและอุปสรรค',
    section: 'ss_behavior',
    sensitivity: 2,
  },
  // Family household
  {
    key: 'annual_family_income',
    label: 'รายได้ครอบครัวต่อปี',
    section: 'ss_family',
    sensitivity: 2,
  },
  {
    key: 'family_work_assistance',
    label: 'การช่วยงานครอบครัว',
    section: 'ss_family',
    sensitivity: 2,
  },
  { key: 'welfare', label: 'สวัสดิการ', section: 'ss_family', sensitivity: 2 },
  {
    key: 'contactable_guardian',
    label: 'ผู้ปกครองที่ติดต่อได้',
    section: 'ss_family',
    sensitivity: 2,
  },
  // Family member
  {
    key: 'fm_relationship',
    label: 'ความสัมพันธ์',
    section: 'ss_family',
    sensitivity: 1,
    familyMember: true,
  },
  {
    key: 'fm_full_name',
    label: 'ชื่อ-นามสกุล',
    section: 'ss_family',
    sensitivity: 1,
    familyMember: true,
  },
  {
    key: 'fm_age',
    label: 'อายุ',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_race',
    label: 'เชื้อชาติ',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_nationality',
    label: 'สัญชาติ',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_tribe',
    label: 'เผ่า',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_highest_education',
    label: 'การศึกษาสูงสุด',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_occupation',
    label: 'อาชีพ',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_monthly_income',
    label: 'รายได้ต่อเดือน',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_current_address',
    label: 'ที่อยู่ปัจจุบัน',
    section: 'ss_family',
    sensitivity: 2,
    familyMember: true,
  },
  {
    key: 'fm_national_id',
    label: 'เลขประจำตัวประชาชน',
    section: 'ss_family',
    sensitivity: 3,
    familyMember: true,
  },
  {
    key: 'fm_phone',
    label: 'เบอร์โทรศัพท์',
    section: 'ss_family',
    sensitivity: 3,
    familyMember: true,
  },
  // Friends
  { key: 'friend_name_1', label: 'ชื่อเพื่อน 1', section: 'ss_friends', sensitivity: 2 },
  { key: 'friend_name_2', label: 'ชื่อเพื่อน 2', section: 'ss_friends', sensitivity: 2 },
  // Health
  { key: 'health_status', label: 'สถานะสุขภาพ', section: 'ss_health', sensitivity: 2 },
  {
    key: 'health_details',
    label: 'รายละเอียดสุขภาพ',
    section: 'ss_health',
    sensitivity: 2,
  },
  {
    key: 'other_benefits',
    label: 'สิทธิประโยชน์อื่น',
    section: 'ss_health',
    sensitivity: 2,
  },
  {
    key: 'benefit_period',
    label: 'ระยะเวลาสิทธิประโยชน์',
    section: 'ss_health',
    sensitivity: 2,
  },
  // Performance
  {
    key: 'average_gpa',
    label: 'เกรดเฉลี่ย',
    section: 'ss_performance',
    sensitivity: 1,
  },
  {
    key: 'job_history',
    label: 'ประวัติการทำงาน',
    section: 'ss_performance',
    sensitivity: 2,
  },
  // Fund
  {
    key: 'remaining_budget',
    label: 'งบคงเหลือ',
    section: 'ss_fund',
    sensitivity: 2,
  },
  { key: 'disbursed', label: 'เบิกจ่ายแล้ว', section: 'ss_fund', sensitivity: 2 },
  {
    key: 'tuition_fee_disbursed',
    label: 'ค่าเล่าเรียน (เบิกแล้ว)',
    section: 'ss_fund',
    sensitivity: 2,
  },
  {
    key: 'individual_disbursement',
    label: 'การเบิกจ่ายรายบุคคล',
    section: 'ss_fund',
    sensitivity: 2,
  },
  {
    key: 'total_scholarship',
    label: 'ทุนรวม',
    section: 'ss_fund',
    sensitivity: 2,
  },
  // Project
  {
    key: 'origin_school',
    label: 'โรงเรียนต้นทาง',
    section: 'ss_project',
    sensitivity: 1,
  },
  {
    key: 'scholarship_origin',
    label: 'ที่มาของทุน',
    section: 'ss_project',
    sensitivity: 2,
  },
];

export const SCHOLARSHIP_SECTION_ORDER: ContentResourceId[] = [
  'ss_general',
  'ss_contact',
  'ss_teacher',
  'ss_performance',
  'ss_behavior',
  'ss_health',
  'ss_fund',
  'ss_project',
  'ss_friends',
  'ss_family',
];

export const SCHOLARSHIP_SECTION_LABEL: Partial<
  Record<ContentResourceId, string>
> = Object.fromEntries(
  SCHOLARSHIP_FIELD_META.map((f) => [f.section, f.section])
);

export function fieldsForSection(
  section: ContentResourceId,
  opts?: { familyMember?: boolean }
): ScholarshipFieldMeta[] {
  return SCHOLARSHIP_FIELD_META.filter((f) => {
    if (f.section !== section) return false;
    if (opts?.familyMember === true) return !!f.familyMember;
    if (opts?.familyMember === false) return !f.familyMember;
    return true;
  });
}

export function metaForKey(
  key: ScholarshipFieldKey
): ScholarshipFieldMeta | undefined {
  return SCHOLARSHIP_FIELD_META.find((f) => f.key === key);
}
