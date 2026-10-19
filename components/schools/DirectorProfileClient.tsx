'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, UserRound } from 'lucide-react';
import type { DirectorHistoryEntry, SchoolDirector } from '@/lib/types';
import { formatDisplayName } from '@/lib/types';
import { directorPictureUrl } from '@/lib/schools/images';
import { formatThaiDate } from '@/lib/format/date';

const GENDER_TH: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่นๆ',
};

export function DirectorProfileClient({
  schoolId,
  schoolName,
  director,
  history,
}: {
  schoolId: string;
  schoolName: string;
  director: SchoolDirector;
  history: DirectorHistoryEntry[];
}) {
  const label = formatDisplayName(director.name_prefix, director.full_name);
  const photo = directorPictureUrl(director);

  return (
    <div className="page-shell py-5 space-y-4" style={{ maxWidth: 720 }}>
      <nav className="text-sm text-slate-600 flex flex-wrap items-center gap-1">
        <Link href={`/schools/${schoolId}`} className="text-tm-blue hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={14} />
          {schoolName || 'โรงเรียน'}
        </Link>
        <span aria-hidden>/</span>
        <span>ผู้อำนวยการ</span>
      </nav>

      <section className="ed-card p-4 flex flex-wrap gap-4 items-start">
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0"
          style={{ width: 112, height: 112 }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserRound size={40} className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500 m-0">
            {director.position_name || 'ผู้อำนวยการโรงเรียน'}
          </p>
          <h1 className="section-heading text-xl m-0">{label}</h1>
          {director.gender ? (
            <p className="text-sm text-slate-600 m-0">
              เพศ: {GENDER_TH[director.gender] ?? director.gender}
            </p>
          ) : null}
        </div>
      </section>

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0 flex items-center gap-2">
          <Building2 size={16} /> ประวัติโรงเรียนที่รับผิดชอบ
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 m-0">ยังไม่มีประวัติการมอบหมาย</p>
        ) : (
          <ol className="m-0 p-0 list-none space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/schools/${h.school_id}`}
                    className="font-semibold text-tm-blue hover:underline"
                  >
                    {h.school_name}
                  </Link>
                  {h.active ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      ปัจจุบัน
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 m-0 mt-1">
                  เริ่ม {formatThaiDate(h.started_at.slice(0, 10))}
                  {h.ended_at
                    ? ` · สิ้นสุด ${formatThaiDate(h.ended_at.slice(0, 10))}`
                    : ' · ยังดำรงตำแหน่ง'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="text-sm m-0">
        <Link href={`/schools/${schoolId}`} className="text-tm-blue underline">
          ← กลับหน้ารายละเอียดโรงเรียน
        </Link>
      </p>
    </div>
  );
}
