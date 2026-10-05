import type { UserRole } from '@/lib/types';

export const AUTH_SESSION_COOKIE = 'coned-auth-session';
export const AUTH_CREDENTIALS_COOKIE = 'coned-auth-credentials';
export const AUTH_USERS_COOKIE = 'coned-auth-users';
export const SITE_SETTINGS_COOKIE = 'coned-site-settings';
export const CALENDAR_EVENTS_COOKIE = 'coned-calendar-events';
export const SCHOOL_EXTRAS_COOKIE = 'coned-school-extras';

export interface MockUserSeed {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: UserRole;
  /** Comma-separated Gov_Domain.area_id values for staff scope */
  assigned_zone: string | null;
  password: string | null;
  tempPassword: string | null;
  mustChangePassword: boolean;
  disabled?: boolean;
}

/**
 * Four mock accounts for local RBAC / login testing.
 * Staff starts with OTP-only (TempStaff01) → forced password change on first login.
 * assigned_zone stores area_id values (Educational Area), not province names.
 */
export const MOCK_USER_SEEDS: MockUserSeed[] = [
  {
    id: 'mock-global',
    email: 'guest@coned.local',
    full_name: 'ผู้เยี่ยมชม ระบบ',
    position: 'สาธารณะ',
    role: 'global',
    assigned_zone: null,
    password: 'Guest123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: 'mock-staff',
    email: 'staff@coned.local',
    full_name: 'สมชาย ใจดี',
    position: 'เจ้าหน้าที่เขตพื้นที่',
    role: 'staff',
    assigned_zone: null,
    password: null,
    tempPassword: 'TempStaff01',
    mustChangePassword: true,
  },
  {
    id: 'mock-overseer',
    email: 'overseer@coned.local',
    full_name: 'วิภาดา ศรีสุข',
    position: 'ผู้จัดการเขตพื้นที่',
    role: 'overseer',
    assigned_zone: null,
    password: 'Overseer123!',
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: 'mock-admin',
    email: 'admin@coned.local',
    full_name: 'อรรถพล ระบบดี',
    position: 'ผู้ดูแลระบบ',
    role: 'admin',
    assigned_zone: null,
    password: 'Admin123!',
    tempPassword: null,
    mustChangePassword: false,
  },
];

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
  mustChangePassword: boolean;
  authVia: 'password' | 'temp';
}

export type StoredUserProfile = {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: UserRole;
  assigned_zone: string | null;
  disabled: boolean;
};

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
  /** scheduled = นัดหมายแล้ว, completed = เยี่ยมชมเสร็จสิ้น */
  status?: 'scheduled' | 'completed';
  /** Thai status label for UI / Supabase */
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

/** Hero is shown ONLY on landing, school list, and map */
export function shouldShowHero(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/schools') return true;
  if (pathname === '/thailand-map') return true;
  return false;
}

/** @deprecated use shouldShowHero — kept for older imports */
export function shouldHideHero(pathname: string): boolean {
  return !shouldShowHero(pathname);
}

export const DROPDOWN_ONLY_HREFS = new Set(['/staff/profile', '/admin/settings']);
export const STAFF_DROPDOWN_HREFS = new Set(['/manage-schools']);

export function parseAreaIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);
}
