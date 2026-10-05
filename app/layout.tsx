import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { HeroGate } from '@/components/layout/HeroGate';
import { getSessionProfile } from '@/lib/auth/session';
import { readHeroSettings } from '@/lib/auth/user-store';

export const metadata: Metadata = {
  title: 'ConED · ระบบข้อมูลโรงเรียนในสังกัด',
  description: 'Connext ED — dashboard, map, and RBAC fieldwork tools',
};

export const viewport: Viewport = {
  themeColor: '#29568f',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ role, profile, isAuthenticated, mustChangePassword }, heroSettings] =
    await Promise.all([getSessionProfile(), Promise.resolve(readHeroSettings())]);

  return (
    <html lang="th">
      <body>
        <AppNavbar
          role={role}
          displayName={profile?.full_name ?? 'ผู้เยี่ยมชม'}
          isAuthenticated={isAuthenticated}
          mustChangePassword={mustChangePassword}
        />
        <HeroGate isAuthenticated={isAuthenticated} settings={heroSettings} />
        <Suspense fallback={null}>
          <main>{children}</main>
        </Suspense>
      </body>
    </html>
  );
}
