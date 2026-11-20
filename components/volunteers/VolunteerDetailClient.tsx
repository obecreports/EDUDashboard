'use client';

import Link from 'next/link';
import { BookOpen, Phone, UserRound } from 'lucide-react';
import { personAvatarUrl } from '@/lib/schools/images';

export type VolunteerDetailView = {
  id: string;
  name: string;
  typeLabel: string;
  overseerLabel: string;
  duty: string;
  lastPosition: string;
  address: string;
  tel: string;
  email: string;
  education: string;
  birthDate: string;
  avatarUrl: string | null;
  provinces: string;
  isOwner: boolean;
};

export function VolunteerDetailClient({ view }: { view: VolunteerDetailView }) {
  return (
    <div className="page-shell py-6 space-y-6" style={{ maxWidth: 860 }}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Link href="/volunteers" className="text-sm font-semibold text-tm-blue">
          ← รายชื่ออาสาสมัคร
        </Link>
        {view.isOwner ? (
          <Link href="/staff/profile" className="text-sm font-semibold text-tm-blue">
            แก้ไขในตั้งค่าโปรไฟล์ →
          </Link>
        ) : null}
      </div>

      <div className="panel-card !p-5 flex flex-wrap gap-5 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={personAvatarUrl({ avatar_url: view.avatarUrl })}
          alt=""
          className="h-28 w-28 rounded-2xl object-cover border border-slate-200 bg-slate-50"
        />
        <div>
          <h1 className="section-heading mb-1 mt-0">{view.name}</h1>
          <p className="text-sm text-slate-600 m-0">{view.typeLabel}</p>
          <p className="text-sm text-slate-500 m-0 mt-1">
            จังหวัด: {view.provinces || '—'}
          </p>
        </div>
      </div>

      <section className="panel-card !p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-tm-blue m-0">
          <UserRound size={18} /> ข้อมูลพื้นฐาน
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 m-0">
          <div>
            <dt className="text-xs text-slate-500 m-0">ชื่อ</dt>
            <dd className="m-0 font-medium">{view.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">ประเภทอาสาสมัคร</dt>
            <dd className="m-0 font-medium">{view.typeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">องคมนตรีที่สังกัด</dt>
            <dd className="m-0 font-medium">{view.overseerLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">วันเกิด</dt>
            <dd className="m-0 font-medium">{view.birthDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">หน้าที่</dt>
            <dd className="m-0 font-medium whitespace-pre-wrap">{view.duty || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 m-0">
              ตำแหน่งสุดท้ายก่อนเกษียณ (ตำแหน่ง - ปี - สังกัด)
            </dt>
            <dd className="m-0 font-medium">{view.lastPosition}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-card !p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-tm-blue m-0">
          <Phone size={18} /> ข้อมูลติดต่อ
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 m-0">
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 m-0">ที่อยู่</dt>
            <dd className="m-0 font-medium whitespace-pre-wrap">{view.address || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">โทรศัพท์</dt>
            <dd className="m-0 font-medium">{view.tel || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 m-0">E-mail</dt>
            <dd className="m-0 font-medium">{view.email || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-card !p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-tm-blue m-0">
          <BookOpen size={18} /> การศึกษา
        </h2>
        <dl className="m-0">
          <dt className="text-xs text-slate-500 m-0">วุฒิการศึกษา</dt>
          <dd className="m-0 font-medium whitespace-pre-wrap">
            {view.education || '—'}
          </dd>
        </dl>
      </section>
    </div>
  );
}
