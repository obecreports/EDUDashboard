'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Shows a wait overlay when the user clicks an internal link or submits a form,
 * so they know the click registered while the next page/action loads.
 */
export function PendingNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPending(false);
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const armPending = () => {
      setPending(true);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setPending(false), 12000);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!el) return;
      const href = el.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (el.target === '_blank' || el.hasAttribute('download')) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }
      startTransition(armPending);
    };

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || form.tagName !== 'FORM') return;
      if (form.dataset.noPending === '1') return;
      startTransition(armPending);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [startTransition]);

  if (!pending) return null;

  return (
    <div className="nav-pending" role="status" aria-live="polite" aria-busy="true">
      <div className="nav-pending__card">
        <span className="nav-pending__spinner" aria-hidden />
        <div>
          <strong>กำลังโหลด…</strong>
          <p className="m-0 text-sm opacity-90">รับคำสั่งแล้ว กรุณารอสักครู่</p>
        </div>
      </div>
    </div>
  );
}
