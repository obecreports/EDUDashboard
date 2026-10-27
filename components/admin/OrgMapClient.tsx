'use client';

import { useMemo } from 'react';
import {
  ROLE_LABELS,
  formatPersonLabel,
  isOverseerType1,
  isOverseerType2,
  type OverseerTier,
  type SchoolFull,
  type UserRole,
} from '@/lib/types';
import { staffUnderType1, type2UnderType1 } from '@/lib/auth/province-radar';
import type { ScopeUser } from '@/lib/auth/scope';

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

  return (
    <div className="grid gap-4">
      <section className="ed-card p-4 space-y-4">
        <div>
          <h2 className="font-bold text-tm-blue m-0 text-base">
            ภาพรวมสายงาน
          </h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            {ROLE_LABELS.super_overseer} → {ROLE_LABELS.overseer} (
            {type1.length} คน) → สาขา{ROLE_LABELS.volunteer} / {ROLE_LABELS.staff}{' '}
            ตามจังหวัดที่ซ้อนทับ (ดูอย่างเดียว)
          </p>
        </div>

        {supers.length === 0 ? (
          <p className="text-sm text-slate-500 m-0">ยังไม่มี{ROLE_LABELS.super_overseer}</p>
        ) : (
          supers.map((so) => (
            <div key={so.id} className="org-map-tree">
              <div className="org-map-tree__so">
                <strong>{labelOf(so)}</strong>
                <span className="text-xs text-slate-500 ml-2">
                  {ROLE_LABELS.super_overseer}
                </span>
              </div>
              <ul className="org-map-tree__overseers">
                {overseerBlocks.length === 0 && (
                  <li className="text-sm text-slate-500">ยังไม่มี{ROLE_LABELS.overseer}</li>
                )}
                {overseerBlocks.map(({ overseer, volunteers, staffKids }) => (
                  <li key={overseer.id} className="org-map-tree__ov">
                    <div className="org-map-tree__ov-head">
                      <strong>{labelOf(overseer)}</strong>
                      <span className="text-xs text-slate-500">
                        {ROLE_LABELS.overseer}
                        {overseer.assigned_provinces.length
                          ? ` · ${overseer.assigned_provinces.join(', ')}`
                          : ' · ยังไม่มอบหมายจังหวัด'}
                      </span>
                    </div>
                    <div className="org-map-tree__branches">
                      <div className="org-map-tree__branch">
                        <div className="org-map-tree__branch-title">
                          {ROLE_LABELS.volunteer} ({volunteers.length})
                        </div>
                        {volunteers.length === 0 ? (
                          <p className="text-xs text-slate-400 m-0">—</p>
                        ) : (
                          <ul className="org-map-tree__names">
                            {volunteers.map((v) => (
                              <li key={v.id}>
                                {labelOf(v)}
                                {v.assigned_provinces.length ? (
                                  <span className="text-slate-400">
                                    {' '}
                                    · {v.assigned_provinces.join(', ')}
                                  </span>
                                ) : null}
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
          ))
        )}

        {supers.length > 1 && (
          <p className="text-xs text-slate-500 m-0">
            มี{ROLE_LABELS.super_overseer} {supers.length} คน — รายการองคมนตรีด้านบนเป็นชุดเดียวกันภายใต้ทุกรายชื่อ
          </p>
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
                {ROLE_LABELS.volunteer} ({orphanVolunteers.length})
              </div>
              <ul className="text-sm m-0 pl-5 space-y-0.5">
                {orphanVolunteers.map((v) => (
                  <li key={v.id}>
                    {labelOf(v)}
                    {v.assigned_provinces.length
                      ? ` · ${v.assigned_provinces.join(', ')}`
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
  );
}
