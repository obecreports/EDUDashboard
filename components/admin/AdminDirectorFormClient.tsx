'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  saveDirectorPhotoAction,
  upsertDirectorAction,
} from '@/app/actions/admin-directors';
import { uploadDirectorPhoto } from '@/lib/media/storage-upload';
import type { DirectorGender, SchoolDirector } from '@/lib/types';

export function AdminDirectorFormClient({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: SchoolDirector | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [directorId, setDirectorId] = useState(initial?.director_id ?? '');
  const [namePrefix, setNamePrefix] = useState(initial?.name_prefix ?? '');
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [positionName, setPositionName] = useState(
    initial?.position_name || 'ผู้อำนวยการโรงเรียน'
  );
  const [gender, setGender] = useState<DirectorGender | ''>(initial?.gender ?? '');
  const [pictureUrl, setPictureUrl] = useState(initial?.picture_url ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const save = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      const fd = new FormData();
      if (directorId) fd.set('director_id', directorId);
      fd.set('name_prefix', namePrefix);
      fd.set('full_name', fullName);
      fd.set('position_name', positionName);
      fd.set('gender', gender);
      if (pictureUrl) fd.set('picture_url', pictureUrl);
      const res = await upsertDirectorAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setDirectorId(res.directorId);
      setMsg(mode === 'create' ? 'สร้างผู้อำนวยการแล้ว' : 'บันทึกแล้ว');
      router.push('/admin/directors');
      router.refresh();
    });
  };

  const onPhoto = async (file: File | null) => {
    if (!file) return;
    if (!directorId) {
      setErr('บันทึกโปรไฟล์ก่อน แล้วจึงอัปโหลดรูป');
      return;
    }
    setUploadingPhoto(true);
    setErr(null);
    try {
      const up = await uploadDirectorPhoto(directorId, file);
      if (!up.ok) {
        setErr(up.error);
        return;
      }
      const fd = new FormData();
      fd.set('director_id', directorId);
      fd.set('picture_url', up.url);
      const res = await saveDirectorPhotoAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setPictureUrl(res.url || up.url);
      setMsg('บันทึกรูปแล้ว');
      router.refresh();
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>
      )}
      {err && (
        <div className="ed-card p-3 text-sm text-red-700 bg-red-50">{err}</div>
      )}

      <section className="ed-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            คำนำหน้า
            <input
              className="form-input"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="นาย / นาง / นางสาว"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            ชื่อ-นามสกุล
            <input
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            ตำแหน่ง
            <input
              className="form-input"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            เพศ
            <select
              className="form-input"
              value={gender}
              onChange={(e) => setGender(e.target.value as DirectorGender | '')}
            >
              <option value="">— ไม่ระบุ —</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
              <option value="other">อื่นๆ</option>
            </select>
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-semibold">รูปผู้อำนวยการ</span>
          {pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pictureUrl}
              alt=""
              className="rounded-lg border border-slate-200 object-cover"
              style={{ width: 96, height: 96 }}
            />
          ) : (
            <p className="text-xs text-slate-500 m-0">ยังไม่มีรูป</p>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!directorId || uploadingPhoto || pending}
            onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
          />
          {!directorId && (
            <p className="text-xs text-slate-500 m-0">
              บันทึกโปรไฟล์ก่อน แล้วจึงอัปโหลดรูปได้
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || !fullName.trim()}
            onClick={save}
          >
            {pending
              ? 'กำลังบันทึก…'
              : mode === 'create'
                ? 'สร้างผู้อำนวยการ'
                : 'บันทึกการแก้ไข'}
          </button>
          <Link href="/admin/directors" className="ed-btn ed-btn--outline">
            ยกเลิก
          </Link>
        </div>
      </section>
    </div>
  );
}
