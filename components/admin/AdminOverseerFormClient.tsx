'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  saveOverseerPhotoAction,
  updateOverseerDisplayAction,
} from '@/app/actions/admin-overseers';
import { uploadOverseerPhoto } from '@/lib/media/storage-upload';
import { personAvatarUrl } from '@/lib/schools/images';

export type OverseerEditInitial = {
  id: string;
  name_prefix?: string | null;
  full_name: string;
  position: string;
  avatar_url?: string | null;
  provinces: string[];
};

export function AdminOverseerFormClient({
  initial,
}: {
  initial: OverseerEditInitial;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [namePrefix, setNamePrefix] = useState(initial.name_prefix ?? '');
  const [fullName, setFullName] = useState(initial.full_name);
  const [position, setPosition] = useState(initial.position);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const save = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      const fd = new FormData();
      fd.set('user_id', initial.id);
      fd.set('name_prefix', namePrefix);
      fd.set('full_name', fullName);
      fd.set('position', position);
      const res = await updateOverseerDisplayAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg('บันทึกแล้ว');
      router.refresh();
    });
  };

  const onPhoto = async (file: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    setErr(null);
    try {
      const up = await uploadOverseerPhoto(initial.id, file);
      if (!up.ok) {
        setErr(up.error);
        return;
      }
      const fd = new FormData();
      fd.set('user_id', initial.id);
      fd.set('avatar_url', up.url);
      const res = await saveOverseerPhotoAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setAvatarUrl(res.url || up.url);
      setMsg('บันทึกรูปแล้ว');
      router.refresh();
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      const fd = new FormData();
      fd.set('user_id', initial.id);
      fd.set('avatar_url', '');
      const res = await saveOverseerPhotoAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setAvatarUrl('');
      setMsg('ลบรูปแล้ว');
      router.refresh();
    });
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
        <div className="flex flex-wrap gap-4 items-start">
          <div
            className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0"
            style={{ width: 96, height: 96 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personAvatarUrl({ avatar_url: avatarUrl || null })}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2 min-w-0 flex-1">
            <label className="grid gap-1 text-sm font-semibold">
              รูปโปรไฟล์
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto || pending}
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {avatarUrl ? (
              <button
                type="button"
                className="ed-btn ed-btn--outline text-sm"
                disabled={pending}
                onClick={clearPhoto}
              >
                ลบรูป
              </button>
            ) : null}
            <p className="text-xs text-slate-500 m-0">
              รูปนี้แสดงในหน้าเกี่ยวกับโครงการ และจุดอื่นที่แสดงรูปองคมนตรี
            </p>
          </div>
        </div>

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
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
            ตำแหน่ง
            <input
              className="form-input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </label>
        </div>

        <div>
          <div className="text-sm font-semibold mb-1">จังหวัดในความดูแล</div>
          <p className="text-xs text-slate-500 m-0 mb-2">
            แก้ไขที่{' '}
            <Link href="/admin/domain" className="text-tm-blue underline">
              มอบหมายพื้นที่จัดการ
            </Link>
          </p>
          {initial.provinces.length ? (
            <div className="flex flex-wrap gap-1.5">
              {initial.provinces.map((p) => (
                <span
                  key={p}
                  className="ed-badge"
                  style={{ background: '#eff6ff', color: '#1d4ed8' }}
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 m-0">ยังไม่ระบุจังหวัด</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || uploadingPhoto}
            onClick={save}
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <Link href="/admin/overseers" className="ed-btn ed-btn--outline">
            กลับรายการ
          </Link>
        </div>
      </section>
    </div>
  );
}
