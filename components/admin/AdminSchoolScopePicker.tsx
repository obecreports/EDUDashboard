'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

export type ScopeSchoolOption = {
  id: string;
  name: string;
  province: string;
  district: string;
};

type Props = {
  schools: ScopeSchoolOption[];
  value: string;
  onChange: (schoolId: string) => void;
  listId?: string;
};

/**
 * Province → district → school + name combo — same pattern as NewReportClient.
 */
export function AdminSchoolScopePicker({
  schools,
  value,
  onChange,
  listId = 'admin-school-name-list',
}: Props) {
  const selected = schools.find((s) => s.id === value) ?? null;

  const [province, setProvince] = useState(selected?.province ?? '');
  const [district, setDistrict] = useState(selected?.district ?? '');
  const [q, setQ] = useState(selected?.name ?? '');

  const provinces = useMemo(
    () =>
      [...new Set(schools.map((s) => s.province).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'th')
      ),
    [schools]
  );

  const districts = useMemo(() => {
    const list = schools
      .filter((s) => !province || s.province === province)
      .map((s) => s.district)
      .filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools, province]);

  const filteredSchools = useMemo(() => {
    return schools
      .filter((s) => {
        if (province && s.province !== province) return false;
        if (district && s.district !== district) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [schools, province, district]);

  const pick = (id: string) => {
    onChange(id);
    const s = schools.find((x) => x.id === id);
    if (s) {
      setProvince(s.province || '');
      setDistrict(s.district || '');
      setQ(s.name);
    }
  };

  const clear = () => {
    onChange('');
    setQ('');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">
          จังหวัด
          <select
            className="form-input"
            value={province}
            onChange={(e) => {
              const v = e.target.value;
              setProvince(v);
              if (
                district &&
                !schools.some(
                  (s) => (!v || s.province === v) && s.district === district
                )
              ) {
                setDistrict('');
              }
              onChange('');
              setQ('');
            }}
          >
            <option value="">ทั้งหมด</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          อำเภอ / เขต
          <select
            className="form-input"
            value={district}
            onChange={(e) => {
              const v = e.target.value;
              setDistrict(v);
              if (
                province &&
                !schools.some(
                  (s) => s.province === province && (!v || s.district === v)
                )
              ) {
                setProvince('');
              }
              onChange('');
              setQ('');
            }}
          >
            <option value="">ทั้งหมด</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          โรงเรียน
          <select
            className="form-input"
            value={value}
            onChange={(e) => pick(e.target.value)}
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
          list={listId}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            const match = schools.find(
              (s) =>
                s.name === e.target.value ||
                s.name.toLowerCase() === e.target.value.toLowerCase()
            );
            if (match) pick(match.id);
            else onChange('');
          }}
          placeholder="พิมพ์เพื่อค้นหาหรือเลือกจากรายการ"
        />
        <datalist id={listId}>
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
              onClick={clear}
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
  );
}
