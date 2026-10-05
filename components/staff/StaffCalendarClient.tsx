'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createCalendarEventAction } from '@/app/actions/visits';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import { VISIT_ACTIVITIES, normalizeActivity, normalizeStatus } from '@/lib/visits/labels';
import { CalendarDays, CalendarRange, ChevronDown, List, Plus, Search, X } from 'lucide-react';

type SchoolOpt = { id: string; name: string; area_id: string; area_name: string; province: string };
type ViewMode = 'today' | 'week' | 'month' | 'other';

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(ymdStr: string, days: number) {
  const d = new Date(ymdStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function formatThaiDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function monthBounds(year: number, monthIndex: number) {
  const start = ymd(new Date(year, monthIndex, 1));
  const end = ymd(new Date(year, monthIndex + 1, 0));
  return { start, end };
}

function displayStatus(e: StaffCalendarEvent) {
  return e.status_th ?? normalizeStatus(e.status);
}

function SchoolComboBox({
  schools,
  value,
  onChange,
  disabled,
}: {
  schools: SchoolOpt[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = schools.find((s) => s.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools.slice(0, 80);
    return schools
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.area_name.toLowerCase().includes(q) ||
          s.province.toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [schools, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (disabled || schools.length === 0) {
    return (
      <div className="senior-cal__combo senior-cal__combo--empty" aria-disabled>
        ไม่มีโรงเรียนภายใต้ความรับผิดชอบ
      </div>
    );
  }

  return (
    <div className="senior-cal__combo" ref={rootRef}>
      <button
        type="button"
        className="senior-cal__combo-trigger"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
      >
        <span className="senior-cal__combo-value">
          {selected ? selected.name : '— เลือกโรงเรียน —'}
        </span>
        <ChevronDown size={22} aria-hidden />
      </button>
      {open && (
        <div className="senior-cal__combo-panel" role="listbox">
          <label className="senior-cal__combo-search">
            <Search size={20} aria-hidden />
            <input
              className="senior-cal__combo-input"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อโรงเรียนเพื่อค้นหา…"
            />
          </label>
          <ul className="senior-cal__combo-list m-0 p-0 list-none">
            {filtered.length === 0 ? (
              <li className="senior-cal__combo-empty">ไม่พบโรงเรียนที่ตรงกับคำค้น</li>
            ) : (
              filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`senior-cal__combo-option ${
                      s.id === value ? 'senior-cal__combo-option--on' : ''
                    }`}
                    role="option"
                    aria-selected={s.id === value}
                    onClick={() => {
                      onChange(s.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="font-semibold">{s.name}</span>
                    {(s.area_name || s.province) && (
                      <span className="senior-cal__combo-meta">
                        {[s.area_name, s.province].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StaffCalendarClient({
  events: initial,
  schools,
}: {
  events: StaffCalendarEvent[];
  schools: SchoolOpt[];
}) {
  const today = ymd(new Date());
  const now = new Date();
  const [events, setEvents] = useState(initial);
  const [mode, setMode] = useState<ViewMode>('today');
  const [pickYear, setPickYear] = useState(now.getFullYear());
  const [pickMonth, setPickMonth] = useState(now.getMonth());
  const [showModal, setShowModal] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hasSchools = schools.length > 0;

  const range = useMemo(() => {
    if (mode === 'today') return { start: today, end: today, label: 'รายการกิจกรรมวันนี้' };
    if (mode === 'week') {
      return {
        start: today,
        end: addDays(today, 6),
        label: 'รายการกิจกรรมสัปดาห์นี้',
      };
    }
    if (mode === 'month') {
      const b = monthBounds(now.getFullYear(), now.getMonth());
      return { ...b, label: 'รายการกิจกรรมเดือนนี้' };
    }
    const b = monthBounds(pickYear, pickMonth);
    const monthLabel = new Date(pickYear, pickMonth, 1).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
    return { ...b, label: `รายการกิจกรรม${monthLabel}` };
  }, [mode, today, pickYear, pickMonth, now]);

  const agenda = useMemo(() => {
    return [...events]
      .filter((e) => e.date >= range.start && e.date <= range.end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, range.start, range.end]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  return (
    <div className="senior-cal space-y-5">
      {!hasSchools && (
        <div className="senior-cal__empty-state" role="status">
          ไม่มีโรงเรียนภายใต้ความรับผิดชอบ
        </div>
      )}

      <div className="senior-cal__mode-row">
        <button
          type="button"
          className={`senior-cal__today-btn ${mode === 'today' ? 'senior-cal__today-btn--on' : ''}`}
          onClick={() => setMode('today')}
        >
          <CalendarDays size={24} aria-hidden />
          ดูตารางวันนี้
        </button>
        <button
          type="button"
          className={`senior-cal__today-btn ${mode === 'week' ? 'senior-cal__today-btn--on' : ''}`}
          onClick={() => setMode('week')}
        >
          <List size={24} aria-hidden />
          ดูสัปดาห์นี้
        </button>
        <button
          type="button"
          className={`senior-cal__today-btn ${mode === 'month' ? 'senior-cal__today-btn--on' : ''}`}
          onClick={() => setMode('month')}
        >
          <CalendarRange size={24} aria-hidden />
          ดูเดือนนี้
        </button>
        <button
          type="button"
          className={`senior-cal__today-btn ${mode === 'other' ? 'senior-cal__today-btn--on' : ''}`}
          onClick={() => setMode('other')}
        >
          <CalendarRange size={24} aria-hidden />
          เลือกเดือนอื่น ๆ
        </button>
        <button
          type="button"
          className="senior-cal__add-btn"
          disabled={!hasSchools}
          onClick={() => {
            setMsg(null);
            setSchoolId('');
            setShowModal(true);
          }}
        >
          <Plus size={24} aria-hidden />
          เพิ่มวันลงพื้นที่
        </button>
      </div>

      {mode === 'other' && (
        <div className="senior-cal__month-pick panel-card">
          <label className="senior-cal__field">
            เดือน
            <select
              className="form-input senior-cal__input"
              value={pickMonth}
              onChange={(e) => setPickMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2020, i, 1).toLocaleDateString('th-TH', { month: 'long' })}
                </option>
              ))}
            </select>
          </label>
          <label className="senior-cal__field">
            ปี
            <select
              className="form-input senior-cal__input"
              value={pickYear}
              onChange={(e) => setPickYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <section className="panel-card space-y-4" aria-live="polite">
        <h2 className="senior-cal__agenda-title m-0">{range.label}</h2>
        <p className="senior-cal__empty m-0" style={{ marginTop: '-0.5rem' }}>
          {range.start === range.end
            ? formatThaiDate(range.start)
            : `${formatThaiDate(range.start)} – ${formatThaiDate(range.end)}`}
        </p>

        {!hasSchools ? (
          <p className="senior-cal__empty m-0">ไม่มีโรงเรียนภายใต้ความรับผิดชอบ</p>
        ) : agenda.length === 0 ? (
          <p className="senior-cal__empty m-0">
            ยังไม่มีกิจกรรมในช่วงนี้ — กด “เพิ่มวันลงพื้นที่” เพื่อสร้างรายการ
          </p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-4">
            {agenda.map((e) => {
              const st = displayStatus(e);
              return (
                <li key={e.id} className="senior-cal__event">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="senior-cal__event-title">
                        {normalizeActivity(String(e.activity))}
                      </div>
                      <div className="senior-cal__event-school">
                        {e.school_name || 'ไม่ระบุโรงเรียน'}
                      </div>
                      <div className="senior-cal__event-meta">{formatThaiDate(e.date)}</div>
                      {e.notes ? <div className="senior-cal__event-meta">{e.notes}</div> : null}
                    </div>
                    <span
                      className={`cal-badge ${
                        st === 'เยี่ยมชมเสร็จสิ้น'
                          ? 'cal-badge--done'
                          : st === 'ยกเลิก'
                            ? 'cal-badge--cancel'
                            : 'cal-badge--sched'
                      }`}
                    >
                      {st}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {msg && !showModal && (
        <p className="senior-cal__toast m-0" role="status">
          {msg}
        </p>
      )}

      {showModal && (
        <div
          className="senior-cal__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="senior-cal-modal-title"
        >
          <div className="senior-cal__modal-card">
            <div className="flex items-center justify-between gap-2 mb-5">
              <h3 id="senior-cal-modal-title" className="senior-cal__modal-title m-0">
                เพิ่มวันลงพื้นที่
              </h3>
              <button
                type="button"
                className="senior-cal__nav"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setShowModal(false)}
              >
                <X size={28} />
              </button>
            </div>

            {!hasSchools ? (
              <p className="senior-cal__empty m-0">ไม่มีโรงเรียนภายใต้ความรับผิดชอบ</p>
            ) : (
              <form
                className="space-y-5"
                action={(fd) => {
                  setMsg(null);
                  start(async () => {
                    if (!schoolId) {
                      setMsg('กรุณาเลือกโรงเรียน');
                      return;
                    }
                    const s = schools.find((x) => x.id === schoolId);
                    fd.set('school_id', schoolId);
                    if (s) {
                      fd.set('school_name', s.name);
                      fd.set('area_id', s.area_id);
                      fd.set('area_name', s.area_name);
                      fd.set('province', s.province);
                    }
                    fd.set('status', 'นัดหมายแล้ว');
                    const res = await createCalendarEventAction(fd);
                    if (!res.ok) {
                      setMsg(('error' in res && res.error) || 'บันทึกไม่สำเร็จ');
                      return;
                    }
                    if (res.event) {
                      setEvents((prev) => [...prev, res.event!]);
                    }
                    setShowModal(false);
                    setMsg(
                      res.warning
                        ? `บันทึกในเครื่องแล้ว (ฐานข้อมูล: ${res.warning})`
                        : 'บันทึกข้อมูลเรียบร้อยแล้ว'
                    );
                  });
                }}
              >
                <div className="senior-cal__field">
                  เลือกโรงเรียน
                  <SchoolComboBox schools={schools} value={schoolId} onChange={setSchoolId} />
                </div>

                <label className="senior-cal__field">
                  วันที่ลงพื้นที่
                  <input
                    name="date"
                    type="date"
                    className="form-input senior-cal__input"
                    required
                    defaultValue={today}
                  />
                </label>

                <label className="senior-cal__field">
                  ประเภทกิจกรรม
                  <select
                    name="activity"
                    className="form-input senior-cal__input"
                    defaultValue={VISIT_ACTIVITIES[0]}
                  >
                    {VISIT_ACTIVITIES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="senior-cal__field">
                  หมายเหตุ (ไม่บังคับ)
                  <textarea
                    name="notes"
                    className="form-input senior-cal__input"
                    rows={3}
                    placeholder="รายละเอียดสั้น ๆ…"
                  />
                </label>

                <button
                  type="submit"
                  className="senior-cal__add-btn w-full justify-center"
                  disabled={pending}
                >
                  {pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
                </button>

                {msg && <p className="senior-cal__field-msg m-0">{msg}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
