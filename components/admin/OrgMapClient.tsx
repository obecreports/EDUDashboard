'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import {
  ADMIN_ROLE_LABELS,
  ROLE_LABELS,
  formatPersonLabel,
  isOverseerType1,
  isOverseerType2,
  roleDisplayLabel,
  type OverseerTier,
  type SchoolFull,
  type UserRole,
} from '@/lib/types';
import { staffUnderType1, type2UnderType1 } from '@/lib/auth/province-radar';
import { domainScopeLabel } from '@/lib/auth/domain-scope';
import type { ScopeUser } from '@/lib/auth/scope';
import { exportElementToPdf } from '@/lib/scholarship/export-pdf';
import { downloadRowsAsXlsx } from '@/lib/export/xlsx-download';

function provinceScopeText(list: string[]) {
  if (!list.length) return '';
  return ` · ${domainScopeLabel(list, 'province')}`;
}

function provincesCell(list: string[]) {
  return list.length ? domainScopeLabel(list, 'province') : '';
}

type Account = {
  id: string;
  email: string;
  full_name: string;
  name_prefix?: string | null;
  role: UserRole;
  overseer_tier?: OverseerTier | null;
  reports_to: string | null;
  assigned_provinces: string[];
  assigned_districts: string[];
};

function labelOf(a: Account) {
  return (
    formatPersonLabel(a.role, a.name_prefix, a.full_name) ||
    a.full_name ||
    a.email ||
    a.id
  );
}

function toScope(a: Account): ScopeUser {
  return {
    id: a.id,
    role: a.role,
    overseer_tier: a.overseer_tier ?? null,
    assigned_provinces: a.assigned_provinces,
    assigned_districts: a.assigned_districts,
    reports_to: a.reports_to,
  };
}

export function OrgMapClient({
  accounts,
  schools = [],
}: {
  accounts: Account[];
  schools?: SchoolFull[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const directory = useMemo(() => accounts.map(toScope), [accounts]);

  const supers = useMemo(
    () =>
      accounts
        .filter((a) => a.role === 'super_overseer')
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th')),
    [accounts]
  );

  const type1 = useMemo(
    () =>
      accounts
        .filter((a) => isOverseerType1(a.role, a.overseer_tier))
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th')),
    [accounts]
  );

  const type2 = useMemo(
    () => accounts.filter((a) => isOverseerType2(a.role, a.overseer_tier)),
    [accounts]
  );

  const staff = useMemo(
    () => accounts.filter((a) => a.role === 'staff'),
    [accounts]
  );

  const covertOverseers = useMemo(
    () =>
      accounts
        .filter((a) => a.role === 'covert_overseer')
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th')),
    [accounts]
  );

  const overseerBlocks = useMemo(() => {
    return type1.map((ov) => {
      const scopeOv = toScope(ov);
      const volunteers = type2UnderType1(scopeOv, directory)
        .map((u) => accounts.find((a) => a.id === u.id)!)
        .filter(Boolean)
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));
      const staffKids = staffUnderType1(scopeOv, directory, schools)
        .map((u) => accounts.find((a) => a.id === u.id)!)
        .filter(Boolean)
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));
      return { overseer: ov, volunteers, staffKids };
    });
  }, [type1, type2, staff, directory, accounts, schools]);

  const placedVolunteerIds = useMemo(() => {
    const s = new Set<string>();
    for (const b of overseerBlocks) {
      for (const v of b.volunteers) s.add(v.id);
    }
    return s;
  }, [overseerBlocks]);

  const placedStaffIds = useMemo(() => {
    const s = new Set<string>();
    for (const b of overseerBlocks) {
      for (const st of b.staffKids) s.add(st.id);
    }
    return s;
  }, [overseerBlocks]);

  const orphanVolunteers = type2
    .filter((a) => !placedVolunteerIds.has(a.id))
    .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));

  const orphanStaff = staff
    .filter((a) => !placedStaffIds.has(a.id))
    .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));

  const exportExcel = () => {
    const rows: Record<string, string>[] = [];
    for (const so of supers) {
      rows.push({
        level: ROLE_LABELS.super_overseer,
        name: labelOf(so),
        role: so.role,
        provinces: provincesCell(so.assigned_provinces),
        parent: '',
      });
    }
    for (const { overseer, volunteers, staffKids } of overseerBlocks) {
      rows.push({
        level: ROLE_LABELS.overseer,
        name: labelOf(overseer),
        role: overseer.role,
        provinces: provincesCell(overseer.assigned_provinces),
        parent: ROLE_LABELS.super_overseer,
      });
      for (const v of volunteers) {
        rows.push({
          level: 'อาสาสมัคร',
          name: labelOf(v),
          role: roleDisplayLabel(v.role, v.overseer_tier),
          provinces: provincesCell(v.assigned_provinces),
          parent: labelOf(overseer),
        });
      }
      for (const st of staffKids) {
        rows.push({
          level: ROLE_LABELS.staff,
          name: labelOf(st),
          role: st.role,
          provinces: provincesCell(st.assigned_provinces),
          parent: labelOf(overseer),
        });
      }
    }
    for (const u of covertOverseers) {
      rows.push({
        level: ADMIN_ROLE_LABELS.covert_overseer,
        name: labelOf(u),
        role: u.role,
        provinces: provincesCell(u.assigned_provinces),
        parent: ROLE_LABELS.super_overseer,
      });
    }
    for (const v of orphanVolunteers) {
      rows.push({
        level: 'อาสาสมัคร (ยังไม่อยู่ภายใต้องคมนตรี)',
        name: labelOf(v),
        role: roleDisplayLabel(v.role, v.overseer_tier),
        provinces: provincesCell(v.assigned_provinces),
        parent: '',
      });
    }
    for (const st of orphanStaff) {
      rows.push({
        level: `${ROLE_LABELS.staff} (ยังไม่อยู่ภายใต้องคมนตรี)`,
        name: labelOf(st),
        role: st.role,
        provinces: provincesCell(st.assigned_provinces),
        parent: '',
      });
    }
    downloadRowsAsXlsx(rows, 'org-map.xlsx', 'org-map');
  };

  const exportPdf = () => {
    const el = chartRef.current;
    if (!el) return;
    setExportMsg(null);
    start(async () => {
      try {
        await exportElementToPdf(el, 'org-map');
      } catch (e) {
        setExportMsg(
          e instanceof Error ? e.message : 'สร้าง PDF ไม่สำเร็จ'
        );
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ed-btn ed-btn--outline ed-btn--sm"
          disabled={pending}
          onClick={exportPdf}
        >
          {pending ? 'กำลังสร้าง PDF…' : 'พิมพ์ PDF'}
        </button>
        <button
          type="button"
          className="ed-btn ed-btn--outline ed-btn--sm"
          onClick={exportExcel}
        >
          Export Excel
        </button>
        {exportMsg ? (
          <p className="text-sm text-amber-700 m-0">{exportMsg}</p>
        ) : null}
      </div>

      <div ref={chartRef} className="grid gap-4">
        <section className="ed-card p-4 space-y-4">
          <div>
            <h2 className="font-bold text-tm-blue m-0 text-base">
              ภาพรวมสายงาน
            </h2>
            <p className="text-sm text-slate-600 m-0 mt-1">
              {ROLE_LABELS.super_overseer} → {ROLE_LABELS.overseer} (
              {type1.length} คน) → สาขา{ROLE_LABELS.volunteer_center} /{' '}
              {ROLE_LABELS.volunteer_border} / {ROLE_LABELS.staff} ตามจังหวัดที่ซ้อนทับ
              (ดูอย่างเดียว)
            </p>
          </div>

          <div className="org-map-tree">
            <div className="org-map-tree__so space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {ROLE_LABELS.super_overseer}
              </div>
              {supers.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">
                  ยังไม่มี{ROLE_LABELS.super_overseer}
                </p>
              ) : (
                supers.map((so) => (
                  <div key={so.id}>
                    <strong>{labelOf(so)}</strong>
                  </div>
                ))
              )}
            </div>

            <ul className="org-map-tree__overseers">
              {overseerBlocks.length === 0 && (
                <li className="text-sm text-slate-500">
                  ยังไม่มี{ROLE_LABELS.overseer}
                </li>
              )}
              {overseerBlocks.map(({ overseer, volunteers, staffKids }) => (
                <li key={overseer.id} className="org-map-tree__ov">
                  <div className="org-map-tree__ov-head">
                    <strong>{labelOf(overseer)}</strong>
                    <span className="text-xs text-slate-500">
                      {ROLE_LABELS.overseer}
                      {overseer.assigned_provinces.length
                        ? provinceScopeText(overseer.assigned_provinces)
                        : ' · ยังไม่มอบหมายจังหวัด'}
                    </span>
                  </div>
                  <div className="org-map-tree__branches">
                    <div className="org-map-tree__branch">
                      <div className="org-map-tree__branch-title">
                        อาสาสมัคร ({volunteers.length})
                      </div>
                      {volunteers.length === 0 ? (
                        <p className="text-xs text-slate-400 m-0">—</p>
                      ) : (
                        <ul className="org-map-tree__names">
                          {volunteers.map((v) => (
                            <li key={v.id}>
                              {labelOf(v)}
                              <span className="text-slate-400">
                                {' '}
                                · {roleDisplayLabel(v.role, v.overseer_tier)}
                                {v.assigned_provinces.length
                                  ? provinceScopeText(v.assigned_provinces)
                                  : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="org-map-tree__branch">
                      <div className="org-map-tree__branch-title">
                        {ROLE_LABELS.staff} ({staffKids.length})
                      </div>
                      {staffKids.length === 0 ? (
                        <p className="text-xs text-slate-400 m-0">—</p>
                      ) : (
                        <ul className="org-map-tree__names">
                          {staffKids.map((st) => (
                            <li key={st.id}>{labelOf(st)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {covertOverseers.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <p className="text-sm text-slate-600 m-0">
                บทบาทเฉพาะกิจภายใต้{ROLE_LABELS.super_overseer} (ไม่แสดงในแดชบอร์ดกิจกรรม
                SO/OS)
              </p>
              <div>
                <div className="text-sm font-semibold mb-1">
                  {ADMIN_ROLE_LABELS.covert_overseer} ({covertOverseers.length})
                </div>
                <ul className="text-sm m-0 pl-5 space-y-0.5">
                  {covertOverseers.map((u) => (
                    <li key={u.id}>
                      {labelOf(u)}
                      {u.assigned_provinces.length
                        ? provinceScopeText(u.assigned_provinces)
                        : ' · ยังไม่มอบหมายจังหวัด'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {(orphanVolunteers.length > 0 || orphanStaff.length > 0) && (
          <section className="ed-card p-4 space-y-3">
            <h2 className="font-bold text-tm-blue m-0 text-base">
              ยังไม่อยู่ภายใต้องคมนตรีใด
            </h2>
            <p className="text-sm text-slate-600 m-0">
              ไม่มีจังหวัดซ้อนทับกับองคมนตรี — ตรวจสอบที่หน้ามอบหมายพื้นที่จัดการ
            </p>
            {orphanVolunteers.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">
                  อาสาสมัคร ({orphanVolunteers.length})
                </div>
                <ul className="text-sm m-0 pl-5 space-y-0.5">
                  {orphanVolunteers.map((v) => (
                    <li key={v.id}>
                      {labelOf(v)}
                      {v.assigned_provinces.length
                        ? provinceScopeText(v.assigned_provinces)
                        : ' · ยังไม่มอบหมายจังหวัด'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {orphanStaff.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">
                  {ROLE_LABELS.staff} ({orphanStaff.length})
                </div>
                <ul className="text-sm m-0 pl-5 space-y-0.5">
                  {orphanStaff.map((st) => (
                    <li key={st.id}>{labelOf(st)}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
