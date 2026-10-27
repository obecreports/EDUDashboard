'use client';

/**
 * Page content wrapper. Do not remount via pathname key — that races soft
 * navigations and hydrates prior-route HTML (e.g. about-page) against login.
 * Auth entry (/login) uses full document loads from the navbar instead.
 */
export function PathKeyedMain({ children }: { children: React.ReactNode }) {
  return <main className="ed-main">{children}</main>;
}
