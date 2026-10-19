'use client';

import { usePathname } from 'next/navigation';

/**
 * Remount page content on route change so SSR HTML from a prior route
 * (e.g. home about-page) cannot hydrate against a different page (login).
 */
export function PathKeyedMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  return (
    <main className="ed-main" key={pathname}>
      {children}
    </main>
  );
}
