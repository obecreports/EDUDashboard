'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import { PasswordField } from '@/components/auth/PasswordField';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Global is public-only — hide guest credentials from login tips
  const tips = MOCK_USER_SEEDS.filter((u) => u.role !== 'global');

  return (
    <div className="page-shell" style={{ maxWidth: 480 }}>
      <h1 className="section-heading">เข้าใช้งานระบบ</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        ใช้บัญชีทดสอบตามบทบาทด้านล่าง หรือรหัส OTP ชั่วคราวของ Staff
      </p>

      <form
        className="panel-card space-y-4"
        action={(fd) => {
          setError(null);
          start(async () => {
            const res = await loginAction(null, fd);
            if (res?.error) setError(res.error);
          });
        }}
      >
        <label className="block text-sm">
          อีเมล
          <input
            name="email"
            type="email"
            className="form-input"
            required
            placeholder="staff@coned.local"
            autoComplete="username"
          />
        </label>
        <PasswordField
          name="password"
          label="รหัสผ่าน / OTP"
          required
          autoComplete="current-password"
        />
        {error && (
          <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
        <button type="submit" className="navbar__login w-full justify-center" disabled={pending}>
          {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <div className="panel-card mt-4">
        <h2 className="font-bold text-tm-blue text-sm mb-2">บัญชีทดสอบ (Mock)</h2>
        <ul className="text-xs space-y-2 m-0 p-0 list-none text-slate-600">
          {tips.map((u) => (
            <li key={u.id} className="rounded-lg bg-slate-50 p-2 border border-slate-100">
              <strong>{u.role}</strong> — {u.email}
              <br />
              {u.password ? `รหัส: ${u.password}` : ''}
              {u.tempPassword ? `OTP ชั่วคราว: ${u.tempPassword}` : ''}
              {u.mustChangePassword ? ' · บังคับเปลี่ยนรหัสหลังล็อกอิน' : ''}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-3 mb-0">
          ผู้เยี่ยมชม (Global) ใช้งานสาธารณะได้โดยไม่ต้องเข้าสู่ระบบ ·{' '}
          <Link href="/" className="text-tm-blue">
            ← กลับหน้าหลัก
          </Link>
        </p>
      </div>
    </div>
  );
}
