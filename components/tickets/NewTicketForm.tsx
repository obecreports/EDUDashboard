'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTicketAction } from '@/app/actions/tickets';

/** School detail section names used as ticket topics */
export const TICKET_SUBJECTS = [
  'ภาพรวม',
  'ข้อมูลพื้นฐาน',
  'SWOT โรงเรียน',
  'การลงพื้นที่',
  '5 ด้าน (connextED)',
  '3 เสาหลัก',
  'นักเรียน / บุคลากร',
  'ที่ตั้งและแผนที่',
  'อื่นๆ',
] as const;

export function NewTicketForm({
  schools,
  defaultSchoolId,
  defaultSchoolName,
}: {
  schools: { id: string; name: string }[];
  defaultSchoolId?: string;
  defaultSchoolName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [schoolQuery, setSchoolQuery] = useState(
    () =>
      defaultSchoolName ||
      schools.find((s) => s.id === defaultSchoolId)?.name ||
      ''
  );
  const [schoolId, setSchoolId] = useState(defaultSchoolId || '');
  const [subject, setSubject] = useState<string>(TICKET_SUBJECTS[0]);
  const [otherSubject, setOtherSubject] = useState('');

  const suggestions = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return schools.slice(0, 12);
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [schools, schoolQuery]);

  const pickSchool = (s: { id: string; name: string }) => {
    setSchoolId(s.id);
    setSchoolQuery(s.name);
  };

  return (
    <form
      className="ed-card p-4 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const matched = schools.find(
          (s) => s.id === schoolId || s.name === schoolQuery.trim()
        );
        fd.set('school_id', matched?.id || schoolId || '');
        fd.set('school_name', matched?.name || schoolQuery.trim() || defaultSchoolName || '');
        const topic =
          subject === 'อื่นๆ' ? otherSubject.trim() || 'อื่นๆ' : subject;
        fd.set('subject', topic);
        if (!fd.get('school_name')) {
          setError('กรุณาระบุชื่อโรงเรียน');
          return;
        }
        startTransition(async () => {
          const res = await createTicketAction(fd);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.push('/tickets');
          router.refresh();
        });
      }}
    >
      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="grid gap-1 text-sm relative">
        <span className="font-semibold">โรงเรียน</span>
        <input
          className="border rounded-lg px-3 py-2"
          value={schoolQuery}
          onChange={(e) => {
            setSchoolQuery(e.target.value);
            const match = schools.find((s) => s.name === e.target.value);
            setSchoolId(match?.id || '');
          }}
          list="ticket-school-combo"
          placeholder="พิมพ์ชื่อโรงเรียน หรือเลือกจากรายการ"
          required
          autoComplete="off"
        />
        <datalist id="ticket-school-combo">
          {schools.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
        {schoolQuery.trim() && suggestions.length > 0 && !schoolId && (
          <div className="ticket-school-suggest">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="ticket-school-suggest__item"
                onClick={() => pickSchool(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-slate-500 font-normal">
          เลือกจากรายการหรือพิมพ์ชื่อเองได้
        </span>
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold">หัวข้อ</span>
        <select
          className="border rounded-lg px-3 py-2"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        >
          {TICKET_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {subject === 'อื่นๆ' && (
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">หัวข้ออื่นๆ</span>
          <input
            className="border rounded-lg px-3 py-2"
            value={otherSubject}
            onChange={(e) => setOtherSubject(e.target.value)}
            required
            placeholder="ระบุหัวข้อ"
          />
        </label>
      )}

      <label className="grid gap-1 text-sm">
        <span className="font-semibold">รายละเอียด</span>
        <textarea
          name="detail"
          className="border rounded-lg px-3 py-2 min-h-[120px]"
          required
          placeholder="อธิบายสิ่งที่ต้องการให้ Admin แก้ไข"
        />
      </label>
      <div className="flex justify-center pt-1">
        <button type="submit" className="ed-btn ed-btn--primary" disabled={pending}>
          ส่งคำขอ
        </button>
      </div>
    </form>
  );
}
