export type UserRole =
  | 'guest'
  | 'staff'
  | 'overseer'
  | 'super_overseer'
  | 'admin'
  | 'super_admin';

/** @deprecated use guest — kept for old cookie sessions */
export type LegacyUserRole = UserRole | 'global';

export type SchoolSize = 'เล็ก' | 'กลาง' | 'ใหญ่' | 'ใหญ่พิเศษ';

export interface PillarScores {
  learner: number;
  participation: number;
  teacherAdmin: number;
  curriculum: number;
  infrastructure: number;
}

/** 3-pillar scores 0–100 from school_pillar_scores */
export interface ThreePillarScores {
  qualitySchool: number;
  qualityGraduation: number;
  disciplineMorality: number;
  overall: number;
}

export interface SchoolFull {
  school_id: string | number;
  school_name_th: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  moo?: string | number;
  village_name?: string;
  area_id?: string;
  area_name?: string;
  zone?: string;
  zipcode?: string | number;
  phone?: string;
  school_size?: SchoolSize | string;
  area_special?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  director_name?: string;
  scores?: Record<string, number | string>;
  pillarScores?: PillarScores;
  threePillarScores?: ThreePillarScores;
  /** Prior-year 3-pillar scores for YoY (exact year; null if missing) */
  threePillarScoresPrevious?: ThreePillarScores | null;
  overallScore?: number;
  /** Prior-year SMS row for YoY spider / total compare */
  School_Score_Previous?: Record<string, number | string> | null;
  lastActivityAt?: string | null;
  /** Derived from calendar bookings / last activity */
  visitStatus?: 'never' | 'planned' | 'visited';
  /**
   * Optional uploaded cover (Supabase Storage public URL or path).
   * When empty, UI uses `/images/school_default.jpg`.
   */
  coverImageUrl?: string | null;
  studentSummary?: {
    totalStudents: number;
    totalMale?: number;
    totalFemale?: number;
  };
  personnelSummary?: {
    totalPersonnel: number;
    teacherDirector?: number;
  };
  labelLookup?: Record<string, string>;
  School_Score?: Record<string, number | string>;
  School_People?: Record<string, number | string>;
  Gov_Domain?: { area_id?: string; area_name?: string };
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  /** Honorific / prefix for greetings; blank → "คุณ" */
  name_prefix?: string | null;
  position: string | null;
  role: UserRole;
  /** @deprecated legacy educational area ids */
  assigned_zone: string | null;
  assigned_provinces: string[];
  /**
   * Staff scope keys:
   * - preferred: Gov_Domain `area_id` (เขตพื้นที่การศึกษา)
   * - legacy: `province|district`
   */
  assigned_districts: string[];
  reports_to: string | null;
  avatar_url: string | null;
  /** ISO date `YYYY-MM-DD` for birthday flower on dashboard */
  birthday?: string | null;
  updated_at?: string;
}

export interface SchoolVisitLog {
  id: number;
  school_id: number;
  staff_id: string;
  visit_date: string;
  survey_status: 'Active' | 'Surveyed' | 'Pending' | 'Inactive';
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
  end?: boolean;
}

export const ALL_ROLES: UserRole[] = [
  'guest',
  'staff',
  'overseer',
  'super_overseer',
  'admin',
  'super_admin',
];

export const FIELD_ROLES: UserRole[] = ['staff', 'overseer', 'super_overseer'];
export const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin'];
export const PUBLIC_ROLES: UserRole[] = [
  'guest',
  'staff',
  'overseer',
  'super_overseer',
  'admin',
  'super_admin',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: 'ผู้เยี่ยมชม (Guest)',
  staff: 'ศึกษานิเทศก์',
  overseer: 'อาสาสมัคร/องคมนตรี',
  super_overseer: 'ผู้กำกับดูแลสูงสุด',
  admin: 'ผู้ดูแลระบบ (Admin)',
  super_admin: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
};

export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'global') return 'guest';
  if (role && (ALL_ROLES as string[]).includes(role)) return role as UserRole;
  return 'guest';
}

export function districtKey(province: string, district: string): string {
  return `${province.trim()}|${district.trim()}`;
}

export function parseDistrictKey(key: string): { province: string; district: string } {
  const [province = '', district = ''] = key.split('|');
  return { province, district };
}

export const NAV_CATALOG: NavItem[] = [
  { href: '/', label: 'หน้าหลัก', roles: PUBLIC_ROLES, end: true },
  { href: '/about', label: 'เกี่ยวกับโครงการ', roles: PUBLIC_ROLES },
  { href: '/pillars', label: 'ภาพรวม 3 เสาหลัก', roles: PUBLIC_ROLES },
  { href: '/strategy', label: 'ผลการประเมินตามระบบ SMS', roles: PUBLIC_ROLES },
  { href: '/thailand-map', label: 'แผนที่', roles: PUBLIC_ROLES },
  { href: '/schools', label: 'โรงเรียนในโครงการ', roles: PUBLIC_ROLES },
  { href: '/dashboard', label: 'แดชบอร์ด', roles: FIELD_ROLES },
  { href: '/calendar', label: 'สรุปปฏิทิน', roles: FIELD_ROLES },
  { href: '/calendar/new', label: 'สร้างนัดหมาย', roles: FIELD_ROLES },
  { href: '/reports/new', label: 'ส่งรายงาน', roles: FIELD_ROLES },
  { href: '/reports', label: 'ดูผลรายงาน', roles: FIELD_ROLES },
  { href: '/tickets', label: 'คำขอแก้ไขข้อมูล', roles: FIELD_ROLES },
  { href: '/admin/accounts', label: 'จัดการบัญชี', roles: ADMIN_ROLES },
  { href: '/admin/domain', label: 'มอบหมายพื้นที่จัดการ', roles: ADMIN_ROLES },
  { href: '/admin/schools', label: 'แก้ไขข้อมูลโรงเรียน', roles: ADMIN_ROLES },
  { href: '/admin/tickets', label: 'จัดการคำขอ', roles: ADMIN_ROLES },
  { href: '/admin/settings', label: 'ตั้งค่าระบบ', roles: ['super_admin'] },
];

export const PAGE_BANNERS = {
  landing: '/images/banners/banner_landing.jpg',
  about: '/images/banners/banner_about.jpg',
  strategy: '/images/banners/banner_strategy.jpg',
  schools: '/images/banners/banner_schools.jpg',
  pillars: '/images/banners/banner_strategy.jpg',
  calendar: '/images/banners/banner_schools.jpg',
  reports: '/images/banners/banner_schools.jpg',
} as const;

/** Fixed report subject guides (locked labels; user fills details under each) */
export const REPORT_SUBJECTS = [
  { key: 'good', label: 'ส่วนที่ดี' },
  { key: 'improve', label: 'ส่วนที่ต้องปรับปรุง' },
  { key: 'suggest', label: 'ข้อเสนอแนะ' },
  { key: 'praise', label: 'ชื่นชม' },
] as const;

/** @deprecated kept for display of legacy tagged comments */
export const REPORT_HASHTAGS = REPORT_SUBJECTS.map((s) => s.label);

/** Default school photo (individual uploads override via `coverImageUrl`) */
export const SCHOOL_DEFAULT_IMAGE = '/images/school_default.jpg';

export function navForRole(role: UserRole): NavItem[] {
  const r = normalizeRole(role);
  const seen = new Set<string>();
  return NAV_CATALOG.filter((item) => {
    if (!item.roles.includes(r)) return false;
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

export const PROTECTED_ROUTES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/staff/profile', roles: [...FIELD_ROLES, ...ADMIN_ROLES] },
  { prefix: '/staff', roles: FIELD_ROLES },
  { prefix: '/dashboard', roles: FIELD_ROLES },
  { prefix: '/calendar', roles: FIELD_ROLES },
  { prefix: '/reports', roles: FIELD_ROLES },
  { prefix: '/tickets', roles: [...FIELD_ROLES, ...ADMIN_ROLES] },
  { prefix: '/overseer', roles: ['overseer', 'super_overseer'] },
  { prefix: '/admin', roles: ADMIN_ROLES },
  { prefix: '/manage-schools', roles: ADMIN_ROLES },
  { prefix: '/change-password', roles: ALL_ROLES },
];

export function rolesForPath(pathname: string): UserRole[] | null {
  const ordered = [...PROTECTED_ROUTES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of ordered) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.roles;
    }
  }
  return null;
}
