import type { UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/types';

export const AUTH_SESSION_COOKIE = 'coned-auth-session';
export const AUTH_CREDENTIALS_COOKIE = 'coned-auth-credentials';
export const AUTH_USERS_COOKIE = 'coned-auth-users';
export const SITE_SETTINGS_COOKIE = 'coned-site-settings';
/** Bumped to v3 when Cookie header 431s — old v2 payloads are purged in middleware. */
export const CALENDAR_EVENTS_COOKIE = 'coned-calendar-events-v3';
export const SCHOOL_EXTRAS_COOKIE = 'coned-school-extras';
/** Lean comments-only map (keeps report saves under cookie size limits). Bumped to clear mock seeds. */
export const SCHOOL_COMMENTS_COOKIE = 'coned-school-comments-v2';
export const TICKETS_COOKIE = 'coned-tickets';
export const REPORT_DRAFTS_COOKIE = 'coned-report-drafts-v2';

export interface MockUserSeed {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: UserRole;
  assigned_zone: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
  reports_to: string | null;
  password: string | null;
  tempPassword: string | null;
  mustChangePassword: boolean;
  disabled?: boolean;
  /** `YYYY-MM-DD` */
  birthday?: string | null;
}

/**
 * Stable UAT UUIDs — must match supabase/migrations/007_uat_seed_users.sql
 * (auth.users + user_profiles). Schedule / report FKs use these ids.
 */
export const UAT_USER_IDS = {
  staff: 'a1111111-1111-4111-8111-111111111101',
  staff2: 'a1111111-1111-4111-8111-111111111102',
  overseer: 'a1111111-1111-4111-8111-111111111103',
  super_overseer: 'a1111111-1111-4111-8111-111111111104',
  admin: 'a1111111-1111-4111-8111-111111111105',
  super_admin: 'a1111111-1111-4111-8111-111111111106',
} as const;

/**
 * Demo / UAT accounts — passwords verified in-app; profiles live in Supabase.
 * Admin can reassign geo via /admin/domain after seed.
 */
export const MOCK_USER_SEEDS: MockUserSeed[] = [
  {
    id: UAT_USER_IDS.staff,
    email: 'staff@coned.local',
    full_name: 'สมชาย ใจดี',
    position: 'เจ้าหน้าที่อำเภอ',
    role: 'staff',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.overseer,
    password: 'Staff123!',
    tempPassword: null,
    mustChangePassword: false,
    birthday: '1990-10-10',
  },
  {
    id: UAT_USER_IDS.staff2,
    email: 'staff2@coned.local',
    full_name: 'มานี รักงาน',
    position: 'เจ้าหน้าที่อำเภอ',
    role: 'staff',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.overseer,
    password: 'Staff123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.overseer,
    email: 'overseer@coned.local',
    full_name: 'วิภาดา ศรีสุข',
    position: 'ผู้กำกับดูแลจังหวัด',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['กาญจนบุรี'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: 'Overseer123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.super_overseer,
    email: 'super@coned.local',
    full_name: 'กิตติศักดิ์ ใหญ่ใหญ่',
    position: 'ผู้กำกับดูแลสูงสุด',
    role: 'super_overseer',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: 'Super123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.admin,
    email: 'admin@coned.local',
    full_name: 'อรรถพล ระบบดี',
    position: 'ผู้ดูแลระบบ',
    role: 'admin',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: 'Admin123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.super_admin,
    email: 'superadmin@coned.local',
    full_name: 'สุดา ควบคุมทั้งหมด',
    position: 'ผู้ดูแลระบบสูงสุด',
    role: 'super_admin',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: 'SuperAdmin123!',
    tempPassword: null,
    mustChangePassword: false,
  },
];

/** True when id is a real UUID suitable for Supabase FKs (UAT / production). */
export function isDbUserId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

export type CredentialState = {
  password: string | null;
  tempPassword: string | null;
  mustChangePassword: boolean;
};

export type CredentialsMap = Record<string, CredentialState>;

export interface AuthSession {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: UserRole;
  assigned_zone: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
  reports_to: string | null;
  mustChangePassword: boolean;
  authVia: 'password' | 'temp';
}

export type StoredUserProfile = {
  id: string;
  email: string;
  full_name: string;
  name_prefix?: string | null;
  position: string;
  role: UserRole;
  assigned_zone: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
  reports_to: string | null;
  disabled: boolean;
  birthday?: string | null;
};

export type ReportDraftBox = {
  text: string;
  tags: string[];
};

export type ReportDraft = {
  id: string;
  staff_id: string;
  school_id: string;
  school_name: string;
  province: string;
  district: string;
  report_date: string;
  boxes: ReportDraftBox[];
  updated_at: string;
};

export function normalizeStoredUser(
  raw: Partial<StoredUserProfile> & { id: string; email: string; role: string }
): StoredUserProfile {
  const prefix =
    raw.name_prefix === undefined
      ? null
      : raw.name_prefix == null
        ? null
        : String(raw.name_prefix).trim() || null;
  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name ?? '',
    name_prefix: prefix,
    position: raw.position ?? '',
    role: normalizeRole(raw.role),
    assigned_zone: raw.assigned_zone ?? null,
    assigned_provinces: Array.isArray(raw.assigned_provinces) ? raw.assigned_provinces : [],
    assigned_districts: Array.isArray(raw.assigned_districts) ? raw.assigned_districts : [],
    reports_to: raw.reports_to ?? null,
    disabled: Boolean(raw.disabled),
    birthday: raw.birthday ?? null,
  };
}

export type HeroSiteSettings = {
  site_title: string;
  hero_title: string;
  hero_subtitle: string;
  hero_bg_url: string;
};

export const DEFAULT_HERO_SETTINGS: HeroSiteSettings = {
  site_title: 'ConED · ระบบข้อมูลโรงเรียนในสังกัด',
  hero_title: 'ภาพรวมข้อมูลสถานศึกษา เพื่อการพัฒนาอย่างต่อเนื่อง',
  hero_subtitle:
    'ระบบสารสนเทศเพื่อการบริหารจัดการและติดตามผลการดำเนินงานเครือข่ายโรงเรียน',
  hero_bg_url: '',
};

export type CalendarActivity =
  | 'อื่นๆ'
  | 'Site Visit'
  | 'Survey'
  | 'Follow-up'
  | 'Meeting'
  | 'เยี่ยมชมโรงเรียน'
  | 'สำรวจข้อมูล'
  | 'ติดตามผล'
  | 'ประชุม';

export type StaffCalendarEvent = {
  id: string;
  staff_id: string;
  date: string;
  activity: CalendarActivity;
  school_id: string | null;
  school_name: string | null;
  area_id: string | null;
  area_name: string | null;
  province: string | null;
  notes: string;
  created_at: string;
  status?: 'scheduled' | 'completed';
  status_th?: 'นัดหมายแล้ว' | 'เยี่ยมชมเสร็จสิ้น' | 'ยกเลิก';
};

export function seedCredentials(): CredentialsMap {
  const map: CredentialsMap = {};
  for (const u of MOCK_USER_SEEDS) {
    map[u.id] = {
      password: u.password,
      tempPassword: u.tempPassword,
      mustChangePassword: u.mustChangePassword,
    };
  }
  return map;
}

export function findSeedByEmail(email: string): MockUserSeed | undefined {
  const normalized = email.trim().toLowerCase();
  return MOCK_USER_SEEDS.find((u) => u.email.toLowerCase() === normalized);
}

export function findSeedById(id: string): MockUserSeed | undefined {
  return MOCK_USER_SEEDS.find((u) => u.id === id);
}

export function shouldShowHero(_pathname: string): boolean {
  return false;
}

export function shouldHideHero(pathname: string): boolean {
  return !shouldShowHero(pathname);
}

/** Hrefs that stay out of the main navbar (profile lives in account dropdown) */
export const DROPDOWN_ONLY_HREFS = new Set(['/staff/profile']);

export const STAFF_DROPDOWN_HREFS = new Set<string>([]);

export function parseAreaIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);
}
