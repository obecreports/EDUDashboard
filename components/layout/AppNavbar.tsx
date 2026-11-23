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
  GraduationCap,
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
import {
  canAccessHref,
  type ContentAccessMap,
} from '@/lib/auth/content-access';

const ICONS: Record<string, LucideIcon> = {
  '/': Home,
  '/about': Info,
  '/project-overview': Layers,
  '/pillars': Hexagon,
  '/strategy': Hexagon,
  '/schools': School,
  '/schools/public': School,
  '/thailand-map': Map,
  '/calendar': CalendarDays,
  '/calendar/new': CalendarDays,
  '/reports/new': FilePlus2,
  '/reports': FileText,
  '/home': Briefcase,
  '/dashboard': Briefcase,
  '/volunteers': Users,
  '/budget': ClipboardPen,
  '/tickets': ClipboardPen,
  '/admin/accounts': Users,
  '/admin/domain': Network,
  '/admin/org-map': Network,
  '/admin/schools': School,
  '/admin/directors': UserRound,
  '/admin/overseers': UserRound,
  '/admin/tickets': ClipboardPen,
  '/admin/content-access': Settings,
  '/admin/settings': Settings,
  '/scholarship-students': GraduationCap,
};

/** Main bar before/after โรงเรียนในโครงการ group (field roles) */
const AUTH_MAIN_BEFORE = ['/home'] as const;

/** บันทึกการตรวจเยี่ยม */
const REPORTS_HREFS = ['/reports/new', '/reports'] as const;

/** Scholarship (field bar) */
const PEOPLE_DATA_HREFS = ['/scholarship-students'] as const;

/** โรงเรียนในโครงการ — domain schools + schedule (logged-in field roles) */
const MANAGE_SCHOOLS_HREFS = ['/schools', '/calendar', '/calendar/new'] as const;
const MANAGE_SCHEDULE_SECTION = 'นัดหมายโรงเรียน';

/** Admin main bar around groups — settings only for super_admin */
const ADMIN_MAIN_BEFORE = ['/schools'] as const;
const ADMIN_MAIN_AFTER = ['/admin/settings'] as const;

/** จัดการข้อมูล — school / director edit + tickets */
const MANAGE_DATA_HREFS = [
  '/admin/schools',
  '/admin/directors',
  '/admin/overseers',
  '/admin/tickets',
] as const;

/** จัดการผู้ใช้งาน — assign domain + manage accounts + ACL */
const MANAGE_USERS_HREFS = [
  '/admin/domain',
  '/admin/accounts',
  '/admin/org-map',
  '/admin/content-access',
] as const;

type OpenMenu = 'manage' | 'reports' | 'data' | 'users' | null;

export function AppNavbar({
  role,
  overseerTier = null,
  displayName,
  isAuthenticated,
  mustChangePassword,
  contentAccess,
}: {
  role: UserRole;
  contentAccess?: ContentAccessMap;
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
  const manageRef = useRef<HTMLLIElement>(null);
  const reportsRef = useRef<HTMLLIElement>(null);
  const dataRef = useRef<HTMLLIElement>(null);
  const usersRef = useRef<HTMLLIElement>(null);
  const drawerId = useId();

  const normalizedRole = normalizeRole(role);
  const roleLabel = roleDisplayLabel(normalizedRole, overseerTier);

  const aclAllows = (href: string) => {
    if (!contentAccess) return true;
    return canAccessHref(normalizedRole, href, 'view', contentAccess);
  };

  const catalog = navForRole(normalizedRole).filter((item) => {
    if (DROPDOWN_ONLY_HREFS.has(item.href)) return false;
    return aclAllows(item.href);
  });

  const byHref = (href: string) => {
    if (!aclAllows(href)) return undefined;
    const item = catalog.find((i) => i.href === href) ?? NAV_CATALOG.find((i) => i.href === href);
    if (!item) return undefined;
    if (href === '/schools' && isAuthenticated && isFieldRole(normalizedRole)) {
      return { ...item, label: 'โรงเรียนของฉัน' };
    }
    return item;
  };

  let mainBefore: NavItem[] = [];
  let mainAfter: NavItem[] = [];
  let showManageGroup = false;
  let showReportsGroup = false;
  let showDataGroup = false;
  let showUsersGroup = false;
  let manageGroup: NavItem[] = [];
  let reportsGroup: NavItem[] = [];
  let dataGroup: NavItem[] = [];
  let usersGroup: NavItem[] = [];
  /** Guest: ภาพรวมโครงการ + โรงเรียนในโครงการ (no หน้าหลัก — logo covers home) */
  let guestOverviewItem: NavItem | undefined;
  let guestSchoolsItem: NavItem | undefined;
  /** Admin keeps map shortcut (field bar no longer shows map) */
  let mapItem: NavItem | undefined;

  const filterAdminSettings = (item: NavItem | undefined) => {
    if (!item) return false;
    if (item.href === '/admin/settings') return normalizedRole === 'super_admin';
    return true;
  };

  let peopleDataItems: NavItem[] = [];

  if (isAuthenticated && isFieldRole(normalizedRole)) {
    mainBefore = AUTH_MAIN_BEFORE.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    manageGroup = MANAGE_SCHOOLS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showManageGroup = manageGroup.length > 0;
    reportsGroup = REPORTS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showReportsGroup = reportsGroup.length > 0;
    peopleDataItems = PEOPLE_DATA_HREFS.map((h) => byHref(h)).filter(
      Boolean
    ) as NavItem[];
  } else if (isAuthenticated && isAdminRole(normalizedRole)) {
    mainBefore = ADMIN_MAIN_BEFORE.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    mainAfter = ADMIN_MAIN_AFTER.map((h) => byHref(h)).filter(filterAdminSettings) as NavItem[];
    dataGroup = MANAGE_DATA_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showDataGroup = dataGroup.length > 0;
    usersGroup = MANAGE_USERS_HREFS.map((h) => byHref(h)).filter(Boolean) as NavItem[];
    showUsersGroup = usersGroup.length > 0;
    // Respect ACL: do not hardcode / fall back past denied project_overview.
    mapItem = byHref('/project-overview');
  } else {
    mainBefore = [byHref('/about')].filter(Boolean) as NavItem[];
    guestOverviewItem = byHref('/project-overview');
    guestSchoolsItem = byHref('/schools');
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
    if (href === '/project-overview') {
      return (
        pathname === '/project-overview' ||
        pathname.startsWith('/project-overview/') ||
        pathname === '/pillars' ||
        pathname.startsWith('/pillars/') ||
        pathname === '/strategy' ||
        pathname.startsWith('/strategy/') ||
        pathname.startsWith('/thailand-map') ||
        pathname.startsWith('/overview')
      );
    }
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      (href === '/strategy' && pathname.startsWith('/overview'))
    );
  };

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
            setAccountOpen(false);
            closeDrawer();
            try {
              await logoutAction();
            } catch {
              // ignore — always hard-navigate below
            }
            // Full load avoids soft-nav hydration mismatch (about-page vs login)
            window.location.assign('/login');
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
          'โรงเรียนในโครงการ',
          School,
          manageGroup,
          manageActive,
          manageRef
        )}
      {peopleDataItems.map((item) => (
        <li key={`bar-${item.href}`}>{renderLink(item, 'bar')}</li>
      ))}
      {showReportsGroup &&
        renderGroup(
          'reports',
          'บันทึกการตรวจเยี่ยม',
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
      {mapItem ? <li key={`bar-${mapItem.href}`}>{renderLink(mapItem, 'bar')}</li> : null}
      {guestOverviewItem ? (
        <li key={`bar-${guestOverviewItem.href}`}>
          {renderLink(guestOverviewItem, 'bar')}
        </li>
      ) : null}
      {guestSchoolsItem ? (
        <li key={`bar-${guestSchoolsItem.href}`}>
          {renderLink(guestSchoolsItem, 'bar')}
        </li>
      ) : null}
    </ul>
  );

  const drawerNav = (
    <ul className="ed-nav-drawer__nav">
      {mainBefore.map((item) => (
        <li key={`drawer-${item.href}`}>{renderLink(item, 'drawer')}</li>
      ))}
      {showManageGroup && (
        <>
          <li className="ed-nav-drawer__group-label">โรงเรียนในโครงการ</li>
          {renderManageMenuItems('drawer')}
        </>
      )}
      {peopleDataItems.length > 0 && (
        <>
          <li className="ed-nav-drawer__group-label">นักเรียนทุน</li>
          {peopleDataItems.map((item) => (
            <li key={`drawer-pd-${item.href}`}>{renderLink(item, 'drawer')}</li>
          ))}
        </>
      )}
      {showReportsGroup && (
        <>
          <li className="ed-nav-drawer__group-label">บันทึกการตรวจเยี่ยม</li>
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
      {mapItem ? (
        <li key={`drawer-${mapItem.href}`}>{renderLink(mapItem, 'drawer')}</li>
      ) : null}
      {guestOverviewItem ? (
        <li key={`drawer-${guestOverviewItem.href}`}>
          {renderLink(guestOverviewItem, 'drawer')}
        </li>
      ) : null}
      {guestSchoolsItem ? (
        <li key={`drawer-${guestSchoolsItem.href}`}>
          {renderLink(guestSchoolsItem, 'drawer')}
        </li>
      ) : null}
    </ul>
  );

  return (
    <>
      <nav
        className={`navbar ed-navbar ${isAuthenticated ? 'ed-navbar--auth' : 'ed-navbar--guest'}`}
        aria-label="หลัก"
      >
        {isAuthenticated ? (
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
        ) : null}

        <Link
          href={isAuthenticated && isFieldRole(normalizedRole) ? '/home' : '/'}
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
              <a href="/login" className="navbar__login">
                <LogIn size={16} />
                <span className="navbar__login-label">เข้าใช้งานระบบ</span>
              </a>
            )}
          </div>
        </div>
      </nav>

      {isAuthenticated ? (
        <>
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
                  <div className="navbar__brand-subtitle">
                    สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="ed-navbar__menu-btn"
                aria-label="ปิดเมนู"
                onClick={closeDrawer}
              >
                <X size={20} />
              </button>
            </div>

            {drawerNav}

            <div className="ed-nav-drawer__footer">
              <div className="ed-nav-drawer__account">
                <div className="ed-nav-drawer__user">
                  <span className="ed-profile-btn__avatar">
                    {displayName.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{displayName}</strong>
                    <span>{roleLabel}</span>
                  </div>
                </div>
                <div className="ed-nav-drawer__account-links">{accountMenuLinks}</div>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
