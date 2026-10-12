'use client';

import { useState, useTransition } from 'react';
import { assignGeoAction } from '@/app/actions/admin';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

type Account = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_provinces: string[];
  assigned_districts: string[];
};

export function AssignmentsClient({
  accounts,
  provinces,
  districts,
}: {
  accounts: Account[];
  provinces: string[];
  districts: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}
      {accounts.map((a) => {
        const isOverseer = a.role === 'overseer';
        const isStaff = a.role === 'staff';
        if (!isOverseer && !isStaff) {
          return (
            <div key={a.id} className="ed-card p-4">
              <strong>{a.full_name}</strong>
              <span className="text-slate-500 text-sm ml-2">{ROLE_LABELS[a.role]} — ไม่ต้องมอบหมายพื้นที่</span>
            </div>
          );
        }

        return (
          <form
            key={a.id}
            className="ed-card p-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await assignGeoAction(fd);
                setMsg(res.ok ? `บันทึก ${a.full_name} แล้ว` : res.error || 'ผิดพลาด');
              });
            }}
          >
            <input type="hidden" name="userId" value={a.id} />
            <div>
              <strong>{a.full_name}</strong>
              <div className="text-xs text-slate-500">
                {a.email} · {ROLE_LABELS[a.role]}
              </div>
            </div>

            {isOverseer && (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-600">จังหวัดที่รับผิดชอบ</span>
                <select
                  multiple
                  className="border rounded-lg p-2 min-h-[120px]"
                  defaultValue={a.assigned_provinces}
                  onChange={(e) => {
                    const selected = [...e.target.selectedOptions].map((o) => o.value);
                    const hidden = e.currentTarget.form?.elements.namedItem(
                      'provinces'
                    ) as HTMLInputElement | null;
                    if (hidden) hidden.value = JSON.stringify(selected);
                  }}
                >
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="provinces" defaultValue={JSON.stringify(a.assigned_provinces)} />
                <input type="hidden" name="districts" value="[]" />
              </label>
            )}

            {isStaff && (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-600">อำเภอที่รับผิดชอบ (จังหวัด|อำเภอ)</span>
                <select
                  multiple
                  className="border rounded-lg p-2 min-h-[120px]"
                  defaultValue={a.assigned_districts}
                  onChange={(e) => {
                    const selected = [...e.target.selectedOptions].map((o) => o.value);
                    const hidden = e.currentTarget.form?.elements.namedItem(
                      'districts'
                    ) as HTMLInputElement | null;
                    if (hidden) hidden.value = JSON.stringify(selected);
                  }}
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d.replace('|', ' / ')}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="districts" defaultValue={JSON.stringify(a.assigned_districts)} />
                <input type="hidden" name="provinces" value="[]" />
              </label>
            )}

            <button type="submit" className="ed-btn ed-btn--primary w-fit" disabled={pending}>
              บันทึกการมอบหมาย
            </button>
          </form>
        );
      })}
    </div>
  );
}
