import type { UserRole } from '@/lib/types';
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLES,
  FIELD_ROLES,
  normalizeRole,
} from '@/lib/types';

/** Access depth for a content resource */
export type AccessLevel = 'none' | 'view' | 'modify';

/** Field sensitivity tags on data fields (L1–L3) */
export type SensitivityLevel = 1 | 2 | 3;

/**
 * Page-level visibility clearance.
 * 0 = มองไม่เห็น (no sensitive fields); 1–3 = view up to that level.
 */
export type VisibilityLevel = 0 | 1 | 2 | 3;

export type TieredAccessCell = {
  access: AccessLevel;
  viewUpTo?: VisibilityLevel;
  /** Always synced to viewUpTo when access is modify (edit = view clearance). */
  modifyUpTo?: VisibilityLevel;
};

/** Plain level (legacy) or tiered cell with clearance */
export type ContentAccessCell = AccessLevel | TieredAccessCell;

export type ContentResourceId =
  | 'home'
  | 'about'
  | 'project_overview'
  | 'pillars'
  | 'strategy'
  | 'thailand_map'
  | 'schools'
  | 'school_detail'
  | 'dashboard'
  | 'calendar'
  | 'reports'
  | 'scholarship_students'
  | 'contract_teachers'
  | 'tickets'
  | 'volunteers'
  | 'budget'
  // school_detail tabs
  | 'school_tab_overview'
  | 'school_tab_basic'
  | 'school_tab_buildings'
  | 'school_tab_location'
  | 'school_tab_swot'
  | 'school_tab_visits'
  | 'school_tab_reports'
  | 'school_tab_calendar'
  | 'school_tab_budget'
  | 'school_tab_pillars'
  | 'school_tab_scores'
  | 'school_tab_people'
  | 'school_tab_scholarship'
  | 'school_tab_contract_teachers'
  // page sections
  | 'dashboard_activity'
  | 'dashboard_radar'
  | 'calendar_view'
  | 'calendar_create'
  | 'reports_list'
  | 'reports_create'
  // scholarship_students sections
  | 'ss_banner'
  | 'ss_general'
  | 'ss_contact'
  | 'ss_teacher'
  | 'ss_performance'
  | 'ss_behavior'
  | 'ss_health'
  | 'ss_fund'
  | 'ss_project'
  | 'ss_friends'
  | 'ss_family';

export type ContentAccessMap = Record<
  ContentResourceId,
  Partial<Record<UserRole, ContentAccessCell>>
>;

export type ContentPageDef = {
  id: ContentResourceId;
  label: string;
  sections: { id: ContentResourceId; label: string }[];
  /** binary = เข้าถึงได้/ไม่ได้; view_edit = ไม่มี/ดู/แก้ไข */
  accessMode?: 'binary' | 'view_edit';
  /** Page-level visibility dropdown (applies to all children/fields) */
  pageVisibility?: boolean;
  /** Include มองไม่เห็น (0) in visibility options */
  visibilityIncludesHidden?: boolean;
  /** Child rows: binary only when sections present */
  childMode?: 'none' | 'binary';
  /**
   * When accessMode is binary, “เข้าถึงได้” stores `modify` instead of `view`
   * (needed for pages whose write actions check page-level modify).
   */
  binaryStoresModify?: boolean;
  /** @deprecated Prefer pageVisibility — kept for older callers */
  supportsSensitivity?: boolean;
};

const SS_SECTIONS: { id: ContentResourceId; label: string }[] = [
  { id: 'ss_banner', label: 'โปรไฟล์ (แบนเนอร์)' },
  { id: 'ss_general', label: 'ข้อมูลทั่วไป' },
  { id: 'ss_contact', label: 'ติดต่อ' },
  { id: 'ss_teacher', label: 'ครู / ผู้ดูแล' },
  { id: 'ss_performance', label: 'ผลการเรียน' },
  { id: 'ss_behavior', label: 'พฤติกรรม / ความเสี่ยง' },
  { id: 'ss_health', label: 'สุขภาพ' },
  { id: 'ss_fund', label: 'ทุน / การเบิกจ่าย' },
  { id: 'ss_project', label: 'ประวัติโครงการ' },
  { id: 'ss_friends', label: 'เพื่อน' },
  { id: 'ss_family', label: 'ครอบครัว' },
];

const SCHOOL_TAB_SECTIONS: { id: ContentResourceId; label: string }[] = [
  { id: 'school_tab_overview', label: 'ภาพรวม' },
  { id: 'school_tab_scholarship', label: 'นักเรียนทุน' },
  { id: 'school_tab_contract_teachers', label: 'ครูอัตรจ้าง' },
  { id: 'school_tab_budget', label: 'งบสนับสนุน' },
  { id: 'school_tab_buildings', label: 'ข้อมูลสิ่งปลูกสร้าง' },
  { id: 'school_tab_pillars', label: '3 เสาหลัก' },
  { id: 'school_tab_scores', label: 'ผลการประเมินตามระบบ SMS' },
  { id: 'school_tab_swot', label: 'SWOT โรงเรียน' },
  { id: 'school_tab_reports', label: 'บันทึกตรวจเยี่ยม' },
  { id: 'school_tab_calendar', label: 'นัดหมายลงพื้นที่' },
];

/** Legacy school tabs — kept in storage map, hidden from admin UI. */
const LEGACY_SCHOOL_TABS: { id: ContentResourceId; label: string }[] = [
  { id: 'school_tab_basic', label: 'ข้อมูลพื้นฐาน' },
  { id: 'school_tab_location', label: 'ที่ตั้งและแผนที่' },
  { id: 'school_tab_visits', label: 'การลงพื้นที่' },
  { id: 'school_tab_people', label: 'นักเรียน / บุคลากร' },
];

/** Page cards shown in admin Content Access UI. */
export const CONTENT_PAGES: ContentPageDef[] = [
  { id: 'home', label: 'หน้าหลัก', sections: [], accessMode: 'binary' },
  {
    id: 'about',
    label: 'เกี่ยวกับโครงการ',
    sections: [],
    accessMode: 'view_edit',
    pageVisibility: true,
    visibilityIncludesHidden: false,
  },
  {
    id: 'project_overview',
    label: 'ภาพรวมโครงการ',
    sections: [],
    accessMode: 'binary',
  },
  { id: 'schools', label: 'รายการโรงเรียน', sections: [], accessMode: 'binary' },
  {
    id: 'school_detail',
    label: 'รายละเอียดโรงเรียน',
    accessMode: 'binary',
    pageVisibility: true,
    visibilityIncludesHidden: true,
    childMode: 'binary',
    supportsSensitivity: true,
    sections: SCHOOL_TAB_SECTIONS,
  },
  { id: 'dashboard', label: 'แดชบอร์ด', sections: [], accessMode: 'binary' },
  {
    id: 'calendar',
    label: 'ปฏิทิน / นัดหมาย',
    accessMode: 'binary',
    childMode: 'binary',
    sections: [
      { id: 'calendar_view', label: 'ดูปฏิทิน' },
      { id: 'calendar_create', label: 'สร้างนัดหมาย' },
    ],
  },
  {
    id: 'reports',
    label: 'บันทึกการตรวจเยี่ยม',
    accessMode: 'binary',
    childMode: 'binary',
    sections: [
      { id: 'reports_list', label: 'ดูรายการ' },
      { id: 'reports_create', label: 'ส่งบันทึก' },
    ],
  },
  {
    id: 'scholarship_students',
    label: 'นักเรียนทุน',
    accessMode: 'view_edit',
    pageVisibility: true,
    visibilityIncludesHidden: true,
    childMode: 'binary',
    supportsSensitivity: true,
    sections: SS_SECTIONS,
  },
  {
    id: 'contract_teachers',
    label: 'ครูอัตรจ้าง',
    sections: [],
    accessMode: 'view_edit',
    pageVisibility: true,
    visibilityIncludesHidden: true,
    supportsSensitivity: true,
  },
  {
    id: 'tickets',
    label: 'คำขอแก้ไขข้อมูล',
    sections: [],
    accessMode: 'binary',
    /** Binary “เข้าถึงได้” stores modify so ticket create still works */
    binaryStoresModify: true,
  },
  { id: 'volunteers', label: 'อาสาสมัคร', sections: [], accessMode: 'binary' },
  { id: 'budget', label: 'งบประมาณ', sections: [], accessMode: 'binary' },
];

/**
 * Merged / legacy pages kept for href gates + stored ACL, not shown in admin.
 */
const HIDDEN_STORAGE_PAGES: {
  id: ContentResourceId;
  label: string;
  pageId: ContentResourceId;
}[] = [
  { id: 'pillars', label: 'ภาพรวม 3 เสาหลัก', pageId: 'pillars' },
  { id: 'strategy', label: 'ผลการประเมินตามระบบ SMS', pageId: 'strategy' },
  { id: 'thailand_map', label: 'แผนที่', pageId: 'thailand_map' },
  {
    id: 'dashboard_activity',
    label: 'ภาพรวมกิจกรรม',
    pageId: 'dashboard',
  },
  { id: 'dashboard_radar', label: 'เรดาร์ / เปรียบเทียบ', pageId: 'dashboard' },
  ...LEGACY_SCHOOL_TABS.map((s) => ({
    id: s.id,
    label: s.label,
    pageId: 'school_detail' as ContentResourceId,
  })),
];

/** Flat list of every resource (pages + sections) for merge/defaults. */
export const CONTENT_RESOURCES: {
  id: ContentResourceId;
  label: string;
  pageId: ContentResourceId;
}[] = [
  ...CONTENT_PAGES.flatMap((page) => [
    { id: page.id, label: page.label, pageId: page.id },
    ...page.sections.map((s) => ({
      id: s.id,
      label: s.label,
      pageId: page.id,
    })),
  ]),
  ...HIDDEN_STORAGE_PAGES,
];

const PAGE_DEF_BY_ID = new Map(CONTENT_PAGES.map((p) => [p.id, p]));

/** Pages that store tiered cells (permission + viewUpTo). */
export function resourceStoresTiered(resource: ContentResourceId): boolean {
  const def = PAGE_DEF_BY_ID.get(resource);
  if (!def) return false;
  return Boolean(
    def.pageVisibility ||
      def.accessMode === 'view_edit' ||
      def.supportsSensitivity
  );
}

/** Sensitivity clearance is read from the page resource, not children. */
export function resourceSupportsSensitivity(
  resource: ContentResourceId
): boolean {
  const pageId = pageIdForResource(resource);
  const def = PAGE_DEF_BY_ID.get(pageId);
  return Boolean(
    def?.pageVisibility || def?.supportsSensitivity || pageId === 'about'
  );
}

export function getPageDef(
  resource: ContentResourceId
): ContentPageDef | undefined {
  return PAGE_DEF_BY_ID.get(resource) ?? PAGE_DEF_BY_ID.get(pageIdForResource(resource));
}

/** Roles in ACL dropdown: Global (guest) first, then field + admin. */
export const ACL_MATRIX_ROLES: UserRole[] = [
  'guest',
  'super_overseer',
  'overseer',
  'covert_overseer',
  'special_volunteer',
  'volunteer_center',
  'volunteer_border',
  'staff',
  'school_admin',
  'director',
  'admin',
  'super_admin',
];

/** Roles an actor may edit in Content Access UI / save. */
export function aclEditableRoles(actorRole: UserRole): UserRole[] {
  const r = normalizeRole(actorRole);
  if (r === 'super_admin') return [...ACL_MATRIX_ROLES];
  return ACL_MATRIX_ROLES.filter((role) => role !== 'super_admin');
}

/**
 * Merge incoming ACL for save: non–super_admin actors cannot change
 * super_admin cells (keep existing / defaults).
 */
export function mergeContentAccessForActor(
  actorRole: UserRole,
  existing: ContentAccessMap,
  incoming: ContentAccessMap
): ContentAccessMap {
  const r = normalizeRole(actorRole);
  if (r === 'super_admin') return incoming;
  const out = { ...incoming } as ContentAccessMap;
  for (const res of CONTENT_RESOURCES) {
    out[res.id] = {
      ...incoming[res.id],
      super_admin:
        existing[res.id]?.super_admin ??
        DEFAULT_CONTENT_ACCESS[res.id]?.super_admin ??
        (resourceStoresTiered(res.id)
          ? tierCell('modify', 3, 3)
          : 'modify'),
    };
  }
  return out;
}

/** Admin UI label — Global for non-login guest. */
export function aclRoleLabel(role: UserRole): string {
  if (role === 'guest') return 'Global';
  return ADMIN_ROLE_LABELS[role] ?? role;
}

const FULL: AccessLevel = 'modify';
const VIEW: AccessLevel = 'view';
const NONE: AccessLevel = 'none';

function clampVisibility(v: number | undefined, fallback: VisibilityLevel): VisibilityLevel {
  if (v == null || Number.isNaN(Number(v))) return fallback;
  const n = Math.max(0, Math.min(3, Math.floor(Number(v)))) as VisibilityLevel;
  return n;
}

export function tierCell(
  access: AccessLevel,
  viewUpTo?: VisibilityLevel,
  _modifyUpTo?: VisibilityLevel
): TieredAccessCell {
  if (access === 'none') return { access: 'none' };
  if (access === 'view') {
    return { access: 'view', viewUpTo: clampVisibility(viewUpTo, 1) };
  }
  // Edit clearance always equals view clearance
  const v = clampVisibility(viewUpTo, 3);
  return { access: 'modify', viewUpTo: v, modifyUpTo: v };
}

export function isTieredCell(cell: ContentAccessCell): cell is TieredAccessCell {
  return typeof cell === 'object' && cell !== null && 'access' in cell;
}

/** Normalize plain or tiered cell. Legacy plain view/modify → full L3. */
export function normalizeAccessCell(
  cell: ContentAccessCell | null | undefined
): TieredAccessCell {
  if (cell == null) return { access: 'none' };
  if (typeof cell === 'string') {
    if (cell === 'none') return { access: 'none' };
    if (cell === 'view') return { access: 'view', viewUpTo: 3 };
    return { access: 'modify', viewUpTo: 3, modifyUpTo: 3 };
  }
  const access = cell.access ?? 'none';
  if (access === 'none') return { access: 'none' };
  if (access === 'view') {
    return { access: 'view', viewUpTo: clampVisibility(cell.viewUpTo, 3) };
  }
  const v = clampVisibility(cell.viewUpTo, 3);
  return { access: 'modify', viewUpTo: v, modifyUpTo: v };
}

export function accessOf(cell: ContentAccessCell | null | undefined): AccessLevel {
  return normalizeAccessCell(cell).access;
}

export function cellsEqual(
  a: ContentAccessCell | null | undefined,
  b: ContentAccessCell | null | undefined
): boolean {
  const na = normalizeAccessCell(a);
  const nb = normalizeAccessCell(b);
  return (
    na.access === nb.access &&
    (na.viewUpTo ?? 0) === (nb.viewUpTo ?? 0) &&
    (na.modifyUpTo ?? 0) === (nb.modifyUpTo ?? 0)
  );
}

function fieldDefaults(
  level: AccessLevel
): Partial<Record<UserRole, ContentAccessCell>> {
  const out: Partial<Record<UserRole, ContentAccessCell>> = {};
  for (const r of FIELD_ROLES) out[r] = level;
  for (const r of ADMIN_ROLES) out[r] = FULL;
  return out;
}

function fieldDefaultsTiered(
  access: AccessLevel,
  viewUpTo: VisibilityLevel,
  _modifyUpTo?: VisibilityLevel
): Partial<Record<UserRole, ContentAccessCell>> {
  const out: Partial<Record<UserRole, ContentAccessCell>> = {};
  for (const r of FIELD_ROLES) {
    out[r] = tierCell(access, viewUpTo);
  }
  for (const r of ADMIN_ROLES) out[r] = tierCell('modify', 3);
  return out;
}

/** Binary section defaults (view/none) — no per-section sensitivity. */
function fieldDefaultsBinary(
  level: AccessLevel
): Partial<Record<UserRole, ContentAccessCell>> {
  return fieldDefaults(level);
}

function withGuest(
  base: Partial<Record<UserRole, ContentAccessCell>>,
  guest: ContentAccessCell
): Partial<Record<UserRole, ContentAccessCell>> {
  return { ...base, guest };
}

/** School detail prepare: L3 view so existing UI stays fully visible until tagged. */
const SCHOOL_TIER = withGuest(fieldDefaultsTiered('view', 3), tierCell('view', 3));

/** Scholarship page: field roles view L1; special/covert can edit (view clearance L3). */
const SCHOLARSHIP_TIER = withGuest(
  {
    ...fieldDefaultsTiered('view', 1),
    special_volunteer: tierCell('modify', 3),
    covert_overseer: tierCell('modify', 3),
    school_admin: tierCell('view', 1),
    director: tierCell('view', 1),
  },
  tierCell('none')
);

/** Scholarship / school child sections: binary on/off only. */
const SCHOLARSHIP_SECTION = withGuest(
  {
    ...fieldDefaultsBinary(VIEW),
    special_volunteer: VIEW,
    covert_overseer: VIEW,
    school_admin: VIEW,
    director: VIEW,
  },
  NONE
);

const SCHOOL_SECTION = withGuest(fieldDefaultsBinary(VIEW), VIEW);
const SCHOOL_SECTION_AUTH = withGuest(fieldDefaultsBinary(VIEW), NONE);

/**
 * Default ACL:
 * - Global (guest): public pages view; field pages none; guest school tabs
 * - SO / admin: full
 * - special_volunteer / covert_overseer: strong on scholarship
 * - school_admin: school surfaces (director kept as legacy alias)
 */
export const DEFAULT_CONTENT_ACCESS: ContentAccessMap = {
  home: withGuest(fieldDefaults(VIEW), VIEW),
  about: withGuest(fieldDefaultsTiered('view', 3), tierCell('view', 3)),
  project_overview: withGuest(fieldDefaults(VIEW), VIEW),
  pillars: withGuest(fieldDefaults(VIEW), VIEW),
  strategy: withGuest(fieldDefaults(VIEW), VIEW),
  thailand_map: withGuest(fieldDefaults(VIEW), VIEW),
  schools: withGuest(fieldDefaults(VIEW), VIEW),
  school_detail: SCHOOL_TIER,
  dashboard: withGuest(
    {
      ...fieldDefaults(VIEW),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  calendar: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  reports: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  scholarship_students: SCHOLARSHIP_TIER,
  contract_teachers: withGuest(
    {
      ...fieldDefaultsTiered('view', 3),
      special_volunteer: tierCell('view', 3),
      covert_overseer: tierCell('view', 3),
      school_admin: tierCell('view', 3),
      director: tierCell('view', 3),
    },
    tierCell('none')
  ),
  tickets: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: NONE,
      covert_overseer: NONE,
      school_admin: FULL,
      director: FULL,
    },
    NONE
  ),
  volunteers: withGuest(
    {
      ...fieldDefaults(VIEW),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  budget: withGuest(
    {
      ...fieldDefaults(VIEW),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  school_tab_overview: SCHOOL_SECTION,
  school_tab_basic: SCHOOL_SECTION,
  school_tab_buildings: SCHOOL_SECTION,
  school_tab_location: SCHOOL_SECTION,
  school_tab_swot: SCHOOL_SECTION,
  school_tab_visits: SCHOOL_SECTION_AUTH,
  school_tab_reports: SCHOOL_SECTION_AUTH,
  school_tab_calendar: SCHOOL_SECTION_AUTH,
  school_tab_budget: SCHOOL_SECTION,
  school_tab_pillars: SCHOOL_SECTION_AUTH,
  school_tab_scores: SCHOOL_SECTION_AUTH,
  school_tab_people: SCHOOL_SECTION_AUTH,
  school_tab_scholarship: SCHOLARSHIP_SECTION,
  school_tab_contract_teachers: SCHOOL_SECTION_AUTH,
  dashboard_activity: withGuest(fieldDefaults(VIEW), NONE),
  dashboard_radar: withGuest(fieldDefaults(VIEW), NONE),
  calendar_view: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  calendar_create: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: NONE,
      covert_overseer: NONE,
      school_admin: NONE,
      director: NONE,
    },
    NONE
  ),
  reports_list: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: VIEW,
      covert_overseer: VIEW,
      school_admin: VIEW,
      director: VIEW,
    },
    NONE
  ),
  reports_create: withGuest(
    {
      ...fieldDefaults(FULL),
      special_volunteer: NONE,
      covert_overseer: NONE,
      school_admin: NONE,
      director: NONE,
    },
    NONE
  ),
  ss_banner: SCHOLARSHIP_SECTION,
  ss_general: SCHOLARSHIP_SECTION,
  ss_contact: SCHOLARSHIP_SECTION,
  ss_teacher: SCHOLARSHIP_SECTION,
  ss_performance: SCHOLARSHIP_SECTION,
  ss_behavior: SCHOLARSHIP_SECTION,
  ss_health: SCHOLARSHIP_SECTION,
  ss_fund: SCHOLARSHIP_SECTION,
  ss_project: SCHOLARSHIP_SECTION,
  ss_friends: SCHOLARSHIP_SECTION,
  ss_family: SCHOLARSHIP_SECTION,
};

export const CONTENT_ACCESS_SETTING_KEY = 'content_access_map';

const LEVEL_RANK: Record<AccessLevel, number> = {
  none: 0,
  view: 1,
  modify: 2,
};

export function getAccessCell(
  map: ContentAccessMap,
  resource: ContentResourceId,
  role: UserRole
): TieredAccessCell {
  return normalizeAccessCell(
    map[resource]?.[role] ?? DEFAULT_CONTENT_ACCESS[resource]?.[role]
  );
}

export function mergeContentAccess(
  stored: Partial<ContentAccessMap> | null | undefined
): ContentAccessMap {
  const out = { ...DEFAULT_CONTENT_ACCESS } as ContentAccessMap;
  if (!stored || typeof stored !== 'object') return out;
  for (const res of CONTENT_RESOURCES) {
    const patch = stored[res.id];
    if (!patch || typeof patch !== 'object') continue;
    out[res.id] = { ...out[res.id], ...patch };
  }
  return out;
}

/**
 * Store only cells that differ from defaults — keeps cookie/DB payloads small.
 * Tiered cells stored compactly as objects `{a,v?,m?}`.
 */
export function compactContentAccess(
  map: ContentAccessMap | Partial<ContentAccessMap>
): Partial<ContentAccessMap> {
  const out: Partial<ContentAccessMap> = {};
  for (const res of CONTENT_RESOURCES) {
    const roles = map[res.id];
    if (!roles || typeof roles !== 'object') continue;
    const defaults = DEFAULT_CONTENT_ACCESS[res.id] ?? {};
    const diff: Partial<Record<UserRole, ContentAccessCell>> = {};
    for (const [role, level] of Object.entries(roles)) {
      if (level == null) continue;
      const r = role as UserRole;
      if (!cellsEqual(defaults[r], level)) {
        diff[r] = compactCell(level, resourceStoresTiered(res.id));
      }
    }
    if (Object.keys(diff).length > 0) {
      out[res.id] = diff;
    }
  }
  return out;
}

/** Compact tiered cell for storage; plain AccessLevel for non-tiered. */
function compactCell(
  cell: ContentAccessCell,
  tiered: boolean
): ContentAccessCell {
  const n = normalizeAccessCell(cell);
  if (!tiered) return n.access;
  if (n.access === 'none') return { access: 'none' };
  if (n.access === 'view') return { access: 'view', viewUpTo: n.viewUpTo };
  return {
    access: 'modify',
    viewUpTo: n.viewUpTo,
    modifyUpTo: n.viewUpTo,
  };
}

export function canAccess(
  role: string | null | undefined,
  resource: ContentResourceId,
  level: AccessLevel = 'view',
  map: ContentAccessMap = DEFAULT_CONTENT_ACCESS
): boolean {
  const r = normalizeRole(role);
  const cellRaw = map[resource]?.[r] ?? DEFAULT_CONTENT_ACCESS[resource]?.[r];
  const granted = accessOf(cellRaw);
  // Respect ACL map for all roles including admin/super_admin (no view bypass).
  return LEVEL_RANK[granted] >= LEVEL_RANK[level];
}

/** Section access requires parent page ≥ view as well. */
export function canAccessSection(
  role: string | null | undefined,
  pageId: ContentResourceId,
  sectionId: ContentResourceId,
  level: AccessLevel = 'view',
  map: ContentAccessMap = DEFAULT_CONTENT_ACCESS
): boolean {
  if (!canAccess(role, pageId, 'view', map)) return false;
  return canAccess(role, sectionId, level, map);
}

/**
 * Field sensitivity check. Pass the **page** resource
 * (e.g. scholarship_students / school_detail), not a child section.
 */
export function canViewSensitivity(
  role: string | null | undefined,
  resource: ContentResourceId,
  fieldLevel: SensitivityLevel,
  map: ContentAccessMap = DEFAULT_CONTENT_ACCESS
): boolean {
  const r = normalizeRole(role);
  const pageId = pageIdForResource(resource);
  if (!canAccess(r, pageId, 'view', map)) return false;
  if (!resourceSupportsSensitivity(pageId)) return true;
  if (r === 'super_admin' || r === 'admin') return true;
  const cell = getAccessCell(map, pageId, r);
  const upTo = cell.viewUpTo ?? 0;
  return upTo >= fieldLevel;
}

/**
 * Edit clearance = view clearance (modifyUpTo ignored; uses viewUpTo).
 * Pass the **page** resource for tiered pages.
 */
export function canModifySensitivity(
  role: string | null | undefined,
  resource: ContentResourceId,
  fieldLevel: SensitivityLevel,
  map: ContentAccessMap = DEFAULT_CONTENT_ACCESS
): boolean {
  const r = normalizeRole(role);
  const pageId = pageIdForResource(resource);
  if (!canAccess(r, pageId, 'modify', map)) return false;
  if (!resourceSupportsSensitivity(pageId)) {
    return canAccess(r, pageId, 'modify', map);
  }
  const cell = getAccessCell(map, pageId, r);
  if (cell.access !== 'modify') return false;
  if (r === 'super_admin' || r === 'admin') return true;
  const upTo = cell.viewUpTo ?? 0;
  return upTo >= fieldLevel;
}

/** Map school detail TabId → ACL section resource. */
export function schoolTabResource(
  tabId: string
): ContentResourceId | null {
  const map: Record<string, ContentResourceId> = {
    overview: 'school_tab_overview',
    basic: 'school_tab_basic',
    buildings: 'school_tab_buildings',
    location: 'school_tab_location',
    swot: 'school_tab_swot',
    visits: 'school_tab_visits',
    reports: 'school_tab_reports',
    calendar: 'school_tab_calendar',
    budget: 'school_tab_budget',
    pillars: 'school_tab_pillars',
    scores: 'school_tab_scores',
    people: 'school_tab_people',
    scholarship: 'school_tab_scholarship',
    contract_teachers: 'school_tab_contract_teachers',
  };
  return map[tabId] ?? null;
}

/** Map nav href → content resource for ACL filtering */
export function resourceForHref(href: string): ContentResourceId | null {
  if (href === '/') return 'home';
  if (href === '/about' || href.startsWith('/about/')) return 'about';
  if (href === '/project-overview' || href.startsWith('/project-overview/'))
    return 'project_overview';
  if (href === '/pillars' || href.startsWith('/pillars/')) return 'pillars';
  if (href === '/strategy' || href.startsWith('/strategy/')) return 'strategy';
  if (href === '/overview' || href.startsWith('/overview/')) return 'project_overview';
  if (href.startsWith('/thailand-map')) return 'thailand_map';
  if (href === '/home' || href.startsWith('/home/')) return null;
  if (href === '/dashboard') return 'dashboard';
  if (href.startsWith('/volunteers')) return 'volunteers';
  if (href.startsWith('/budget')) return 'budget';
  if (href === '/calendar/new' || href.startsWith('/calendar/new'))
    return 'calendar_create';
  if (href.startsWith('/calendar')) return 'calendar_view';
  if (href === '/reports/new' || href.startsWith('/reports/new'))
    return 'reports_create';
  if (href.startsWith('/reports')) return 'reports_list';
  if (href.startsWith('/scholarship-students')) return 'scholarship_students';
  if (href.startsWith('/contract-teachers')) return 'contract_teachers';
  if (/^\/schools\/[^/]+/.test(href) && !href.startsWith('/schools/public')) {
    return 'school_detail';
  }
  if (href === '/schools' || href.startsWith('/schools/')) return 'schools';
  if (href.startsWith('/tickets')) return 'tickets';
  return null;
}

/** Parent page id for a resource (itself if it is a page). */
export function pageIdForResource(
  resource: ContentResourceId
): ContentResourceId {
  const found = CONTENT_RESOURCES.find((r) => r.id === resource);
  return found?.pageId ?? resource;
}

/** Nav/href ACL: sections also require parent page ≥ view. */
export function canAccessHref(
  role: string | null | undefined,
  href: string,
  level: AccessLevel = 'view',
  map: ContentAccessMap = DEFAULT_CONTENT_ACCESS
): boolean {
  const resource = resourceForHref(href);
  if (!resource) return true;
  const pageId = pageIdForResource(resource);
  if (pageId !== resource) {
    return canAccessSection(role, pageId, resource, level, map);
  }
  return canAccess(role, resource, level, map);
}

export function accessLevelLabel(level: AccessLevel): string {
  if (level === 'modify') return 'แก้ไขได้';
  if (level === 'view') return 'เข้าถึงได้';
  return 'ไม่สามารถเข้าถึง';
}

export function accessLevelLabelDetailed(level: AccessLevel): string {
  if (level === 'modify') return 'แก้ไขได้';
  if (level === 'view') return 'ดูได้อย่างเดียว';
  return 'ไม่มีสิทธิ์';
}

export function binaryAccessLabel(level: AccessLevel): string {
  return level === 'none' ? 'ไม่สามารถเข้าถึง' : 'เข้าถึงได้';
}

export function sensitivityLevelLabel(level: SensitivityLevel | VisibilityLevel): string {
  if (level === 0) return 'ไม่สามารถเห็นได้';
  if (level === 1) return 'view level 1';
  if (level === 2) return 'view level 2';
  return 'view level 3';
}
