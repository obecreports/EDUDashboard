'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from '@/app/actions/visits';
import { VISIT_ACTIVITIES } from '@/lib/visits/labels';
import { ThaiDateField } from '@/components/ui/ThaiDateField';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

export type ScheduleInitialEvent = {
  id: string;
  school_id: string | null;
  date: string;
  visit_reasons?: string[];
  activity?: string;
  participant_ids?: string[];
  notes?: string;
};

type SchoolOpt = {
  id: string;
  name: string;
  province: string;
  district: string;
  area_id: string;
  area_name: string;
};

type TeamOpt = {
  id: string;
  full_name: string;
  role: UserRole;
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seedReasonsFromEvent(ev: ScheduleInitialEvent | null | undefined) {
  const raw = ev?.visit_reasons?.length
    ? ev.visit_reasons
    : ev?.activity
      ? [ev.activity]
      : [VISIT_ACTIVITIES[0]];
  const known = new Set<string>();
  let other = '';
  for (const r of raw) {
    const t = String(r).trim();
    if (!t) continue;
    if ((VISIT_ACTIVITIES as readonly string[]).includes(t)) known.add(t);
    else {
      known.add('อื่นๆ');
      if (!other) other = t;
    }
  }
  if (!known.size) known.add(VISIT_ACTIVITIES[0]!);
  return { known, other };
}

export function NewScheduleClient({
  schools,
  teammates = [],
  currentUserId,
  currentUserRole,
  initialSchoolId = '',
  initialDate = '',
  mode = 'create',
  initialEvent = null,
}: {
  schools: SchoolOpt[];
  teammates?: TeamOpt[];
  currentUserId: string;
  currentUserRole: UserRole;
  initialSchoolId?: string;
  initialDate?: string;
  mode?: 'create' | 'edit';
  initialEvent?: ScheduleInitialEvent | null;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit' && Boolean(initialEvent?.id);
  const schoolSeedId = initialEvent?.school_id || initialSchoolId;
  const seed = schools.find((s) => s.id === schoolSeedId);
  const isSo = currentUserRole === 'super_overseer';
  const seeded = seedReasonsFromEvent(initialEvent);
  const [q, setQ] = useState(seed?.name ?? '');
  const [province, setProvince] = useState(seed?.province ?? '');
  const [district, setDistrict] = useState(seed?.district ?? '');
  const [schoolId, setSchoolId] = useState(schoolSeedId || '');
  const [date, setDate] = useState(() => {
    const d = initialEvent?.date || initialDate;
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayYmd();
  });
  const [reasons, setReasons] = useState<Set<string>>(() => seeded.known);
  const [activityOther, setActivityOther] = useState(seeded.other);
  const [participantIds, setParticipantIds] = useState<Set<string>>(() => {
    const ids = (initialEvent?.participant_ids ?? []).filter((id) => id !== currentUserId);
    return new Set(ids);
  });
  const [notes, setNotes] = useState(initialEvent?.notes ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = schools.find((s) => s.id === schoolId);

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

  const selectableTeammates = useMemo(
    () =>
      teammates.filter((t) => {
        if (t.id === currentUserId) return false;
        if (!isSo && t.role === 'super_overseer') return false;
        return true;
      }),
    [teammates, currentUserId, isSo]
  );

  const pickSchool = (id: string) => {
    if (!id) {
      setSchoolId('');
      return;
    }
    const s = schools.find((x) => x.id === id);
    if (!s) return;
    setSchoolId(id);
    setProvince(s.province);
    setDistrict(s.district);
    setQ(s.name);
    setMsg(null);
  };

  const clearSchool = () => {
    setSchoolId('');
    setQ('');
  };

  const toggleReason = (label: string) => {
    setReasons((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleParticipant = (id: string) => {
    if (id === currentUserId) return;
    setParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (!selected) {
      setMsg('เลือกโรงเรียน 1 แห่ง');
      return;
    }
    if (!date) {
      setMsg('เลือกวันที่ทำกิจกรรม');
      return;
    }
    if (reasons.size === 0) {
      setMsg('เลือกเหตุผลการลงพื้นที่อย่างน้อย 1 รายการ');
      return;
    }
    if (reasons.has('อื่นๆ') && !activityOther.trim()) {
      setMsg('ระบุชื่อกิจกรรมเมื่อเลือก “อื่นๆ”');
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const reasonList = [...reasons].map((r) =>
          r === 'อื่นๆ' && activityOther.trim() ? activityOther.trim() : r
        );
        const fd = new FormData();
        fd.set('school_ids', JSON.stringify([selected.id]));
        fd.set('school_names', JSON.stringify([selected.name]));
        fd.set('school_id', selected.id);
        fd.set('school_name', selected.name);
        fd.set('area_id', selected.area_id);
        fd.set('area_name', selected.area_name);
        fd.set('province', selected.province);
        fd.set('date', date);
        fd.set('visit_reasons', JSON.stringify(reasonList));
        fd.set('activity', reasonList[0]!);
        fd.set('participant_ids', JSON.stringify([...participantIds]));
        fd.set('status', 'นัดหมายแล้ว');
        fd.set('notes', notes.trim());
        const res = isEdit
          ? (() => {
              fd.set('id', initialEvent!.id);
              return updateCalendarEventAction(fd);
            })()
          : createCalendarEventAction(fd);
        const result = await res;
        if (!result.ok) {
          setMsg(('error' in result && result.error) || 'บันทึกไม่สำเร็จ');
          return;
        }
        router.push(`/calendar?date=${encodeURIComponent(date)}`);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      }
    });
  };

  return (
    <div className="page-shell py-5 grid gap-4 max-w-3xl">
      <Link href="/calendar" className="text-sm text-tm-blue font-semibold inline-flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> กลับหน้าปฏิทิน
      </Link>

      <div className="ed-card p-5 space-y-4">
        <div>
          <h2 className="ed-section-title text-base m-0">
            {isEdit ? '1 · แก้ไขโรงเรียน' : '1 · เลือกโรงเรียน'}
          </h2>
          <p className="text-sm text-slate-600 m-0 mt-1">เลือกได้ครั้งละ 1 โรงเรียน</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            จังหวัด
            <select
              className="form-input"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict('');
                setSchoolId('');
                setQ('');
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
                setDistrict(e.target.value);
                setSchoolId('');
                setQ('');
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
              onChange={(e) => pickSchool(e.target.value)}
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
          ค้นหาชื่อโรงเรียน
          <input
            className="form-input"
            list="schedule-school-list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              const match = schools.find(
                (s) =>
                  s.name === e.target.value ||
                  s.name.toLowerCase() === e.target.value.toLowerCase()
              );
              if (match) pickSchool(match.id);
              else setSchoolId('');
            }}
            placeholder="พิมพ์เพื่อค้นหาแล้วเลือกจากรายการ"
          />
          <datalist id="schedule-school-list">
            {filteredSchools.slice(0, 80).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        {selected ? (
          <div className="report-selected-school" role="status">
            <div className="report-selected-school__head">
              <span className="report-selected-school__label">โรงเรียนที่เลือก</span>
              <button
                type="button"
                className="report-selected-school__clear"
                aria-label="ยกเลิกการเลือก"
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
          <h2 className="ed-section-title text-base m-0">2 · วันที่ เหตุผล และทีม</h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            เลือกเหตุผลการลงพื้นที่ได้หลายรายการ · เพิ่มสมาชิกทีมเพื่อซิงก์ปฏิทิน
          </p>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          วันที่ทำกิจกรรม
          <ThaiDateField value={date} onChange={setDate} required />
        </label>

        <fieldset className="grid gap-2 m-0 p-0 border-0">
          <legend className="text-sm font-semibold mb-1">เหตุผลการลงพื้นที่ (เลือกได้หลายข้อ)</legend>
          <div className="managed-filters__chip-row">
            {VISIT_ACTIVITIES.map((a) => (
              <label key={a} className="ed-check ed-check--inline">
                <input
                  type="checkbox"
                  checked={reasons.has(a)}
                  onChange={() => toggleReason(a)}
                />
                {a}
              </label>
            ))}
          </div>
        </fieldset>

        {reasons.has('อื่นๆ') && (
          <label className="grid gap-1 text-sm font-semibold">
            ระบุเหตุผลอื่นๆ
            <input
              className="form-input"
              value={activityOther}
              onChange={(e) => setActivityOther(e.target.value)}
              placeholder="เช่น ประชุมผู้ปกครอง"
            />
          </label>
        )}

        {selectableTeammates.length > 0 && (
          <fieldset className="grid gap-2 m-0 p-0 border-0">
            <legend className="text-sm font-semibold mb-1">เลือกผู้เข้าร่วม</legend>
            <p className="text-xs text-slate-500 m-0">
              เลือกสมาชิกเพิ่มเพื่อให้เห็นนัดในปฏิทินของตน
              {!isSo ? '' : ''}
            </p>
            <div className="managed-filters__chip-row">
              {selectableTeammates.map((t) => (
                <label key={t.id} className="ed-check ed-check--inline">
                  <input
                    type="checkbox"
                    checked={participantIds.has(t.id)}
                    onChange={() => toggleParticipant(t.id)}
                  />
                  {t.full_name}
                  <span className="text-slate-400"> ({ROLE_LABELS[t.role]})</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="grid gap-1 text-sm font-semibold">
          หมายเหตุ
          <textarea
            className="form-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
          />
        </label>

        {msg && (
          <p className="text-sm font-medium m-0" style={{ color: '#b91c1c' }}>
            {msg}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || !schoolId}
            onClick={submit}
          >
            {pending ? 'กำลังบันทึก…' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกนัดหมาย'}
          </button>
          <Link href="/calendar" className="ed-btn ed-btn--outline">
            ยกเลิก
          </Link>
        </div>
      </div>
    </div>
  );
}
