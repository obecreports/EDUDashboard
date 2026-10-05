'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  School,
  LayoutDashboard,
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navForRole, ROLE_LABELS, type UserRole } from '@/lib/types';
import { DROPDOWN_ONLY_HREFS, STAFF_DROPDOWN_HREFS } from '@/lib/auth/mock-users';
import { logoutAction } from '@/app/actions/auth';

const ICONS: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/schools': School,
  '/thailand-map': Map,
  '/staff/dashboard': Briefcase,
  '/staff/calendar': CalendarDays,
  '/staff/update-school': ClipboardPen,
  '/manage-schools': Network,
  '/overseer/progress': Activity,
  '/admin/accounts': Users,
};

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
  const ref = useRef<HTMLDivElement>(null);

  const items = navForRole(role).filter((item) => {
    if (DROPDOWN_ONLY_HREFS.has(item.href)) return false;
    if (role === 'staff' && STAFF_DROPDOWN_HREFS.has(item.href)) return false;
    return true;
  });

  const showProfile = role === 'staff' || role === 'overseer' || role === 'admin';
  const showSettings = role === 'admin';
  const showManageSchools = role === 'staff';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <nav className="navbar" aria-label="หลัก">
      <Link href="/" className="navbar__brand">
        <div className="navbar__brand-icon">
          <School size={22} />
        </div>
        <div>
          <div className="navbar__brand-name">
            Con<span>ED</span>
          </div>
          <div className="navbar__brand-subtitle">ระบบข้อมูลโรงเรียนในสังกัด</div>
        </div>
      </Link>

      <ul className="navbar__nav">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? LayoutDashboard;
          const active = item.end
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={true}
                className={`navbar__link ${active ? 'navbar__link--active' : ''}`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="relative" ref={ref} style={{ position: 'relative' }}>
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="navbar__login"
              onClick={() => setOpen((v) => !v)}
              disabled={pending}
              aria-expanded={open}
            >
              <span
                className="navbar__avatar"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {displayName.slice(0, 1)}
              </span>
              {displayName}
              <ChevronDown size={14} />
            </button>
            {open && (
              <div className="role-menu" role="menu">
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#8a9aab',
                    padding: '8px 12px 4px',
                  }}
                >
                  {ROLE_LABELS[role]}
                  {mustChangePassword ? ' · ต้องเปลี่ยนรหัสผ่าน' : ''}
                </div>
                {showProfile && (
                  <Link
                    href="/staff/profile"
                    className="role-menu__item"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => setOpen(false)}
                  >
                    <UserRound size={16} />
                    โปรไฟล์
                  </Link>
                )}
                {showManageSchools && (
                  <Link
                    href="/manage-schools"
                    className="role-menu__item"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => setOpen(false)}
                  >
                    <Network size={16} />
                    จัดการโรงเรียน
                  </Link>
                )}
                {showSettings && (
                  <Link
                    href="/admin/settings"
                    className="role-menu__item"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => setOpen(false)}
                  >
                    <Settings size={16} />
                    ตั้งค่า
                  </Link>
                )}
                <button
                  type="button"
                  className="role-menu__item"
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    startTransition(async () => {
                      await logoutAction();
                      setOpen(false);
                      router.refresh();
                    });
                  }}
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </>
        ) : (
          <Link href="/login" className="navbar__login">
            <LogIn size={16} />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </nav>
  );
}
