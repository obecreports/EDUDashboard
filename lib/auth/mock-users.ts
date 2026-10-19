import type { OverseerTier, UserRole } from '@/lib/types';
import { normalizeOverseerTier, normalizeRole } from '@/lib/types';

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
  /** Thai salutation / rank (คำนำหน้า) */
  name_prefix?: string | null;
  position: string;
  role: UserRole;
  /** type1 for OS*; type2 for sub-overseer; omit for non-overseer */
  overseer_tier?: OverseerTier | null;
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
/** Shared UAT / mock first-login password */
export const MOCK_LOGIN_PASSWORD = 'login1234';

/** Admin-only password (not shown on login tips) */
export const ADMIN_LOGIN_PASSWORD = 'Admin123456';

export const UAT_USER_IDS = {
  staff: 'a1111111-1111-4111-8111-111111111101',
  staff2: 'a1111111-1111-4111-8111-111111111102',
  /** @deprecated AS01 removed from mock seeds — UUID kept for legacy FKs */
  volunteer: 'a1111111-1111-4111-8111-111111111103',
  /** @deprecated same as volunteer */
  overseer: 'a1111111-1111-4111-8111-111111111103',
  /** sirdawpong · boss (super_overseer) */
  super_overseer: 'a1111111-1111-4111-8111-111111111104',
  /** sirthanu · ดร.ธนุ วงษ์จินดา */
  super_overseer2: 'a1111111-1111-4111-8111-111111111107',
  admin: 'a1111111-1111-4111-8111-111111111105',
  super_admin: 'a1111111-1111-4111-8111-111111111106',
  /** OS01–OS14 · Type 1 underboss (migration 014) */
  os01: 'a1111111-1111-4111-8111-111111111201',
  os02: 'a1111111-1111-4111-8111-111111111202',
  os03: 'a1111111-1111-4111-8111-111111111203',
  os04: 'a1111111-1111-4111-8111-111111111204',
  os05: 'a1111111-1111-4111-8111-111111111205',
  os06: 'a1111111-1111-4111-8111-111111111206',
  os07: 'a1111111-1111-4111-8111-111111111207',
  os08: 'a1111111-1111-4111-8111-111111111208',
  os09: 'a1111111-1111-4111-8111-111111111209',
  os10: 'a1111111-1111-4111-8111-111111111210',
  os11: 'a1111111-1111-4111-8111-111111111211',
  os12: 'a1111111-1111-4111-8111-111111111212',
  os13: 'a1111111-1111-4111-8111-111111111213',
  os14: 'a1111111-1111-4111-8111-111111111214',
  /** OS10T01 · Type 2 underboss assist under OS10 (migration 020) */
  os10t01: 'a1111111-1111-4111-8111-111111111301',
} as const;

/**
 * Demo / UAT accounts — `email` stores short login ID (not a mailbox).
 * Hierarchy: SO (boss) → OS Type1 (underboss) ← staff via Gov district/province;
 * Type 2 (assist) also under Type 1 — staff does not reports_to Type 2.
 * Password: MOCK_LOGIN_PASSWORD. Profiles also live in Supabase (014/020).
 */
export const MOCK_USER_SEEDS: MockUserSeed[] = [
  {
    id: UAT_USER_IDS.staff,
    email: 'staff03',
    full_name: 'วิชัย ใฝ่รู้',
    position: 'ศึกษานิเทศก์',
    role: 'staff',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.os10,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
    birthday: '1990-10-10',
  },
  {
    id: UAT_USER_IDS.staff2,
    email: 'staff04',
    full_name: 'ปัญญา มีสุข',
    position: 'ศึกษานิเทศก์',
    role: 'staff',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.os10,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.super_overseer,
    email: 'sirdawpong',
    name_prefix: 'พลเอก',
    full_name: 'ดาว์พงษ์ รัตนสุวรรณ',
    position: 'ผู้กำกับดูแลสูงสุด',
    role: 'super_overseer',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.super_overseer2,
    email: 'sirthanu',
    name_prefix: 'ดร.',
    full_name: 'ธนุ วงษ์จินดา',
    position: 'ผู้กำกับดูแลสูงสุด',
    role: 'super_overseer',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.admin,
    email: 'admin',
    full_name: 'อรรถพล ระบบดี',
    position: 'ผู้ดูแลระบบ',
    role: 'admin',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: ADMIN_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.super_admin,
    email: 'superadmin',
    full_name: 'สุดา ควบคุมทั้งหมด',
    position: 'ผู้ดูแลระบบสูงสุด',
    role: 'super_admin',
    assigned_zone: null,
    assigned_provinces: [],
    assigned_districts: [],
    reports_to: null,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  // —— 14 องคมนตรี (OS01–OS14) ——
  {
    id: UAT_USER_IDS.os01,
    email: 'OS01',
    name_prefix: 'นาย',
    full_name: 'อรรถนิติ ดิษฐอำนาจ',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['ฉะเชิงเทรา', 'สระแก้ว'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os02,
    email: 'OS02',
    name_prefix: 'พลอากาศเอก',
    full_name: 'จอม รุ่งสว่าง',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['บุรีรัมย์', 'ศรีสะเกษ', 'สุรินทร์'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os03,
    email: 'OS03',
    name_prefix: 'นาย',
    full_name: 'นุรักษ์ มาประณีต',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os04,
    email: 'OS04',
    name_prefix: 'พลเอก',
    full_name: 'บัณฑิตย์ มลายอริศูนย์',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['ลพบุรี'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os05,
    email: 'OS05',
    name_prefix: 'นาย',
    full_name: 'เศรษฐพุฒิ สุทธิวาทนฤพุฒิ',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['มุกดาหาร', 'สกลนคร'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os06,
    email: 'OS06',
    name_prefix: 'หม่อมหลวง',
    full_name: 'ปนัดดา ดิศกุล',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['ราชบุรี', 'อุบลราชธานี'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os07,
    email: 'OS07',
    name_prefix: 'พลอากาศเอก',
    full_name: 'ชลิต พุกผาสุข',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['เพชรบุรี', 'ประจวบคีรีขันธ์'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os08,
    email: 'OS08',
    name_prefix: 'พลเอก',
    full_name: 'ประยุทธ์ จันทร์โอชา',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['แพร่', 'น่าน', 'พะเยา'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os09,
    email: 'OS09',
    name_prefix: 'พลเอก',
    full_name: 'ดาว์พงษ์ รัตนสุวรรณ',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['พระนครศรีอยุธยา'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os10,
    email: 'OS10',
    name_prefix: 'พลเอก',
    full_name: 'ไพบูลย์ คุ้มฉายา',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['กาญจนบุรี', 'สุพรรณบุรี', 'อุทัยธานี'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os11,
    email: 'OS11',
    name_prefix: 'พลเอก',
    full_name: 'กัมปนาท รุดดิษฐ์',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['กำแพงเพชร', 'พิษณุโลก'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os12,
    email: 'OS12',
    name_prefix: 'พลเรือเอก',
    full_name: 'พงษ์เทพ หนูเทพ',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['ตาก', 'สุโขทัย', 'อุตรดิตถ์'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os13,
    email: 'OS13',
    name_prefix: 'นาย',
    full_name: 'อำพน กิตติอำพน',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['หนองบัวลำภู', 'อุดรธานี'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
  {
    id: UAT_USER_IDS.os14,
    email: 'OS14',
    name_prefix: 'พลเอก',
    full_name: 'เฉลิมชัย สิทธิสาท',
    position: 'องคมนตรี',
    role: 'overseer',
    assigned_zone: null,
    assigned_provinces: ['นราธิวาส', 'ปัตตานี', 'ยะลา', 'สงขลา'],
    assigned_districts: [],
    reports_to: UAT_USER_IDS.super_overseer,
    password: MOCK_LOGIN_PASSWORD,
    tempPassword: null,
    mustChangePassword: false,
  },
];

/** Normalize login ID for lookup (case-insensitive; strips @domain if pasted). */
export function normalizeLoginId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const local = trimmed.includes('@') ? trimmed.split('@')[0]! : trimmed;
  return local.trim().toLowerCase();
}

export function loginIdsMatch(storedEmail: string, input: string): boolean {
  const a = normalizeLoginId(storedEmail);
  const b = normalizeLoginId(input);
  return Boolean(a) && a === b;
}

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
  overseer_tier?: OverseerTier | null;
  assigned_zone: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
  reports_to: string | null;
  mustChangePassword: boolean;
  authVia: 'password' | 'temp';
  /** ms epoch — refreshed on activity; used for idle logout */
  lastActiveAt?: number;
}

/** Idle logout: 15 min for staff/overseer/volunteer/admin; 30 min for super_overseer */
export const IDLE_MS_DEFAULT = 15 * 60 * 1000;
export const IDLE_MS_SUPER_OVERSEER = 30 * 60 * 1000;

export function idleTimeoutMs(role: UserRole | string | null | undefined): number {
  return role === 'super_overseer' ? IDLE_MS_SUPER_OVERSEER : IDLE_MS_DEFAULT;
}

export type StoredUserProfile = {
  id: string;
  email: string;
  full_name: string;
  name_prefix?: string | null;
  position: string;
  role: UserRole;
  overseer_tier?: OverseerTier | null;
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
  const role = normalizeRole(raw.role);
  const tier =
    role === 'overseer'
      ? normalizeOverseerTier(raw.overseer_tier) ?? 'type1'
      : null;
  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name ?? '',
    name_prefix: prefix,
    position: raw.position ?? '',
    role,
    overseer_tier: tier,
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
  /** Multi-school visit (same province); school_id is primary */
  school_ids?: string[];
  school_names?: string[];
  area_id: string | null;
  area_name: string | null;
  province: string | null;
  /** Multi-select visit reasons; activity is primary/display */
  visit_reasons?: string[];
  /** Team members who see this on their calendar (includes booker) */
  participant_ids?: string[];
  group_id?: string | null;
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

/**
 * Cookie must NOT store full seed map (OS01–OS14 blows past ~2.4KB).
 * Persist only non-seed users and seed accounts whose creds differ from seeds.
 */
export function credentialsOverridesOnly(map: CredentialsMap): CredentialsMap {
  const seeds = seedCredentials();
  const out: CredentialsMap = {};
  for (const [id, state] of Object.entries(map)) {
    const seed = seeds[id];
    if (!seed) {
      out[id] = state;
      continue;
    }
    if (
      state.password !== seed.password ||
      state.tempPassword !== seed.tempPassword ||
      Boolean(state.mustChangePassword) !== Boolean(seed.mustChangePassword)
    ) {
      out[id] = state;
    }
  }
  return out;
}

export function findSeedByEmail(email: string): MockUserSeed | undefined {
  return MOCK_USER_SEEDS.find((u) => loginIdsMatch(u.email, email));
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
