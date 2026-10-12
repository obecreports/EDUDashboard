'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Row = {
  id: string;
  name: string;
  province: string;
  district: string;
  area_name: string;
  phone: string;
};

export function AdminSchoolsListClient({ schools }: { schools: Row[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((s) =>
      [s.id, s.name, s.province, s.district, s.area_name, s.phone]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [schools, q]);

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-semibold max-w-md">
        ค้นหาโรงเรียน
        <input
          className="form-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ชื่อ · จังหวัด · เขต · รหัส"
        />
      </label>

      <p className="text-sm text-slate-500 m-0">
        แสดง {filtered.length.toLocaleString('th-TH')} จาก {schools.length.toLocaleString('th-TH')}{' '}
        แห่ง
      </p>

      {filtered.length === 0 ? (
        <div className="ed-card p-5 text-slate-500">ไม่พบโรงเรียนตามคำค้น</div>
      ) : (
        <div className="ed-school-list-compact">
          {filtered.slice(0, 200).map((s) => (
            <article key={s.id} className="ed-school-list-row">
              <div className="ed-school-list-row__main min-w-0">
                <div className="font-bold text-tm-blue text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {[s.district, s.province].filter(Boolean).join(' · ') || '—'}
                  {s.area_name ? ` · ${s.area_name}` : ''}
                  {s.phone ? ` · ${s.phone}` : ''}
                </div>
              </div>
              <div className="ed-school-list-row__actions">
                <Link
                  href={`/admin/schools/${encodeURIComponent(s.id)}`}
                  className="ed-btn ed-btn--primary ed-btn--sm"
                >
                  แก้ไขรายละเอียด
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {filtered.length > 200 && (
        <p className="text-xs text-slate-500 m-0">แสดงสูงสุด 200 รายการ — ใส่คำค้นเพื่อกรองต่อ</p>
      )}
    </div>
  );
}
