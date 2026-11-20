'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatThaiMonthYear } from '@/lib/format/date';

const WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ScheduleDateCalendar({
  value,
  onChange,
  minDate,
}: {
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
}) {
  const selected = parseYmd(value);
  const today = ymd(new Date());
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  useEffect(() => {
    if (!selected) return;
    setCursor({ year: selected.getFullYear(), month: selected.getMonth() });
  }, [value]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startPad = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: Array<{ day: number; ymd: string } | null> = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({
        day,
        ymd: ymd(new Date(cursor.year, cursor.month, day)),
      });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor.year, cursor.month]);

  const headerLabel = formatThaiMonthYear(
    new Date(cursor.year, cursor.month, 1)
  );

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="schedule-date-cal panel-card !p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          className="ed-btn ed-btn--outline ed-btn--sm !px-2"
          aria-label="เดือนก่อน"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <strong className="text-sm text-tm-blue">{headerLabel}</strong>
        <button
          type="button"
          className="ed-btn ed-btn--outline ed-btn--sm !px-2"
          aria-label="เดือนถัดไป"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="schedule-date-cal__grid">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="schedule-date-cal__dow">
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`e-${idx}`} className="schedule-date-cal__cell" />;
          }
          const disabled = Boolean(minDate && cell.ymd < minDate);
          const isSelected = cell.ymd === value;
          const isToday = cell.ymd === today;
          return (
            <button
              key={cell.ymd}
              type="button"
              disabled={disabled}
              className={[
                'schedule-date-cal__day',
                isSelected ? 'schedule-date-cal__day--selected' : '',
                isToday ? 'schedule-date-cal__day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                onChange(cell.ymd);
                setCursor({ year: cursor.year, month: cursor.month });
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
