'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type PersonFilterOpt = {
  id: string;
  full_name: string;
  role_label?: string;
};

/** Parse `?person=id` or `?person=id1,id2` from search params. */
export function parsePersonIdsParam(
  raw: string | string[] | null | undefined
): string[] {
  if (raw == null) return [];
  const text = Array.isArray(raw) ? raw.join(',') : String(raw);
  return [
    ...new Set(
      text
        .split(/[,+]/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export function personIdsToParam(ids: string[]): string {
  return ids.filter(Boolean).join(',');
}

export function PersonMultiFilter({
  people,
  selectedIds,
  onChange,
  label = 'บุคคล',
}: {
  people: PersonFilterOpt[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const summary =
    selectedIds.length === 0
      ? 'ทั้งหมด'
      : selectedIds.length === 1
        ? people.find((p) => p.id === selectedIds[0])?.full_name || '1 คน'
        : `${selectedIds.length} คน`;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="form-input flex items-center justify-between gap-2 text-left w-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="truncate text-sm">
          <span className="text-slate-500">{label}: </span>
          {summary}
        </span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg p-2 space-y-1">
          <button
            type="button"
            className="text-xs text-tm-blue underline px-1"
            onClick={() => onChange([])}
          >
            ล้างตัวกรอง
          </button>
          {people.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-2 text-sm px-1 py-0.5 cursor-pointer hover:bg-slate-50 rounded"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span>
                {p.full_name}
                {p.role_label ? (
                  <span className="text-slate-400"> ({p.role_label})</span>
                ) : null}
              </span>
            </label>
          ))}
          {people.length === 0 && (
            <p className="text-xs text-slate-500 m-0 px-1">ไม่มีรายชื่อ</p>
          )}
        </div>
      )}
    </div>
  );
}
