'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeOwnPasswordAction, updateSelfProfileAction } from '@/app/actions/auth';
import { ROLE_LABELS, type UserRole } from '@/lib/types';
import { PasswordField } from '@/components/auth/PasswordField';

export function ProfileSettingsClient({
  fullName,
  namePrefix,
  position,
  email,
  role,
  domainLines,
  bossName,
}: {
  fullName: string;
  namePrefix: string;
  position: string;
  email: string;
  role: UserRole;
  domainLines: string[];
  bossName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [full_name, setFullName] = useState(fullName);
  const [prefix, setPrefix] = useState(namePrefix);
  const [savedPrefix, setSavedPrefix] = useState(namePrefix);
  const [pos, setPos] = useState(position);
  const [msg, setMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pending, start] = useTransition();
  const [pwdPending, startPwd] = useTransition();

  useEffect(() => {
    setFullName(fullName);
    setPrefix(namePrefix);
    setSavedPrefix(namePrefix);
    setPos(position);
  }, [fullName, namePrefix, position]);

  const displayPrefix = savedPrefix.trim() || 'คุณ';
  void bossName;

  const save = () => {
    setMsg(null);
    start(async () => {
      const nextPrefix = prefix.trim();
      const fd = new FormData();
      fd.set('full_name', full_name.trim());
      fd.set('name_prefix', nextPrefix);
      fd.set('position', pos.trim());
      const res = await updateSelfProfileAction(fd);
      if (!res.ok) {
        setMsg(res.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      setSavedPrefix(nextPrefix);
      setPrefix(nextPrefix);
      setEditing(false);
      setMsg('บันทึกโปรไฟล์แล้ว');
      router.refresh();
    });
  };

  const cancel = () => {
    setFullName(fullName);
    setPos(position);
    setPrefix(savedPrefix);
    setEditing(false);
    setMsg(null);
  };

  const savePassword = (fd: FormData) => {
    setPwdMsg(null);
    startPwd(async () => {
      const res = await changeOwnPasswordAction(fd);
      if (!res.ok) {
        setPwdMsg(res.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        return;
      }
      setPwdMsg('เปลี่ยนรหัสผ่านสำเร็จแล้ว');
      setPwdOpen(false);
    });
  };

  return (
    <div className="grid gap-4">
      <div className="panel-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="ed-section-title text-base m-0">ข้อมูลโปรไฟล์</h2>
          {!editing ? (
            <button type="button" className="ed-btn ed-btn--primary ed-btn--sm" onClick={() => setEditing(true)}>
              แก้ไขโปรไฟล์
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending} onClick={save}>
                {pending ? 'กำลังบันทึก…' : 'บันทึก'}
              </button>
              <button type="button" className="ed-btn ed-btn--outline ed-btn--sm" disabled={pending} onClick={cancel}>
                ยกเลิก
              </button>
            </div>
          )}
        </div>

        <label className="block text-sm font-semibold">
          ชื่อ–นามสกุล
          <input
            className="form-input"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!editing}
          />
        </label>

        <label className="block text-sm font-semibold">
          คำนำหน้า (ใช้ในคำทักทายแดชบอร์ด)
          <input
            className="form-input"
            value={editing ? prefix : displayPrefix}
            onChange={(e) => setPrefix(e.target.value)}
            disabled={!editing}
            placeholder="ว่าง = คุณ"
          />
        </label>

        <label className="block text-sm font-semibold">
          ตำแหน่ง
          <input
            className="form-input"
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            disabled={!editing}
          />
        </label>

        <label className="block text-sm font-semibold">
          อีเมลเข้าสู่ระบบ
          <input className="form-input form-input--locked" value={email} disabled readOnly />
          <span className="text-xs text-slate-500 font-normal">หากต้องการเปลี่ยน ติดต่อผู้ดูแลระบบ</span>
        </label>

        <label className="block text-sm font-semibold">
          บทบาท
          <input
            className="form-input form-input--locked"
            value={ROLE_LABELS[role]}
            disabled
            readOnly
          />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm space-y-2 opacity-90">
          <p className="font-semibold text-tm-blue m-0">พื้นที่รับผิดชอบ / Domain</p>
          {domainLines.map((line) => (
            <p key={line} className="m-0 text-slate-600">
              {line}
            </p>
          ))}
          <p className="text-xs text-slate-500 m-0">
            หากต้องการเปลี่ยนพื้นที่รับผิดชอบ ให้แจ้งผู้ดูแลระบบ
          </p>
        </div>

        {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}
      </div>

      <div className="panel-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="ed-section-title text-base m-0">รหัสผ่าน</h2>
            <p className="text-sm text-slate-500 m-0 mt-1">
              เปลี่ยนรหัสผ่านด้วยตนเอง · หากลืมรหัส ให้ขอ OTP จากผู้ดูแลระบบ
            </p>
          </div>
          {!pwdOpen && (
            <button
              type="button"
              className="ed-btn ed-btn--outline ed-btn--sm"
              onClick={() => {
                setPwdOpen(true);
                setPwdMsg(null);
              }}
            >
              เปลี่ยนรหัสผ่าน
            </button>
          )}
        </div>

        {pwdOpen && (
          <form
            className="grid gap-3 max-w-md"
            action={(fd) => savePassword(fd)}
          >
            <PasswordField
              name="current"
              label="รหัสผ่านปัจจุบัน"
              required
              autoComplete="current-password"
            />
            <PasswordField
              name="next"
              label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <PasswordField
              name="confirm"
              label="ยืนยันรหัสผ่านใหม่"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pwdPending}>
                {pwdPending ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
              </button>
              <button
                type="button"
                className="ed-btn ed-btn--outline ed-btn--sm"
                disabled={pwdPending}
                onClick={() => {
                  setPwdOpen(false);
                  setPwdMsg(null);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        {pwdMsg && <p className="text-sm text-tm-blue m-0">{pwdMsg}</p>}
      </div>
    </div>
  );
}
