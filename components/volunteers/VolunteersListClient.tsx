'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { personAvatarUrl } from '@/lib/schools/images';

export type VolunteerListRow = {
  id: string;
  name: string;
  typeLabel: string;
  overseerLabel: string;
  provinces: string;
  avatarUrl: string | null;
};

export function VolunteersListClient({ rows }: { rows: VolunteerListRow[] }) {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(
    () => [...new Set(rows.map((r) => r.typeLabel))].sort((a, b) => a.localeCompare(b, 'th')),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.typeLabel !== typeFilter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.provinces.toLowerCase().includes(needle) ||
        r.overseerLabel.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          className="form-input max-w-sm"
          placeholder="ค้นหาชื่อ / จังหวัด / องคมนตรี"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="form-input max-w-xs"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">อาสาสมัครทุกประเภท</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500 m-0">
        แสดง {filtered.length} จาก {rows.length} คน
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/volunteers/${r.id}`}
            className="panel-card !p-4 flex gap-3 no-underline text-inherit hover:border-tm-blue/40 border border-transparent transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personAvatarUrl({ avatar_url: r.avatarUrl })}
              alt=""
              className="h-14 w-14 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
            />
            <span className="min-w-0">
              <span className="block font-bold text-tm-blue truncate">{r.name}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{r.typeLabel}</span>
              <span className="block text-xs text-slate-600 mt-1 truncate">
                องคมนตรี: {r.overseerLabel}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5 truncate">
                {r.provinces || '—'}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-slate-500">ไม่พบอาสาสมัครในขอบเขต</p>
      ) : null}
    </div>
  );
}
