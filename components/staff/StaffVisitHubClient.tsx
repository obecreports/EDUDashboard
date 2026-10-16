'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  AlertTriangle,
  LogOut,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Phone,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import type { UserRole } from '@/lib/types';
import { normalizeActivity, normalizeStatus } from '@/lib/visits/labels';
import { statusFromScore } from '@/lib/theme/status';
import { formatThaiDate, formatThaiMonthYear } from '@/lib/format/date';
import { ThaiDateField } from '@/components/ui/ThaiDateField';
import {
  cancelVisitEventAction,
  leaveVisitEventAction,
} from '@/app/actions/visits';

function isInvolved(e: StaffCalendarEvent, userId: string) {
  return e.staff_id === userId || (e.participant_ids ?? []).includes(userId);
}

function isActiveEvent(e: StaffCalendarEvent) {
  return normalizeStatus(e.status_th ?? e.status) !== 'ยกเลิก';
}

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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
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

  const activeEvents = useMemo(() => events.filter(isActiveEvent), [events]);

  const scopedEvents = useMemo(
    () =>
      scopeView === 'mine'
        ? activeEvents.filter((e) => isInvolved(e, currentUserId))
        : activeEvents,
    [activeEvents, scopeView, currentUserId]
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

  const monthLabel = formatThaiMonthYear(cursor);
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

  const runCancel = (id: string) => {
    if (!window.confirm('ยกเลิกนัดหมายนี้สำหรับทุกคนในทีม?')) return;
    setActionMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await cancelVisitEventAction(fd);
      if (!res.ok) {
        setActionMsg(res.error || 'ยกเลิกไม่สำเร็จ');
        return;
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status_th: 'ยกเลิก' as const, status: 'scheduled' as const }
            : e
        )
      );
      router.refresh();
    });
  };

  const runLeave = (id: string) => {
    if (!window.confirm('ออกจากนัดนี้? นัดจะยังคงอยู่ในปฏิทินของเจ้าของและสมาชิกอื่น')) return;
    setActionMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await leaveVisitEventAction(fd);
      if (!res.ok) {
        setActionMsg(res.error || 'ออกจากนัดไม่สำเร็จ');
        return;
      }
      setEvents((prev) =>
        prev
          .map((e) => {
            if (e.id !== id) return e;
            return {
              ...e,
              participant_ids: (e.participant_ids ?? []).filter((pid) => pid !== currentUserId),
            };
          })
          .filter((e) => e.id !== id || e.staff_id === currentUserId)
      );
      router.refresh();
    });
  };

  const upcomingStrip =
    upcoming.length > 0 ? (
      <section className="ed-card p-3 ed-upcoming-strip">
        <div className="ed-upcoming-strip__label">เร็วๆ นี้</div>
        <div className="ed-upcoming-strip__rail">
          {upcoming.map((e) => {
            const mine = isInvolved(e, currentUserId);
            return (
              <button
                key={e.id}
                type="button"
                className={`ed-upcoming-chip ${mine ? 'ed-upcoming-chip--mine' : 'ed-upcoming-chip--other'}`}
                onClick={() => {
                  setPreset('custom');
                  setRange({ from: e.date, to: e.date });
                  setExpandedIds(new Set([e.id]));
                  const d = new Date(e.date + 'T12:00:00');
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                <strong>{formatThaiDate(e.date)}</strong>
                <span className="truncate">{e.school_name || 'ไม่ระบุโรงเรียน'}</span>
              </button>
            );
          })}
        </div>
      </section>
    ) : null;

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
              <div className="status-card__label">โรงเรียนของฉัน</div>
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
              <div className="status-card__label">ควรพัฒนา</div>
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
              <ThaiDateField
                value={range.from}
                onChange={(ymd) => {
                  if (!ymd) return;
                  setPreset('custom');
                  setRange((r) => ({ ...r, from: ymd }));
                  const d = new Date(ymd + 'T12:00:00');
                  if (!Number.isNaN(d.getTime())) {
                    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }}
              />
            </label>
            <label className="text-sm font-semibold grid gap-1">
              ถึง
              <ThaiDateField
                value={range.to}
                onChange={(ymd) => {
                  if (!ymd) return;
                  setPreset('custom');
                  setRange((r) => ({ ...r, to: ymd }));
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

        {upcomingStrip}

        {actionMsg ? (
          <p className="text-sm font-medium m-0" style={{ color: '#b91c1c' }}>
            {actionMsg}
          </p>
        ) : null}

        <div className="ed-visit-layout ed-visit-layout--split">
          <div className="ed-visit-layout__cal space-y-3">
            <section className="ed-card p-4 ed-month-cal-wrap">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <strong className="text-lg">{monthLabel}</strong>
                <div className="flex items-center gap-2">
                  <div className="cal-owner-legend m-0">
                    <span>
                      <i style={{ background: '#166534' }} /> นัดของฉัน
                    </span>
                    <span>
                      <i style={{ background: '#991b1b' }} /> นัดของผู้อื่น
                    </span>
                  </div>
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
              </div>
              <div className="ed-month-cal">
                {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
                  <div key={d} className="ed-month-cal__head">
                    {d}
                  </div>
                ))}
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} className="ed-month-cal__pad" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), day));
                  const dayEvents = eventsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === today;
                  const inRange = dateStr >= range.from && dateStr <= range.to;
                  const hasMine = dayEvents.some((e) => isInvolved(e, currentUserId));
                  const hasOther = dayEvents.some((e) => !isInvolved(e, currentUserId));
                  const ownerClass =
                    hasMine && hasOther
                      ? 'ed-month-cal__day--has-both'
                      : hasMine
                        ? 'ed-month-cal__day--has-mine'
                        : hasOther
                          ? 'ed-month-cal__day--has-other'
                          : '';
                  const peek = dayEvents.slice(0, 2);
                  const more = dayEvents.length - peek.length;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`ed-month-cal__day ${isToday ? 'ed-month-cal__day--today' : ''} ${
                        inRange ? 'ed-month-cal__day--range' : ''
                      } ${ownerClass}`}
                      onClick={() => {
                        setPreset('custom');
                        setRange({ from: dateStr, to: dateStr });
                        if (dayEvents.length) {
                          setExpandedIds(new Set(dayEvents.map((e) => e.id)));
                        }
                      }}
                    >
                      <span className="ed-month-cal__day-num">{day}</span>
                      <div className="ed-month-cal__peeks">
                        {peek.map((e) => {
                          const mine = isInvolved(e, currentUserId);
                          return (
                            <span
                              key={e.id}
                              className={`ed-month-cal__peek ${
                                mine ? 'ed-month-cal__peek--mine' : 'ed-month-cal__peek--other'
                              }`}
                              title={`${e.school_name || 'โรงเรียน'} · ${normalizeActivity(String(e.activity))}`}
                            >
                              {e.school_name || 'ไม่ระบุโรงเรียน'}
                            </span>
                          );
                        })}
                        {more > 0 ? (
                          <span className="ed-month-cal__more">+{more} นัด</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="ed-visit-layout__detail">
            <div className="visit-detail-panel__header">
              <h2 className="ed-section-title text-base m-0">
                รายละเอียดนัดหมาย ({rangedEvents.length})
              </h2>
              <span className="visit-detail-panel__range">
                {formatThaiDate(range.from)} – {formatThaiDate(range.to)}
              </span>
            </div>

            {rangedEvents.length === 0 ? (
              <div className="ed-card p-4 text-slate-500 text-sm">ไม่มีนัดหมายในช่วงวันที่นี้</div>
            ) : (
              <div className="visit-detail-panel__list">
                {pagedEvents.map((e) => {
                  const open = expandedIds.has(e.id);
                  const st = normalizeStatus(e.status_th ?? e.status);
                  const school = schools.find((s) => s.id === e.school_id);
                  const schoolStatus = statusFromScore(school?.overallScore);
                  const booker = personLabel(e.staff_id);
                  const isOwner = e.staff_id === currentUserId;
                  const isParticipant =
                    !isOwner && (e.participant_ids ?? []).includes(currentUserId);
                  const teamIds = [
                    ...new Set(
                      [e.staff_id, ...(e.participant_ids ?? [])].filter(Boolean)
                    ),
                  ].filter((id) => id !== e.staff_id);
                  const schoolName = e.school_name || school?.name || 'โรงเรียน';
                  const activity = normalizeActivity(String(e.activity));
                  const reasons =
                    e.visit_reasons?.length
                      ? e.visit_reasons
                      : [activity];
                  const location =
                    [school?.district, school?.province || e.province].filter(Boolean).join(' · ') ||
                    '—';
                  return (
                    <article
                      key={e.id}
                      className={`ed-card visit-booking-card visit-booking-card--panel ${
                        open ? 'is-open' : ''
                      } ${isInvolved(e, currentUserId) ? 'visit-booking-card--mine' : 'visit-booking-card--other'}`}
                    >
                      <button
                        type="button"
                        className="visit-booking-card__head visit-booking-card__head--panel"
                        aria-expanded={open}
                        onClick={() => toggleExpand(e.id)}
                      >
                        <div className="visit-booking-card__meta">
                          <span className="visit-booking-card__date">{formatThaiDate(e.date)}</span>
                          <span
                            className={`cal-badge ${
                              st === 'เยี่ยมชมเสร็จสิ้น' ? 'cal-badge--done' : 'cal-badge--sched'
                            }`}
                          >
                            {st}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`visit-booking-card__chevron ${open ? 'is-open' : ''}`}
                          />
                        </div>
                        <div className="visit-booking-card__title">{schoolName}</div>
                        <div className="visit-booking-card__sub">{activity}</div>
                      </button>
                      {open && (
                        <div className="visit-booking-card__body visit-booking-card__body--panel">
                          <dl className="visit-booking-card__facts">
                            <div className="visit-booking-card__fact">
                              <dt>
                                <UserRound size={14} aria-hidden /> เจ้าของนัด
                              </dt>
                              <dd>
                                <span
                                  className={
                                    booker.isMe ? 'owner-name--mine' : 'owner-name--other'
                                  }
                                >
                                  {booker.name}
                                </span>
                                {booker.role ? (
                                  <span className="visit-booking-card__role">{booker.role}</span>
                                ) : null}
                              </dd>
                            </div>
                            <div className="visit-booking-card__fact">
                              <dt>
                                <Users size={14} aria-hidden /> สมาชิกทีม
                              </dt>
                              <dd>
                                {teamIds.length === 0 ? (
                                  <span className="text-slate-500">ไม่มีสมาชิกเพิ่ม</span>
                                ) : (
                                  <ul className="m-0 p-0 list-none space-y-1">
                                    {teamIds.map((pid) => {
                                      const p = personLabel(pid);
                                      return (
                                        <li key={pid}>
                                          <span
                                            className={
                                              p.isMe ? 'owner-name--mine' : 'owner-name--other'
                                            }
                                          >
                                            {p.name}
                                          </span>
                                          {p.role ? (
                                            <span className="visit-booking-card__role">
                                              {p.role}
                                            </span>
                                          ) : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </dd>
                            </div>
                            <div className="visit-booking-card__fact">
                              <dt>
                                <MapPin size={14} aria-hidden /> ที่ตั้ง
                              </dt>
                              <dd>{location}</dd>
                            </div>
                            <div className="visit-booking-card__fact">
                              <dt>
                                <Phone size={14} aria-hidden /> โทรศัพท์
                              </dt>
                              <dd>{school?.phone || '—'}</dd>
                            </div>
                          </dl>

                          {reasons.length > 1 ? (
                            <p className="text-xs text-slate-600 m-0">
                              เหตุผล: {reasons.join(' · ')}
                            </p>
                          ) : null}

                          <div className="visit-booking-card__score">
                            <div className="visit-booking-card__score-value">
                              {(school?.overallScore ?? 0).toFixed(2)}
                              <span> / 5</span>
                            </div>
                            <span
                              className="ed-badge"
                              style={{ background: schoolStatus.bg, color: schoolStatus.color }}
                            >
                              {schoolStatus.label}
                            </span>
                          </div>

                          {e.notes ? (
                            <p className="visit-booking-card__notes">{e.notes}</p>
                          ) : null}

                          <div className="visit-booking-card__actions">
                            <Link
                              href={`/reports/new?event_id=${encodeURIComponent(e.id)}${
                                e.school_id
                                  ? `&school_id=${encodeURIComponent(e.school_id)}`
                                  : ''
                              }&date=${encodeURIComponent(e.date)}`}
                              className="ed-btn ed-btn--primary ed-btn--sm"
                            >
                              <MessageSquarePlus size={14} /> เขียนสรุปรายงาน
                            </Link>
                            <Link
                              href={e.school_id ? `/schools/${e.school_id}` : '/schools'}
                              className="ed-btn ed-btn--outline ed-btn--sm"
                            >
                              ดูรายละเอียดโรงเรียน
                            </Link>
                            {isOwner ? (
                              <Link
                                href={`/calendar/edit?id=${encodeURIComponent(e.id)}`}
                                className="ed-btn ed-btn--outline ed-btn--sm"
                              >
                                <Pencil size={14} /> แก้ไขนัดหมาย
                              </Link>
                            ) : null}
                            {isOwner ? (
                              <button
                                type="button"
                                className="ed-btn ed-btn--danger ed-btn--sm"
                                disabled={pending}
                                onClick={() => runCancel(e.id)}
                              >
                                <XCircle size={14} /> ยกเลิกนัด
                              </button>
                            ) : null}
                            {isParticipant ? (
                              <button
                                type="button"
                                className="ed-btn ed-btn--outline ed-btn--sm"
                                disabled={pending}
                                onClick={() => runLeave(e.id)}
                              >
                                <LogOut size={14} /> ออกจากนัด
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
                {rangedEvents.length > SCHEDULE_PAGE_SIZE ? (
                  <div className="visit-detail-panel__pager">
                    <span className="text-xs text-slate-500">
                      แสดง {(listPage - 1) * SCHEDULE_PAGE_SIZE + 1}–
                      {Math.min(listPage * SCHEDULE_PAGE_SIZE, rangedEvents.length)} จาก{' '}
                      {rangedEvents.length}
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
              </div>
            )}
          </aside>
        </div>
      </div>

    </div>
  );
}
