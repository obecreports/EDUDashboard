'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Activity,
  Settings,
  Users,
  UserRound,
  ChevronDown,
  LogIn,
  LogOut,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navForRole, ROLE_LABELS, type UserRole } from '@/lib/types';
import { DROPDOWN_ONLY_HREFS, STAFF_DROPDOWN_HREFS } from '@/lib/auth/mock-users';
import { logoutAction } from '@/app/actions/auth';

const ICONS: Record<string, LucideIcon> = {
  '/': Home,
  '/about': Info,
  '/strategy': Hexagon,
  '/overview': Hexagon,
  '/schools': School,
  '/thailand-map': Map,
  '/staff/calendar': CalendarDays,
  '/staff/reports': FileText,
  '/reports': FileText,
  '/staff/dashboard': Briefcase,
  '/staff/update-school': ClipboardPen,
  '/manage-schools': Network,
  '/overseer/progress': Activity,
  '/admin/accounts': Users,
};

const MAIN_BAR_HREFS = new Set([
  '/',
  '/about',
  '/strategy',
  '/thailand-map',
  '/schools',
  '/staff/calendar',
  '/staff/reports',
]);

export function AppNavbar({
  role,
  displayName,
  isAuthenticated,
  mustChangePassword,
}: {
  role: UserRole;
  displayName: string;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fontScale, setFontScale] = useState(100);
  const accountRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();

  const items = navForRole(role).filter((item) => {
    if (DROPDOWN_ONLY_HREFS.has(item.href)) return false;
    if (role === 'staff' && STAFF_DROPDOWN_HREFS.has(item.href)) return false;
    if (!MAIN_BAR_HREFS.has(item.href)) return false;
    if (!isAuthenticated && (item.href.startsWith('/staff/') || item.href === '/reports')) {
      return false;
    }
    return true;
  });

  const showProfile = role === 'staff' || role === 'overseer' || role === 'admin';
  const showSettings = role === 'admin';
  const showManageSchools = role === 'staff';

  const isActive = (href: string, end?: boolean) =>
    end
      ? pathname === '/'
      : pathname === href ||
        pathname.startsWith(`${href}/`) ||
        (href === '/strategy' && pathname.startsWith('/overview'));

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', drawerOpen);
    return () => document.body.classList.remove('nav-drawer-open');
  }, [drawerOpen]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
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

  const fontControls = (
    <div className="ed-a11y" role="group" aria-label="ขนาดตัวอักษร">
      <button type="button" onClick={() => setFontScale((s) => Math.max(90, s - 10))} aria-label="ลดขนาดตัวอักษร">
        ก-
      </button>
      <button type="button" onClick={() => setFontScale(100)} aria-label="ขนาดปกติ">
        ก
      </button>
      <button type="button" onClick={() => setFontScale((s) => Math.min(125, s + 10))} aria-label="เพิ่มขนาดตัวอักษร">
        ก+
      </button>
    </div>
  );

  const accountMenuLinks = (
    <>
      {showProfile && (
        <Link href="/staff/profile" prefetch className="role-menu__item" onClick={() => { setAccountOpen(false); closeDrawer(); }}>
          <UserRound size={16} /> โปรไฟล์
        </Link>
      )}
      {showManageSchools && (
        <Link href="/manage-schools" prefetch className="role-menu__item" onClick={() => { setAccountOpen(false); closeDrawer(); }}>
          <Network size={16} /> จัดการโรงเรียน
        </Link>
      )}
      {role === 'staff' && (
        <Link href="/staff/update-school" prefetch className="role-menu__item" onClick={() => { setAccountOpen(false); closeDrawer(); }}>
          <ClipboardPen size={16} /> อัปเดตโรงเรียน
        </Link>
      )}
      {role === 'staff' && (
        <Link href="/staff/dashboard" prefetch className="role-menu__item" onClick={() => { setAccountOpen(false); closeDrawer(); }}>
          <Briefcase size={16} /> แดชบอร์ดเจ้าหน้าที่
        </Link>
      )}
      {showSettings && (
        <Link href="/admin/settings" prefetch className="role-menu__item" onClick={() => { setAccountOpen(false); closeDrawer(); }}>
          <Settings size={16} /> ตั้งค่า
        </Link>
      )}
      <button
        type="button"
        className="role-menu__item"
        onClick={() => {
          startTransition(async () => {
            await logoutAction();
            setAccountOpen(false);
            closeDrawer();
            router.refresh();
          });
        }}
      >
        <LogOut size={16} /> ออกจากระบบ
      </button>
    </>
  );

  const navLinks = (variant: 'bar' | 'drawer') =>
    items.map((item) => {
      const Icon = ICONS[item.href] ?? Home;
      const active = isActive(item.href, item.end);
      return (
        <li key={`${variant}-${item.href}`}>
          <Link
            href={item.href}
            prefetch
            className={`navbar__link ${active ? 'navbar__link--active' : ''}`}
            onClick={variant === 'drawer' ? closeDrawer : undefined}
          >
            <Icon size={variant === 'drawer' ? 18 : 15} />
            {item.label}
          </Link>
        </li>
      );
    });

  return (
    <>
      <nav className="navbar ed-navbar" aria-label="หลัก">
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

        <Link href="/" prefetch className="navbar__brand" onClick={closeDrawer}>
          <Image
            src="/images/Logo/EDU_Logo.png"
            alt=""
            width={46}
            height={46}
            className="navbar__brand-seal navbar__brand-logo"
            priority
          />
          <div className="navbar__brand-text">
            <div className="navbar__brand-name">โครงการกองทุนการศึกษา</div>
            <div className="navbar__brand-subtitle">สร้างโอกาส สร้างคนดี สู่อนาคตที่ยั่งยืน</div>
          </div>
        </Link>

        <div className="ed-navbar__inline ed-navbar__inline--desktop">
          <ul className="navbar__nav">{navLinks('bar')}</ul>
        </div>

        <div className="ed-navbar__utils">
          <div className="ed-navbar__utils-desktop">{fontControls}</div>

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
                    <div className="role-menu__meta">{ROLE_LABELS[role]}</div>
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
              <div className="navbar__brand-subtitle">เมนูหลัก</div>
            </div>
          </div>
          <button type="button" className="ed-navbar__menu-btn" aria-label="ปิดเมนู" onClick={closeDrawer}>
            <X size={20} />
          </button>
        </div>

        <ul className="ed-nav-drawer__nav">{navLinks('drawer')}</ul>

        <div className="ed-nav-drawer__footer">
          {fontControls}
          {isAuthenticated ? (
            <div className="ed-nav-drawer__account">
              <div className="ed-nav-drawer__user">
                <span className="ed-profile-btn__avatar">{displayName.slice(0, 1)}</span>
                <div>
                  <strong>{displayName}</strong>
                  <span>{ROLE_LABELS[role]}</span>
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
