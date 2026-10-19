'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  createAccountAction,
  generateOtpForUserAction,
  toggleAccountStatusAction,
  updateAdminUserAction,
} from '@/app/actions/admin';
import {
  ROLE_LABELS,
  formatDisplayName,
  formatPersonLabel,
  normalizeRole,
  type UserRole,
} from '@/lib/types';

type AccountRow = {
  id: string;
  email: string;
  full_name: string;
  name_prefix?: string | null;
  position: string;
  role: string;
  assigned_zone: string | null;
  disabled: boolean;
  status: 'active' | 'disabled';
  hasTempPassword: boolean;
  hintTemp: string | null;
  mustChangePassword: boolean;
};

const CREATE_ROLES: UserRole[] = [
  'staff',
  'overseer',
  'volunteer',
  'super_overseer',
  'admin',
];

function canManageTarget(actorRole: UserRole, targetRole: UserRole, targetId: string, actorId: string) {
  if (targetId === actorId) return true; // self view ok, but edits limited below
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin') {
    // admin cannot manage other admin or super_admin
    return targetRole !== 'admin' && targetRole !== 'super_admin';
  }
  return false;
}

function rolesAssignableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'super_admin') {
    return ['staff', 'overseer', 'volunteer', 'super_overseer', 'admin', 'super_admin'];
  }
  return ['staff', 'overseer', 'volunteer', 'super_overseer'];
}

export function AdminAccountsManager({
  accounts,
  actorRole,
  actorId,
}: {
  accounts: AccountRow[];
  actorRole: UserRole;
  actorId: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');

  const filtered = useMemo(() => {
    // When editing, focus only on that user row
    if (editingId) {
      const one = accounts.find((a) => a.id === editingId);
      return one ? [one] : [];
    }
    let list = [...accounts];
    if (roleFilter !== 'all') list = list.filter((a) => a.role === roleFilter);
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [accounts, roleFilter, nameFilter, editingId]);

  const startEdit = (a: AccountRow) => {
    setEditingId(a.id);
    setEditName(a.full_name);
    setEditPrefix(a.name_prefix ?? '');
    setEditPosition(a.position);
    setEditRole(normalizeRole(a.role));
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const createRoles =
    actorRole === 'super_admin'
      ? [...CREATE_ROLES, 'super_admin' as UserRole]
      : CREATE_ROLES;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 m-0">
          {editingId
            ? 'โหมดแก้ไข — แสดงเฉพาะผู้ใช้ที่เลือก'
            : `${filtered.length} / ${accounts.length} บัญชี`}
        </p>
        {!editingId && (
          <button
            type="button"
            className="navbar__login"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'ปิดฟอร์ม' : '+ สร้างผู้ใช้ใหม่'}
          </button>
        )}
      </div>

      {!editingId && (
        <div className="ed-card p-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            กรองบทบาท
            <select
              className="form-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">ทั้งหมด</option>
              {(Object.keys(ROLE_LABELS) as UserRole[])
                .filter((r) => r !== 'guest')
                .map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            ค้นหาชื่อ / รหัสผู้ใช้
            <input
              className="form-input"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="พิมพ์ชื่อหรือรหัสผู้ใช้"
            />
          </label>
        </div>
      )}

      {showCreate && !editingId && (
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
                `บันทึกลงฐานข้อมูลแล้ว · รหัสผู้ใช้ ${
                  'email' in res ? res.email : ''
                } · รหัสผ่าน ${'tempPassword' in res ? res.tempPassword : ''}`
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
            รหัสผู้ใช้ (ว่าง = สร้างอัตโนมัติ)
            <input
              name="email"
              type="text"
              className="form-input"
              placeholder="ว่าง = staff0001 / OS0015 / AS0001"
              autoCapitalize="off"
              spellCheck={false}
            />
            <span className="text-xs text-slate-500 font-normal">
              ตามบทบาท + เลข 4 หลัก · หรือใส่เองถ้าต้องการ
            </span>
          </label>
          <label className="block text-sm">
            บทบาท
            <select name="role" className="form-input" defaultValue="staff">
              {createRoles.map((r) => (
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
              <th className="text-left p-3">รหัสผู้ใช้</th>
              <th className="text-left p-3">ตำแหน่ง</th>
              <th className="text-left p-3">บทบาท</th>
              <th className="text-left p-3">สถานะ</th>
              <th className="text-left p-3">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const targetRole = normalizeRole(a.role);
              const manageable = canManageTarget(actorRole, targetRole, a.id, actorId);
              const editing = editingId === a.id;
              const assignableRoles = rolesAssignableBy(actorRole);

              return (
                <tr key={a.id} className="border-t border-slate-100 align-top">
                  {editing ? (
                    <td className="p-3" colSpan={6}>
                      <div className="grid gap-3 max-w-2xl">
                        <h3 className="font-bold text-tm-blue text-sm m-0">
                          แก้ไขผู้ใช้ · {a.email}
                        </h3>
                        <label className="block text-sm font-semibold">
                          ชื่อ–นามสกุล
                          <input
                            className="form-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </label>
                        <label className="block text-sm font-semibold">
                          คำนำหน้า
                          <input
                            className="form-input"
                            value={editPrefix}
                            onChange={(e) => setEditPrefix(e.target.value)}
                            placeholder="ว่าง = คุณ"
                          />
                        </label>
                        <label className="block text-sm font-semibold">
                          ตำแหน่ง
                          <input
                            className="form-input"
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                          />
                        </label>
                        <label className="block text-sm font-semibold">
                          บทบาท
                          <select
                            className="form-input"
                            value={editRole}
                            onChange={(e) => setEditRole(normalizeRole(e.target.value))}
                            disabled={a.id === actorId}
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="ed-btn ed-btn--primary ed-btn--sm"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                const fd = new FormData();
                                fd.set('id', a.id);
                                fd.set('full_name', editName.trim());
                                fd.set('name_prefix', editPrefix.trim());
                                fd.set('position', editPosition.trim());
                                fd.set('role', editRole);
                                const res = await updateAdminUserAction(fd);
                                if (!res.ok) {
                                  setMsg(res.error || 'บันทึกไม่สำเร็จ');
                                  return;
                                }
                                setMsg(`บันทึก ${editName} แล้ว`);
                                setEditingId(null);
                              });
                            }}
                          >
                            บันทึกข้อมูลผู้ใช้
                          </button>
                          <button
                            type="button"
                            className="ed-btn ed-btn--outline ed-btn--sm"
                            disabled={pending || a.id === actorId}
                            onClick={() => {
                              start(async () => {
                                const fd = new FormData();
                                fd.set('id', a.id);
                                fd.set('disabled', a.disabled ? '0' : '1');
                                const res = await toggleAccountStatusAction(fd);
                                if (!res.ok) setMsg(('error' in res && res.error) || 'ล้มเหลว');
                                else
                                  setMsg(
                                    a.disabled
                                      ? `เปิดใช้งาน ${a.full_name} แล้ว`
                                      : `ปิดใช้งาน ${a.full_name} แล้ว`
                                  );
                              });
                            }}
                          >
                            {a.disabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </button>
                          <button
                            type="button"
                            className="ed-btn ed-btn--outline ed-btn--sm"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                const fd = new FormData();
                                fd.set('userId', a.id);
                                const res = await generateOtpForUserAction(fd);
                                if (!res.ok) setMsg(('error' in res && res.error) || 'ล้มเหลว');
                                else
                                  setMsg(
                                    `OTP สำหรับ ${a.full_name}: ${
                                      'tempPassword' in res ? res.tempPassword : ''
                                    } · ผู้ใช้ต้องตั้งรหัสผ่านใหม่หลังล็อกอิน`
                                  );
                              });
                            }}
                          >
                            สร้าง OTP (รีเซ็ตรหัสผ่าน)
                          </button>
                          <button
                            type="button"
                            className="ed-btn ed-btn--outline ed-btn--sm"
                            onClick={cancelEdit}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="p-3">
                        <div className="font-medium">
                          {formatPersonLabel(a.role, a.name_prefix, a.full_name) ||
                            formatDisplayName(a.name_prefix, a.full_name)}
                        </div>
                      </td>
                      <td className="p-3">
                        <code className="text-xs font-semibold text-tm-blue">{a.email}</code>
                      </td>
                      <td className="p-3">{a.position || '—'}</td>
                      <td className="p-3">{ROLE_LABELS[targetRole] ?? a.role}</td>
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
                          <div className="text-xs font-mono text-slate-500 mt-1">
                            OTP: {a.hintTemp}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {manageable ? (
                          <button
                            type="button"
                            className="ed-btn ed-btn--outline ed-btn--sm"
                            onClick={() => startEdit(a)}
                          >
                            แก้ไข
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">ไม่มีสิทธิ์จัดการ</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
