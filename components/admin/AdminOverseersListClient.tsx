'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDisplayName } from '@/lib/types';
import { personAvatarUrl } from '@/lib/schools/images';
import { GripVertical, Pencil, UserRound } from 'lucide-react';
import { saveOverseerDisplayOrderAction } from '@/app/actions/admin-overseers';

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
  overseers: initial,
}: {
  overseers: OverseerAdminRow[];
}) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((o) => {
      const label = formatDisplayName(o.name_prefix, o.full_name).toLowerCase();
      return (
        label.includes(needle) ||
        o.full_name.toLowerCase().includes(needle) ||
        (o.position ?? '').toLowerCase().includes(needle) ||
        o.provinces.some((p) => p.toLowerCase().includes(needle))
      );
    });
  }, [rows, q]);

  const searching = q.trim().length > 0;

  const persistOrder = (next: OverseerAdminRow[]) => {
    start(async () => {
      const res = await saveOverseerDisplayOrderAction(next.map((r) => r.id));
      setMsg(
        res.ok
          ? 'บันทึกลำดับแสดงผลแล้ว — ใช้ในหน้าเกี่ยวกับโครงการ'
          : res.error || 'บันทึกลำดับไม่สำเร็จ'
      );
    });
  };

  const moveRow = (fromId: string, toId: string) => {
    if (fromId === toId || searching) return;
    const from = rows.findIndex((r) => r.id === fromId);
    const to = rows.findIndex((r) => r.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setRows(next);
    persistOrder(next);
  };

  return (
    <div className="space-y-4">
      <input
        className="form-input w-full"
        placeholder="ค้นหาชื่อ / ตำแหน่ง / จังหวัด"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <p className="text-sm text-slate-600 m-0">
        ลากแถวเพื่อจัดลำดับการแสดงในหน้าเกี่ยวกับโครงการ
        {searching
          ? ' · ล้างคำค้นหาก่อนจึงจะลากเรียงลำดับได้'
          : ' · แถวบน = แสดงก่อน'}
        {pending ? ' · กำลังบันทึก…' : ''}
      </p>
      {msg ? <p className="text-sm text-tm-blue m-0">{msg}</p> : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 m-0 ed-card p-4">ไม่พบองคมนตรี</p>
      ) : (
        <ul className="m-0 p-0 list-none space-y-2">
          {filtered.map((o, index) => (
            <li
              key={o.id}
              draggable={!searching}
              onDragStart={() => {
                if (searching) return;
                setDragId(o.id);
              }}
              onDragOver={(e) => {
                if (searching || !dragId) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId) return;
                moveRow(dragId, o.id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={`ed-card p-3 flex flex-wrap gap-3 items-center ${
                dragId === o.id ? 'opacity-60 ring-2 ring-tm-blue/30' : ''
              } ${searching ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <span
                className="text-slate-400 shrink-0"
                title={searching ? undefined : 'ลากเพื่อเรียงลำดับ'}
                aria-hidden
              >
                <GripVertical size={18} />
              </span>
              <span className="text-xs font-bold text-slate-400 w-6 shrink-0 tabular-nums">
                {index + 1}
              </span>
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
                draggable={false}
                onClick={(e) => e.stopPropagation()}
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
