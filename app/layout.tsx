import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppFooter } from '@/components/layout/AppFooter';
import { HeroGate } from '@/components/layout/HeroGate';
import { PendingNav } from '@/components/layout/PendingNav';
import { getSessionProfile } from '@/lib/auth/session';
import { readHeroSettings } from '@/lib/auth/user-store';
import { formatPersonLabel } from '@/lib/types';

export const metadata: Metadata = {
  title: 'โครงการกองทุนการศึกษา · Connext ED',
  description: 'สร้างคนดีให้บ้านเมือง — ระบบติดตามโรงเรียนในโครงการกองทุนการศึกษา',
};

export const viewport: Viewport = {
  themeColor: '#0B4DA2',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ role, profile, isAuthenticated, mustChangePassword }, heroSettings] =
    await Promise.all([getSessionProfile(), readHeroSettings()]);

  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body>
        <PendingNav />
        <AppNavbar
          role={role}
          overseerTier={profile?.overseer_tier ?? null}
          displayName={
            profile
              ? formatPersonLabel(role, profile.name_prefix, profile.full_name) ||
                'ผู้เยี่ยมชม'
              : 'ผู้เยี่ยมชม'
          }
          isAuthenticated={isAuthenticated}
          mustChangePassword={mustChangePassword}
        />
        <HeroGate isAuthenticated={isAuthenticated} settings={heroSettings} />
        <Suspense fallback={null}>
          <main className="ed-main">{children}</main>
        </Suspense>
        <AppFooter />
      </body>
    </html>
  );
}
