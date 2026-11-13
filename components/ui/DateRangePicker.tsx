'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { formatThaiDate, toBuddhistYear } from '@/lib/format/date';

export type RangePreset =
  | 'today'
  | 'this-week'
  | 'next-week'
  | 'this-month'
  | 'last-month'
  | 'next-month'
  | 'custom';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function rangeForPreset(
  preset: RangePreset,
  anchor: Date = new Date()
): { from: string; to: string } {
  const today = new Date(anchor);
  today.setHours(0, 0, 0, 0);
  if (preset === 'today') return { from: ymd(today), to: ymd(today) };
  if (preset === 'this-week') {
    const start = startOfWeek(today);
    return { from: ymd(start), to: ymd(addDays(start, 6)) };
  }
  if (preset === 'next-week') {
    const start = addDays(startOfWeek(today), 7);
    return { from: ymd(start), to: ymd(addDays(start, 6)) };
  }
  if (preset === 'this-month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: ymd(start), to: ymd(end) };
  }
  if (preset === 'last-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: ymd(start), to: ymd(end) };
  }
  if (preset === 'next-month') {
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { from: ymd(start), to: ymd(end) };
  }
  // custom — month of anchor (calendar month navigation)
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: ymd(start), to: ymd(end) };
}

export const DATE_RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'this-week', label: 'สัปดาห์นี้' },
  { key: 'next-week', label: 'สัปดาห์หน้า' },
  { key: 'this-month', label: 'เดือนนี้' },
  { key: 'last-month', label: 'เดือนก่อนหน้า' },
  { key: 'next-month', label: 'เดือนหน้า' },
];

type Props = {
  from: string;
  to: string;
  preset: RangePreset;
  onChange: (next: { from: string; to: string; preset: RangePreset }) => void;
  /** Hide preset chips */
  hidePresets?: boolean;
};

function MonthCalendar({
  viewYear,
  viewMonth,
  from,
  to,
  onPick,
  onPrev,
  onNext,
}: {
  viewYear: number;
  viewMonth: number;
  from: string;
  to: string;
  onPick: (ymd: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const inRange = (day: number) => {
    const s = ymd(new Date(viewYear, viewMonth, day));
    if (!from || !to) return s === from || s === to;
    return s >= from && s <= to;
  };
  const isEdge = (day: number) => {
    const s = ymd(new Date(viewYear, viewMonth, day));
    return s === from || s === to;
  };

  return (
    <div className="date-range-cal">
      <div className="date-range-cal__head">
        <button type="button" className="pagination-btn" onClick={onPrev} aria-label="เดือนก่อน">
          <ChevronLeft size={16} />
        </button>
        <strong>
          {THAI_MONTHS_SHORT[viewMonth]} {toBuddhistYear(viewYear)}
        </strong>
        <button type="button" className="pagination-btn" onClick={onNext} aria-label="เดือนถัดไป">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="date-range-cal__weekdays">
        {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="date-range-cal__grid">
        {cells.map((day, idx) =>
          day == null ? (
            <span key={`e-${idx}`} className="date-range-cal__cell is-empty" />
          ) : (
            <button
              key={`${viewYear}-${viewMonth}-${day}`}
              type="button"
              className={[
                'date-range-cal__cell',
                inRange(day) ? 'is-in-range' : '',
                isEdge(day) ? 'is-edge' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPick(ymd(new Date(viewYear, viewMonth, day)))}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Preset chips + calendar popover for selecting a date range (CE storage, BE display).
 */
export function DateRangePicker({
  from,
  to,
  preset,
  onChange,
  hidePresets = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const anchor = useMemo(() => parseYmd(from) ?? new Date(), [from]);
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  useEffect(() => {
    if (!open) return;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPicking(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const applyPreset = (key: RangePreset) => {
    if (key === 'custom') return;
    const next = rangeForPreset(key);
    onChange({ ...next, preset: key });
  };

  const openCal = (which: 'from' | 'to') => {
    setPicking(which);
    setOpen(true);
  };

  const onPick = (day: string) => {
    if (picking === 'to') {
      let nextFrom = from;
      let nextTo = day;
      if (nextFrom && nextTo < nextFrom) {
        nextFrom = day;
        nextTo = from;
      }
      onChange({ from: nextFrom || day, to: nextTo, preset: 'custom' });
      setOpen(false);
      setPicking(null);
      return;
    }
    // picking from (or first click)
    if (!from || (from && to && picking !== 'from')) {
      onChange({ from: day, to: day, preset: 'custom' });
      setPicking('to');
      return;
    }
    onChange({ from: day, to: to && to >= day ? to : day, preset: 'custom' });
    setPicking('to');
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="date-range-picker space-y-2" ref={rootRef}>
      {!hidePresets && (
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`navbar__link ${preset === p.key ? 'navbar__link--active' : ''}`}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end relative">
        <label className="grid gap-1 text-sm font-semibold">
          จากวันที่
          <button
            type="button"
            className="form-input flex items-center gap-2 text-left min-w-[10rem]"
            onClick={() => openCal('from')}
          >
            <CalendarDays size={14} className="shrink-0 opacity-70" />
            <span>{from ? formatThaiDate(from) : 'เลือกวันที่'}</span>
          </button>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          ถึงวันที่
          <button
            type="button"
            className="form-input flex items-center gap-2 text-left min-w-[10rem]"
            onClick={() => openCal('to')}
          >
            <CalendarDays size={14} className="shrink-0 opacity-70" />
            <span>{to ? formatThaiDate(to) : 'เลือกวันที่'}</span>
          </button>
        </label>

        {open && (
          <div className="date-range-cal__popover ed-card p-3 shadow-lg absolute z-20 top-full left-0 mt-1">
            <p className="text-xs text-slate-500 m-0 mb-2">
              {picking === 'to'
                ? 'เลือกวันสิ้นสุดช่วง'
                : 'เลือกวันเริ่มต้น แล้วเลือกวันสิ้นสุด'}
            </p>
            <MonthCalendar
              viewYear={viewYear}
              viewMonth={viewMonth}
              from={from}
              to={to}
              onPick={onPick}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
