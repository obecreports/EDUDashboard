'use client';

import { useState, useTransition } from 'react';
import { setReportsToAction } from '@/app/actions/admin';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

type Account = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  reports_to: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
};

export function OrgMapClient({ accounts }: { accounts: Account[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const overseers = accounts.filter(
    (a) => a.role === 'overseer' || a.role === 'volunteer'
  );
  const supers = accounts.filter((a) => a.role === 'super_overseer');
  const staff = accounts.filter((a) => a.role === 'staff');

  const nameOf = (id: string | null) =>
    accounts.find((a) => a.id === id)?.full_name ?? '—';

  return (
    <div className="grid gap-4">
      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}

      <section className="ed-card p-4">
        <h2 className="font-bold text-tm-blue mb-3">Staff → Overseer</h2>
        <div className="grid gap-3">
          {staff.map((s) => (
            <form
              key={s.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await setReportsToAction(fd);
                  setMsg(res.ok ? `อัปเดต ${s.full_name}` : res.error || 'ผิดพลาด');
                });
              }}
            >
              <input type="hidden" name="userId" value={s.id} />
              <div className="min-w-[180px]">
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-xs text-slate-500">
                  {s.assigned_districts.map((d) => d.replace('|', '/')).join(', ') || 'ยังไม่มอบหมายอำเภอ'}
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
                  {overseers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name}
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
        <h2 className="font-bold text-tm-blue mb-3">Overseer → Super Overseer</h2>
        <div className="grid gap-3">
          {overseers.map((o) => (
            <form
              key={o.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await setReportsToAction(fd);
                  setMsg(res.ok ? `อัปเดต ${o.full_name}` : res.error || 'ผิดพลาด');
                });
              }}
            >
              <input type="hidden" name="userId" value={o.id} />
              <div className="min-w-[180px]">
                <div className="font-semibold">{o.full_name}</div>
                <div className="text-xs text-slate-500">
                  จังหวัด: {o.assigned_provinces.join(', ') || '—'} · ปัจจุบัน: {nameOf(o.reports_to)}
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
              <strong>{a.full_name}</strong> ({ROLE_LABELS[a.role]}) → {nameOf(a.reports_to)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
