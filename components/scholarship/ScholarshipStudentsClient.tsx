'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ScholarshipStudent } from '@/lib/mock/scholarship-students';

export function ScholarshipStudentsClient({
  students,
  canModify,
}: {
  students: ScholarshipStudent[];
  canModify: boolean;
}) {
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');

  const provinces = useMemo(
    () =>
      [...new Set(students.map((s) => s.province).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'th')
      ),
    [students]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter((s) => {
      if (province && s.province !== province) return false;
      if (!needle) return true;
      return (
        s.full_name.toLowerCase().includes(needle) ||
        s.school_name.toLowerCase().includes(needle) ||
        s.scholarship_type.toLowerCase().includes(needle) ||
        s.id.toLowerCase().includes(needle)
      );
    });
  }, [students, q, province]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="grid gap-1 text-sm font-semibold">
          ค้นหา
          <input
            className="form-input min-w-[14rem]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ชื่อ / โรงเรียน / ประเภททุน"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          จังหวัด
          <select
            className="form-input"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {canModify ? (
          <span className="text-xs text-tm-blue font-semibold pb-2">
            สิทธิ์แก้ไข (mock)
          </span>
        ) : null}
      </div>

      <div className="ed-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="p-3">ชื่อ</th>
              <th className="p-3">ชั้น</th>
              <th className="p-3">โรงเรียน</th>
              <th className="p-3">จังหวัด</th>
              <th className="p-3">ประเภททุน</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-slate-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">
                    {[s.name_prefix, s.full_name].filter(Boolean).join(' ')}
                  </td>
                  <td className="p-3">{s.grade_level}</td>
                  <td className="p-3">{s.school_name}</td>
                  <td className="p-3">{s.province}</td>
                  <td className="p-3">{s.scholarship_type}</td>
                  <td className="p-3">{s.status}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/scholarship-students/${s.id}`}
                      className="text-tm-blue font-semibold underline"
                    >
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 m-0">
        แสดง {filtered.length} จาก {students.length} คน · ข้อมูลจำลอง
      </p>
    </div>
  );
}
