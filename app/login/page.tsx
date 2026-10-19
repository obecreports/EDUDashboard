'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { MOCK_LOGIN_PASSWORD, MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import { PasswordField } from '@/components/auth/PasswordField';
import { ROLE_LABELS, normalizeRole } from '@/lib/types';

/** Other demo accounts (OS10 chain shown separately below) */
const TIP_ORDER = ['OS01', 'sirdawpong', 'sirthanu'];

/** Sample Type 2 under OS10 (migration 020; password = MOCK_LOGIN_PASSWORD) */
const OS10_TYPE2_SAMPLES = [
  { id: 'OS10T01', name: 'นางสาวสุนันทา แสงทอง' },
  { id: 'OS10T02', name: 'นางวรรณดี นาคสุขปาน' },
  { id: 'OS10T03', name: 'นายอนันต์ กัลปะ' },
  { id: 'OS10T04', name: 'นายเสวก สังขจันทร์' },
  { id: 'OS10T05', name: 'นายวิบูลย์ ชมละม้าย' },
] as const;

const INVALID_LOGIN_MSG = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';

function tipByLogin(loginId: string) {
  return MOCK_USER_SEEDS.find((u) => u.email.toLowerCase() === loginId.toLowerCase());
}

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const os10 = tipByLogin('OS10');
  const as01 = tipByLogin('AS01');
  const staff01 = tipByLogin('staff01');
  const staff02 = tipByLogin('staff02');

  const tips = TIP_ORDER.map((id) => tipByLogin(id)).filter(
    (u): u is (typeof MOCK_USER_SEEDS)[number] =>
      Boolean(u) && u!.role !== 'admin' && u!.role !== 'super_admin'
  );

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
            placeholder="OS10 / OS10T01 / staff01"
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
        <p className="text-xs text-slate-500 m-0 mb-2">
          รหัสผ่าน: <code>{MOCK_LOGIN_PASSWORD}</code>
        </p>

        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-xs text-slate-600 mb-2">
          <strong className="text-tm-blue">ตัวอย่าง · สายการทำงาน</strong>
          <p className="m-0 mt-1 text-slate-500">
            
          </p>
          <ul className="m-0 mt-2 p-0 list-none space-y-1.5 font-mono text-[0.7rem] leading-snug">
            <li>
              <code>sirdawpong</code>
              <span className="font-sans text-slate-500"> · ผู้กำกับสูงสุด</span>
            </li>
            <li className="pl-3 border-l-2 border-slate-200">
              <code>OS10</code>
              <span className="font-sans text-slate-600">
                {' '}
                · องคมนตรี
                {os10 ? ` · ${os10.name_prefix ?? ''} ${os10.full_name}`.trim() : ''}
              </span>
            </li>
            <li className="pl-6 border-l-2 border-slate-200">
              <span className="font-sans font-semibold text-slate-700">อาสาสมัคร</span>
              <span className="font-sans text-slate-500"> · ตัวอย่าง OS10T01–OS10T05</span>
              <ul className="m-0 mt-1 p-0 list-none space-y-0.5 pl-1">
                {OS10_TYPE2_SAMPLES.map((t) => (
                  <li key={t.id}>
                    <code>{t.id}</code>
                    <span className="font-sans text-slate-600"> · {t.name}</span>
                  </li>
                ))}
              </ul>
              <p className="font-sans text-slate-400 m-0 mt-1">
                (มีถึง <code>OS10T15</code> · รหัสเดียวกัน)
              </p>
            </li>
            <li className="pl-6 border-l-2 border-slate-200">
              
            </li>
            <li className="pl-9 border-l-2 border-slate-200">
              <span className="font-sans font-semibold text-slate-700">ศึกษานิเทศก์</span>
              <ul className="m-0 mt-1 p-0 list-none space-y-0.5 pl-1">
                {staff01 && (
                  <li>
                    <code>staff01</code>
                    <span className="font-sans text-slate-600"> · {staff01.full_name}</span>
                  </li>
                )}
                {staff02 && (
                  <li>
                    <code>staff02</code>
                    <span className="font-sans text-slate-600"> · {staff02.full_name}</span>
                  </li>
                )}
              </ul>
              <p className="font-sans text-slate-400 m-0 mt-1">
              </p>
            </li>
          </ul>
        </div>

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
            องคมนตรี Type 1 ทั้ง 14 คน: <code>OS01</code>–<code>OS14</code> · รหัสเดียวกัน
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
