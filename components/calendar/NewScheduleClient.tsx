'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createCalendarEventAction } from '@/app/actions/visits';
import { VISIT_ACTIVITIES } from '@/lib/visits/labels';
import { ThaiDateField } from '@/components/ui/ThaiDateField';

type SchoolOpt = {
  id: string;
  name: string;
  province: string;
  district: string;
  area_id: string;
  area_name: string;
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function NewScheduleClient({
  schools,
  initialSchoolId = '',
  initialDate = '',
}: {
  schools: SchoolOpt[];
  initialSchoolId?: string;
  initialDate?: string;
}) {
  const router = useRouter();
  const seed = schools.find((s) => s.id === initialSchoolId);
  const [q, setQ] = useState(seed?.name ?? '');
  const [province, setProvince] = useState(seed?.province ?? '');
  const [district, setDistrict] = useState(seed?.district ?? '');
  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [date, setDate] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayYmd
  );
  const [activity, setActivity] = useState<string>(VISIT_ACTIVITIES[0]);
  const [activityOther, setActivityOther] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

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

  const pickSchool = (id: string) => {
    setSchoolId(id);
    const s = schools.find((x) => x.id === id);
    if (s) {
      setProvince(s.province);
      setDistrict(s.district);
      setQ(s.name);
    }
  };

  const submit = () => {
    if (!selected) {
      setMsg('เลือกโรงเรียนก่อนบันทึกนัดหมาย');
      return;
    }
    if (!date) {
      setMsg('เลือกวันที่ทำกิจกรรม');
      return;
    }
    if (activity === 'อื่นๆ' && !activityOther.trim()) {
      setMsg('ระบุชื่อกิจกรรมเมื่อเลือก “อื่นๆ”');
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set('school_id', selected.id);
        fd.set('school_name', selected.name);
        fd.set('area_id', selected.area_id);
        fd.set('area_name', selected.area_name);
        fd.set('province', selected.province);
        fd.set('date', date);
        fd.set('activity', activity);
        fd.set('status', 'นัดหมายแล้ว');
        const remarkParts: string[] = [];
        if (activity === 'อื่นๆ' && activityOther.trim()) {
          remarkParts.push(`กิจกรรม: ${activityOther.trim()}`);
        }
        if (notes.trim()) remarkParts.push(notes.trim());
        fd.set('notes', remarkParts.join('\n'));
        const res = await createCalendarEventAction(fd);
        if (!res.ok) {
          setMsg(('error' in res && res.error) || 'บันทึกไม่สำเร็จ');
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
          <h2 className="ed-section-title text-base m-0">1 · เลือกโรงเรียน</h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            กรองจังหวัด/อำเภอ/โรงเรียน เหมือนหน้าส่งรายงาน
          </p>
        </div>

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
                const value = e.target.value;
                setDistrict(value);
                if (province && !schools.some((s) => s.province === province && (!value || s.district === value))) {
                  setProvince('');
                }
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
                (s) => s.name === e.target.value || s.name.toLowerCase() === e.target.value.toLowerCase()
              );
              if (match) pickSchool(match.id);
              else setSchoolId('');
            }}
            placeholder="พิมพ์เพื่อค้นหาหรือเลือกจากรายการ"
          />
          <datalist id="schedule-school-list">
            {filteredSchools.slice(0, 80).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        {selected ? (
          <div className="report-selected-school" role="status">
            <span className="report-selected-school__label">โรงเรียนที่เลือกแล้ว</span>
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
          <h2 className="ed-section-title text-base m-0">2 · วันที่ กิจกรรม และหมายเหตุ</h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            กำหนดวันลงพื้นที่และรายละเอียดกิจกรรม · นัดหลายรายการในวันเดียวกันได้
          </p>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          วันที่ทำกิจกรรม
          <ThaiDateField value={date} onChange={setDate} required />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          ชื่อกิจกรรม
          <select
            className="form-input"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            {VISIT_ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {activity === 'อื่นๆ' && (
          <label className="grid gap-1 text-sm font-semibold">
            ระบุชื่อกิจกรรม
            <input
              className="form-input"
              value={activityOther}
              onChange={(e) => setActivityOther(e.target.value)}
              placeholder="เช่น ประชุมผู้ปกครอง"
            />
          </label>
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

        {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || !schoolId}
            onClick={submit}
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึกนัดหมาย'}
          </button>
          <Link href="/calendar" className="ed-btn ed-btn--outline">
            ยกเลิก
          </Link>
        </div>
      </div>
    </div>
  );
}
