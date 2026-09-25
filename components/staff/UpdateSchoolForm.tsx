'use client';

import { useState, useTransition } from 'react';
import { createVisitLog } from '@/app/actions/visits';

export function UpdateSchoolForm({
  schools,
}: {
  schools: { id: number; name: string }[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel-card space-y-4"
      action={(fd) => {
        start(async () => {
          const res = await createVisitLog(fd);
          setMsg(res.ok ? 'บันทึกสำเร็จ' : res.error || 'ล้มเหลว');
        });
      }}
    >
      <label className="block text-sm">
        โรงเรียน
        <select name="school_id" className="form-input" required defaultValue="">
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
      <label className="block text-sm">
        สถานะสำรวจ
        <select name="survey_status" className="form-input" defaultValue="Pending">
          <option value="Active">Active</option>
          <option value="Surveyed">Surveyed</option>
          <option value="Pending">Pending</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      <label className="block text-sm">
        หมายเหตุ / ผลการสำรวจ
        <textarea name="notes" className="form-input" rows={4} />
      </label>
      <button type="submit" className="navbar__login" disabled={pending}>
        {pending ? 'กำลังบันทึก…' : 'บันทึกลง school_visit_logs'}
      </button>
      {msg && <p className="text-sm font-medium text-tm-blue">{msg}</p>}
    </form>
  );
}
