'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveContentAccessAction } from '@/app/actions/admin';
import {
  CONTENT_PAGES,
  DEFAULT_CONTENT_ACCESS,
  accessLevelLabelDetailed,
  accessOf,
  aclEditableRoles,
  aclRoleLabel,
  binaryAccessLabel,
  getAccessCell,
  normalizeAccessCell,
  sensitivityLevelLabel,
  tierCell,
  type AccessLevel,
  type ContentAccessCell,
  type ContentAccessMap,
  type ContentPageDef,
  type ContentResourceId,
  type TieredAccessCell,
  type VisibilityLevel,
} from '@/lib/auth/content-access';
import { normalizeRole, type UserRole } from '@/lib/types';

const VIEW_EDIT_LEVELS: AccessLevel[] = ['none', 'view', 'modify'];
const VIS_WITH_HIDDEN: VisibilityLevel[] = [0, 1, 2, 3];
const VIS_L1_L3: VisibilityLevel[] = [1, 2, 3];

function cellOf(
  map: ContentAccessMap,
  resource: ContentResourceId,
  role: UserRole
): TieredAccessCell {
  return getAccessCell(map, resource, role);
}

function binaryValue(access: AccessLevel): 'none' | 'on' {
  return access === 'none' ? 'none' : 'on';
}

function BinaryAccessSelect({
  access,
  disabled,
  storesModify,
  onChange,
}: {
  access: AccessLevel;
  disabled?: boolean;
  storesModify?: boolean;
  onChange: (next: ContentAccessCell) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      สิทธิ์
      <select
        className="form-input text-sm py-1.5 min-w-[10rem]"
        value={binaryValue(access)}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === 'none') onChange('none');
          else onChange(storesModify ? 'modify' : 'view');
        }}
      >
        <option value="none">{binaryAccessLabel('none')}</option>
        <option value="on">{binaryAccessLabel('view')}</option>
      </select>
    </label>
  );
}

function ViewEditAccessSelect({
  cell,
  disabled,
  onChange,
}: {
  cell: TieredAccessCell;
  disabled?: boolean;
  onChange: (next: ContentAccessCell) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      สิทธิ์
      <select
        className="form-input text-sm py-1.5 min-w-[10rem]"
        value={cell.access}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as AccessLevel;
          if (next === 'none') onChange(tierCell('none'));
          else if (next === 'view')
            onChange(tierCell('view', cell.viewUpTo && cell.viewUpTo > 0 ? cell.viewUpTo : 1));
          else
            onChange(
              tierCell('modify', cell.viewUpTo && cell.viewUpTo > 0 ? cell.viewUpTo : 3)
            );
        }}
      >
        {VIEW_EDIT_LEVELS.map((lv) => (
          <option key={lv} value={lv}>
            {accessLevelLabelDetailed(lv)}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisibilitySelect({
  cell,
  includeHidden,
  disabled,
  onChange,
}: {
  cell: TieredAccessCell;
  includeHidden: boolean;
  disabled?: boolean;
  onChange: (next: ContentAccessCell) => void;
}) {
  const options = includeHidden ? VIS_WITH_HIDDEN : VIS_L1_L3;
  const value = clampVis(cell.viewUpTo, includeHidden ? 0 : 1, includeHidden);

  return (
    <label className="grid gap-1 text-xs font-semibold">
      ระดับการมองเห็น
      <select
        className="form-input text-sm py-1.5 min-w-[11rem]"
        value={value}
        disabled={disabled || cell.access === 'none'}
        onChange={(e) => {
          const v = Number(e.target.value) as VisibilityLevel;
          if (cell.access === 'none') return;
          onChange(tierCell(cell.access, v));
        }}
      >
        {options.map((lv) => (
          <option key={lv} value={lv}>
            {sensitivityLevelLabel(lv)}
          </option>
        ))}
      </select>
    </label>
  );
}

function clampVis(
  v: number | undefined,
  fallback: VisibilityLevel,
  allowZero: boolean
): VisibilityLevel {
  if (v == null) return fallback;
  if (!allowZero && v === 0) return 1;
  return Math.max(0, Math.min(3, v)) as VisibilityLevel;
}

function PageAccessControls({
  page,
  cell,
  onChange,
}: {
  page: ContentPageDef;
  cell: TieredAccessCell;
  onChange: (next: ContentAccessCell) => void;
}) {
  const mode = page.accessMode ?? 'binary';
  const showVis = Boolean(page.pageVisibility);
  const includeHidden = Boolean(page.visibilityIncludesHidden);

  return (
    <div className="flex flex-wrap items-end gap-2">
      {mode === 'view_edit' ? (
        <ViewEditAccessSelect cell={cell} onChange={onChange} />
      ) : (
        <BinaryAccessSelect
          access={cell.access}
          storesModify={page.binaryStoresModify}
          onChange={(next) => {
            if (!showVis) {
              onChange(next);
              return;
            }
            // Preserve visibility when toggling binary page access
            if (typeof next === 'string') {
              if (next === 'none') onChange(tierCell('none'));
              else onChange(tierCell('view', cell.viewUpTo ?? 3));
            } else onChange(next);
          }}
        />
      )}
      {showVis && cell.access !== 'none' ? (
        <VisibilitySelect
          cell={normalizeAccessCell(cell)}
          includeHidden={includeHidden}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function ChildBinaryControls({
  access,
  disabled,
  onChange,
}: {
  access: AccessLevel;
  disabled?: boolean;
  onChange: (next: ContentAccessCell) => void;
}) {
  return (
    <BinaryAccessSelect
      access={access}
      disabled={disabled}
      onChange={onChange}
    />
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
        หน้ารายละเอียดโรงเรียน / นักเรียนทุน / ครูอัตรจ้าง ตั้งระดับการมองเห็นที่หน้าหลัก
        แล้วใช้กับทุกส่วนย่อย · ส่วนย่อยเป็นเข้าถึงได้/ไม่ได้เท่านั้น ·
        สิทธิ์แก้ไข = ระดับการมองเห็นเดียวกัน (ไม่มีแยกระดับแก้ไข)
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
                  {page.pageVisibility ? (
                    <p className="text-xs text-slate-500 m-0 mt-1">
                      ระดับการมองเห็นใช้กับทุกส่วนย่อย / ฟิลด์ในหน้านี้
                    </p>
                  ) : null}
                </div>
                <PageAccessControls
                  page={page}
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
                      <ChildBinaryControls
                        access={accessOf(cellOf(map, sec.id, role))}
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
