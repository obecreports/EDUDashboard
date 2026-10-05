'use client';

import { useState, useTransition } from 'react';
import { changePasswordAction } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="page-shell" style={{ maxWidth: 480 }}>
      <h1 className="section-heading">ตั้งรหัสผ่านใหม่</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        คุณเข้าสู่ระบบด้วยรหัสชั่วคราว / OTP — กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานพื้นที่อื่น
        (ไม่ต้องกรอกรหัสเดิม)
      </p>

      <form
        className="panel-card space-y-4"
        action={(fd) => {
          setError(null);
          start(async () => {
            const res = await changePasswordAction(null, fd);
            if (res?.error) setError(res.error);
          });
        }}
      >
        <PasswordField
          name="next"
          label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordField
          name="confirm"
          label="ยืนยันรหัสผ่านใหม่"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error && (
          <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
        <button type="submit" className="navbar__login w-full justify-center" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}
        </button>
      </form>
    </div>
  );
}
