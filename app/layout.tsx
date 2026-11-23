import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppFooter } from '@/components/layout/AppFooter';
import { HeroGate } from '@/components/layout/HeroGate';
import { SessionIdleGuard } from '@/components/auth/SessionIdleGuard';
import { MobileFieldShell } from '@/components/layout/MobileFieldShell';
import { PathKeyedMain } from '@/components/layout/PathKeyedMain';
import { PendingNav } from '@/components/layout/PendingNav';
import { idleTimeoutMs } from '@/lib/auth/mock-users';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole } from '@/lib/auth/scope';
import {
  readContentAccessMapStored,
  readHeroSettings,
} from '@/lib/auth/user-store';
import { formatPersonLabel, normalizeRole } from '@/lib/types';

export const metadata: Metadata = {
  title: 'โครงการกองทุนการศึกษา',
  description: 'สร้างคนดีให้บ้านเมือง — ระบบติดตามโรงเรียนในโครงการกองทุนการศึกษา',
};

export const viewport: Viewport = {
  themeColor: '#0B4DA2',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ role, profile, isAuthenticated, mustChangePassword, session }, heroSettings, contentAccess] =
    await Promise.all([
      getSessionProfile(),
      readHeroSettings(),
      readContentAccessMapStored(),
    ]);

  const fieldMobile =
    isAuthenticated && isFieldRole(normalizeRole(role)) ? '1' : undefined;
  const guestMobile = !isAuthenticated ? '1' : undefined;
  const idleLimitMs = idleTimeoutMs(normalizeRole(role));
  const lastActiveAt = session?.lastActiveAt ?? Date.now();

  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body data-field-mobile={fieldMobile} data-guest-mobile={guestMobile}>
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
          contentAccess={contentAccess}
        />
        <MobileFieldShell
          role={normalizeRole(role)}
          isAuthenticated={isAuthenticated}
          contentAccess={contentAccess}
        />
        {isAuthenticated ? (
          <SessionIdleGuard
            idleLimitMs={idleLimitMs}
            initialLastActiveAt={lastActiveAt}
          />
        ) : null}
        <HeroGate isAuthenticated={isAuthenticated} settings={heroSettings} />
        <Suspense fallback={null}>
          <PathKeyedMain>{children}</PathKeyedMain>
        </Suspense>
        <AppFooter />
      </body>
    </html>
  );
}
