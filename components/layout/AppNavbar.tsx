'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import {
  Home,
  Info,
  Hexagon,
  School,
  Map,
  Briefcase,
  CalendarDays,
  ClipboardPen,
  Network,
  Settings,
  Users,
  UserRound,
  ChevronDown,
  LogIn,
  LogOut,
  FileText,
  FilePlus2,
  Menu,
  X,
  Layers,
  Database,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  NAV_CATALOG,
  navForRole,
  normalizeRole,
  roleDisplayLabel,
  type NavItem,
  type OverseerTier,
  type UserRole,
} from '@/lib/types';
import { DROPDOWN_ONLY_HREFS } from '@/lib/auth/mock-users';
import { isAdminRole, isFieldRole } from '@/lib/auth/scope';
import { logoutAction } from '@/app/actions/auth';

const ICONS: Record<string, LucideIcon> = {
  '/': Home,
  '/about': Info,
  '/pillars': Hexagon,
  '/strategy': Hexagon,
  '/schools': School,
  '/schools/public': School,
  '/thailand-map': Map,
  '/calendar': CalendarDays,
  '/calendar/new': CalendarDays,
  '/reports/new': FilePlus2,
  '/reports': FileText,
  '/dashboard': Briefcase,
  '/tickets': ClipboardPen,
  '/admin/accounts': Users,
  '/admin/domain': Network,
  '/admin/org-map': Network,
  '/admin/schools': School,
  '/admin/directors': UserRound,
  '/admin/tickets': ClipboardPen,
  '/admin/settings': Settings,
};

/** ภาพรวมด้านต่างๆ — 3 pillars + SMS evaluation */
const OVERVIEW_GROUP: NavItem[] = [
  { href: '/pillars', label: 'ภาพรวม 3 เสาหลัก', roles: [] },
  { href: '/strategy', label: 'ผลการประเมินตามระบบ SMS', roles: [] },
];

/** ข้อมูลรายละเอียด — map + school list */
const DETAIL_GROUP_GUEST: NavItem[] = [
  { href: '/thailand-map', label: 'แผนที่', roles: [] },
  { href: '/schools', label: 'โรงเรียนในโครงการ', roles: [] },
];

/** Logged-in users keep only the public map (no guest marketing pages) */
const DETAIL_GROUP_AUTH: NavItem[] = [
  { href: '/thailand-map', label: 'แผนที่', roles: [] },
];

/** Main bar before/after จัดการโรงเรียน group (field roles) */
const AUTH_MAIN_BEFORE = ['/dashboard'] as const;
/** Tickets render after ข้อมูลรายละเอียด */
const AUTH_TICKETS_HREF = '/tickets' as const;

/** รายงาน — ส่งรายงาน + ดูผลรายงาน */
const REPORTS_HREFS = ['/reports/new', '/reports'] as const;

/** จัดการโรงเรียน — domain schools + schedule (logged-in field roles) */
const MANAGE_SCHOOLS_HREFS = ['/schools', '/calendar', '/calendar/new'] as const;
const MANAGE_SCHEDULE_SECTION = 'นัดหมายโรงเรียน';

/** Admin main bar around groups — settings only for super_admin */
const ADMIN_MAIN_BEFORE = ['/schools'] as const;
const ADMIN_MAIN_AFTER = ['/admin/settings'] as const;

/** จัดการข้อมูล — school / director edit + tickets */
const MANAGE_DATA_HREFS = [
  '/admin/schools',
  '/admin/directors',
  '/admin/tickets',
] as const;

/** จัดการผู้ใช้งาน — assign domain + manage accounts */
const MANAGE_USERS_HREFS = ['/admin/domain', '/admin/accounts'] as const;

type OpenMenu = 'overview' | 'detail' | 'manage' | 'reports' | 'data' | 'users' | null;

export function AppNavbar({
  role,
  overseerTier = null,
  displayName,
  isAuthenticated,
  mustChangePassword,
}: {
  role: UserRole;
  overseerTier?: OverseerTier | null;
  displayName: string;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
}) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const accountRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLLIElement>(null);
  const detailRef = useRef<HTMLLIElement>(null);
  const manageRef = useRef<HTMLLIElement>(null);
  const reportsRef = useRef<HTMLLIElement>(null);
  const dataRef = useRef<HTMLLIElement>(null);
  const usersRef = useRef<HTMLLIElement>(null);
  const drawerId = useId();

  const normalizedRole = normalizeRole(role);
  const roleLabel = roleDisplayLabel(normalizedRole, overseerTier);
  const catalog = navForRole(normalizedRole).filter((item) => !DROPDOWN_ONLY_HREFS.has(item.href));

  const byHref = (href: string) => {
    const item = catalog.find((i) => i.href === href) ?? NAV_CATALOG.find((i) => i.href === href);
    if (!item) return undefined;
    if (href === '/schools' && isAuthenticated && isFieldRole(normalizedRole)) {
      return { ...item, label: 'โรงเรียนของฉัน' };
    }
    return item;
  };

  let mainBefore: NavItem[] = [];
  let mainAfter: NavItem[] = [];
  let showPublicGroups = false;
  let showOverviewGroup = false;
  let showManageGroup = false;
  let showReportsGroup = false;
  let showDataGroup = false;
  let showUsersGroup = false;
  let overviewGroup: NavItem[] = OVERVIEW_GROUP;
  let detailGroup: NavItem[] = DETAIL_GROUP_GUEST;
  let manageGroup: NavItem[] = [];
  let reportsGroup: NavItem[] = [];
  let dataGroup: NavItem[] = [];
  let usersGroup: NavItem[] = [];
  let mapItem: NavItem | undefined;

  const filterAdminSettings = (item: NavItem | undefined) => {
    if (!item) return false;
    if (item.href === '/admin/settings') return normalizedRole === 'super_admin';
    return true;
  };

  let ticketsItem: NavItem | undefined;

  if (isAuthenticated && isFieldRole(normalizedRole)) {
    mainBefore = AUTH_MAIN_BEFORE.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    ticketsItem = byHref(AUTH_TICKETS_HREF);
    manageGroup = MANAGE_SCHOOLS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showManageGroup = manageGroup.length > 0;
    reportsGroup = REPORTS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showReportsGroup = reportsGroup.length > 0;
    mapItem = byHref('/thailand-map') ?? DETAIL_GROUP_AUTH[0];
    showOverviewGroup = false;
    showPublicGroups = false;
  } else if (isAuthenticated && isAdminRole(normalizedRole)) {
    mainBefore = ADMIN_MAIN_BEFORE.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    mainAfter = ADMIN_MAIN_AFTER.map((h) => byHref(h)).filter(filterAdminSettings) as NavItem[];
    dataGroup = MANAGE_DATA_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showDataGroup = dataGroup.length > 0;
    usersGroup = MANAGE_USERS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showUsersGroup = usersGroup.length > 0;
    mapItem = byHref('/thailand-map') ?? DETAIL_GROUP_AUTH[0];
    showOverviewGroup = false;
    showPublicGroups = false;
  } else {
    mainBefore = [
      byHref('/') ?? { href: '/', label: 'หน้าหลัก', roles: [], end: true },
      byHref('/about') ?? { href: '/about', label: 'เกี่ยวกับโครงการ', roles: [] },
    ];
    showPublicGroups = true;
    showOverviewGroup = true;
    overviewGroup = OVERVIEW_GROUP;
    detailGroup = DETAIL_GROUP_GUEST;
  }

  const showProfile = isFieldRole(normalizedRole) || isAdminRole(normalizedRole);

  const isActive = (href: string, end?: boolean) => {
    if (end) return pathname === '/';
    // /schools must not match /schools/public (domain list vs all-schools catalog)
    if (href === '/schools') {
      if (pathname === '/schools') return true;
      if (pathname.startsWith('/schools/public')) return false;
      return pathname.startsWith('/schools/');
    }
    if (href === '/schools/public') {
      return pathname === '/schools/public' || pathname.startsWith('/schools/public/');
    }
    // /reports must not highlight when on /reports/new
    if (href === '/reports') {
      return pathname === '/reports' || (pathname.startsWith('/reports/') && !pathname.startsWith('/reports/new'));
    }
    if (href === '/reports/new') {
      return pathname === '/reports/new' || pathname.startsWith('/reports/new/');
    }
    // /calendar must not highlight when on /calendar/new
    if (href === '/calendar') {
      return pathname === '/calendar';
    }
    if (href === '/calendar/new') {
      return pathname === '/calendar/new' || pathname.startsWith('/calendar/new/');
    }
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      (href === '/strategy' && pathname.startsWith('/overview'))
    );
  };

  const overviewActive = overviewGroup.some((i) => isActive(i.href, i.end));
  const detailActive = detailGroup.some((i) => isActive(i.href, i.end));
  const manageActive = manageGroup.some((i) => isActive(i.href, i.end));
  const reportsActive = reportsGroup.some((i) => isActive(i.href, i.end));
  const dataActive = dataGroup.some((i) => isActive(i.href, i.end));
  const usersActive = usersGroup.some((i) => isActive(i.href, i.end));

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.removeItem('coned-theme');
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', drawerOpen);
    return () => document.body.classList.remove('nav-drawer-open');
  }, [drawerOpen]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
      if (
        !overviewRef.current?.contains(e.target as Node) &&
        !detailRef.current?.contains(e.target as Node) &&
        !manageRef.current?.contains(e.target as Node) &&
        !reportsRef.current?.contains(e.target as Node) &&
        !dataRef.current?.contains(e.target as Node) &&
        !usersRef.current?.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  const accountMenuLinks = (
    <>
      {showProfile && (
        <Link
          href="/staff/profile"
          prefetch
          className="role-menu__item"
          onClick={() => {
            setAccountOpen(false);
            closeDrawer();
          }}
        >
          <UserRound size={16} /> แก้ไขโปรไฟล์
        </Link>
      )}
      <button
        type="button"
        className="role-menu__item"
        onClick={() => {
          startTransition(async () => {
            try {
              await logoutAction();
            } catch {
              // redirect() throws; full navigation recovers from bloated cookies
            }
            setAccountOpen(false);
            closeDrawer();
            window.location.assign('/');
          });
        }}
      >
        <LogOut size={16} /> ออกจากระบบ
      </button>
    </>
  );

  const renderLink = (item: NavItem, variant: 'bar' | 'drawer' | 'dropdown') => {
    const Icon = ICONS[item.href] ?? Home;
    const active = isActive(item.href, item.end);
    const className =
      variant === 'dropdown'
        ? `role-menu__item ${active ? 'role-menu__item--active' : ''}`
        : `navbar__link ${active ? 'navbar__link--active' : ''}`;
    return (
      <Link
        key={`${variant}-${item.href}`}
        href={item.href}
        prefetch
        className={className}
        onClick={() => {
          setOpenMenu(null);
          if (variant === 'drawer') closeDrawer();
        }}
      >
        <Icon size={variant === 'drawer' ? 18 : 15} />
        {item.label}
      </Link>
    );
  };

  const renderManageMenuItems = (variant: 'dropdown' | 'drawer') => {
    const schoolItem = manageGroup.find((i) => i.href === '/schools');
    const scheduleItems = manageGroup.filter(
      (i) => i.href === '/calendar' || i.href === '/calendar/new'
    );
    return (
      <>
        {schoolItem ? (
          variant === 'drawer' ? (
            <li key={`drawer-mg-${schoolItem.href}`}>{renderLink(schoolItem, 'drawer')}</li>
          ) : (
            renderLink(schoolItem, 'dropdown')
          )
        ) : null}
        {scheduleItems.length > 0 ? (
          variant === 'drawer' ? (
            <li className="ed-nav-drawer__group-label ed-nav-drawer__group-label--sub">
              {MANAGE_SCHEDULE_SECTION}
            </li>
          ) : (
            <div className="role-menu__meta" role="presentation">
              {MANAGE_SCHEDULE_SECTION}
            </div>
          )
        ) : null}
        {scheduleItems.map((item) =>
          variant === 'drawer' ? (
            <li key={`drawer-mg-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ) : (
            renderLink(item, 'dropdown')
          )
        )}
      </>
    );
  };

  const renderGroup = (
    key: Exclude<OpenMenu, null>,
    label: string,
    Icon: LucideIcon,
    items: NavItem[],
    active: boolean,
    ref: React.RefObject<HTMLLIElement | null>
  ) => (
    <li className="ed-nav-explore relative" ref={ref}>
      <button
        type="button"
        className={`navbar__link ed-nav-explore__btn ${active || openMenu === key ? 'navbar__link--active' : ''}`}
        aria-expanded={openMenu === key}
        onClick={() => setOpenMenu((v) => (v === key ? null : key))}
      >
        <Icon size={15} />
        {label}
        <ChevronDown size={14} />
      </button>
      {openMenu === key && (
        <div className="role-menu ed-nav-explore__menu" role="menu">
          {key === 'manage'
            ? renderManageMenuItems('dropdown')
            : items.map((item) => renderLink(item, 'dropdown'))}
        </div>
      )}
    </li>
  );

  const desktopNav = (
    <ul className="navbar__nav">
      {mainBefore.map((item) => (
        <li key={`bar-${item.href}`}>{renderLink(item, 'bar')}</li>
      ))}
      {showManageGroup &&
        renderGroup(
          'manage',
          'จัดการโรงเรียน',
          School,
          manageGroup,
          manageActive,
          manageRef
        )}
      {showReportsGroup &&
        renderGroup(
          'reports',
          'รายงาน',
          FileText,
          reportsGroup,
          reportsActive,
          reportsRef
        )}
      {showDataGroup &&
        renderGroup(
          'data',
          'จัดการข้อมูล',
          ClipboardPen,
          dataGroup,
          dataActive,
          dataRef
        )}
      {showUsersGroup &&
        renderGroup(
          'users',
          'จัดการผู้ใช้งาน',
          Users,
          usersGroup,
          usersActive,
          usersRef
        )}
      {mainAfter.map((item) => (
        <li key={`bar-${item.href}`}>{renderLink(item, 'bar')}</li>
      ))}
      {showOverviewGroup &&
        renderGroup('overview', 'ภาพรวมด้านต่างๆ', Layers, overviewGroup, overviewActive, overviewRef)}
      {showPublicGroups &&
        renderGroup('detail', 'ข้อมูลรายละเอียด', Database, detailGroup, detailActive, detailRef)}
      {mapItem ? <li key={`bar-${mapItem.href}`}>{renderLink(mapItem, 'bar')}</li> : null}
      {ticketsItem ? <li key={`bar-${ticketsItem.href}`}>{renderLink(ticketsItem, 'bar')}</li> : null}
    </ul>
  );

  const drawerNav = (
    <ul className="ed-nav-drawer__nav">
      {mainBefore.map((item) => (
        <li key={`drawer-${item.href}`}>{renderLink(item, 'drawer')}</li>
      ))}
      {showManageGroup && (
        <>
          <li className="ed-nav-drawer__group-label">จัดการโรงเรียน</li>
          {renderManageMenuItems('drawer')}
        </>
      )}
      {showReportsGroup && (
        <>
          <li className="ed-nav-drawer__group-label">รายงาน</li>
          {reportsGroup.map((item) => (
            <li key={`drawer-rp-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {showDataGroup && (
        <>
          <li className="ed-nav-drawer__group-label">จัดการข้อมูล</li>
          {dataGroup.map((item) => (
            <li key={`drawer-data-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {showUsersGroup && (
        <>
          <li className="ed-nav-drawer__group-label">จัดการผู้ใช้งาน</li>
          {usersGroup.map((item) => (
            <li key={`drawer-us-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {mainAfter.map((item) => (
        <li key={`drawer-${item.href}`}>{renderLink(item, 'drawer')}</li>
      ))}
      {showOverviewGroup && (
        <>
          <li className="ed-nav-drawer__group-label">ภาพรวมด้านต่างๆ</li>
          {overviewGroup.map((item) => (
            <li key={`drawer-ov-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {showPublicGroups && (
        <>
          <li className="ed-nav-drawer__group-label">ข้อมูลรายละเอียด</li>
          {detailGroup.map((item) => (
            <li key={`drawer-dt-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {mapItem ? (
        <li key={`drawer-${mapItem.href}`}>{renderLink(mapItem, 'drawer')}</li>
      ) : null}
      {ticketsItem ? (
        <li key={`drawer-${ticketsItem.href}`}>{renderLink(ticketsItem, 'drawer')}</li>
      ) : null}
    </ul>
  );

  return (
    <>
      <nav className={`navbar ed-navbar ${isAuthenticated ? 'ed-navbar--auth' : ''}`} aria-label="หลัก">
        <button
          type="button"
          className="ed-navbar__menu-btn"
          aria-label={drawerOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {drawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link
          href={isAuthenticated && isFieldRole(normalizedRole) ? '/dashboard' : '/'}
          prefetch
          className="navbar__brand"
          onClick={closeDrawer}
        >
          <Image
            src="/images/Logo/EDU_Logo.png"
            alt=""
            width={34}
            height={34}
            className="navbar__brand-seal navbar__brand-logo"
            priority
          />
          <div className="navbar__brand-text">
            <div className="navbar__brand-name">โครงการกองทุนการศึกษา</div>
            <div className="navbar__brand-subtitle">สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน</div>
          </div>
        </Link>

        <div className="ed-navbar__inline ed-navbar__inline--desktop">{desktopNav}</div>

        <div className="ed-navbar__utils">
          <div className="ed-navbar__account relative" ref={accountRef}>
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="ed-profile-btn"
                  onClick={() => setAccountOpen((v) => !v)}
                  disabled={pending || mustChangePassword}
                  aria-expanded={accountOpen}
                >
                  <span className="ed-profile-btn__avatar">{displayName.slice(0, 1)}</span>
                  <span className="ed-profile-btn__name">{displayName}</span>
                  <ChevronDown size={14} className="ed-profile-btn__chevron" />
                </button>
                {accountOpen && (
                  <div className="role-menu" role="menu">
                    <div className="role-menu__meta">{roleLabel}</div>
                    {accountMenuLinks}
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" prefetch className="navbar__login">
                <LogIn size={16} />
                <span className="navbar__login-label">เข้าใช้งานระบบ</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div
        className={`ed-nav-backdrop ${drawerOpen ? 'is-open' : ''}`}
        aria-hidden={!drawerOpen}
        onClick={closeDrawer}
      />

      <aside
        id={drawerId}
        className={`ed-nav-drawer ${drawerOpen ? 'is-open' : ''}`}
        aria-hidden={!drawerOpen}
        aria-label="เมนูนำทาง"
      >
        <div className="ed-nav-drawer__head">
          <div className="ed-nav-drawer__brand">
            <Image
              src="/images/Logo/EDU_Logo.png"
              alt=""
              width={40}
              height={40}
              className="navbar__brand-seal navbar__brand-logo"
            />
            <div>
              <div className="navbar__brand-name">โครงการกองทุนการศึกษา</div>
              <div className="navbar__brand-subtitle">สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน</div>
            </div>
          </div>
          <button type="button" className="ed-navbar__menu-btn" aria-label="ปิดเมนู" onClick={closeDrawer}>
            <X size={20} />
          </button>
        </div>

        {drawerNav}

        <div className="ed-nav-drawer__footer">
          {isAuthenticated ? (
            <div className="ed-nav-drawer__account">
              <div className="ed-nav-drawer__user">
                <span className="ed-profile-btn__avatar">{displayName.slice(0, 1)}</span>
                <div>
                  <strong>{displayName}</strong>
                  <span>{roleLabel}</span>
                </div>
              </div>
              <div className="ed-nav-drawer__account-links">{accountMenuLinks}</div>
            </div>
          ) : (
            <Link href="/login" prefetch className="navbar__login ed-nav-drawer__login" onClick={closeDrawer}>
              <LogIn size={16} />
              เข้าใช้งานระบบ
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
