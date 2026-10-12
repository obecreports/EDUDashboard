'use client';

import { useState, useTransition } from 'react';
import { issueTempPasswordAction } from '@/app/actions/auth';

export function IssueTempPasswordForm({ userId }: { userId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel-card space-y-3"
      action={(fd) => {
        setMsg(null);
        start(async () => {
          const res = await issueTempPasswordAction(fd);
          setMsg(
            res && 'error' in res && res.error
              ? res.error
              : 'ออก OTP แล้ว — ผู้ใช้ต้องตั้งรหัสผ่านใหม่หลังล็อกอิน (เหมือน first-time login)'
          );
        });
      }}
    >
      <h3 className="font-bold text-tm-blue m-0 text-sm">ออกรหัสชั่วคราว / OTP</h3>
      <p className="text-xs text-slate-500 m-0">
        ใช้สำหรับผู้ใช้ใหม่หรือลืมรหัสผ่าน · ล้างรหัสถาวรอัตโนมัติ · บังคับตั้งรหัสใหม่หลังล็อกอิน
      </p>
      <input type="hidden" name="userId" value={userId} />
      <label className="block text-sm font-semibold">
        OTP / รหัสชั่วคราว
        <input name="tempPassword" className="form-input" required minLength={6} placeholder="TempXXXX" />
      </label>
      <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending}>
        {pending ? 'กำลังออก…' : 'ออก OTP'}
      </button>
      {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}
    </form>
  );
}
