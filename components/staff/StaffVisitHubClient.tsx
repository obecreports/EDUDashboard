'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  AlertTriangle,
  MapPin,
  MessageSquarePlus,
  Phone,
  UserRound,
} from 'lucide-react';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import type { UserRole } from '@/lib/types';
import { normalizeActivity, normalizeStatus } from '@/lib/visits/labels';
import { statusFromScore } from '@/lib/theme/status';

type SchoolOpt = {
  id: string;
  name: string;
  area_id: string;
  area_name: string;
  province: string;
  district?: string;
  overallScore?: number;
  students?: number;
  teachers?: number;
  size?: string;
  phone?: string;
  director?: string;
};

type PersonOpt = {
  id: string;
  full_name: string;
  role: UserRole;
  role_label: string;
};

type RangePreset = 'today' | 'this-week' | 'next-week' | 'this-month' | 'next-month' | 'custom';

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

function formatThaiShort(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function rangeForPreset(preset: RangePreset, anchor: Date): { from: string; to: string } {
  const today = new Date();
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
  if (preset === 'next-month') {
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { from: ymd(start), to: ymd(end) };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: ymd(start), to: ymd(end) };
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'this-week', label: 'สัปดาห์นี้' },
  { key: 'next-week', label: 'สัปดาห์หน้า' },
  { key: 'this-month', label: 'เดือนนี้' },
  { key: 'next-month', label: 'เดือนหน้า' },
];

const SCHEDULE_PAGE_SIZE = 10;

export function StaffVisitHubClient({
  events: initial,
  schools,
  managedCount,
  currentUserId,
  people = [],
  focusDate = '',
}: {
  events: StaffCalendarEvent[];
  schools: SchoolOpt[];
  managedCount: number;
  currentUserId: string;
  people?: PersonOpt[];
  /** Optional YYYY-MM-DD to focus after creating a schedule */
  focusDate?: string;
}) {
  const today = ymd(new Date());
  const [events, setEvents] = useState(initial);
  const [cursor, setCursor] = useState(() => {
    if (focusDate && /^\d{4}-\d{2}-\d{2}$/.test(focusDate)) {
      const d = new Date(focusDate + 'T12:00:00');
      if (!Number.isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });
  const [preset, setPreset] = useState<RangePreset>(
    focusDate && /^\d{4}-\d{2}-\d{2}$/.test(focusDate) ? 'custom' : 'this-month'
  );
  const [range, setRange] = useState(() =>
    focusDate && /^\d{4}-\d{2}-\d{2}$/.test(focusDate)
      ? { from: focusDate, to: focusDate }
      : rangeForPreset('this-month', new Date())
  );
  const [scopeView, setScopeView] = useState<'mine' | 'chain'>('chain');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    setEvents(initial);
  }, [initial]);

  useEffect(() => {
    if (!focusDate || !/^\d{4}-\d{2}-\d{2}$/.test(focusDate)) return;
    setPreset('custom');
    setRange({ from: focusDate, to: focusDate });
    const d = new Date(focusDate + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) {
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [focusDate]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const scopedEvents = useMemo(
    () =>
      scopeView === 'mine' ? events.filter((e) => e.staff_id === currentUserId) : events,
    [events, scopeView, currentUserId]
  );

  const waiting = scopedEvents.filter((e) => normalizeStatus(e.status_th ?? e.status) === 'นัดหมายแล้ว').length;
  const done = scopedEvents.filter((e) => normalizeStatus(e.status_th ?? e.status) === 'เยี่ยมชมเสร็จสิ้น').length;

  const personLabel = (staffId: string) => {
    const p = peopleById.get(staffId);
    if (!p) return { name: staffId === currentUserId ? 'ฉัน' : 'ไม่ระบุ', role: '', isMe: staffId === currentUserId };
    return {
      name: staffId === currentUserId ? `${p.full_name} (ฉัน)` : p.full_name,
      role: p.role_label,
      isMe: staffId === currentUserId,
    };
  };

  const applyPreset = (key: RangePreset) => {
    setPreset(key);
    // Always anchor presets to "today" so month/week switches don't stick to an old cursor
    const next = rangeForPreset(key, new Date());
    setRange(next);
    const d = new Date(next.from + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) {
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const upcoming = useMemo(
    () =>
      [...scopedEvents]
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [scopedEvents, today]
  );

  const rangedEvents = useMemo(
    () =>
      [...scopedEvents]
        .filter((e) => e.date >= range.from && e.date <= range.to)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            (a.created_at || '').localeCompare(b.created_at || '') ||
            (a.school_name || '').localeCompare(b.school_name || '', 'th')
        ),
    [scopedEvents, range]
  );

  const totalListPages = Math.max(1, Math.ceil(rangedEvents.length / SCHEDULE_PAGE_SIZE));
  const pagedEvents = rangedEvents.slice(
    (listPage - 1) * SCHEDULE_PAGE_SIZE,
    listPage * SCHEDULE_PAGE_SIZE
  );

  useEffect(() => {
    setListPage(1);
  }, [range.from, range.to, scopeView, preset]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  const monthLabel = cursor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const startPad = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, StaffCalendarEvent[]>();
    scopedEvents.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [scopedEvents]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="page-shell py-5 space-y-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="status-card">
            <div className="status-card__icon" style={{ background: '#DBEAFE', color: '#0B4DA2' }}>
              <Building2 size={18} />
            </div>
            <div>
              <div className="status-card__value text-tm-blue">{managedCount}</div>
              <div className="status-card__label">โรงเรียนในความดูแล</div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card__icon" style={{ background: '#FFEDD5', color: '#C2410C' }}>
              <Clock3 size={18} />
            </div>
            <div>
              <div className="status-card__value" style={{ color: '#C2410C' }}>{waiting}</div>
              <div className="status-card__label">รอลงพื้นที่</div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card__icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="status-card__value" style={{ color: '#15803D' }}>{done}</div>
              <div className="status-card__label">ลงพื้นที่แล้ว</div>
            </div>
          </div>
          <div className="status-card">
            <div className="status-card__icon" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="status-card__value" style={{ color: '#B91C1C' }}>
                {Math.max(0, managedCount - done)}
              </div>
              <div className="status-card__label">ต้องติดตาม</div>
            </div>
          </div>
        </div>

        <div className="ed-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">มุมมอง</strong>
            <div className="score-mode-switch" role="group" aria-label="ขอบเขตตารางนัด">
              <button
                type="button"
                className={scopeView === 'mine' ? 'is-active' : ''}
                onClick={() => setScopeView('mine')}
              >
                นัดของฉัน
              </button>
              <button
                type="button"
                className={scopeView === 'chain' ? 'is-active' : ''}
                onClick={() => setScopeView('chain')}
              >
                นัดทั้งหมด
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">ช่วงวันที่</strong>
            {PRESETS.map((p) => (
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
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm font-semibold grid gap-1">
              จาก
              <input
                type="date"
                className="form-input"
                value={range.from}
                onChange={(e) => {
                  setPreset('custom');
                  setRange((r) => ({ ...r, from: e.target.value }));
                  const d = new Date(e.target.value + 'T12:00:00');
                  if (!Number.isNaN(d.getTime())) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              />
            </label>
            <label className="text-sm font-semibold grid gap-1">
              ถึง
              <input
                type="date"
                className="form-input"
                value={range.to}
                onChange={(e) => {
                  setPreset('custom');
                  setRange((r) => ({ ...r, to: e.target.value }));
                }}
              />
            </label>
            <Link
              href={
                range.from === range.to
                  ? `/calendar/new?date=${encodeURIComponent(range.from)}`
                  : '/calendar/new'
              }
              className="ed-btn ed-btn--primary ed-btn--sm"
            >
              <CalendarDays size={14} /> เพิ่มนัดหมาย
            </Link>
          </div>
        </div>

        <div className="ed-visit-layout">
          <aside className="space-y-4">
            <section className="ed-card p-4">
              <div className="flex items-center justify-between mb-3">
                <strong>{monthLabel}</strong>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="navbar__link"
                    onClick={() => {
                      const next = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
                      setCursor(next);
                      setPreset('custom');
                      setRange(rangeForPreset('custom', next));
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="navbar__link"
                    onClick={() => {
                      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                      setCursor(next);
                      setPreset('custom');
                      setRange(rangeForPreset('custom', next));
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="ed-mini-cal">
                {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
                  <div key={d} className="ed-mini-cal__head">
                    {d}
                  </div>
                ))}
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), day));
                  const dayEvents = eventsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === today;
                  const inRange = dateStr >= range.from && dateStr <= range.to;
                  const hasMine = dayEvents.some((e) => e.staff_id === currentUserId);
                  const hasOther = dayEvents.some((e) => e.staff_id !== currentUserId);
                  const ownerClass =
                    hasMine && hasOther
                      ? 'ed-mini-cal__day--has-both'
                      : hasMine
                        ? 'ed-mini-cal__day--has-mine'
                        : hasOther
                          ? 'ed-mini-cal__day--has-other'
                          : '';
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`ed-mini-cal__day ${isToday ? 'ed-mini-cal__day--today' : ''} ${
                        inRange ? 'ed-mini-cal__day--range' : ''
                      } ${ownerClass}`}
                      onClick={() => {
                        setPreset('custom');
                        setRange({ from: dateStr, to: dateStr });
                        if (dayEvents.length) {
                          setExpandedIds(new Set(dayEvents.map((e) => e.id)));
                        }
                      }}
                    >
                      <span className="ed-mini-cal__day-num">{day}</span>
                      {dayEvents.length > 1 ? (
                        <span className="ed-mini-cal__day-count" aria-label={`${dayEvents.length} นัด`}>
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="cal-owner-legend mt-3">
                <span>
                  <i style={{ background: '#166534' }} /> นัดของฉัน
                </span>
                <span>
                  <i style={{ background: '#991b1b' }} /> นัดของผู้อื่น
                </span>
              </div>
            </section>

            <section className="ed-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="ed-section-title text-base m-0">รายการลงพื้นที่ (เร็วๆ นี้)</h2>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">ยังไม่มีนัดหมาย</p>
              ) : (
                upcoming.map((e) => {
                  const st = normalizeStatus(e.status_th ?? e.status);
                  const mine = e.staff_id === currentUserId;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`ed-visit-item ${mine ? 'ed-visit-item--mine' : 'ed-visit-item--other'}`}
                      onClick={() => {
                        setPreset('custom');
                        setRange({ from: e.date, to: e.date });
                        setExpandedIds(new Set([e.id]));
                        const d = new Date(e.date + 'T12:00:00');
                        setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                      }}
                    >
                      <div className="ed-visit-item__date">{formatThaiShort(e.date)}</div>
                      <div className="min-w-0 text-left">
                        <div className="font-semibold truncate">{e.school_name || 'ไม่ระบุโรงเรียน'}</div>
                        <div className="text-xs text-slate-500">
                          {normalizeActivity(String(e.activity))}
                          {' · '}
                          <span className={mine ? 'owner-name--mine' : 'owner-name--other'}>
                            {mine ? 'ของฉัน' : 'ผู้อื่น'}
                          </span>
                        </div>
                      </div>
                      <span className={`cal-badge ${st === 'เยี่ยมชมเสร็จสิ้น' ? 'cal-badge--done' : 'cal-badge--sched'}`}>
                        {st}
                      </span>
                    </button>
                  );
                })
              )}
            </section>
          </aside>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="ed-section-title text-base m-0">
                นัดหมายในช่วงที่เลือก ({rangedEvents.length})
              </h2>
              <span className="text-xs text-slate-500">
                {formatThaiShort(range.from)} – {formatThaiShort(range.to)} · คลิกการ์ดเพื่อขยาย
              </span>
            </div>

            {rangedEvents.length === 0 ? (
              <div className="ed-card p-5 text-slate-500">ไม่มีนัดหมายในช่วงวันที่นี้</div>
            ) : (
              <>
              {pagedEvents.map((e) => {
                const open = expandedIds.has(e.id);
                const st = normalizeStatus(e.status_th ?? e.status);
                const school = schools.find((s) => s.id === e.school_id);
                const schoolStatus = statusFromScore(school?.overallScore);
                const booker = personLabel(e.staff_id);
                return (
                  <article
                    key={e.id}
                    className={`ed-card visit-booking-card ${open ? 'is-open' : ''} ${
                      booker.isMe ? 'visit-booking-card--mine' : 'visit-booking-card--other'
                    }`}
                  >
                    <button
                      type="button"
                      className="visit-booking-card__head"
                      aria-expanded={open}
                      onClick={() => toggleExpand(e.id)}
                    >
                      <div className="visit-booking-card__date">{formatThaiShort(e.date)}</div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="font-bold text-tm-blue truncate">
                          {e.school_name || school?.name || 'โรงเรียน'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {normalizeActivity(String(e.activity))}
                          {' · '}
                          <span className={booker.isMe ? 'owner-name--mine' : 'owner-name--other'}>
                            {booker.name}
                          </span>
                          {booker.role ? ` · ${booker.role}` : ''}
                        </div>
                      </div>
                      <span className={`cal-badge ${st === 'เยี่ยมชมเสร็จสิ้น' ? 'cal-badge--done' : 'cal-badge--sched'}`}>
                        {st}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`visit-booking-card__chevron ${open ? 'is-open' : ''}`}
                      />
                    </button>
                    {open && (
                      <div className="visit-booking-card__body space-y-3">
                        <div className="flex flex-wrap gap-4 justify-between">
                          <div className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <UserRound size={14} />
                              ผู้จอง:{' '}
                              <strong className={booker.isMe ? 'owner-name--mine' : 'owner-name--other'}>
                                {booker.name}
                              </strong>
                              {booker.role ? ` (${booker.role})` : ''}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              {[school?.district, school?.province || e.province].filter(Boolean).join(' · ') || '—'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              {school?.phone || '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-extrabold text-tm-blue">
                              {(school?.overallScore ?? 0).toFixed(2)}
                              <span className="text-sm text-slate-400"> / 5</span>
                            </div>
                            <span
                              className="ed-badge"
                              style={{ background: schoolStatus.bg, color: schoolStatus.color }}
                            >
                              {schoolStatus.label}
                            </span>
                          </div>
                        </div>
                        {e.notes && (
                          <p className="text-sm m-0 rounded-xl bg-slate-50 border border-slate-100 p-3">
                            {e.notes}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={e.school_id ? `/schools/${e.school_id}` : '/schools'}
                            className="ed-btn ed-btn--primary ed-btn--sm"
                          >
                            ดูรายละเอียดโรงเรียน
                          </Link>
                          <Link
                            href={
                              e.school_id
                                ? `/reports/new?school_id=${encodeURIComponent(e.school_id)}`
                                : '/reports/new'
                            }
                            className="ed-btn ed-btn--outline ed-btn--sm"
                          >
                            <MessageSquarePlus size={14} /> เพิ่มความคิดเห็น
                          </Link>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {rangedEvents.length > SCHEDULE_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-500">
                    แสดง {(listPage - 1) * SCHEDULE_PAGE_SIZE + 1}–
                    {Math.min(listPage * SCHEDULE_PAGE_SIZE, rangedEvents.length)} จาก{' '}
                    {rangedEvents.length} รายการ
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="ed-btn ed-btn--outline ed-btn--sm"
                      disabled={listPage <= 1}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    >
                      ก่อนหน้า
                    </button>
                    {Array.from({ length: totalListPages }, (_, i) => i + 1)
                      .filter((n) => {
                        if (totalListPages <= 5) return true;
                        const start = Math.max(1, Math.min(listPage - 2, totalListPages - 4));
                        return n >= start && n < start + 5;
                      })
                      .map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`ed-btn ed-btn--sm ${
                            n === listPage ? 'ed-btn--primary' : 'ed-btn--outline'
                          }`}
                          onClick={() => setListPage(n)}
                        >
                          {n}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="ed-btn ed-btn--outline ed-btn--sm"
                      disabled={listPage >= totalListPages}
                      onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              ) : null}
              </>
            )}
          </section>
        </div>
      </div>

    </div>
  );
}
