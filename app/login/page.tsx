import Link from 'next/link';
import { LoginFormClient } from '@/components/auth/LoginFormClient';
import { MOCK_LOGIN_PASSWORD, MOCK_USER_SEEDS } from '@/lib/auth/mock-users';
import { ROLE_LABELS, normalizeRole } from '@/lib/types';

/** Other demo accounts (OS10 chain shown separately below) */
const TIP_ORDER = ['OS01', 'sirdawpong', 'sirthanu'];

/** Sample Type 2 under OS10 (migration 020) */
const OS10_TYPE2_SAMPLES = [
  { id: 'OS10T01', name: 'นางสาวสุนันทา แสงทอง' },
  { id: 'OS10T02', name: 'นางวรรณดี นาคสุขปาน' },
  { id: 'OS10T03', name: 'นายอนันต์ กัลปะ' },
] as const;

function tipByLogin(loginId: string) {
  return MOCK_USER_SEEDS.find((u) => u.email.toLowerCase() === loginId.toLowerCase());
}

export default function LoginPage() {
  const os10 = tipByLogin('OS10');
  const so = tipByLogin('sirdawpong');
  const staff03 = tipByLogin('staff03');
  const staff04 = tipByLogin('staff04');

  const tips = TIP_ORDER.map((id) => tipByLogin(id)).filter(
    (u): u is (typeof MOCK_USER_SEEDS)[number] =>
      Boolean(u) && u!.role !== 'admin' && u!.role !== 'super_admin'
  );

  const soLabel = so
    ? [so.position, so.name_prefix, so.full_name].filter(Boolean).join(' · ')
    : 'ผู้กำกับดูแลสูงสุด';

  return (
    <div className="page-shell" style={{ maxWidth: 480 }}>
      <h1 className="section-heading">เข้าใช้งานระบบ</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        ใช้รหัสผู้ใช้และรหัสผ่านด้านล่าง
      </p>

      <LoginFormClient />

      <div className="panel-card mt-4">
        <h2 className="font-bold text-tm-blue text-sm mb-2">บัญชีทดสอบ (Mock)</h2>
        <p className="text-xs text-slate-500 m-0 mb-2">
          รหัสผ่าน: <code>{MOCK_LOGIN_PASSWORD}</code>
        </p>

        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-xs text-slate-600 mb-2">
          <strong className="text-tm-blue">ตัวอย่าง · สายการทำงาน</strong>
          <ul className="m-0 mt-2 p-0 list-none space-y-1.5 font-mono text-[0.7rem] leading-snug">
            <li>
              <code>sirdawpong</code>
              <span className="font-sans text-slate-500"> · {soLabel}</span>
            </li>
            <li className="pl-3 border-l-2 border-slate-200">
              <code>OS10</code>
              <span className="font-sans text-slate-600">
                {' '}
                · {ROLE_LABELS.overseer}
                {os10 ? ` · ${[os10.name_prefix, os10.full_name].filter(Boolean).join(' ')}` : ''}
              </span>
            </li>
            <li className="pl-6 border-l-2 border-slate-200">
              <span className="font-sans font-semibold text-slate-700">
                {ROLE_LABELS.volunteer}
              </span>
              <ul className="m-0 mt-1 p-0 list-none space-y-0.5 pl-1">
                {OS10_TYPE2_SAMPLES.map((t) => (
                  <li key={t.id}>
                    <code>{t.id}</code>
                    <span className="font-sans text-slate-600"> · {t.name}</span>
                  </li>
                ))}
              </ul>
              <p className="font-sans text-slate-400 m-0 mt-1">
                (มีถึง <code>OS10T15</code> · รหัสผ่านเดียวกัน)
              </p>
            </li>
            <li className="pl-9 border-l-2 border-slate-200">
              <span className="font-sans font-semibold text-slate-700">
                {ROLE_LABELS.staff}
              </span>
              <ul className="m-0 mt-1 p-0 list-none space-y-0.5 pl-1">
                {staff03 && (
                  <li>
                    <code>staff03</code>
                    <span className="font-sans text-slate-600"> · {staff03.full_name}</span>
                  </li>
                )}
                {staff04 && (
                  <li>
                    <code>staff04</code>
                    <span className="font-sans text-slate-600"> · {staff04.full_name}</span>
                  </li>
                )}
              </ul>
              <p className="font-sans text-slate-400 m-0 mt-1">
                รายงานต่อ <code>OS10</code> · ตามจังหวัดของเขต · รหัสผ่านเดียวกัน
              </p>
            </li>
          </ul>
        </div>

        <ul className="text-xs space-y-2 m-0 p-0 list-none text-slate-600">
          {tips.map((u) => {
            const role = normalizeRole(u.role);
            const title =
              role === 'super_overseer'
                ? [u.position, u.name_prefix, u.full_name].filter(Boolean).join(' · ')
                : `${ROLE_LABELS[role]} · ${u.full_name}`;
            return (
              <li key={u.id} className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <strong>{title}</strong> — <code>{u.email}</code>
              </li>
            );
          })}
          <li className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-slate-500">
            องคมนตรีทั้ง 14 คน: <code>OS01</code>–<code>OS14</code> · รหัสผ่านเดียวกัน
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
