'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fontScale, setFontScale] = useState(100);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <nav className="navbar ed-navbar" aria-label="หลัก">
      <Link href="/" prefetch className="navbar__brand">
        <div className="navbar__brand-seal" aria-hidden>
          <span>กศ</span>
        </div>
        <div>
          <div className="navbar__brand-name">โครงการกองทุนการศึกษา</div>
          <div className="navbar__brand-subtitle">สร้างโอกาส สร้างคนดี สู่อนาคตที่ยั่งยืน</div>
        </div>
      </Link>

      <div className="ed-navbar__inline">
        <ul className="navbar__nav">
          {items.map((item) => {
            const Icon = ICONS[item.href] ?? Home;
            const active = item.end
              ? pathname === '/'
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === '/strategy' && pathname.startsWith('/overview'));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch
                  className={`navbar__link ${active ? 'navbar__link--active' : ''}`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="ed-navbar__utils">
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

        <div className="ed-navbar__account relative" ref={ref}>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="ed-profile-btn"
                onClick={() => setOpen((v) => !v)}
                disabled={pending || mustChangePassword}
                aria-expanded={open}
              >
                <span className="ed-profile-btn__avatar">{displayName.slice(0, 1)}</span>
                <span className="ed-profile-btn__name">{displayName}</span>
                <ChevronDown size={14} />
              </button>
              {open && (
                <div className="role-menu" role="menu">
                  <div className="role-menu__meta">{ROLE_LABELS[role]}</div>
                  {showProfile && (
                    <Link href="/staff/profile" prefetch className="role-menu__item" onClick={() => setOpen(false)}>
                      <UserRound size={16} /> โปรไฟล์
                    </Link>
                  )}
                  {showManageSchools && (
                    <Link href="/manage-schools" prefetch className="role-menu__item" onClick={() => setOpen(false)}>
                      <Network size={16} /> จัดการโรงเรียน
                    </Link>
                  )}
                  {role === 'staff' && (
                    <Link href="/staff/update-school" prefetch className="role-menu__item" onClick={() => setOpen(false)}>
                      <ClipboardPen size={16} /> อัปเดตโรงเรียน
                    </Link>
                  )}
                  {role === 'staff' && (
                    <Link href="/staff/dashboard" prefetch className="role-menu__item" onClick={() => setOpen(false)}>
                      <Briefcase size={16} /> แดชบอร์ดเจ้าหน้าที่
                    </Link>
                  )}
                  {showSettings && (
                    <Link href="/admin/settings" prefetch className="role-menu__item" onClick={() => setOpen(false)}>
                      <Settings size={16} /> ตั้งค่า
                    </Link>
                  )}
                  <button
                    type="button"
                    className="role-menu__item"
                    onClick={() => {
                      startTransition(async () => {
                        await logoutAction();
                        setOpen(false);
                        router.refresh();
                      });
                    }}
                  >
                    <LogOut size={16} /> ออกจากระบบ
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" prefetch className="navbar__login">
              <LogIn size={16} />
              เข้าใช้งานระบบ
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
