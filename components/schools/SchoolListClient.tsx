'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { SchoolFull } from '@/lib/types';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

type AreaOption = { area_id: string; area_name: string };

const PAGE_SIZE = 20;

export function SchoolListClient({
  schools,
  areas,
}: {
  schools: SchoolFull[];
  areas: AreaOption[];
}) {
  const [nameQ, setNameQ] = useState('');
  const [province, setProvince] = useState('');
  const [areaId, setAreaId] = useState('');
  const [size, setSize] = useState('');
  const [page, setPage] = useState(1);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    schools.forEach((s) => {
      if (s.province?.trim()) set.add(s.province.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    schools.forEach((s) => {
      if (s.school_size?.trim()) set.add(String(s.school_size).trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools]);

  const areaOptions = useMemo(() => {
    const byId = new Map(areas.map((a) => [String(a.area_id), a.area_name]));
    schools.forEach((s) => {
      if (s.area_id && !byId.has(String(s.area_id))) {
        byId.set(String(s.area_id), s.area_name || String(s.area_id));
      }
    });
    return [...byId.entries()]
      .map(([id, name]) => ({ area_id: id, area_name: name }))
      .sort((a, b) => a.area_name.localeCompare(b.area_name, 'th'));
  }, [areas, schools]);

  const filtered = useMemo(() => {
    const q = nameQ.trim().toLowerCase();
    return schools.filter((s) => {
      if (q && !(s.school_name_th || '').toLowerCase().includes(q)) return false;
      if (province && (s.province || '') !== province) return false;
      if (areaId && String(s.area_id || '') !== areaId) return false;
      if (size && String(s.school_size || '') !== size) return false;
      return true;
    });
  }, [schools, nameQ, province, areaId, size]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [nameQ, province, areaId, size]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, totalPages, page]);
    for (let d = 1; d <= 2; d++) {
      if (page - d > 1) pages.add(page - d);
      if (page + d < totalPages) pages.add(page + d);
    }
    return [...pages].sort((a, b) => a - b);
  }, [page, totalPages]);

  return (
    <div className="space-y-4">
      <div className="panel-card filter-toolbar">
        <label className="filter-field">
          <span>ชื่อโรงเรียน</span>
          <div className="filter-input-wrap">
            <Search size={16} className="filter-input-icon" />
            <input
              className="form-input filter-input"
              placeholder="ค้นหาชื่อ…"
              value={nameQ}
              onChange={(e) => setNameQ(e.target.value)}
            />
          </div>
        </label>
        <label className="filter-field">
          <span>จังหวัด</span>
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
        <label className="filter-field">
          <span>เขตพื้นที่การศึกษา</span>
          <select
            className="form-input"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {areaOptions.map((a) => (
              <option key={a.area_id} value={a.area_id}>
                {a.area_name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>ขนาดโรงเรียน</span>
          <select className="form-input" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {sizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-500 m-0">
        แสดง {pageRows.length.toLocaleString()} จาก {filtered.length.toLocaleString()} โรงเรียน
        (หน้า {page}/{totalPages} · หน้าละ {PAGE_SIZE})
      </p>

      <div className="panel-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
            <tr>
              <th className="text-left p-3">ชื่อโรงเรียน</th>
              <th className="text-left p-3">จังหวัด</th>
              <th className="text-left p-3">อำเภอ</th>
              <th className="text-left p-3">เขตพื้นที่</th>
              <th className="text-left p-3">ขนาด</th>
              <th className="text-left p-3">นักเรียน</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => (
              <tr key={String(s.school_id)} className="border-t border-slate-100">
                <td className="p-3">
                  <Link
                    href={`/schools/${s.school_id}`}
                    prefetch
                    className="font-medium text-tm-blue hover:underline"
                  >
                    {s.school_name_th}
                  </Link>
                </td>
                <td className="p-3">{s.province}</td>
                <td className="p-3">{s.district}</td>
                <td className="p-3">{s.area_name || s.area_id || '—'}</td>
                <td className="p-3">{s.school_size}</td>
                <td className="p-3">
                  {(s.studentSummary?.totalStudents ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  ไม่พบโรงเรียนตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            ก่อนหน้า
          </button>
          <div className="pagination-pages">
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1];
              const showEllipsis = prev != null && n - prev > 1;
              return (
                <span key={n} className="inline-flex items-center gap-1">
                  {showEllipsis && <span className="text-slate-400 px-1">…</span>}
                  <button
                    type="button"
                    className={`pagination-num ${page === n ? 'pagination-num--active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ถัดไป
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
