'use client';

import { useTransition } from 'react';
import { updateAccountRole } from '@/app/actions/admin';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  position: string | null;
  role: string;
  assigned_zone: string | null;
};

export function AccountsTable({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();

  if (!rows.length) {
    return (
      <div className="panel-card text-slate-500">
        ยังไม่มีแถวใน user_profiles
      </div>
    );
  }

  return (
    <div className="panel-card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
          <tr>
            <th className="text-left p-3">ชื่อ</th>
            <th className="text-left p-3">อีเมล</th>
            <th className="text-left p-3">เขต</th>
            <th className="text-left p-3">บทบาท</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="p-3">{r.full_name}</td>
              <td className="p-3">{r.email}</td>
              <td className="p-3">{r.assigned_zone || '—'}</td>
              <td className="p-3">
                <form
                  action={(fd) => {
                    start(async () => {
                      await updateAccountRole(fd);
                    });
                  }}
                  className="flex gap-2 items-center"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <select
                    name="role"
                    className="form-input"
                    style={{ marginTop: 0, padding: '6px 10px' }}
                    defaultValue={r.role}
                    disabled={pending}
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="navbar__link text-xs">
                    บันทึก
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
