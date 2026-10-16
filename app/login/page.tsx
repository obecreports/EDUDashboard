'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { MOCK_LOGIN_PASSWORD, MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import { PasswordField } from '@/components/auth/PasswordField';
import { ROLE_LABELS, normalizeRole } from '@/lib/types';

const TIP_ORDER = [
  'staff01',
  'staff02',
  'AS01',
  'OS01',
  'OS10',
  'sirdawpong',
  'sirthanu',
  'admin',
];

const INVALID_LOGIN_MSG = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tips = TIP_ORDER.map((id) =>
    MOCK_USER_SEEDS.find((u) => u.email.toLowerCase() === id.toLowerCase())
  ).filter(Boolean) as typeof MOCK_USER_SEEDS;

  return (
    <div className="page-shell" style={{ maxWidth: 480 }}>
      <h1 className="section-heading">เข้าใช้งานระบบ</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        ใช้รหัสผู้ใช้ด้านล่าง · รหัสผ่านเริ่มต้น {MOCK_LOGIN_PASSWORD}
      </p>

      <form
        className="panel-card space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData();
          fd.set('login', login.trim());
          fd.set('password', password);
          start(async () => {
            const res = await loginAction(null, fd);
            if (res?.error) {
              setPassword('');
              setError(INVALID_LOGIN_MSG);
            }
          });
        }}
      >
        <label className="block text-sm">
          รหัสผู้ใช้
          <input
            name="login"
            type="text"
            className="form-input"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="staff01 / OS01 / sirdawpong"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <PasswordField
          name="password"
          label="รหัสผ่าน"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
              <strong>
                {ROLE_LABELS[normalizeRole(u.role)]} · {u.full_name}
              </strong>{' '}
              — <code>{u.email}</code>
              <br />
              รหัส: {u.password ?? MOCK_LOGIN_PASSWORD}
              {u.tempPassword ? ` · OTP ชั่วคราว: ${u.tempPassword}` : ''}
            </li>
          ))}
          <li className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-slate-500">
            องคมนตรีทั้ง 14 คน: <code>OS01</code>–<code>OS14</code> · รหัสเดียวกัน
          </li>
        </ul>
        <p className="text-xs text-slate-400 mt-3 mb-0">
          ผู้เยี่ยมชม (Guest) ใช้งานสาธารณะได้โดยไม่ต้องเข้าสู่ระบบ ·{' '}
          <Link href="/" className="text-tm-blue">
            ← กลับหน้าหลัก
          </Link>
        </p>
      </div>
    </div>
  );
}
