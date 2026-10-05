'use client';

import { useState, useTransition } from 'react';
import { issueTempPasswordAction } from '@/app/actions/auth';

export function IssueTempPasswordForm({
  users,
}: {
  users: { id: string; email: string; full_name: string }[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel-card space-y-3"
      action={(fd) => {
        start(async () => {
          const res = await issueTempPasswordAction(fd);
          setMsg(res && 'error' in res && res.error ? res.error : 'ออก OTP ชั่วคราวแล้ว (ไม่มีวันหมดอายุ)');
        });
      }}
    >
      <h3 className="font-bold text-tm-blue m-0 text-sm">ออกรหัสชั่วคราว / OTP</h3>
      <label className="block text-sm">
        ผู้ใช้
        <select name="userId" className="form-input" required defaultValue="">
          <option value="" disabled>
            — เลือก —
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.email})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        OTP / รหัสชั่วคราว
        <input name="tempPassword" className="form-input" required minLength={6} placeholder="TempXXXX" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="clearPermanent" value="1" />
        ล้างรหัสถาวร (โหมดผู้ใช้ใหม่ — มีเฉพาะ OTP)
      </label>
      <button type="submit" className="navbar__login" disabled={pending}>
        ออก OTP
      </button>
      {msg && <p className="text-sm text-tm-blue font-medium m-0">{msg}</p>}
    </form>
  );
}
