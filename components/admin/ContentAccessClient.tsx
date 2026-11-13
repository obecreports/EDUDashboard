'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveContentAccessAction } from '@/app/actions/admin';
import {
  CONTENT_PAGES,
  DEFAULT_CONTENT_ACCESS,
  accessLevelLabel,
  accessOf,
  aclEditableRoles,
  aclRoleLabel,
  getAccessCell,
  normalizeAccessCell,
  resourceSupportsSensitivity,
  sensitivityLevelLabel,
  tierCell,
  type AccessLevel,
  type ContentAccessCell,
  type ContentAccessMap,
  type ContentResourceId,
  type SensitivityLevel,
  type TieredAccessCell,
} from '@/lib/auth/content-access';
import { normalizeRole, type UserRole } from '@/lib/types';

const LEVELS: AccessLevel[] = ['none', 'view', 'modify'];
const SENSITIVITY: SensitivityLevel[] = [1, 2, 3];

function cellOf(
  map: ContentAccessMap,
  resource: ContentResourceId,
  role: UserRole
): TieredAccessCell {
  return getAccessCell(map, resource, role);
}

function AccessControls({
  resource,
  cell,
  disabled,
  onChange,
}: {
  resource: ContentResourceId;
  cell: TieredAccessCell;
  disabled?: boolean;
  onChange: (next: ContentAccessCell) => void;
}) {
  const tiered = resourceSupportsSensitivity(resource);
  const access = cell.access;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-semibold">
        สิทธิ์
        <select
          className="form-input text-sm py-1.5 min-w-[9rem]"
          value={access}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value as AccessLevel;
            if (!tiered) {
              onChange(next);
              return;
            }
            if (next === 'none') onChange(tierCell('none'));
            else if (next === 'view')
              onChange(tierCell('view', cell.viewUpTo ?? 1));
            else
              onChange(
                tierCell(
                  'modify',
                  cell.viewUpTo ?? 3,
                  Math.min(cell.viewUpTo ?? 3, cell.modifyUpTo ?? 1) as SensitivityLevel
                )
              );
          }}
        >
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              {accessLevelLabel(lv)}
            </option>
          ))}
        </select>
      </label>

      {tiered && access !== 'none' ? (
        <label className="grid gap-1 text-xs font-semibold">
          ดูได้ถึง
          <select
            className="form-input text-sm py-1.5 min-w-[9rem]"
            value={cell.viewUpTo ?? 1}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value) as SensitivityLevel;
              if (access === 'view') onChange(tierCell('view', v));
              else {
                const m = Math.min(v, cell.modifyUpTo ?? 1) as SensitivityLevel;
                onChange(tierCell('modify', v, m));
              }
            }}
          >
            {SENSITIVITY.map((lv) => (
              <option key={lv} value={lv}>
                {sensitivityLevelLabel(lv)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {tiered && access === 'modify' ? (
        <label className="grid gap-1 text-xs font-semibold">
          แก้ไขได้ถึง
          <select
            className="form-input text-sm py-1.5 min-w-[9rem]"
            value={Math.min(cell.modifyUpTo ?? 1, cell.viewUpTo ?? 1)}
            disabled={disabled}
            onChange={(e) => {
              const m = Number(e.target.value) as SensitivityLevel;
              const v = (cell.viewUpTo ?? 3) as SensitivityLevel;
              onChange(tierCell('modify', v, Math.min(v, m) as SensitivityLevel));
            }}
          >
            {SENSITIVITY.filter((lv) => lv <= (cell.viewUpTo ?? 3)).map((lv) => (
              <option key={lv} value={lv}>
                {sensitivityLevelLabel(lv)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function ContentAccessClient({
  initial,
  actorRole,
}: {
  initial: ContentAccessMap;
  actorRole: UserRole;
}) {
  const editableRoles = useMemo(
    () => aclEditableRoles(normalizeRole(actorRole)),
    [actorRole]
  );
  const [map, setMap] = useState<ContentAccessMap>(initial);
  const [role, setRole] = useState<UserRole>(
    () => editableRoles[0] ?? 'guest'
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const setCell = (resource: ContentResourceId, cell: ContentAccessCell) => {
    if (!editableRoles.includes(role)) return;
    setMap((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], [role]: cell },
    }));
  };

  const resetDefaults = () => {
    setMap((prev) => {
      const next = { ...prev } as ContentAccessMap;
      for (const page of CONTENT_PAGES) {
        const ids = [page.id, ...page.sections.map((s) => s.id)];
        for (const id of ids) {
          const row = { ...(prev[id] ?? {}) };
          for (const r of editableRoles) {
            row[r] = DEFAULT_CONTENT_ACCESS[id]?.[r] ?? 'none';
          }
          next[id] = row;
        }
      }
      return next;
    });
    setMsg('คืนค่าเริ่มต้นแล้ว — กดบันทึกเพื่อยืนยัน');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="grid gap-1 text-sm font-semibold min-w-[12rem]">
          บทบาท
          <select
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {editableRoles.map((r) => (
              <option key={r} value={r}>
                {aclRoleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ed-btn ed-btn--primary"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const fd = new FormData();
              fd.set('map', JSON.stringify(map));
              const res = await saveContentAccessAction(fd);
              setMsg(res.ok ? 'บันทึกสิทธิ์เรียบร้อย' : res.error);
            });
          }}
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์'}
        </button>
        <button
          type="button"
          className="ed-btn"
          disabled={pending}
          onClick={resetDefaults}
        >
          คืนค่าเริ่มต้น
        </button>
        {msg ? <span className="text-sm text-slate-600">{msg}</span> : null}
      </div>

      <p className="text-sm text-slate-600 m-0">
        เลือกบทบาทแล้วกำหนดสิทธิ์รายหน้า · Global = ผู้ใช้ที่ยังไม่ล็อกอิน ·
        หน้ารายละเอียดโรงเรียน / นักเรียนทุน ใช้ระดับความลับ 1–3 เพิ่มเติม ·
        ส่วนย่อยใช้ได้เมื่อหน้านั้นไม่ใช่「ไม่มีสิทธิ์」
        {normalizeRole(actorRole) !== 'super_admin'
          ? ' · Admin ไม่สามารถแก้ไขสิทธิ์ Super Admin ได้'
          : ''}
      </p>

      <div className="grid gap-4">
        {CONTENT_PAGES.map((page) => {
          const pageCell = cellOf(map, page.id, role);
          const pageOff = accessOf(pageCell) === 'none';
          return (
            <section key={page.id} className="ed-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="ed-section-title text-base m-0">{page.label}</h2>
                  {page.supportsSensitivity ? (
                    <p className="text-xs text-slate-500 m-0 mt-1">
                      รองรับระดับความลับ (ทั่วไป / ลับ / จำกัด)
                    </p>
                  ) : null}
                </div>
                <AccessControls
                  resource={page.id}
                  cell={normalizeAccessCell(pageCell)}
                  onChange={(next) => setCell(page.id, next)}
                />
              </div>

              {page.sections.length > 0 && (
                <div
                  className={`grid gap-3 border-t border-slate-100 pt-3 ${
                    pageOff ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-500 m-0">
                    ส่วนย่อยในหน้า
                    {pageOff ? ' (เปิดสิทธิ์หน้าก่อน)' : ''}
                  </p>
                  {page.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="flex flex-wrap items-start justify-between gap-2 pl-2 border-l-2 border-amber-200"
                    >
                      <span className="text-sm font-medium pt-1.5">{sec.label}</span>
                      <AccessControls
                        resource={sec.id}
                        cell={cellOf(map, sec.id, role)}
                        disabled={pageOff}
                        onChange={(next) => setCell(sec.id, next)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
