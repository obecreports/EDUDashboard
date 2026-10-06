'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  MapPin,
  Phone,
  Printer,
  UserRound,
} from 'lucide-react';
import { createCalendarEventAction } from '@/app/actions/visits';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import { VISIT_ACTIVITIES, normalizeActivity, normalizeStatus } from '@/lib/visits/labels';
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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatThaiShort(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function StaffVisitHubClient({
  events: initial,
  schools,
  managedCount,
}: {
  events: StaffCalendarEvent[];
  schools: SchoolOpt[];
  managedCount: number;
}) {
  const today = ymd(new Date());
  const [events, setEvents] = useState(initial);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [pending, start] = useTransition();
  const [showCreate, setShowCreate] = useState(false);

  const waiting = events.filter((e) => normalizeStatus(e.status_th ?? e.status) === 'นัดหมายแล้ว').length;
  const done = events.filter((e) => normalizeStatus(e.status_th ?? e.status) === 'เยี่ยมชมเสร็จสิ้น').length;
  const progress = managedCount ? Math.min(100, Math.round(((done || waiting) / managedCount) * 100)) : 0;

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [events, today]
  );

  const selected = events.find((e) => e.id === selectedId) ?? upcoming[0] ?? events[0] ?? null;
  const selectedSchool = schools.find((s) => s.id === selected?.school_id);
  const schoolStatus = statusFromScore(selectedSchool?.overallScore);

  const monthLabel = cursor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const startPad = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, StaffCalendarEvent[]>();
    events.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  return (
    <div>
      <header className="ed-page-hero">
        <div className="ed-page-hero__inner">
          <div>
            <h1>การลงพื้นที่</h1>
            <p>วางแผน ติดตาม และบันทึกผลการเยี่ยมชมโรงเรียนในความดูแล</p>
          </div>
          <p className="ed-card p-3 max-w-sm text-sm text-slate-600 m-0">
            ทุกการลงพื้นที่ คือก้าวสำคัญของการพัฒนาคุณภาพการศึกษา
          </p>
        </div>
      </header>

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

        <div className="ed-card p-4">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span>ความก้าวหน้าการลงพื้นที่</span>
            <span className="text-tm-blue">{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
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
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="navbar__link"
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
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
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`ed-mini-cal__day ${isToday ? 'ed-mini-cal__day--today' : ''}`}
                      onClick={() => {
                        if (dayEvents[0]) setSelectedId(dayEvents[0].id);
                      }}
                    >
                      {day}
                      {dayEvents.length > 0 && <span className="ed-mini-cal__dot" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ed-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="ed-section-title text-base m-0">รายการลงพื้นที่ (เร็วๆ นี้)</h2>
                <button type="button" className="ed-btn ed-btn--primary ed-btn--sm" onClick={() => setShowCreate(true)}>
                  <CalendarDays size={14} /> เพิ่ม
                </button>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">ยังไม่มีนัดหมาย</p>
              ) : (
                upcoming.map((e) => {
                  const st = normalizeStatus(e.status_th ?? e.status);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`ed-visit-item ${selected?.id === e.id ? 'ed-visit-item--on' : ''}`}
                      onClick={() => setSelectedId(e.id)}
                    >
                      <div className="ed-visit-item__date">{formatThaiShort(e.date)}</div>
                      <div className="min-w-0 text-left">
                        <div className="font-semibold truncate">{e.school_name || 'ไม่ระบุโรงเรียน'}</div>
                        <div className="text-xs text-slate-500">{normalizeActivity(String(e.activity))}</div>
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

          <section className="ed-card p-5 space-y-4">
            {!selected ? (
              <p className="text-slate-500 m-0">เลือกนัดหมายจากรายการทางซ้าย เพื่อดูรายละเอียด</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-tm-blue m-0">
                      {selected.school_name || selectedSchool?.name || 'โรงเรียน'}
                    </h2>
                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin size={14} />
                      {selectedSchool?.province || selected.province || '—'}
                      {selectedSchool?.district ? ` · ${selectedSchool.district}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ขนาด {selectedSchool?.size || '—'} · นักเรียน{' '}
                      {(selectedSchool?.students ?? 0).toLocaleString()} · ครู{' '}
                      {(selectedSchool?.teachers ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-tm-blue">
                      {(selectedSchool?.overallScore ?? 0).toFixed(2)}
                      <span className="text-sm text-slate-400"> / 5.00</span>
                    </div>
                    <span className="ed-badge" style={{ background: schoolStatus.bg, color: schoolStatus.color }}>
                      {schoolStatus.label}
                    </span>
                  </div>
                </div>

                <div className="ed-visit-steps">
                  {['เตรียมลงพื้นที่', 'ระหว่างลงพื้นที่', 'สรุปผลและข้อเสนอแนะ', 'ติดตามผล'].map(
                    (label, i) => (
                      <div key={label} className={`ed-visit-step ${i === 0 ? 'ed-visit-step--on' : ''}`}>
                        <span>{i + 1}</span>
                        {label}
                      </div>
                    )
                  )}
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <div className="space-y-3">
                    <h3 className="font-bold text-tm-blue m-0">ข้อมูลก่อนลงพื้นที่</h3>
                    <div className="rounded-xl border border-slate-100 p-3 text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <UserRound size={16} className="text-tm-blue" />
                        ผู้อำนวยการ: {selectedSchool?.director || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-tm-blue" />
                        โทร: {selectedSchool?.phone || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-tm-blue" />
                        {selectedSchool?.province || '—'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 p-3 text-sm">
                      <strong>กำหนดการ</strong>
                      <div className="mt-1 text-slate-600">
                        {formatThaiShort(selected.date)} · {normalizeActivity(String(selected.activity))}
                      </div>
                      {selected.notes && <div className="mt-1 text-slate-500">{selected.notes}</div>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-tm-blue m-0">เอกสารและทรัพยากร</h3>
                    <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      {['สรุปโรงเรียน (PDF)', 'รายงาน KPI & SWOT', 'คำแนะนำการเยี่ยม', 'Google Map'].map(
                        (t) => (
                          <div key={t} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs font-semibold text-tm-blue">
                            {t}
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link
                        href={selected.school_id ? `/schools/${selected.school_id}` : '/schools'}
                        className="ed-btn ed-btn--primary"
                      >
                        เริ่มบันทึกการลงพื้นที่
                      </Link>
                      <button type="button" className="ed-btn ed-btn--outline">
                        <Printer size={16} /> พิมพ์เอกสารเตรียมลงพื้นที่
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showCreate && (
        <div className="senior-cal__modal" role="dialog" aria-modal>
          <div className="senior-cal__modal-card">
            <h3 className="senior-cal__modal-title">เพิ่มวันลงพื้นที่</h3>
            <form
              className="space-y-4 mt-4"
              action={(fd) => {
                start(async () => {
                  const schoolId = String(fd.get('school_id') || '');
                  const s = schools.find((x) => x.id === schoolId);
                  if (s) {
                    fd.set('school_name', s.name);
                    fd.set('area_id', s.area_id);
                    fd.set('area_name', s.area_name);
                    fd.set('province', s.province);
                  }
                  fd.set('status', 'นัดหมายแล้ว');
                  const res = await createCalendarEventAction(fd);
                  if (res.ok && res.event) {
                    setEvents((prev) => [...prev, res.event!]);
                    setSelectedId(res.event.id);
                  }
                  setShowCreate(false);
                });
              }}
            >
              <label className="senior-cal__field">
                เลือกโรงเรียน
                <select name="school_id" className="form-input senior-cal__input" required defaultValue="">
                  <option value="" disabled>
                    — เลือก —
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="senior-cal__field">
                วันที่
                <input name="date" type="date" className="form-input senior-cal__input" required defaultValue={today} />
              </label>
              <label className="senior-cal__field">
                ประเภทกิจกรรม
                <select name="activity" className="form-input senior-cal__input" defaultValue={VISIT_ACTIVITIES[0]}>
                  {VISIT_ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="senior-cal__field">
                หมายเหตุ
                <textarea name="notes" className="form-input senior-cal__input" rows={2} />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="ed-btn ed-btn--primary" disabled={pending}>
                  บันทึกข้อมูล
                </button>
                <button type="button" className="ed-btn ed-btn--outline" onClick={() => setShowCreate(false)}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
