'use client';

import { useState, useTransition } from 'react';
import { setReportsToAction } from '@/app/actions/admin';
import {
  ROLE_LABELS,
  effectiveOverseerTier,
  isOverseerType1,
  isOverseerType2,
  overseerTierLabel,
  type OverseerTier,
  type UserRole,
} from '@/lib/types';

type Account = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  overseer_tier?: OverseerTier | null;
  reports_to: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
};

export function OrgMapClient({ accounts }: { accounts: Account[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const type1 = accounts.filter((a) => isOverseerType1(a.role, a.overseer_tier));
  const type2 = accounts.filter((a) => isOverseerType2(a.role, a.overseer_tier));
  /** Staff always reports to Type 1 (geo: Gov district → province) — not Type 2 */
  const bossesForStaff = type1;
  const supers = accounts.filter((a) => a.role === 'super_overseer');
  const staff = accounts.filter((a) => a.role === 'staff');

  const nameOf = (id: string | null) =>
    accounts.find((a) => a.id === id)?.full_name ?? '—';

  const submit = (userId: string, label: string, form: HTMLFormElement) => {
    const fd = new FormData(form);
    fd.set('userId', userId);
    startTransition(async () => {
      const res = await setReportsToAction(fd);
      setMsg(res.ok ? `อัปเดต ${label}` : res.error || 'ผิดพลาด');
    });
  };

  return (
    <div className="grid gap-4">
      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}

      <section className="ed-card p-4">
        <h2 className="font-bold text-tm-blue mb-3">Staff → Type 1 (จังหวัด)</h2>
        <p className="text-sm text-slate-600 mb-3 m-0">
          ศึกษานิเทศก์รายงานต่อองคมนตรี Type 1 ตามจังหวัดของเขต (Gov_Domain) — ไม่ผูกตรงกับ Type 2
        </p>
        <div className="grid gap-3">
          {staff.map((s) => (
            <form
              key={s.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(s.id, s.full_name, e.currentTarget);
              }}
            >
              <input type="hidden" name="userId" value={s.id} />
              <div className="min-w-[180px]">
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-xs text-slate-500">
                  {s.assigned_districts.map((d) => d.replace('|', '/')).join(', ') ||
                    'ยังไม่มอบหมายอำเภอ'}
                </div>
              </div>
              <label className="grid gap-1 text-sm">
                <span>หัวหน้า Overseer</span>
                <select
                  name="reportsTo"
                  className="border rounded-lg px-2 py-1.5"
                  defaultValue={s.reports_to ?? ''}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {bossesForStaff.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name}
                      {o.role === 'overseer'
                        ? ` · ${overseerTierLabel(effectiveOverseerTier(o.role, o.overseer_tier))}`
                        : ` · ${ROLE_LABELS[o.role]}`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending}>
                บันทึก
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="ed-card p-4">
        <h2 className="font-bold text-tm-blue mb-3">Type 2 → Type 1</h2>
        <p className="text-sm text-slate-600 mb-3 m-0">
          องคมนตรีระดับ 2 อยู่ภายใต้ระดับ 1 และเลือกจังหวัดได้เฉพาะในขอบเขตของ Type 1
        </p>
        <div className="grid gap-3">
          {type2.length === 0 && (
            <p className="text-sm text-slate-500 m-0">
              ยังไม่มี Type 2 — ตั้งระดับและหัวหน้าที่หน้ามอบหมายพื้นที่จัดการ
            </p>
          )}
          {type2.map((o) => (
            <form
              key={o.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(o.id, o.full_name, e.currentTarget);
              }}
            >
              <input type="hidden" name="userId" value={o.id} />
              <div className="min-w-[180px]">
                <div className="font-semibold">{o.full_name}</div>
                <div className="text-xs text-slate-500">
                  จังหวัด: {o.assigned_provinces.join(', ') || '—'} · ปัจจุบัน:{' '}
                  {nameOf(o.reports_to)}
                </div>
              </div>
              <label className="grid gap-1 text-sm">
                <span>หัวหน้า Type 1</span>
                <select
                  name="reportsTo"
                  className="border rounded-lg px-2 py-1.5"
                  defaultValue={o.reports_to ?? ''}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {type1
                    .filter((t) => t.id !== o.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                </select>
              </label>
              <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending}>
                บันทึก
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="ed-card p-4">
        <h2 className="font-bold text-tm-blue mb-3">Type 1 → Super Overseer</h2>
        <div className="grid gap-3">
          {type1.map((o) => (
            <form
              key={o.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(o.id, o.full_name, e.currentTarget);
              }}
            >
              <input type="hidden" name="userId" value={o.id} />
              <div className="min-w-[180px]">
                <div className="font-semibold">{o.full_name}</div>
                <div className="text-xs text-slate-500">
                  จังหวัด: {o.assigned_provinces.join(', ') || '—'} · ปัจจุบัน:{' '}
                  {nameOf(o.reports_to)}
                </div>
              </div>
              <label className="grid gap-1 text-sm">
                <span>Super Overseer</span>
                <select
                  name="reportsTo"
                  className="border rounded-lg px-2 py-1.5"
                  defaultValue={o.reports_to ?? ''}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {supers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending}>
                บันทึก
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="ed-card p-4 text-sm text-slate-600">
        <h2 className="font-bold text-tm-blue mb-2">สรุปสายงาน</h2>
        <ul className="grid gap-1">
          {accounts.map((a) => (
            <li key={a.id}>
              <strong>{a.full_name}</strong> (
              {a.role === 'overseer'
                ? overseerTierLabel(effectiveOverseerTier(a.role, a.overseer_tier))
                : ROLE_LABELS[a.role]}
              ) → {nameOf(a.reports_to)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
