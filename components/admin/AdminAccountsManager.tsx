'use client';

import { useState, useTransition } from 'react';
import {
  createAccountAction,
  generateOtpForUserAction,
  toggleAccountStatusAction,
  updateAccountRole,
} from '@/app/actions/admin';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

type AccountRow = {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: string;
  assigned_zone: string | null;
  disabled: boolean;
  status: 'active' | 'disabled';
  hasTempPassword: boolean;
  hintTemp: string | null;
  mustChangePassword: boolean;
};

const MANAGE_ROLES: UserRole[] = ['staff', 'overseer', 'admin'];

export function AdminAccountsManager({ accounts }: { accounts: AccountRow[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 m-0">{accounts.length} บัญชีในระบบ</p>
        <button
          type="button"
          className="navbar__login"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'ปิดฟอร์ม' : '+ สร้างผู้ใช้ใหม่'}
        </button>
      </div>

      {showCreate && (
        <form
          className="panel-card space-y-3"
          action={(fd) => {
            setMsg(null);
            start(async () => {
              const res = await createAccountAction(fd);
              if (!res.ok) {
                setMsg(('error' in res && res.error) || 'สร้างไม่สำเร็จ');
                return;
              }
              setMsg(
                `สร้างแล้ว · อีเมล ${'email' in res ? res.email : ''} · OTP: ${
                  'tempPassword' in res ? res.tempPassword : ''
                }`
              );
              setShowCreate(false);
            });
          }}
        >
          <h3 className="font-bold text-tm-blue text-sm m-0">สร้างบัญชีด้วยตนเอง</h3>
          <label className="block text-sm">
            ชื่อ–นามสกุล
            <input name="full_name" className="form-input" required />
          </label>
          <label className="block text-sm">
            ตำแหน่ง
            <input name="position" className="form-input" required />
          </label>
          <label className="block text-sm">
            อีเมล (ไม่บังคับ)
            <input name="email" type="email" className="form-input" placeholder="name@coned.local" />
          </label>
          <label className="block text-sm">
            บทบาท
            <select name="role" className="form-input" defaultValue="staff">
              {MANAGE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="navbar__login" disabled={pending}>
            สร้างและออก OTP
          </button>
        </form>
      )}

      {msg && <p className="text-sm font-medium text-tm-blue m-0">{msg}</p>}

      <div className="panel-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
            <tr>
              <th className="text-left p-3">ชื่อ</th>
              <th className="text-left p-3">ตำแหน่ง</th>
              <th className="text-left p-3">บทบาท</th>
              <th className="text-left p-3">สถานะ</th>
              <th className="text-left p-3">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 align-top">
                <td className="p-3">
                  <div className="font-medium">{a.full_name}</div>
                  <div className="text-xs text-slate-500">{a.email}</div>
                </td>
                <td className="p-3">{a.position || '—'}</td>
                <td className="p-3">
                  <form
                    action={(fd) => {
                      start(async () => {
                        await updateAccountRole(fd);
                      });
                    }}
                    className="flex gap-2 items-center"
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <select
                      name="role"
                      className="form-input"
                      style={{ marginTop: 0, padding: '6px 10px' }}
                      defaultValue={a.role}
                      disabled={pending || a.role === 'global'}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    {a.role !== 'global' && (
                      <button type="submit" className="navbar__link text-xs">
                        บันทึก
                      </button>
                    )}
                  </form>
                </td>
                <td className="p-3">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: a.disabled ? '#fee2e2' : '#d1fae5',
                      color: a.disabled ? '#b91c1c' : '#047857',
                    }}
                  >
                    {a.disabled ? 'Disabled' : 'Active'}
                  </span>
                  {a.mustChangePassword && (
                    <div className="text-xs text-amber-700 mt-1">ต้องเปลี่ยนรหัส</div>
                  )}
                  {a.hintTemp && (
                    <div className="text-xs font-mono text-slate-500 mt-1">OTP: {a.hintTemp}</div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-2 items-start">
                    <form
                      action={(fd) => {
                        start(async () => {
                          await toggleAccountStatusAction(fd);
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="disabled" value={a.disabled ? '0' : '1'} />
                      <button type="submit" className="navbar__link text-xs" disabled={pending}>
                        {a.disabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </button>
                    </form>
                    <form
                      action={(fd) => {
                        setMsg(null);
                        start(async () => {
                          const res = await generateOtpForUserAction(fd);
                          if (!res.ok) setMsg(('error' in res && res.error) || 'ล้มเหลว');
                          else
                            setMsg(
                              `OTP สำหรับ ${a.full_name}: ${
                                'tempPassword' in res ? res.tempPassword : ''
                              }`
                            );
                        });
                      }}
                    >
                      <input type="hidden" name="userId" value={a.id} />
                      <input type="hidden" name="clearPermanent" value="0" />
                      <button type="submit" className="navbar__login text-xs py-1.5" disabled={pending}>
                        สร้าง OTP ชั่วคราว
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
