'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeOwnPasswordAction, updateSelfProfileAction } from '@/app/actions/auth';
import {
  isOverseerType2,
  isVolunteerRole,
  positionDisplayLabel,
  roleDisplayLabel,
  type OverseerTier,
  type UserRole,
} from '@/lib/types';
import { PasswordField } from '@/components/auth/PasswordField';
import { personAvatarUrl } from '@/lib/schools/images';
import { uploadAndSaveSelfAvatar } from '@/components/home/upload-self-avatar';

export function ProfileSettingsClient({
  userId,
  fullName,
  namePrefix,
  position,
  email,
  role,
  overseerTier = null,
  domainLines,
  bossName,
  avatarUrl = null,
  contactAddress = '',
  contactTel = '',
  contactEmail = '',
  duty = '',
  lastPositionTitle = '',
  lastPositionYear = '',
  lastPositionAffiliation = '',
  educationBachelor = '',
  educationMaster = '',
  birthDateDisplay = '',
}: {
  userId: string;
  fullName: string;
  namePrefix: string;
  position: string;
  email: string;
  role: UserRole;
  overseerTier?: OverseerTier | null;
  domainLines: string[];
  bossName: string;
  avatarUrl?: string | null;
  contactAddress?: string;
  contactTel?: string;
  contactEmail?: string;
  duty?: string;
  lastPositionTitle?: string;
  lastPositionYear?: string;
  lastPositionAffiliation?: string;
  educationBachelor?: string;
  educationMaster?: string;
  /** Thai BE long form e.g. 28 สิงหาคม 2504 */
  birthDateDisplay?: string;
}) {
  const router = useRouter();
  const isType2 = isOverseerType2(role, overseerTier);
  const showVlBio = isVolunteerRole(role);
  const displayRole = roleDisplayLabel(role, overseerTier);
  const displayPosition = positionDisplayLabel(role, overseerTier, position);
  const [editing, setEditing] = useState(false);
  const [full_name, setFullName] = useState(fullName);
  const [prefix, setPrefix] = useState(namePrefix);
  const [savedPrefix, setSavedPrefix] = useState(namePrefix);
  const [pos, setPos] = useState(displayPosition);
  const [addr, setAddr] = useState(contactAddress);
  const [tel, setTel] = useState(contactTel);
  const [cEmail, setCEmail] = useState(contactEmail);
  const [dutyText, setDutyText] = useState(duty);
  const [lastTitle, setLastTitle] = useState(lastPositionTitle);
  const [lastYear, setLastYear] = useState(lastPositionYear);
  const [lastAff, setLastAff] = useState(lastPositionAffiliation);
  const [eduBa, setEduBa] = useState(educationBachelor);
  const [eduMa, setEduMa] = useState(educationMaster);
  const [birthText, setBirthText] = useState(birthDateDisplay);
  const [preview, setPreview] = useState(personAvatarUrl({ avatar_url: avatarUrl }));
  const [msg, setMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pending, start] = useTransition();
  const [pwdPending, startPwd] = useTransition();
  const [avatarPending, startAvatar] = useTransition();

  useEffect(() => {
    setFullName(fullName);
    setPrefix(namePrefix);
    setSavedPrefix(namePrefix);
    setPos(displayPosition);
    setAddr(contactAddress);
    setTel(contactTel);
    setCEmail(contactEmail);
    setDutyText(duty);
    setLastTitle(lastPositionTitle);
    setLastYear(lastPositionYear);
    setLastAff(lastPositionAffiliation);
    setEduBa(educationBachelor);
    setEduMa(educationMaster);
    setBirthText(birthDateDisplay);
    setPreview(personAvatarUrl({ avatar_url: avatarUrl }));
  }, [
    fullName,
    namePrefix,
    displayPosition,
    contactAddress,
    contactTel,
    contactEmail,
    duty,
    lastPositionTitle,
    lastPositionYear,
    lastPositionAffiliation,
    educationBachelor,
    educationMaster,
    birthDateDisplay,
    avatarUrl,
  ]);

  const displayPrefix = savedPrefix.trim() || 'คุณ';
  void bossName;

  const save = () => {
    setMsg(null);
    start(async () => {
      const nextPrefix = prefix.trim();
      const fd = new FormData();
      fd.set('full_name', full_name.trim());
      fd.set('name_prefix', nextPrefix);
      fd.set('position', isType2 ? displayRole : pos.trim());
      if (showVlBio) {
        fd.set('contact_address', addr.trim());
        fd.set('contact_tel', tel.trim());
        fd.set('contact_email', cEmail.trim());
        fd.set('duty', dutyText.trim());
        fd.set('last_position_title', lastTitle.trim());
        fd.set('last_position_year', lastYear.trim());
        fd.set('last_position_affiliation', lastAff.trim());
        fd.set('education_bachelor', eduBa.trim());
        fd.set('education_master', eduMa.trim());
        fd.set('birth_date', birthText.trim());
      }
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
    setPos(displayPosition);
    setPrefix(savedPrefix);
    setAddr(contactAddress);
    setTel(contactTel);
    setCEmail(contactEmail);
    setDutyText(duty);
    setLastTitle(lastPositionTitle);
    setLastYear(lastPositionYear);
    setLastAff(lastPositionAffiliation);
    setEduBa(educationBachelor);
    setEduMa(educationMaster);
    setBirthText(birthDateDisplay);
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

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    setMsg(null);
    startAvatar(async () => {
      const res = await uploadAndSaveSelfAvatar(userId, file);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setPreview(res.url);
      setMsg('อัปเดตรูปโปรไฟล์แล้ว');
      router.refresh();
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

        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-24 w-24 rounded-2xl object-cover border border-slate-200 bg-slate-50"
          />
          <label className="ed-btn ed-btn--outline ed-btn--sm cursor-pointer">
            {avatarPending ? 'กำลังอัปโหลด…' : 'อัปโหลดรูปโปรไฟล์'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={avatarPending}
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
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
          คำนำหน้า
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
            className={`form-input${isType2 ? ' form-input--locked' : ''}`}
            value={isType2 ? displayPosition : pos}
            onChange={(e) => setPos(e.target.value)}
            disabled={!editing || isType2}
            readOnly={isType2}
          />
          {isType2 ? (
            <span className="text-xs text-slate-500 font-normal">
              องคมนตรีระดับ 2 แสดงเป็นอาสาสมัคร
            </span>
          ) : null}
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
            value={displayRole}
            disabled
            readOnly
          />
        </label>

        {showVlBio ? (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="font-semibold text-tm-blue m-0">ข้อมูลอาสาสมัคร</p>
            <label className="block text-sm font-semibold">
              หน้าที่
              <textarea
                className="form-input"
                rows={3}
                value={dutyText}
                onChange={(e) => setDutyText(e.target.value)}
                disabled={!editing}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                ตำแหน่งสุดท้าย
                <input
                  className="form-input"
                  value={lastTitle}
                  onChange={(e) => setLastTitle(e.target.value)}
                  disabled={!editing}
                />
              </label>
              <label className="block text-sm font-semibold">
                ปี
                <input
                  className="form-input"
                  value={lastYear}
                  onChange={(e) => setLastYear(e.target.value)}
                  disabled={!editing}
                />
              </label>
              <label className="block text-sm font-semibold">
                สังกัด
                <input
                  className="form-input"
                  value={lastAff}
                  onChange={(e) => setLastAff(e.target.value)}
                  disabled={!editing}
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              ที่อยู่
              <textarea
                className="form-input"
                rows={2}
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                disabled={!editing}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                โทรศัพท์
                <input
                  className="form-input"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  disabled={!editing}
                />
              </label>
              <label className="block text-sm font-semibold">
                E-mail ติดต่อ
                <input
                  className="form-input"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  disabled={!editing}
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              วันเกิด (เช่น 28 สิงหาคม 2504)
              <input
                className="form-input"
                value={birthText}
                onChange={(e) => setBirthText(e.target.value)}
                disabled={!editing}
                placeholder="28 สิงหาคม 2504"
              />
            </label>
            <label className="block text-sm font-semibold">
              วุฒิ ป.ตรี
              <input
                className="form-input"
                value={eduBa}
                onChange={(e) => setEduBa(e.target.value)}
                disabled={!editing}
              />
            </label>
            <label className="block text-sm font-semibold">
              วุฒิ ป.โท
              <input
                className="form-input"
                value={eduMa}
                onChange={(e) => setEduMa(e.target.value)}
                disabled={!editing}
              />
            </label>
          </div>
        ) : null}

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
