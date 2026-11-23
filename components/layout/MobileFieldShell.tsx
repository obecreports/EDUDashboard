'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { isFieldRole } from '@/lib/auth/scope';
import { type ContentAccessMap } from '@/lib/auth/content-access';
import { normalizeRole, type UserRole } from '@/lib/types';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileGuestBottomNav } from '@/components/layout/MobileGuestBottomNav';
import { logoutAction } from '@/app/actions/auth';

/**
 * Mobile chrome:
 * - Guest: bottom bar with 3 public navbar links
 * - Field login: top brand + logout + 5-tab bottom bar
 * Visibility via body[data-field-mobile] / body[data-guest-mobile] @ ≤767px
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const field = isAuthenticated && isFieldRole(normalizeRole(role));

  if (!isAuthenticated) {
    return <MobileGuestBottomNav />;
  }

  if (!field) return null;

  const onLogout = () => {
    start(async () => {
      try {
        await logoutAction();
      } catch {
        /* client hard-navigates anyway */
      }
      window.location.assign('/login');
      router.refresh();
    });
  };

  return (
    <>
      <header className="mfs-top" aria-label="หัวข้อมือถือ">
        <Link href="/home" prefetch className="mfs-top__brand">
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
        <button
          type="button"
          className="mfs-top__logout"
          onClick={onLogout}
          disabled={pending}
          aria-label="ออกจากระบบ"
        >
          <LogOut size={18} />
          <span>{pending ? '…' : 'ออกจากระบบ'}</span>
        </button>
      </header>
      <MobileBottomNav role={role} contentAccess={contentAccess} />
    </>
  );
}
