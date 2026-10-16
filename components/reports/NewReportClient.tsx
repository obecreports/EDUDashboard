'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { postSchoolCommentsBatchAction } from '@/app/actions/school-extras';
import { deleteReportDraftAction, saveReportDraftAction } from '@/app/actions/reports';
import { REPORT_SUBJECTS } from '@/lib/types';
import type { ReportDraft } from '@/lib/auth/mock-users';
import { REPORT_IMAGE_MAX } from '@/lib/media/compress-image';
import { uploadReportImage } from '@/lib/media/storage-upload';
import { mediaThumbUrl } from '@/lib/media/image-display';
import {
  assembleReportComment,
  emptySubjectDetails,
  parseReportComment,
  type ReportSubjectDetails,
  type ReportSubjectKey,
} from '@/lib/reports/subjects';
import { formatThaiDate } from '@/lib/format/date';
import { ThaiDateField } from '@/components/ui/ThaiDateField';
import { VISIT_ACTIVITIES } from '@/lib/visits/labels';

type SchoolOpt = {
  id: string;
  name: string;
  province: string;
  district: string;
};

export type ScheduleHint = {
  event_id: string;
  school_id: string;
  school_name: string;
  date: string;
  visit_reasons?: string[];
  participants?: { id: string; name: string }[];
};

type ParticipantOpt = {
  id: string;
  name: string;
};

function splitReasons(reasons: string[]): { known: Set<string>; other: string } {
  const known = new Set<string>();
  let other = '';
  for (const r of reasons) {
    const t = r.trim();
    if (!t) continue;
    if ((VISIT_ACTIVITIES as readonly string[]).includes(t)) {
      known.add(t);
    } else {
      known.add('อื่นๆ');
      if (!other) other = t;
    }
  }
  return { known, other };
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftYmd(base: string, delta: number) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function detailsFromDraft(draft: ReportDraft | null | undefined): ReportSubjectDetails {
  if (!draft?.boxes?.length) return emptySubjectDetails();
  const joined = draft.boxes.map((b) => b.text).filter(Boolean).join('\n\n');
  return parseReportComment(joined);
}

function toggleInSet(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function NewReportClient({
  schools,
  initialSchoolId = '',
  scheduleHints = [],
  initialLinkedEvent = null,
  initialDraft = null,
  peopleOptions = [],
  currentUser,
}: {
  schools: SchoolOpt[];
  initialSchoolId?: string;
  scheduleHints?: ScheduleHint[];
  /** Prefill from calendar CTA / event_id query — Linked mode */
  initialLinkedEvent?: ScheduleHint | null;
  initialDraft?: ReportDraft | null;
  /** Peers available to add onto the participation matrix */
  peopleOptions?: ParticipantOpt[];
  currentUser: ParticipantOpt;
}) {
  const router = useRouter();
  const seed =
    schools.find((s) => s.id === (initialDraft?.school_id || initialSchoolId)) ??
    schools.find((s) => s.id === initialSchoolId);

  const me: ParticipantOpt = currentUser;

  const [draftId, setDraftId] = useState(initialDraft?.id ?? '');
  const [linkedEventId, setLinkedEventId] = useState<string | null>(
    initialLinkedEvent?.event_id ?? null
  );
  const [q, setQ] = useState(seed?.name ?? '');
  const [province, setProvince] = useState(initialDraft?.province || seed?.province || '');
  const [district, setDistrict] = useState(initialDraft?.district || seed?.district || '');
  const [schoolId, setSchoolId] = useState(initialDraft?.school_id || initialSchoolId);
  const [datePreset, setDatePreset] = useState<'yesterday' | 'today' | 'tomorrow' | 'custom'>(
    initialLinkedEvent ? 'custom' : 'today'
  );
  const [reportDate, setReportDate] = useState(
    initialDraft?.report_date || initialLinkedEvent?.date || todayYmd
  );
  const [subjects, setSubjects] = useState<ReportSubjectDetails>(() =>
    detailsFromDraft(initialDraft)
  );
  const [onsiteReasons, setOnsiteReasons] = useState<Set<string>>(() => new Set());
  const [onsiteOther, setOnsiteOther] = useState('');
  // Independent default = me; linked overridden by applyLinkedPrefill
  const [teamParticipants, setTeamParticipants] = useState<ParticipantOpt[]>(() =>
    initialLinkedEvent?.participants?.length
      ? initialLinkedEvent.participants
      : [me]
  );
  const [visitorReasonMap, setVisitorReasonMap] = useState<Record<string, Set<string>>>({});
  const [opsNotes, setOpsNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const isLinked = Boolean(linkedEventId);

  const peopleById = useMemo(() => {
    const map = new Map<string, ParticipantOpt>();
    for (const p of peopleOptions) map.set(p.id, p);
    map.set(me.id, me);
    return map;
  }, [peopleOptions, me.id, me.name]);

  const availableToAdd = useMemo(
    () => peopleOptions.filter((p) => !teamParticipants.some((t) => t.id === p.id)),
    [peopleOptions, teamParticipants]
  );

  const resolvedOnsiteReasons = useMemo(() => {
    const list = [...onsiteReasons].filter((r) => r !== 'อื่นๆ');
    const other = onsiteOther.trim();
    if (onsiteReasons.has('อื่นๆ') && other) list.push(other);
    return list;
  }, [onsiteReasons, onsiteOther]);

  const provinces = useMemo(() => {
    let list = schools;
    if (district) list = list.filter((s) => s.district === district);
    return [...new Set(list.map((s) => s.province).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [schools, district]);

  const districts = useMemo(() => {
    let list = schools;
    if (province) list = list.filter((s) => s.province === province);
    return [...new Set(list.map((s) => s.district).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [schools, province]);

  const filteredSchools = useMemo(() => {
    let list = [...schools];
    if (province) list = list.filter((s) => s.province === province);
    if (district) list = list.filter((s) => s.district === district);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(n) || s.id.includes(n));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [schools, province, district, q]);

  const selected =
    filteredSchools.find((s) => s.id === schoolId) ?? schools.find((s) => s.id === schoolId);

  const applyDatePreset = (key: 'yesterday' | 'today' | 'tomorrow') => {
    setDatePreset(key);
    const t = todayYmd();
    if (key === 'yesterday') setReportDate(shiftYmd(t, -1));
    else if (key === 'tomorrow') setReportDate(shiftYmd(t, 1));
    else setReportDate(t);
  };

  const setSubjectDetail = (key: ReportSubjectKey, value: string) => {
    setSubjects((prev) => ({ ...prev, [key]: value }));
  };

  const applyLinkedPrefill = (h: ScheduleHint) => {
    setLinkedEventId(h.event_id);
    setSchoolId(h.school_id);
    const s = schools.find((x) => x.id === h.school_id);
    if (s) {
      setProvince(s.province);
      setDistrict(s.district);
      setQ(s.name);
    } else {
      setQ(h.school_name);
    }
    setReportDate(h.date);
    setDatePreset('custom');
    const { known, other } = splitReasons(h.visit_reasons ?? []);
    setOnsiteReasons(known);
    setOnsiteOther(other);
    const parts = h.participants ?? [];
    setTeamParticipants(parts);
    const map: Record<string, Set<string>> = {};
    const reasonList = [...known].filter((r) => r !== 'อื่นๆ');
    if (other) reasonList.push(other);
    for (const p of parts) {
      map[p.id] = new Set(reasonList);
    }
    setVisitorReasonMap(map);
    setMsg(null);
  };

  /** Manual school pick → Independent report (clear schedule link; team = me). */
  const pickSchoolIndependent = (id: string) => {
    setLinkedEventId(null);
    setSchoolId(id);
    const s = schools.find((x) => x.id === id);
    if (s) {
      setProvince(s.province);
      setDistrict(s.district);
      setQ(s.name);
    }
    setOnsiteReasons(new Set());
    setOnsiteOther('');
    setTeamParticipants([me]);
    setVisitorReasonMap({ [me.id]: new Set() });
  };

  useEffect(() => {
    if (initialLinkedEvent?.event_id) {
      applyLinkedPrefill(initialLinkedEvent);
    } else if (!linkedEventId && teamParticipants.length === 0) {
      setTeamParticipants([me]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from URL
  }, [initialLinkedEvent?.event_id]);

  const clearSchool = () => {
    setSchoolId('');
    setQ('');
    setLinkedEventId(null);
    setOnsiteReasons(new Set());
    setOnsiteOther('');
    setTeamParticipants([me]);
    setVisitorReasonMap({ [me.id]: new Set() });
    setMsg(null);
  };

  const addParticipant = (id: string) => {
    if (!id) return;
    if (teamParticipants.some((t) => t.id === id)) return;
    const person = peopleById.get(id);
    if (!person) return;
    setTeamParticipants((prev) => [...prev, person]);
    setVisitorReasonMap((prev) => ({
      ...prev,
      [id]: new Set(resolvedOnsiteReasons),
    }));
  };

  const removeParticipant = (id: string) => {
    setTeamParticipants((prev) => prev.filter((p) => p.id !== id));
    setVisitorReasonMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleOnsiteReason = (label: string) => {
    setOnsiteReasons((prev) => {
      const next = toggleInSet(prev, label);
      if (!next.has('อื่นๆ')) setOnsiteOther('');
      return next;
    });
    // Prune visitor map entries for removed reasons
    setVisitorReasonMap((prev) => {
      const allowed = new Set(
        [...onsiteReasons].includes(label)
          ? [...onsiteReasons].filter((r) => r !== label && r !== 'อื่นๆ')
          : [...onsiteReasons, label].filter((r) => r !== 'อื่นๆ')
      );
      if (onsiteOther.trim() && (onsiteReasons.has('อื่นๆ') || label === 'อื่นๆ')) {
        // keep other text reasons when อื่นๆ stays
      }
      const out: Record<string, Set<string>> = {};
      for (const [uid, set] of Object.entries(prev)) {
        out[uid] = new Set([...set].filter((r) => allowed.has(r) || r === onsiteOther.trim()));
      }
      return out;
    });
  };

  const toggleVisitorReason = (userId: string, reason: string) => {
    setVisitorReasonMap((prev) => {
      const cur = new Set(prev[userId] ?? []);
      if (cur.has(reason)) cur.delete(reason);
      else cur.add(reason);
      return { ...prev, [userId]: cur };
    });
  };

  const submitAll = () => {
    if (!schoolId) {
      setMsg('เลือกโรงเรียนก่อนบันทึก');
      return;
    }
    if (!resolvedOnsiteReasons.length && !onsiteReasons.has('อื่นๆ')) {
      setMsg('เลือกเหตุผลการลงพื้นที่จริงอย่างน้อย 1 รายการ');
      return;
    }
    if (onsiteReasons.has('อื่นๆ') && !onsiteOther.trim()) {
      setMsg('ระบุเหตุผลเมื่อเลือก “อื่นๆ”');
      return;
    }
    const reasons = resolvedOnsiteReasons.length
      ? resolvedOnsiteReasons
      : onsiteReasons.has('อื่นๆ') && onsiteOther.trim()
        ? [onsiteOther.trim()]
        : [];
    if (!reasons.length) {
      setMsg('เลือกเหตุผลการลงพื้นที่จริงอย่างน้อย 1 รายการ');
      return;
    }
    const comment = assembleReportComment(subjects);
    setMsg(null);
    start(async () => {
      try {
        const mapObj: Record<string, string[]> = {};
        for (const [uid, set] of Object.entries(visitorReasonMap)) {
          mapObj[uid] = [...set].filter((r) => reasons.includes(r));
        }
        const fd = new FormData();
        fd.set('school_id', schoolId);
        fd.set('report_date', reportDate);
        fd.set('boxes', JSON.stringify([{ text: comment, tags: [] }]));
        fd.set('image_urls', JSON.stringify(imageUrls));
        fd.set('onsite_reasons', JSON.stringify(reasons));
        fd.set('visitor_reason_map', JSON.stringify(mapObj));
        fd.set('ops_notes', opsNotes.trim());
        if (linkedEventId) fd.set('calendar_event_id', linkedEventId);
        const res = await postSchoolCommentsBatchAction(fd);
        if (!res.ok) {
          setMsg(res.error || 'บันทึกไม่สำเร็จ');
          return;
        }
        if (draftId) {
          const dfd = new FormData();
          dfd.set('draft_id', draftId);
          await deleteReportDraftAction(dfd);
        }
        setSubjects(emptySubjectDetails());
        setImageUrls([]);
        setDraftId('');
        setOpsNotes('');
        setMsg('บันทึกความคิดเห็นแล้ว');
        router.push('/reports');
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      }
    });
  };

  const saveDraft = () => {
    if (!schoolId || !selected) {
      setMsg('เลือกโรงเรียนก่อนบันทึกร่าง');
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const comment = assembleReportComment(subjects);
        const fd = new FormData();
        if (draftId) fd.set('draft_id', draftId);
        fd.set('school_id', schoolId);
        fd.set('school_name', selected.name);
        fd.set('province', selected.province);
        fd.set('district', selected.district);
        fd.set('report_date', reportDate);
        fd.set('boxes', JSON.stringify([{ text: comment, tags: [] }]));
        const res = await saveReportDraftAction(fd);
        if (!res.ok) {
          setMsg(res.error || 'บันทึกร่างไม่สำเร็จ');
          return;
        }
        setDraftId(res.draft.id);
        window.alert('บันทึกร่างสำเร็จแล้ว\nคุณสามารถกลับมาเขียนต่อได้จากหน้ารายงานทั้งหมด');
        router.push('/reports');
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'บันทึกร่างไม่สำเร็จ');
      }
    });
  };

  const removeDraft = () => {
    if (!draftId) return;
    start(async () => {
      const fd = new FormData();
      fd.set('draft_id', draftId);
      const res = await deleteReportDraftAction(fd);
      if (!res.ok) {
        setMsg(res.error || 'ลบร่างไม่สำเร็จ');
        return;
      }
      setDraftId('');
      setMsg('ลบร่างแล้ว');
      router.push('/reports/new');
      router.refresh();
    });
  };

  const canSubmit =
    Boolean(schoolId) &&
    (resolvedOnsiteReasons.length > 0 ||
      (onsiteReasons.has('อื่นๆ') && onsiteOther.trim().length > 0));

  return (
    <div className="page-shell py-5 grid gap-4 max-w-3xl">
      <Link href="/reports" className="text-sm text-tm-blue font-semibold inline-flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> กลับหน้ารายงาน
      </Link>

      {draftId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600 m-0">กำลังเขียนต่อจากร่างที่บันทึกไว้</p>
          <button
            type="button"
            className="ed-btn ed-btn--danger ed-btn--sm"
            disabled={pending}
            onClick={removeDraft}
          >
            ลบร่างนี้
          </button>
        </div>
      )}

      <div className="ed-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ed-section-title text-base m-0">เลือกโรงเรียนและวันที่</h2>
            <p className="text-sm text-slate-600 m-0 mt-1">
              เลือกจากตารางนัด = รายงานผูกกับนัดหมาย · เลือกโรงเรียนเอง = รายงานอิสระ
            </p>
          </div>
          <span
            className={`ed-badge ${isLinked ? '' : ''}`}
            style={
              isLinked
                ? { background: '#DBEAFE', color: '#1D4ED8' }
                : { background: '#F1F5F9', color: '#475569' }
            }
          >
            {isLinked ? 'รายงานผูกกับนัดหมาย' : 'รายงานอิสระ'}
          </span>
        </div>

        {scheduleHints.length > 0 && (
          <div>
            <div className="text-sm font-bold mb-2">แนะนำจากตารางนัด</div>
            <div className="report-suggest-list">
              {scheduleHints.map((h) => (
                <button
                  key={h.event_id}
                  type="button"
                  className={`report-suggest-chip ${
                    linkedEventId === h.event_id ? 'is-active' : ''
                  }`}
                  onClick={() => applyLinkedPrefill(h)}
                >
                  {h.school_name} · {formatThaiDate(h.date)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            จังหวัด
            <select
              className="form-input"
              value={province}
              onChange={(e) => {
                const value = e.target.value;
                setProvince(value);
                if (district && !schools.some((s) => (!value || s.province === value) && s.district === district)) {
                  setDistrict('');
                }
                setLinkedEventId(null);
                setSchoolId('');
                setQ('');
                setOnsiteReasons(new Set());
                setTeamParticipants([me]);
                setVisitorReasonMap({ [me.id]: new Set() });
              }}
            >
              <option value="">ทั้งหมด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            อำเภอ / เขต
            <select
              className="form-input"
              value={district}
              onChange={(e) => {
                const value = e.target.value;
                setDistrict(value);
                if (province && !schools.some((s) => s.province === province && (!value || s.district === value))) {
                  setProvince('');
                }
                setLinkedEventId(null);
                setSchoolId('');
                setQ('');
                setOnsiteReasons(new Set());
                setTeamParticipants([me]);
                setVisitorReasonMap({ [me.id]: new Set() });
              }}
            >
              <option value="">ทั้งหมด</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            โรงเรียน
            <select
              className="form-input"
              value={schoolId}
              onChange={(e) => pickSchoolIndependent(e.target.value)}
            >
              <option value="">— เลือก —</option>
              {filteredSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          ค้นหาชื่อโรงเรียน (combo)
          <input
            className="form-input"
            list="school-name-list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              const match = schools.find(
                (s) => s.name === e.target.value || s.name.toLowerCase() === e.target.value.toLowerCase()
              );
              if (match) pickSchoolIndependent(match.id);
              else setSchoolId('');
            }}
            placeholder="พิมพ์เพื่อค้นหาหรือเลือกจากรายการ"
          />
          <datalist id="school-name-list">
            {filteredSchools.slice(0, 80).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        {selected ? (
          <div className="report-selected-school" role="status">
            <div className="report-selected-school__head">
              <span className="report-selected-school__label">โรงเรียนที่เลือกแล้ว</span>
              <button
                type="button"
                className="report-selected-school__clear"
                aria-label="ยกเลิกการเลือกโรงเรียน"
                onClick={clearSchool}
              >
                <X size={14} />
              </button>
            </div>
            <strong className="report-selected-school__name">{selected.name}</strong>
            <span className="report-selected-school__meta">
              {[selected.district, selected.province].filter(Boolean).join(' · ') || '—'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 m-0">ยังไม่ได้เลือกโรงเรียน</p>
        )}
      </div>

      <div className="ed-card p-5 space-y-4">
        <div>
          <h2 className="ed-section-title text-base m-0">วันที่รายงาน</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {(
              [
                ['yesterday', 'ของเมื่อวาน'],
                ['today', 'วันนี้'],
                ['tomorrow', 'พรุ่งนี้'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`navbar__link ${datePreset === key ? 'navbar__link--active' : ''}`}
                onClick={() => applyDatePreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm font-semibold mt-3">
            หรือเลือกเองจากปฏิทิน
            <ThaiDateField
              value={reportDate}
              onChange={(ymd) => {
                setDatePreset('custom');
                setReportDate(ymd);
              }}
            />
          </label>
        </div>

        <fieldset className="space-y-2 m-0 p-0 border-0">
          <legend className="ed-section-title text-base m-0">เหตุผลการลงพื้นที่จริง (หน้างาน)</legend>
          <p className="text-xs text-slate-500 m-0">
            เลือกได้หลายข้อ — บันทึกเหตุผลจริงที่พบ ณ หน้างาน
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {VISIT_ACTIVITIES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={onsiteReasons.has(r)}
                  onChange={() => toggleOnsiteReason(r)}
                />
                {r}
              </label>
            ))}
          </div>
          {onsiteReasons.has('อื่นๆ') && (
            <label className="grid gap-1 text-sm font-semibold">
              ระบุเหตุผลอื่นๆ
              <input
                className="form-input"
                value={onsiteOther}
                onChange={(e) => setOnsiteOther(e.target.value)}
                placeholder="ระบุเหตุผลเพิ่มเติม"
              />
            </label>
          )}
        </fieldset>

        <fieldset className="space-y-3 m-0 p-0 border-0">
          <legend className="ed-section-title text-base m-0">การมีส่วนร่วมของทีมตามเหตุผล</legend>
          <p className="text-xs text-slate-500 m-0">
            {isLinked
              ? 'ดึงสมาชิกจากนัดหมายมาให้แล้ว — เพิ่มหรือลบได้ตามจริง ณ หน้างาน'
              : 'เริ่มจากตัวคุณ — เพิ่มหรือลบสมาชิกทีมได้ตามต้องการ'}
          </p>

          <div className="flex flex-wrap gap-2 items-end">
            <label className="grid gap-1 text-sm font-semibold min-w-[200px] flex-1">
              เพิ่มผู้เข้าร่วม
              <select
                className="form-input"
                value=""
                onChange={(e) => {
                  addParticipant(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">— เลือกเพื่อเพิ่ม —</option>
                {availableToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === me.id ? ' (ฉัน)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {teamParticipants.length === 0 ? (
            <p className="text-sm text-amber-700 m-0">ยังไม่มีผู้เข้าร่วม — เลือกจากรายการด้านบน</p>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
              {teamParticipants.map((p) => (
                <li key={p.id} className="domain-tag">
                  {p.name}
                  {p.id === me.id ? ' (ฉัน)' : ''}
                  <button
                    type="button"
                    aria-label={`ลบ ${p.name}`}
                    onClick={() => removeParticipant(p.id)}
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {teamParticipants.length > 0 && resolvedOnsiteReasons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-3 font-semibold">ผู้เข้าร่วม</th>
                    {resolvedOnsiteReasons.map((r) => (
                      <th key={r} className="py-2 px-2 font-semibold whitespace-nowrap">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamParticipants.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{p.name}</td>
                      {resolvedOnsiteReasons.map((r) => (
                        <td key={r} className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${p.name} · ${r}`}
                            checked={visitorReasonMap[p.id]?.has(r) ?? false}
                            onChange={() => toggleVisitorReason(p.id, r)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : teamParticipants.length > 0 ? (
            <p className="text-xs text-slate-500 m-0">
              เลือกเหตุผลการลงพื้นที่ด้านบนก่อน เพื่อติ๊กการมีส่วนร่วมตามเหตุผล
            </p>
          ) : null}
        </fieldset>

        <label className="grid gap-1 text-sm font-semibold">
          แนวทางการดำเนินงาน/การปฏิบัติงาน ณ หน้างาน
          <textarea
            className="form-input"
            rows={4}
            value={opsNotes}
            onChange={(e) => setOpsNotes(e.target.value)}
            placeholder="อธิบายแนวทางหรือการปฏิบัติงานที่ดำเนินการ ณ หน้างาน…"
          />
        </label>

        <div className="space-y-3">
          <h2 className="ed-section-title text-base m-0">รูปแนบรายงาน</h2>
          <p className="text-xs text-slate-500 m-0">
            สูงสุด {REPORT_IMAGE_MAX} รูป · แอปบีบอัดเป็น 2 ขนาดให้อัตโนมัติ (thumb + เต็ม) เพื่อประหยัดโควตา
          </p>
          <div className="report-attach">
            {imageUrls.map((url) => (
              <div key={url} className="report-attach__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaThumbUrl(url)}
                  alt=""
                  loading="lazy"
                  width={96}
                  height={72}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback !== '1' && img.src !== url) {
                      img.dataset.fallback = '1';
                      img.src = url;
                    }
                  }}
                />
                <button
                  type="button"
                  className="report-attach__remove"
                  aria-label="ลบรูป"
                  onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {imageUrls.length < REPORT_IMAGE_MAX && (
              <label className="report-attach__add">
                <ImagePlus size={18} />
                <span>{uploadingImgs ? 'อัปโหลด…' : 'เพิ่มรูป'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={uploadingImgs || pending || !schoolId}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (!files.length) return;
                    if (!schoolId) {
                      setMsg('เลือกโรงเรียนก่อนแนบรูป');
                      return;
                    }
                    const room = REPORT_IMAGE_MAX - imageUrls.length;
                    if (room <= 0) {
                      setMsg(`แนบได้สูงสุด ${REPORT_IMAGE_MAX} รูปต่อรายงาน`);
                      return;
                    }
                    const picked = files.slice(0, room);
                    setUploadingImgs(true);
                    setMsg(null);
                    void (async () => {
                      const next: string[] = [];
                      for (const file of picked) {
                        const res = await uploadReportImage(schoolId, file);
                        if (!res.ok) {
                          setMsg(res.error || 'อัปโหลดรูปไม่สำเร็จ');
                          break;
                        }
                        next.push(res.url);
                      }
                      if (next.length) setImageUrls((prev) => [...prev, ...next].slice(0, REPORT_IMAGE_MAX));
                      setUploadingImgs(false);
                      if (files.length > room) {
                        setMsg(`แนบได้สูงสุด ${REPORT_IMAGE_MAX} รูป — เพิ่มแล้ว ${room} รูป`);
                      }
                    })();
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-400 m-0">
            {imageUrls.length}/{REPORT_IMAGE_MAX} รูป
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="ed-section-title text-base m-0">ความคิดเห็นตามหัวข้อ (ไม่บังคับ)</h2>
          <p className="text-xs text-slate-500 m-0">
            กรอกได้ตามต้องการ — ไม่จำเป็นต้องกรอกครบทุกหัวข้อ
          </p>

          <div className="report-guided-box">
            {REPORT_SUBJECTS.map((s) => (
              <div key={s.key} className="report-guided-box__row">
                <div className="report-guided-box__subject" aria-hidden={false}>
                  - {s.label}
                </div>
                <textarea
                  className="form-input report-guided-box__detail"
                  rows={3}
                  value={subjects[s.key]}
                  onChange={(e) => setSubjectDetail(s.key, e.target.value)}
                  placeholder="… กรอกรายละเอียดใต้หัวข้อนี้ (ไม่บังคับ)"
                  aria-label={`รายละเอียด${s.label}`}
                />
              </div>
            ))}
          </div>
        </div>

        {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || !canSubmit}
            onClick={submitAll}
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึกความคิดเห็น'}
          </button>
          <button
            type="button"
            className="ed-btn ed-btn--outline"
            disabled={pending || !schoolId}
            onClick={saveDraft}
          >
            บันทึกร่าง
          </button>
          <Link href="/reports" className="ed-btn ed-btn--outline">
            ไปหน้ารายงานทั้งหมด
          </Link>
        </div>
      </div>
    </div>
  );
}
