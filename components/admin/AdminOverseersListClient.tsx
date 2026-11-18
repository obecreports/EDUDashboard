'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDisplayName } from '@/lib/types';
import { personAvatarUrl } from '@/lib/schools/images';
import { Pencil, UserRound } from 'lucide-react';

export type OverseerAdminRow = {
  id: string;
  full_name: string;
  name_prefix?: string | null;
  position: string;
  avatar_url?: string | null;
  provinceCount: number;
  provinces: string[];
};

export function AdminOverseersListClient({
  overseers,
}: {
  overseers: OverseerAdminRow[];
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return overseers;
    return overseers.filter((o) => {
      const label = formatDisplayName(o.name_prefix, o.full_name).toLowerCase();
      return (
        label.includes(needle) ||
        o.full_name.toLowerCase().includes(needle) ||
        (o.position ?? '').toLowerCase().includes(needle) ||
        o.provinces.some((p) => p.toLowerCase().includes(needle))
      );
    });
  }, [overseers, q]);

  return (
    <div className="space-y-4">
      <input
        className="form-input w-full"
        placeholder="ค้นหาชื่อ / ตำแหน่ง / จังหวัด"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 m-0 ed-card p-4">ไม่พบองคมนตรี</p>
      ) : (
        <ul className="m-0 p-0 list-none space-y-2">
          {filtered.map((o) => (
            <li key={o.id} className="ed-card p-3 flex flex-wrap gap-3 items-center">
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0"
                style={{ width: 48, height: 48 }}
              >
                {o.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={personAvatarUrl(o)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserRound size={22} className="text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-tm-blue block">
                  {formatDisplayName(o.name_prefix, o.full_name)}
                </strong>
                <span className="text-xs text-slate-500">
                  {o.position || 'องคมนตรี'}
                  {' · '}
                  {o.provinceCount} จังหวัด
                </span>
              </div>
              <Link
                href={`/admin/overseers/${o.id}/edit`}
                className="ed-btn ed-btn--outline text-sm"
              >
                <Pencil size={14} className="inline mr-1" />
                แก้ไขการแสดงผล
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
