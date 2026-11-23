'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Info, Layers, School, type LucideIcon } from 'lucide-react';

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
};

/** Same 3 links as guest desktop navbar (about / overview / schools). */
const GUEST_TABS: Tab[] = [
  {
    href: '/about',
    label: 'เกี่ยวกับ',
    icon: Info,
    match: (p) => p === '/about' || p.startsWith('/about/'),
  },
  {
    href: '/project-overview',
    label: 'ภาพรวม',
    icon: Layers,
    match: (p) =>
      p === '/project-overview' || p.startsWith('/project-overview/'),
  },
  {
    href: '/schools',
    label: 'โรงเรียน',
    icon: School,
    match: (p) =>
      p === '/schools' ||
      (p.startsWith('/schools/') && !p.startsWith('/schools/public')),
  },
];

export function MobileGuestBottomNav() {
  const pathname = usePathname() || '/';

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

  return (
    <nav className="mfs-bottom" aria-label="เมนูมือถือผู้เยี่ยมชม">
      <ul className="mfs-bottom__list">
        {GUEST_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="mfs-bottom__item">
              <Link
                href={tab.href}
                prefetch
                className={`mfs-bottom__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mfs-bottom__icon" aria-hidden>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
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
