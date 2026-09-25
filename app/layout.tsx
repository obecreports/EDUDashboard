import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { getSessionProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'ConED · ระบบข้อมูลโรงเรียนในสังกัด',
  description: 'Connext ED — dashboard, map, and RBAC fieldwork tools',
};

export const viewport: Viewport = {
  themeColor: '#29568f',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, isDemo } = await getSessionProfile();

  return (
    <html lang="th">
      <body>
        <AppNavbar
          role={role}
          displayName={profile?.full_name ?? 'ผู้เยี่ยมชม'}
          isDemo={isDemo}
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
