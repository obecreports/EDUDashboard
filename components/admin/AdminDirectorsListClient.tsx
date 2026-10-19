'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDisplayName, type SchoolDirector } from '@/lib/types';
import { Pencil, Plus, UserRound, Link2 } from 'lucide-react';

export type DirectorListRow = SchoolDirector & {
  activeSchoolCount: number;
};

export function AdminDirectorsListClient({
  directors,
}: {
  directors: DirectorListRow[];
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return directors;
    return directors.filter((d) => {
      const label = formatDisplayName(d.name_prefix, d.full_name).toLowerCase();
      return (
        label.includes(needle) ||
        d.full_name.toLowerCase().includes(needle) ||
        (d.position_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [directors, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <input
          className="form-input flex-1 min-w-[200px]"
          placeholder="ค้นหาชื่อ / คำนำหน้า / ตำแหน่ง"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/directors/assign" className="ed-btn ed-btn--outline">
            <Link2 size={16} className="inline mr-1" />
            มอบหมายโรงเรียน
          </Link>
          <Link href="/admin/directors/new" className="ed-btn ed-btn--primary">
            <Plus size={16} className="inline mr-1" />
            สร้างใหม่
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 m-0 ed-card p-4">ไม่พบผู้อำนวยการ</p>
      ) : (
        <ul className="m-0 p-0 list-none space-y-2">
          {filtered.map((d) => (
            <li key={d.director_id} className="ed-card p-3 flex flex-wrap gap-3 items-center">
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0"
                style={{ width: 48, height: 48 }}
              >
                {d.picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.picture_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserRound size={22} className="text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-tm-blue block">
                  {formatDisplayName(d.name_prefix, d.full_name)}
                </strong>
                <span className="text-xs text-slate-500">
                  {d.position_name || 'ผู้อำนวยการโรงเรียน'}
                  {' · '}
                  ดูแล {d.activeSchoolCount} โรงเรียน
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/directors/${d.director_id}/edit`}
                  className="ed-btn ed-btn--outline text-sm"
                >
                  <Pencil size={14} className="inline mr-1" />
                  แก้ไข
                </Link>
                <Link
                  href={`/admin/directors/assign?director=${encodeURIComponent(d.director_id)}`}
                  className="ed-btn ed-btn--outline text-sm"
                >
                  มอบหมาย
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
