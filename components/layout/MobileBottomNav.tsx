'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Briefcase,
  CalendarPlus,
  ClipboardPlus,
  School,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  canAccessHref,
  type ContentAccessMap,
} from '@/lib/auth/content-access';
import { normalizeRole, type UserRole } from '@/lib/types';

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  elevated?: boolean;
  match: (path: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: '/home',
    label: 'หน้าของฉัน',
    icon: Briefcase,
    match: (p) => p === '/home' || p.startsWith('/home/'),
  },
  {
    href: '/calendar/new',
    label: 'นัดหมาย',
    icon: CalendarPlus,
    match: (p) => p.startsWith('/calendar'),
  },
  {
    href: '/reports/new',
    label: 'ส่งบันทึก',
    icon: ClipboardPlus,
    elevated: true,
    match: (p) => p.startsWith('/reports'),
  },
  {
    href: '/schools',
    label: 'โรงเรียน',
    icon: School,
    match: (p) => p === '/schools' || p.startsWith('/schools/'),
  },
  {
    href: '/staff/profile',
    label: 'โปรไฟล์',
    icon: UserRound,
    match: (p) => p.startsWith('/staff/profile'),
  },
];

export function MobileBottomNav({
  role,
  contentAccess,
}: {
  role: UserRole;
  contentAccess?: ContentAccessMap | null;
}) {
  const pathname = usePathname() || '/';
  const r = normalizeRole(role);
  const tabs = TABS.filter((t) =>
    canAccessHref(r, t.href, 'view', contentAccess ?? undefined)
  );

  // Hide bottom bar while scrolling down (finger swipe up); show on scroll up
  useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 24) {
          document.body.classList.remove('mfs-bottom-hidden');
        } else if (dy > 6) {
          document.body.classList.add('mfs-bottom-hidden');
        } else if (dy < -6) {
          document.body.classList.remove('mfs-bottom-hidden');
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.body.classList.remove('mfs-bottom-hidden');
    };
  }, []);

  if (tabs.length === 0) return null;

  return (
    <nav className="mfs-bottom" aria-label="เมนูมือถือ">
      <ul className="mfs-bottom__list">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="mfs-bottom__item">
              <Link
                href={tab.href}
                prefetch
                className={`mfs-bottom__link${active ? ' is-active' : ''}${
                  tab.elevated ? ' mfs-bottom__link--elevated' : ''
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mfs-bottom__icon" aria-hidden>
                  <Icon size={tab.elevated ? 22 : 20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="mfs-bottom__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
