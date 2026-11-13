'use client';

import Image from 'next/image';
import Link from 'next/link';
import { isFieldRole } from '@/lib/auth/scope';
import { type ContentAccessMap } from '@/lib/auth/content-access';
import { normalizeRole, type UserRole } from '@/lib/types';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

/**
 * Field-role mobile chrome (top + bottom). Visibility is CSS-driven via
 * body[data-field-mobile="1"] @ max-width 900px so there is no hamburger flash.
 */
export function MobileFieldShell({
  role,
  isAuthenticated,
  contentAccess,
}: {
  role: UserRole;
  isAuthenticated: boolean;
  contentAccess?: ContentAccessMap | null;
}) {
  const field = isAuthenticated && isFieldRole(normalizeRole(role));
  if (!field) return null;

  return (
    <>
      <header className="mfs-top" aria-label="หัวข้อมือถือ">
        <Link href="/dashboard" prefetch className="mfs-top__brand">
          <Image
            src="/images/Logo/EDU_Logo.png"
            alt=""
            width={28}
            height={28}
            className="mfs-top__logo"
            priority
          />
          <span className="mfs-top__title">กองทุนการศึกษา</span>
        </Link>
      </header>
      <MobileBottomNav role={role} contentAccess={contentAccess} />
    </>
  );
}
