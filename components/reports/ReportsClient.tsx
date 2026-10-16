'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronDown, FilePlus2, MessageSquare, Pencil } from 'lucide-react';
import { updateSchoolCommentAction } from '@/app/actions/school-extras';
import type { SchoolSize } from '@/lib/types';
import type { ReportDraft } from '@/lib/auth/mock-users';
import { ImageThumbGrid } from '@/components/media/ImageThumbGrid';
import { formatThaiDate, formatThaiDateTime } from '@/lib/format/date';
import { ThaiDateField } from '@/components/ui/ThaiDateField';
import {
  parseReportComment,
  type ReportSubjectDetails,
} from '@/lib/reports/subjects';
import { REPORT_SUBJECTS } from '@/lib/types';

export type ReportRow = {
  id: string;
  school_id: string;
  school_name: string;
  province: string;
  district: string;
  school_size?: string;
  staff_id: string;
  staff_name: string;
  text: string;
  created_at: string;
  edited_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  tags?: string[];
  image_urls?: string[];
  onsite_reasons?: string[];
  visitor_reason_map?: Record<string, string[]>;
  ops_notes?: string | null;
  participants?: { id: string; name: string }[];
};

type RangePreset = 'today' | 'this-week' | 'next-week' | 'this-month' | 'next-month' | 'custom';

const DAYS_PER_PAGE = 10;
const SCHOOL_SIZES: SchoolSize[] = ['เล็ก', 'กลาง', 'ใหญ่', 'ใหญ่พิเศษ'];

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

function rangeForPreset(preset: RangePreset): { from: string; to: string } {
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
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: ymd(start), to: ymd(end) };
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'this-week', label: 'สัปดาห์นี้' },
  { key: 'next-week', label: 'สัปดาห์หน้า' },
  { key: 'this-month', label: 'เดือนนี้' },
  { key: 'next-month', label: 'เดือนหน้า' },
];

function canEditReport(row: ReportRow, userId: string) {
  if (row.staff_id === userId) return true;
  if ((row.participants ?? []).some((p) => p.id === userId)) return true;
  if (row.visitor_reason_map && userId in row.visitor_reason_map) return true;
  return false;
}

function groupByDate(rows: ReportRow[]) {
  const map = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(r);
    map.set(day, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function SubjectBlocks({ text }: { text: string }) {
  const details: ReportSubjectDetails = parseReportComment(text);
  const hasAny = REPORT_SUBJECTS.some((s) => (details[s.key] ?? '').trim());
  if (!hasAny) {
    if (!text.trim() || text.trim() === '(ไม่มีข้อความความคิดเห็น)') {
      return <p className="text-sm text-slate-400 m-0">ไม่มีข้อความความคิดเห็น</p>;
    }
    return <p className="text-sm mt-0 mb-0 whitespace-pre-wrap">{text}</p>;
  }
  return (
    <div className="report-guided-box mt-1">
      {REPORT_SUBJECTS.map((s) => {
        const body = (details[s.key] ?? '').trim();
        if (!body) return null;
        return (
          <div key={s.key} className="report-guided-box__row">
            <div className="report-guided-box__subject">- {s.label}</div>
            <p className="text-sm m-0 whitespace-pre-wrap">{body}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsClient({
  rows: initialRows,
  currentUserId,
  drafts = [],
}: {
  rows: ReportRow[];
  currentUserId: string;
  drafts?: ReportDraft[];
}) {
  const initial = rangeForPreset('this-month');
  const [rows, setRows] = useState(initialRows);
  const [ownerFilter, setOwnerFilter] = useState<'mine' | 'all'>('all');
  const [preset, setPreset] = useState<RangePreset>('this-month');
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolSize, setSchoolSize] = useState('');
  const [page, setPage] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [pending, start] = useTransition();

  const provinces = useMemo(
    () => [...new Set(rows.map((r) => r.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')),
    [rows]
  );

  const districts = useMemo(() => {
    let list = rows;
    if (province) list = list.filter((r) => r.province === province);
    return [...new Set(list.map((r) => r.district).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [rows, province]);

  const applyPreset = (key: RangePreset) => {
    setPreset(key);
    const next = rangeForPreset(key);
    setDateFrom(next.from);
    setDateTo(next.to);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (ownerFilter === 'mine') {
      list = list.filter((r) => canEditReport(r, currentUserId));
    }
    if (dateFrom) list = list.filter((r) => r.created_at.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((r) => r.created_at.slice(0, 10) <= dateTo);
    if (province) list = list.filter((r) => r.province === province);
    if (district) list = list.filter((r) => r.district === district);
    if (schoolSize) list = list.filter((r) => String(r.school_size || '') === schoolSize);
    if (schoolName.trim()) {
      const n = schoolName.trim().toLowerCase();
      list = list.filter((r) => r.school_name.toLowerCase().includes(n));
    }
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [
    rows,
    ownerFilter,
    currentUserId,
    dateFrom,
    dateTo,
    province,
    district,
    schoolSize,
    schoolName,
  ]);

  const dayGroups = useMemo(() => groupByDate(filtered), [filtered]);
  const totalPages = Math.max(1, Math.ceil(dayGroups.length / DAYS_PER_PAGE));
  const pageGroups = dayGroups.slice((page - 1) * DAYS_PER_PAGE, page * DAYS_PER_PAGE);

  const startEdit = (r: ReportRow) => {
    setEditingId(r.id);
    setEditText(r.text.replace(/^#[^\n]+\n?/, '').trim() || r.text);
  };

  const saveEdit = (r: ReportRow) => {
    start(async () => {
      const fd = new FormData();
      fd.set('school_id', r.school_id);
      fd.set('comment_id', r.id);
      fd.set('text', editText.trim());
      fd.set('tags', '');
      const res = await updateSchoolCommentAction(fd);
      if (!res.ok || !('comment' in res) || !res.comment) return;
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                text: res.comment!.text,
                edited_at: res.comment!.edited_at,
                updated_at: res.comment!.updated_at ?? res.comment!.edited_at,
                updated_by: res.comment!.updated_by ?? currentUserId,
                updated_by_name: res.comment!.updated_by_name ?? null,
                tags: res.comment!.tags,
              }
            : x
        )
      );
      setEditingId(null);
    });
  };

  return (
    <div className="page-shell py-5 grid gap-5">
      <section className="ed-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ed-section-title text-base m-0">ส่งรายงานลงพื้นที่</h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            บันทึกความคิดเห็นหรือกิจกรรมของโรงเรียนของฉัน
          </p>
        </div>
        <Link href="/reports/new" className="ed-btn ed-btn--primary">
          <FilePlus2 size={16} /> ฉันจะส่งรายงาน
        </Link>
      </section>

      {drafts.length > 0 && (
        <section className="ed-card p-4 space-y-3">
          <div>
            <h2 className="ed-section-title text-base m-0">ร่างรายงานของฉัน</h2>
            <p className="text-sm text-slate-600 m-0 mt-1">
              คลิกเพื่อเขียนต่อ · หากไม่ต้องการแล้ว ให้เปิดร่างแล้วกดลบด้านบน
            </p>
          </div>
          <div className="report-draft-list">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/reports/new?draft_id=${encodeURIComponent(d.id)}`}
                className="report-draft-item"
              >
                <div>
                  <strong className="text-tm-blue">{d.school_name || 'ไม่ระบุโรงเรียน'}</strong>
                  <div className="text-xs text-slate-500 mt-0.5">
                    แก้ไขล่าสุด{' '}
                    {formatThaiDateTime(d.updated_at)}
                    {d.report_date ? ` · วันที่รายงาน ${formatThaiDate(d.report_date)}` : ''}
                  </div>
                </div>
                <span className="text-xs font-bold text-tm-blue">เขียนต่อ →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="ed-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">มุมมอง</strong>
          <div className="score-mode-switch" role="group" aria-label="เจ้าของรายงาน">
            <button
              type="button"
              className={ownerFilter === 'mine' ? 'is-active' : ''}
              onClick={() => {
                setOwnerFilter('mine');
                setPage(1);
              }}
            >
              รายงานของฉัน
            </button>
            <button
              type="button"
              className={ownerFilter === 'all' ? 'is-active' : ''}
              onClick={() => {
                setOwnerFilter('all');
                setPage(1);
              }}
            >
              รายงานทั้งหมด
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold grid gap-1">
            จังหวัด
            <select
              className="form-input"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict('');
                setPage(1);
              }}
            >
              <option value="">ทั้งหมด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold grid gap-1">
            อำเภอ / เขต
            <select
              className="form-input"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setPage(1);
              }}
            >
              <option value="">ทั้งหมด</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold grid gap-1">
            ชื่อโรงเรียน
            <input
              className="form-input"
              value={schoolName}
              onChange={(e) => {
                setSchoolName(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ"
            />
          </label>
          <label className="text-sm font-semibold grid gap-1">
            ขนาดโรงเรียน
            <select
              className="form-input"
              value={schoolSize}
              onChange={(e) => {
                setSchoolSize(e.target.value);
                setPage(1);
              }}
            >
              <option value="">ทั้งหมด</option>
              {SCHOOL_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
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
            จากวันที่
            <ThaiDateField
              value={dateFrom}
              onChange={(ymd) => {
                setPreset('custom');
                setDateFrom(ymd);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm font-semibold grid gap-1">
            ถึงวันที่
            <ThaiDateField
              value={dateTo}
              onChange={(ymd) => {
                setPreset('custom');
                setDateTo(ymd);
                setPage(1);
              }}
            />
          </label>
        </div>
        <p className="text-sm text-slate-500 m-0">
          {filtered.length} รายการ · {dayGroups.length} วัน · หน้า {page}/{totalPages}
        </p>
      </section>

      <section className="panel-card space-y-3 school-activity">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-tm-blue" />
          <h2 className="section-heading text-base m-0">รายงานทั้งหมด</h2>
        </div>

        {pageGroups.length === 0 ? (
          <p className="school-empty-note m-0">ไม่พบรายงานตามเงื่อนไข</p>
        ) : (
          <div className="school-activity__list">
            {pageGroups.map(([day, items]) => {
              const open = expandedDays.has(day);
              return (
                <article key={day} className="school-activity__day">
                  <button
                    type="button"
                    className="school-activity__day-head"
                    aria-expanded={open}
                    onClick={() =>
                      setExpandedDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(day)) next.delete(day);
                        else next.add(day);
                        return next;
                      })
                    }
                  >
                    <div>
                      <strong>{formatThaiDate(day)}</strong>
                      <div className="school-activity__day-preview">
                        {open ? 'คลิกเพื่อย่อ' : `${items.length} รายงาน · ${items[0]?.school_name || ''}`}
                      </div>
                    </div>
                    <span className="school-activity__day-head__right">
                      <span className="school-activity__count">{items.length}</span>
                      <ChevronDown
                        size={16}
                        className={open ? 'visit-booking-card__chevron is-open' : 'visit-booking-card__chevron'}
                      />
                    </span>
                  </button>
                  {open && (
                    <ul className="school-activity__items">
                      {items.map((c) => {
                        const editable = canEditReport(c, currentUserId);
                        const editing = editingId === c.id;
                        const team = (c.participants ?? []).filter((p) => p.id !== c.staff_id);
                        const modifiedAt = c.updated_at || c.edited_at;
                        return (
                          <li key={c.id} className="report-detail-item">
                            <div className="report-detail-item__top">
                              <div>
                                <strong className="text-tm-blue">{c.school_name}</strong>
                                <div className="text-xs text-slate-500">
                                  {[c.district, c.province, c.school_size].filter(Boolean).join(' · ') || '—'}
                                </div>
                                <div className="text-xs font-semibold mt-1 space-y-0.5">
                                  <div>
                                    เจ้าของรายงาน:{' '}
                                    <span
                                      className={
                                        c.staff_id === currentUserId
                                          ? 'owner-name--mine'
                                          : 'owner-name--other'
                                      }
                                    >
                                      {c.staff_name}
                                    </span>
                                  </div>
                                  {team.length > 0 ? (
                                    <div className="text-slate-600 font-normal">
                                      สมาชิกทีม:{' '}
                                      {team.map((p) => p.name).join(' · ')}
                                    </div>
                                  ) : null}
                                  {modifiedAt ? (
                                    <div className="text-slate-500 font-normal">
                                      แก้ไขล่าสุดโดย{' '}
                                      {c.updated_by_name ||
                                        (c.updated_by === currentUserId
                                          ? 'ฉัน'
                                          : c.staff_name)}{' '}
                                      · {formatThaiDateTime(modifiedAt)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <time className="text-xs text-slate-500 whitespace-nowrap">
                                {formatThaiDateTime(c.created_at)}
                              </time>
                            </div>

                            {editing ? (
                              <div className="grid gap-2 mt-2">
                                <textarea
                                  className="form-input"
                                  rows={5}
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="ed-btn ed-btn--primary ed-btn--sm"
                                    disabled={pending || !editText.trim()}
                                    onClick={() => saveEdit(c)}
                                  >
                                    บันทึกการแก้ไข
                                  </button>
                                  <button
                                    type="button"
                                    className="ed-btn ed-btn--outline ed-btn--sm"
                                    onClick={() => setEditingId(null)}
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {c.image_urls && c.image_urls.length > 0 ? (
                                  <ImageThumbGrid urls={c.image_urls} label="รูปแนบรายงาน" />
                                ) : null}

                                {c.ops_notes ? (
                                  <div className="mt-2">
                                    <div className="text-xs font-bold text-slate-700">
                                      แนวทางการดำเนินงาน/การปฏิบัติงาน ณ หน้างาน
                                    </div>
                                    <p className="text-sm mt-1 mb-0 whitespace-pre-wrap">
                                      {c.ops_notes}
                                    </p>
                                  </div>
                                ) : null}

                                {c.onsite_reasons && c.onsite_reasons.length > 0 ? (
                                  <div className="mt-2 text-xs text-slate-600">
                                    เหตุผลหน้างาน: {c.onsite_reasons.join(' · ')}
                                  </div>
                                ) : null}

                                <div className="mt-3">
                                  <div className="text-xs font-bold text-slate-700 mb-1">
                                    ความคิดเห็นตามหัวข้อ
                                  </div>
                                  <SubjectBlocks text={c.text} />
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Link
                                    href={`/schools/${c.school_id}`}
                                    className="ed-btn ed-btn--outline ed-btn--sm w-fit"
                                  >
                                    เปิดรายละเอียดโรงเรียน
                                  </Link>
                                  {editable && (
                                    <button
                                      type="button"
                                      className="ed-btn ed-btn--outline ed-btn--sm"
                                      onClick={() => startEdit(c)}
                                    >
                                      <Pencil size={14} /> แก้ไข
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {dayGroups.length > DAYS_PER_PAGE && (
          <div className="managed-pagination">
            <span>
              วัน {(page - 1) * DAYS_PER_PAGE + 1}–{Math.min(page * DAYS_PER_PAGE, dayGroups.length)} จาก{' '}
              {dayGroups.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="navbar__link"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), page + 2)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`navbar__link ${page === n ? 'navbar__link--active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              <button
                type="button"
                className="navbar__link"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
