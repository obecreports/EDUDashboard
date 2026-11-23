'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction, touchSessionAction } from '@/app/actions/auth';
import { IDLE_WARN_BEFORE_MS } from '@/lib/auth/mock-users';

export function SessionIdleGuard({
  idleLimitMs,
  initialLastActiveAt,
}: {
  idleLimitMs: number;
  /** ms epoch from server session cookie */
  initialLastActiveAt: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [warnOpen, setWarnOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActiveRef = useRef(initialLastActiveAt || Date.now());
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    tickRef.current = null;
  }, []);

  const forceLogout = useCallback(() => {
    clearTimers();
    setWarnOpen(false);
    start(async () => {
      try {
        await logoutAction();
      } catch {
        /* ignore */
      }
      window.location.assign('/login?timeout=1');
    });
  }, [clearTimers]);

  const schedule = useCallback(
    (from: number) => {
      clearTimers();
      setWarnOpen(false);
      lastActiveRef.current = from;
      const now = Date.now();
      const expireAt = from + idleLimitMs;
      const warnAt = expireAt - IDLE_WARN_BEFORE_MS;
      const msToWarn = Math.max(0, warnAt - now);
      const msToLogout = Math.max(0, expireAt - now);

      if (msToLogout <= 0) {
        forceLogout();
        return;
      }

      warnTimerRef.current = setTimeout(() => {
        setWarnOpen(true);
        const updateLeft = () => {
          const left = Math.max(
            0,
            Math.ceil((lastActiveRef.current + idleLimitMs - Date.now()) / 1000)
          );
          setSecondsLeft(left);
          if (left <= 0) forceLogout();
        };
        updateLeft();
        tickRef.current = setInterval(updateLeft, 1000);
      }, msToWarn);

      logoutTimerRef.current = setTimeout(() => {
        forceLogout();
      }, msToLogout);
    },
    [clearTimers, forceLogout, idleLimitMs]
  );

  useEffect(() => {
    schedule(initialLastActiveAt || Date.now());
    return clearTimers;
  }, [initialLastActiveAt, schedule, clearTimers]);

  const stayLoggedIn = () => {
    start(async () => {
      const res = await touchSessionAction();
      if (!res.ok) {
        forceLogout();
        return;
      }
      schedule(res.lastActiveAt);
      router.refresh();
    });
  };

  if (!warnOpen) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="session-idle-overlay" role="dialog" aria-modal="true">
      <div className="session-idle-modal panel-card">
        <h2 className="text-base font-bold text-tm-blue m-0">เซสชันกำลังจะหมดอายุ</h2>
        <p className="text-sm text-slate-600 m-0 mt-2">
          หากไม่มีการใช้งาน ระบบจะออกจากระบบอัตโนมัติในอีก{' '}
          <strong>
            {mins}:{String(secs).padStart(2, '0')}
          </strong>{' '}
          นาที
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className="ed-btn ed-btn--primary ed-btn--sm"
            disabled={pending}
            onClick={stayLoggedIn}
          >
            {pending ? 'กำลังบันทึก…' : 'อยู่ต่อ'}
          </button>
          <button
            type="button"
            className="ed-btn ed-btn--outline ed-btn--sm"
            disabled={pending}
            onClick={forceLogout}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
