'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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

const PAGE_SIZE = 10;

const CREATE_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'staff', label: ROLE_LABELS.staff },
  { value: 'overseer', label: ROLE_LABELS.overseer },
  { value: 'volunteer', label: ROLE_LABELS.volunteer },
  { value: 'super_overseer', label: ROLE_LABELS.super_overseer },
  { value: 'admin', label: ROLE_LABELS.admin },
];

function canManageTarget(
  actorRole: UserRole,
  targetRole: UserRole,
  targetId: string,
  actorId: string
) {
  if (targetId === actorId) return true;
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin') {
    return targetRole !== 'admin' && targetRole !== 'super_admin';
  }
  return false;
}

function rolesAssignableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'super_admin') {
    return [
      'staff',
      'overseer',
      'volunteer',
      'super_overseer',
      'admin',
      'super_admin',
    ];
  }
  return ['staff', 'overseer', 'volunteer', 'super_overseer'];
}

function roleFilterOptions(actorRole: UserRole): UserRole[] {
  const all = (Object.keys(ROLE_LABELS) as UserRole[]).filter((r) => r !== 'guest');
  if (actorRole === 'super_admin') return all;
  return all.filter((r) => r !== 'super_admin');
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
  const [page, setPage] = useState(1);

  const [editName, setEditName] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');

  const filtered = useMemo(() => {
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
  }, [accounts, roleFilter, nameFilter]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, nameFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const startIdx = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filtered, safePage]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, totalPages, safePage]);
    for (let d = 1; d <= 2; d++) {
      if (safePage - d > 1) pages.add(safePage - d);
      if (safePage + d < totalPages) pages.add(safePage + d);
    }
    return [...pages].sort((a, b) => a - b);
  }, [safePage, totalPages]);

  const editingUser = editingId
    ? accounts.find((a) => a.id === editingId) ?? null
    : null;

  const startEdit = (a: AccountRow) => {
    setEditingId(a.id);
    setEditName(a.full_name);
    setEditPrefix(a.name_prefix ?? '');
    setEditPosition(a.position);
    setEditRole(normalizeRole(a.role));
    setMsg(null);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
  };

  const createRoles =
    actorRole === 'super_admin'
      ? [
          ...CREATE_ROLE_OPTIONS,
          {
            value: 'super_admin' as UserRole,
            label: ROLE_LABELS.super_admin,
          },
        ]
      : CREATE_ROLE_OPTIONS.filter((o) => o.value !== 'admin');

  if (editingUser) {
    const a = editingUser;
    const assignableRoles = rolesAssignableBy(actorRole);
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500 m-0">โหมดแก้ไข — {a.email}</p>
        {msg && <p className="text-sm font-medium text-tm-blue m-0">{msg}</p>}
        <div className="panel-card space-y-3 max-w-2xl">
          <h3 className="font-bold text-tm-blue text-sm m-0">แก้ไขผู้ใช้ · {a.email}</h3>
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
                  cancelEdit();
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
                const nextDisabled = !a.disabled;
                const ok = window.confirm(
                  nextDisabled
                    ? `ปิดใช้งานบัญชี ${a.full_name}?`
                    : `เปิดใช้งานบัญชี ${a.full_name}?`
                );
                if (!ok) return;
                start(async () => {
                  const fd = new FormData();
                  fd.set('id', a.id);
                  fd.set('disabled', a.disabled ? '0' : '1');
                  const res = await toggleAccountStatusAction(fd);
                  if (!res.ok) {
                    setMsg(('error' in res && res.error) || 'ล้มเหลว');
                    return;
                  }
                  setMsg(
                    a.disabled
                      ? `เปิดใช้งาน ${a.full_name} แล้ว`
                      : `ปิดใช้งาน ${a.full_name} แล้ว`
                  );
                  cancelEdit();
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
                const ok = window.confirm(
                  `สร้างรหัส OTP ชั่วคราวให้ ${a.full_name}? ผู้ใช้ต้องตั้งรหัสผ่านใหม่หลังล็อกอิน`
                );
                if (!ok) return;
                start(async () => {
                  const fd = new FormData();
                  fd.set('userId', a.id);
                  const res = await generateOtpForUserAction(fd);
                  if (!res.ok) {
                    setMsg(('error' in res && res.error) || 'ล้มเหลว');
                    return;
                  }
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 m-0">
          {filtered.length} / {accounts.length} บัญชี
        </p>
        <button
          type="button"
          className="navbar__login"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'ปิดฟอร์ม' : '+ สร้างผู้ใช้ใหม่'}
        </button>
      </div>

      <div className="ed-card p-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          กรองบทบาท
          <select
            className="form-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">ทั้งหมด</option>
            {roleFilterOptions(actorRole).map((r) => (
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
            คำนำหน้า
            <input
              name="name_prefix"
              className="form-input"
              placeholder="ว่าง = คุณ"
            />
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
              placeholder="ว่าง = staff0001 / OS0015 / AS0001 (อาสาสมัคร)"
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
                <option key={r.value} value={r.value}>
                  {r.label}
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
          <thead
            style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}
          >
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
            {pageRows.map((a) => {
              const targetRole = normalizeRole(a.role);
              const manageable = canManageTarget(
                actorRole,
                targetRole,
                a.id,
                actorId
              );
              return (
                <tr key={a.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <div className="font-medium">
                      {formatPersonLabel(a.role, a.name_prefix, a.full_name) ||
                        formatDisplayName(a.name_prefix, a.full_name)}
                    </div>
                  </td>
                  <td className="p-3">
                    <code className="text-xs font-semibold text-tm-blue">
                      {a.email}
                    </code>
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
                      <div className="text-xs text-amber-700 mt-1">
                        ต้องเปลี่ยนรหัส
                      </div>
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
                      <span className="text-xs text-slate-400">
                        ไม่มีสิทธิ์จัดการ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500 text-center">
                  ไม่พบผู้ใช้ที่ตรงเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ก่อนหน้า
          </button>
          <div className="pagination-pages">
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1];
              const showEllipsis = prev != null && n - prev > 1;
              return (
                <span key={n} className="inline-flex items-center gap-1">
                  {showEllipsis && <span className="text-slate-400 px-1">…</span>}
                  <button
                    type="button"
                    className={`pagination-num ${safePage === n ? 'pagination-num--active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            className="pagination-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}
