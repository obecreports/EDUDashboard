'use client';

import { useMemo, useState, useTransition } from 'react';
import { updateAssignedZonesAction } from '@/app/actions/auth';
import { X } from 'lucide-react';
import { parseAreaIds } from '@/lib/auth/mock-users';

type AreaOption = { area_id: string; area_name: string };

export function ZoneBasket({
  initialZones,
  options,
}: {
  /** Comma-separated area_id values */
  initialZones: string | null;
  options: AreaOption[];
}) {
  const [selected, setSelected] = useState<string[]>(() => parseAreaIds(initialZones));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const byId = useMemo(() => {
    const map = new Map(options.map((o) => [String(o.area_id), o.area_name]));
    return map;
  }, [options]);

  const available = useMemo(() => {
    const set = new Set(selected);
    return options
      .filter((o) => !set.has(String(o.area_id)))
      .sort((a, b) => a.area_name.localeCompare(b.area_name, 'th'));
  }, [options, selected]);

  const add = (areaId: string) => {
    const id = areaId.trim();
    if (!id) return;
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setMsg(null);
  };

  const remove = (areaId: string) => {
    setSelected((prev) => prev.filter((z) => z !== areaId));
    setMsg(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-600">
        เขตพื้นที่การศึกษาที่รับผิดชอบ (area_id / Gov_Domain)
      </label>
      <p className="text-xs text-slate-400 m-0">
        เลือกได้เฉพาะระดับเขตพื้นที่การศึกษา — ไม่สามารถมอบหมายทั้งจังหวัดได้
      </p>

      <div className="zone-basket" aria-label="ตะกร้าเขตพื้นที่ที่เลือก">
        {selected.length === 0 && (
          <span className="text-xs text-slate-400">ยังไม่ได้เลือกเขตพื้นที่</span>
        )}
        {selected.map((id) => (
          <span key={id} className="zone-chip">
            {byId.get(id) || id}
            <button
              type="button"
              className="zone-chip__remove"
              aria-label={`ลบ ${id}`}
              onClick={() => remove(id)}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <label className="block text-sm flex-1">
          เพิ่มเขตพื้นที่
          <select
            className="form-input"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) add(v);
            }}
          >
            <option value="">เลือกเขตพื้นที่การศึกษา…</option>
            {available.map((o) => (
              <option key={o.area_id} value={o.area_id}>
                {o.area_name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="navbar__login"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const fd = new FormData();
              fd.set('zones', JSON.stringify(selected));
              const res = await updateAssignedZonesAction(fd);
              if (res && 'error' in res && res.error) setMsg(res.error);
              else setMsg('บันทึกเขตพื้นที่เรียบร้อย');
            });
          }}
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>

      {msg && (
        <p
          className="text-sm m-0"
          style={{ color: msg.includes('เรียบร้อย') ? '#047857' : '#b91c1c' }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
