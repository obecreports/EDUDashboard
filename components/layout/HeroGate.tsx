'use client';

import { usePathname } from 'next/navigation';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { shouldShowHero, type HeroSiteSettings } from '@/lib/auth/mock-users';

export function HeroGate({
  isAuthenticated,
  settings,
}: {
  isAuthenticated: boolean;
  settings: HeroSiteSettings;
}) {
  const pathname = usePathname() || '/';
  if (!shouldShowHero(pathname)) return null;
  return <HeroBanner isAuthenticated={isAuthenticated} settings={settings} />;
}
