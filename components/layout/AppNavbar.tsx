'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  School,
  LayoutDashboard,
  Map,
  Briefcase,
  UserRound,
  CalendarDays,
  ClipboardPen,
  Network,
  Activity,
  Settings,
  Users,
  ChevronDown,
  LogIn,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navForRole, ROLE_LABELS, type UserRole } from '@/lib/types';
import { setDemoRole } from '@/app/actions/role';

const ICONS: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/schools': School,
  '/thailand-map': Map,
  '/staff/dashboard': Briefcase,
  '/staff/profile': UserRound,
  '/staff/calendar': CalendarDays,
  '/staff/update-school': ClipboardPen,
  '/manage-schools': Network,
  '/overseer/progress': Activity,
  '/admin/settings': Settings,
  '/admin/accounts': Users,
};

export function AppNavbar({
  role,
  displayName,
  isDemo,
}: {
  role: UserRole;
  displayName: string;
  isDemo: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const items = navForRole(role);

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
        <button
          type="button"
          className="navbar__login"
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
        >
          {isDemo ? <LogIn size={16} /> : null}
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
                textTransform: 'uppercase',
              }}
            >
              {isDemo ? 'สลับบทบาท (Demo)' : 'บทบาทปัจจุบัน'}
            </div>
            {(isDemo ? (['global', 'staff', 'overseer', 'admin'] as UserRole[]) : [role]).map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  className={`role-menu__item ${role === r ? 'role-menu__item--active' : ''}`}
                  onClick={() => {
                    if (!isDemo) return;
                    startTransition(async () => {
                      await setDemoRole(r);
                      setOpen(false);
                      router.refresh();
                    });
                  }}
                >
                  {ROLE_LABELS[r]}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

