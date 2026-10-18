'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ChevronDown, School, UserRound } from 'lucide-react';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import type { OverseerTier, UserRole } from '@/lib/types';
import {
  ROLE_LABELS,
  effectiveOverseerTier,
  formatPersonLabel,
  isOverseerType1,
  isOverseerType2,
  normalizeRole,
  overseerTierLabel,
  roleDisplayLabel,
} from '@/lib/types';
import {
  countCompleteEvents,
  eventHasMappedReport,
  type ReportActivityLink,
} from '@/lib/activity/complete';
import {
  HierarchicalFilterDropdown,
  type FilterTreeNode,
} from '@/components/ui/HierarchicalFilterDropdown';
import { formatThaiDate, formatThaiYearMonth } from '@/lib/format/date';

export type ActivityPerson = {
  id: string;
  full_name: string;
  name_prefix?: string | null;
  role: UserRole;
  overseer_tier?: OverseerTier | null;
  reports_to: string | null;
  schoolIds: string[];
};

export type ActivitySchool = {
  id: string;
  name: string;
  province: string;
  district: string;
  area_name: string;
};

type Props = {
  events: StaffCalendarEvent[];
  people: ActivityPerson[];
  schools: ActivitySchool[];
  reports: ReportActivityLink[];
};

type PerfLevel = 0 | 1 | 2 | 3 | 4;

function schoolsHref(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `/schools?${q.toString()}`;
}

function monthKey(ymd: string) {
  return ymd.slice(0, 7);
}

/** 5 pastel levels from red → green by report completion rate */
function perfLevelFromPct(pct: number): PerfLevel {
  if (pct < 20) return 0;
  if (pct < 40) return 1;
  if (pct < 60) return 2;
  if (pct < 80) return 3;
  return 4;
}

function perfLevel(bookings: number, complete: number): PerfLevel {
  return perfLevelFromPct(perfPct(bookings, complete));
}

function perfPct(bookings: number, complete: number) {
  if (bookings <= 0) return 0;
  return Math.round((complete / bookings) * 100);
}

/**
 * Parent (gov / province) color = mean of school completion %.
 * Schools with no bookings count as 0% so 1/5 schools done ≈ 20% (not green).
 */
function rollupFromSchoolPcts(pcts: number[]): { level: PerfLevel; pct: number } {
  if (pcts.length === 0) return { level: 0, pct: 0 };
  const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  return { level: perfLevelFromPct(pct), pct };
}

function latestDate(dates: string[]) {
  return dates.filter(Boolean).sort((a, b) => b.localeCompare(a))[0] || '';
}

function MetricLink({
  href,
  value,
  label,
}: {
  href: string;
  value: number;
  label: string;
}) {
  return (
    <Link href={href} className="so-metric" title={`ไปโรงเรียนของฉัน · ${label}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </Link>
  );
}

/** Flat month picker (no hierarchy) */
function MonthMultiDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel = 'ทั้งหมด',
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const summary =
    selected.size === 0
      ? emptyLabel
      : selected.size === 1
        ? options.find((o) => selected.has(o.id))?.label || '1 เดือน'
        : `${selected.size} เดือน`;

  return (
    <div className="so-filter-dd" ref={ref}>
      <button
        type="button"
        className="so-filter-dd__btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="so-filter-dd__label">{label}</span>
        <span className="so-filter-dd__value">{summary}</span>
        <ChevronDown size={14} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="so-filter-dd__menu" role="listbox" aria-multiselectable>
          <div className="so-filter-dd__actions">
            <button type="button" onClick={() => onChange(new Set())}>
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => onChange(new Set(options.map((o) => o.id)))}
            >
              เลือกทั้งหมด
            </button>
          </div>
          <div className="so-filter-dd__list">
            {options.map((o) => (
              <label key={o.id} className="so-filter-dd__item">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(o.id)) next.delete(o.id);
                    else next.add(o.id);
                    onChange(next);
                  }}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SuperOverseerActivityPanel({ events, people, schools, reports }: Props) {
  const [tab, setTab] = useState<'people' | 'schools'>('people');
  const [q, setQ] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [openOverseers, setOpenOverseers] = useState<Set<string>>(new Set());
  const [openRoleGroups, setOpenRoleGroups] = useState<Set<string>>(new Set());
  const [openProvinces, setOpenProvinces] = useState<Set<string>>(new Set());
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.date) set.add(monthKey(e.date));
    }
    for (const r of reports) {
      if (r.report_date) set.add(monthKey(r.report_date));
    }
    // Always include current month for empty data UX
    const now = new Date();
    set.add(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );
    return [...set]
      .sort((a, b) => b.localeCompare(a))
      .map((id) => ({ id, label: formatThaiYearMonth(id) }));
  }, [events, reports]);

  const filteredEvents = useMemo(() => {
    if (selectedMonths.size === 0) return events;
    return events.filter((e) => e.date && selectedMonths.has(monthKey(e.date)));
  }, [events, selectedMonths]);

  const filteredReports = useMemo(() => {
    if (selectedMonths.size === 0) return reports;
    return reports.filter(
      (r) => r.report_date && selectedMonths.has(monthKey(r.report_date))
    );
  }, [reports, selectedMonths]);

  const eventsByStaff = useMemo(() => {
    const map = new Map<string, StaffCalendarEvent[]>();
    for (const e of filteredEvents) {
      if (!e.staff_id) continue;
      const list = map.get(e.staff_id) ?? [];
      list.push(e);
      map.set(e.staff_id, list);
    }
    return map;
  }, [filteredEvents]);

  const reportsByStaff = useMemo(() => {
    const map = new Map<string, ReportActivityLink[]>();
    for (const r of filteredReports) {
      if (!r.staff_id) continue;
      const list = map.get(r.staff_id) ?? [];
      list.push(r);
      map.set(r.staff_id, list);
    }
    return map;
  }, [filteredReports]);

  const personMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        schools: number;
        bookings: number;
        reportsDone: number;
        complete: number;
        hasActivity: boolean;
        lastDate: string;
        level: PerfLevel;
        pct: number;
      }
    >();
    for (const p of people) {
      const mine = eventsByStaff.get(p.id) ?? [];
      const myReports = reportsByStaff.get(p.id) ?? [];
      const mappedReportIds = new Set<string>();
      for (const e of mine) {
        for (const r of myReports) {
          if (eventHasMappedReport(e, [r])) mappedReportIds.add(r.id);
        }
      }
      const bookings = mine.length;
      const complete = countCompleteEvents(mine, myReports);
      map.set(p.id, {
        schools: p.schoolIds.length,
        bookings,
        reportsDone: mappedReportIds.size,
        complete,
        hasActivity: bookings > 0,
        lastDate: latestDate(mine.map((e) => e.date)),
        level: perfLevel(bookings, complete),
        pct: perfPct(bookings, complete),
      });
    }
    return map;
  }, [people, eventsByStaff, reportsByStaff]);

  const labelOf = (p: ActivityPerson) =>
    formatPersonLabel(p.role, p.name_prefix, p.full_name);

  const overseers = useMemo(
    () =>
      people
        .filter((p) => {
          const r = normalizeRole(p.role);
          return r === 'overseer' || r === 'volunteer';
        })
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th')),
    [people]
  );

  const type1Overseers = useMemo(
    () =>
      overseers.filter(
        (p) =>
          normalizeRole(p.role) === 'volunteer' ||
          isOverseerType1(p.role, p.overseer_tier)
      ),
    [overseers]
  );

  const type2Under = useMemo(() => {
    const map = new Map<string, ActivityPerson[]>();
    for (const p of overseers) {
      if (!isOverseerType2(p.role, p.overseer_tier) || !p.reports_to) continue;
      const list = map.get(p.reports_to) ?? [];
      list.push(p);
      map.set(p.reports_to, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));
      map.set(k, list);
    }
    return map;
  }, [overseers]);

  const staffUnder = useMemo(() => {
    const map = new Map<string, ActivityPerson[]>();
    for (const p of people) {
      if (normalizeRole(p.role) !== 'staff' || !p.reports_to) continue;
      const list = map.get(p.reports_to) ?? [];
      list.push(p);
      map.set(p.reports_to, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));
      map.set(k, list);
    }
    return map;
  }, [people]);

  /** Overseer rollup lastDate includes Type 2 + staff under them (in filtered months) */
  const overseerLastDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const ov of overseers) {
      const dates = [(personMetrics.get(ov.id)?.lastDate || '')];
      for (const t2 of type2Under.get(ov.id) ?? []) {
        dates.push(personMetrics.get(t2.id)?.lastDate || '');
        for (const st of staffUnder.get(t2.id) ?? []) {
          dates.push(personMetrics.get(st.id)?.lastDate || '');
        }
      }
      for (const st of staffUnder.get(ov.id) ?? []) {
        dates.push(personMetrics.get(st.id)?.lastDate || '');
      }
      map.set(ov.id, latestDate(dates));
    }
    return map;
  }, [overseers, type2Under, staffUnder, personMetrics]);

  const personFilterTree = useMemo((): FilterTreeNode[] => {
    const nestedType2 = new Set<string>();
    const nodes: FilterTreeNode[] = type1Overseers.map((ov) => {
      const children: FilterTreeNode[] = [];
      for (const t2 of type2Under.get(ov.id) ?? []) {
        nestedType2.add(t2.id);
        children.push({
          id: t2.id,
          label: labelOf(t2),
          hint: overseerTierLabel('type2'),
          children: (staffUnder.get(t2.id) ?? []).map((st) => ({
            id: st.id,
            label: labelOf(st),
            hint: 'Staff',
          })),
        });
      }
      for (const st of staffUnder.get(ov.id) ?? []) {
        children.push({
          id: st.id,
          label: labelOf(st),
          hint: 'Staff',
        });
      }
      return {
        id: ov.id,
        label: labelOf(ov),
        hint:
          normalizeRole(ov.role) === 'volunteer'
            ? ROLE_LABELS.volunteer
            : overseerTierLabel(effectiveOverseerTier(ov.role, ov.overseer_tier)),
        children,
      };
    });
    // Orphan Type 2 (no Type 1 parent in list)
    for (const p of overseers) {
      if (!isOverseerType2(p.role, p.overseer_tier) || nestedType2.has(p.id)) continue;
      nodes.push({
        id: p.id,
        label: labelOf(p),
        hint: overseerTierLabel('type2'),
        children: (staffUnder.get(p.id) ?? []).map((st) => ({
          id: st.id,
          label: labelOf(st),
          hint: 'Staff',
        })),
      });
    }
    for (const p of people) {
      if (normalizeRole(p.role) !== 'staff') continue;
      if (p.reports_to && staffUnder.has(p.reports_to)) continue;
      if (nodes.some((n) => n.id === p.id)) continue;
      nodes.push({ id: p.id, label: labelOf(p), hint: 'Staff' });
    }
    return nodes;
  }, [type1Overseers, type2Under, staffUnder, overseers, people]);

  const placeFilterTree = useMemo((): FilterTreeNode[] => {
    const byProv = new Map<string, Map<string, ActivitySchool[]>>();
    for (const s of schools) {
      const province = s.province || 'ไม่ระบุจังหวัด';
      const area = s.area_name || s.district || 'ไม่ระบุเขต';
      if (!byProv.has(province)) byProv.set(province, new Map());
      const am = byProv.get(province)!;
      if (!am.has(area)) am.set(area, []);
      am.get(area)!.push(s);
    }
    return [...byProv.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'th'))
      .map(([province, am]) => ({
        id: `p:${province}`,
        label: province,
        hint: 'จังหวัด',
        children: [...am.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'th'))
          .map(([area, list]) => ({
            id: `a:${province}||${area}`,
            label: area,
            hint: 'เขตพื้นที่',
            children: list
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, 'th'))
              .map((s) => ({
                id: `s:${s.id}`,
                label: s.name,
                hint: 'โรงเรียน',
              })),
          })),
      }));
  }, [schools]);

  const provinceTree = useMemo(() => {
    type SchoolLeaf = {
      school: ActivitySchool;
      bookings: number;
      complete: number;
      lastDate: string;
      byWho: { id: string; name: string }[];
      hasActivity: boolean;
      level: PerfLevel;
      pct: number;
    };
    type AreaNode = {
      area: string;
      bookings: number;
      complete: number;
      lastDate: string;
      schools: SchoolLeaf[];
      level: PerfLevel;
      pct: number;
    };
    type ProvNode = {
      province: string;
      bookings: number;
      complete: number;
      schoolCount: number;
      lastDate: string;
      areas: AreaNode[];
      level: PerfLevel;
      pct: number;
    };

    const byProv = new Map<string, Map<string, Map<string, SchoolLeaf>>>();

    for (const s of schools) {
      const province = s.province || 'ไม่ระบุจังหวัด';
      const area = s.area_name || s.district || 'ไม่ระบุเขต';
      if (!byProv.has(province)) byProv.set(province, new Map());
      const areaMap = byProv.get(province)!;
      if (!areaMap.has(area)) areaMap.set(area, new Map());
      areaMap.get(area)!.set(s.id, {
        school: s,
        bookings: 0,
        complete: 0,
        lastDate: '',
        byWho: [],
        hasActivity: false,
        level: 0,
        pct: 0,
      });
    }

    for (const e of filteredEvents) {
      if (!e.school_id) continue;
      const sid = String(e.school_id);
      const school = schoolById.get(sid);
      const province = school?.province || e.province || 'ไม่ระบุจังหวัด';
      const area = school?.area_name || school?.district || 'ไม่ระบุเขต';
      if (!byProv.has(province)) byProv.set(province, new Map());
      const areaMap = byProv.get(province)!;
      if (!areaMap.has(area)) areaMap.set(area, new Map());
      const schoolMap = areaMap.get(area)!;
      const leaf: SchoolLeaf =
        schoolMap.get(sid) ??
        {
          school: school ?? {
            id: sid,
            name: e.school_name || sid,
            province,
            district: '',
            area_name: area,
          },
          bookings: 0,
          complete: 0,
          lastDate: '',
          byWho: [] as { id: string; name: string }[],
          hasActivity: false,
          level: 0,
          pct: 0,
        };
      leaf.bookings += 1;
      leaf.hasActivity = true;
      if (!leaf.lastDate || e.date > leaf.lastDate) leaf.lastDate = e.date;
      if (eventHasMappedReport(e, filteredReports)) leaf.complete += 1;
      if (e.staff_id) {
        const who = peopleById.get(e.staff_id);
        const name = who
          ? labelOf(who) || 'ไม่ระบุ'
          : 'ไม่ระบุ';
        if (!leaf.byWho.some((w) => w.id === e.staff_id)) {
          leaf.byWho.push({ id: e.staff_id, name });
        }
      }
      leaf.level = perfLevel(leaf.bookings, leaf.complete);
      leaf.pct = perfPct(leaf.bookings, leaf.complete);
      schoolMap.set(sid, leaf);
    }

    const nodes: ProvNode[] = [];
    for (const [province, areaMap] of [...byProv.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], 'th')
    )) {
      const areas: AreaNode[] = [];
      let provBookings = 0;
      let provComplete = 0;
      let schoolCount = 0;
      const provDates: string[] = [];
      for (const [area, schoolMap] of [...areaMap.entries()].sort((a, b) =>
        a[0].localeCompare(b[0], 'th')
      )) {
        const schoolLeaves = [...schoolMap.values()].sort((a, b) =>
          a.school.name.localeCompare(b.school.name, 'th')
        );
        const bookings = schoolLeaves.reduce((n, s) => n + s.bookings, 0);
        const complete = schoolLeaves.reduce((n, s) => n + s.complete, 0);
        const lastDate = latestDate(schoolLeaves.map((s) => s.lastDate));
        const areaRollup = rollupFromSchoolPcts(schoolLeaves.map((s) => s.pct));
        schoolCount += schoolLeaves.length;
        provBookings += bookings;
        provComplete += complete;
        if (lastDate) provDates.push(lastDate);
        areas.push({
          area,
          bookings,
          complete,
          lastDate,
          schools: schoolLeaves,
          level: areaRollup.level,
          pct: areaRollup.pct,
        });
      }
      const allSchoolPcts = areas.flatMap((a) => a.schools.map((s) => s.pct));
      const provRollup = rollupFromSchoolPcts(allSchoolPcts);
      nodes.push({
        province,
        bookings: provBookings,
        complete: provComplete,
        schoolCount,
        lastDate: latestDate(provDates),
        areas,
        level: provRollup.level,
        pct: provRollup.pct,
      });
    }
    return nodes;
  }, [schools, filteredEvents, filteredReports, schoolById, peopleById]);

  const needle = q.trim().toLowerCase();

  const personMatches = (p: ActivityPerson) => {
    if (!needle) return true;
    return (
      p.full_name.toLowerCase().includes(needle) ||
      labelOf(p).toLowerCase().includes(needle)
    );
  };

  const visibleStaffOf = (bossId: string, ancestorsSelected: boolean) => {
    const kids = staffUnder.get(bossId) ?? [];
    return kids.filter((st) => {
      if (selectedPeople.size > 0) {
        const anyStaffSelected = kids.some((k) => selectedPeople.has(k.id));
        if (anyStaffSelected) return selectedPeople.has(st.id);
        if (ancestorsSelected || selectedPeople.has(bossId)) return true;
        return selectedPeople.has(st.id);
      }
      return personMatches(st);
    });
  };

  /**
   * Person tree sections (mirror school: province → gov → school):
   * - Type 1 root → role groups อาสาสมัคร / เจ้าหน้าที่ → people
   * - Or (no Type 1 in list): role groups at top → Type 2 / staff → staff under Type 2
   */
  const filteredPersonSections = useMemo(() => {
    const nestedType2 = new Set<string>();
    const nestedStaff = new Set<string>();

    type Section =
      | {
          kind: 'type1';
          person: ActivityPerson;
          type2: ActivityPerson[];
          staff: ActivityPerson[];
        }
      | { kind: 'role-type2'; people: ActivityPerson[] }
      | { kind: 'role-staff'; people: ActivityPerson[] };

    const sections: Section[] = [];

    for (const ov of type1Overseers) {
      const t2s = type2Under.get(ov.id) ?? [];
      const directStaff = staffUnder.get(ov.id) ?? [];
      for (const t2 of t2s) {
        nestedType2.add(t2.id);
        for (const st of staffUnder.get(t2.id) ?? []) nestedStaff.add(st.id);
      }
      for (const st of directStaff) nestedStaff.add(st.id);

      if (selectedPeople.size > 0) {
        const hitSelf = selectedPeople.has(ov.id);
        const hitT2 = t2s.some(
          (t2) =>
            selectedPeople.has(t2.id) ||
            (staffUnder.get(t2.id) ?? []).some((s) => selectedPeople.has(s.id))
        );
        const hitStaff = directStaff.some((s) => selectedPeople.has(s.id));
        if (!hitSelf && !hitT2 && !hitStaff) continue;
      }
      if (needle) {
        const hitSelf = personMatches(ov);
        const hitT2 = t2s.some(
          (t2) =>
            personMatches(t2) ||
            (staffUnder.get(t2.id) ?? []).some((s) => personMatches(s))
        );
        const hitStaff = directStaff.some((s) => personMatches(s));
        if (!hitSelf && !hitT2 && !hitStaff) continue;
      }

      const type2Visible = t2s.filter((t2) => {
        const staff = staffUnder.get(t2.id) ?? [];
        if (selectedPeople.size > 0) {
          const hitSelf = selectedPeople.has(t2.id);
          const hitStaff = staff.some((s) => selectedPeople.has(s.id));
          const parentSelected = selectedPeople.has(ov.id);
          if (!hitSelf && !hitStaff && !parentSelected) return false;
        }
        if (!needle) return true;
        return personMatches(t2) || staff.some((s) => personMatches(s));
      });
      const staffVisible = directStaff.filter((st) => {
        if (selectedPeople.size > 0) {
          const anyStaffSelected = directStaff.some((k) => selectedPeople.has(k.id));
          if (anyStaffSelected) return selectedPeople.has(st.id);
          if (selectedPeople.has(ov.id)) return true;
          return selectedPeople.has(st.id);
        }
        return personMatches(st);
      });

      sections.push({
        kind: 'type1',
        person: ov,
        type2: type2Visible,
        staff: staffVisible,
      });
    }

    const orphanType2: ActivityPerson[] = [];
    for (const p of overseers) {
      if (!isOverseerType2(p.role, p.overseer_tier) || nestedType2.has(p.id)) continue;
      const staff = staffUnder.get(p.id) ?? [];
      if (selectedPeople.size > 0) {
        const hitSelf = selectedPeople.has(p.id);
        const hitStaff = staff.some((s) => selectedPeople.has(s.id));
        if (!hitSelf && !hitStaff) continue;
      }
      if (needle && !personMatches(p) && !staff.some((s) => personMatches(s))) continue;
      for (const st of staff) nestedStaff.add(st.id);
      orphanType2.push(p);
    }
    if (orphanType2.length > 0) {
      sections.push({ kind: 'role-type2', people: orphanType2 });
    }

    const orphanStaff: ActivityPerson[] = [];
    for (const p of people) {
      if (normalizeRole(p.role) !== 'staff') continue;
      if (nestedStaff.has(p.id)) continue;
      if (p.reports_to && peopleById.has(p.reports_to)) continue;
      if (selectedPeople.size > 0 && !selectedPeople.has(p.id)) continue;
      if (needle && !personMatches(p)) continue;
      orphanStaff.push(p);
    }
    if (orphanStaff.length > 0) {
      sections.push({ kind: 'role-staff', people: orphanStaff });
    }

    return sections;
  }, [
    type1Overseers,
    type2Under,
    staffUnder,
    overseers,
    people,
    peopleById,
    selectedPeople,
    needle,
  ]);

  const placeMatch = (province: string, area: string, schoolId: string) => {
    if (selectedPlaces.size === 0) return true;
    if (selectedPlaces.has(`p:${province}`)) return true;
    if (selectedPlaces.has(`a:${province}||${area}`)) return true;
    if (selectedPlaces.has(`s:${schoolId}`)) return true;
    return false;
  };

  const filteredProvinces = useMemo(() => {
    return provinceTree
      .map((prov) => {
        const areas = prov.areas
          .map((area) => {
            const schoolLeaves = area.schools.filter((leaf) => {
              if (!placeMatch(prov.province, area.area, leaf.school.id)) return false;
              if (!needle) return true;
              return (
                leaf.school.name.toLowerCase().includes(needle) ||
                area.area.toLowerCase().includes(needle) ||
                prov.province.toLowerCase().includes(needle)
              );
            });
            if (
              selectedPlaces.size > 0 &&
              !selectedPlaces.has(`p:${prov.province}`) &&
              !selectedPlaces.has(`a:${prov.province}||${area.area}`) &&
              schoolLeaves.length === 0
            ) {
              return null;
            }
            if (needle && schoolLeaves.length === 0 && !area.area.toLowerCase().includes(needle)) {
              return null;
            }
            const bookings = schoolLeaves.reduce((n, s) => n + s.bookings, 0);
            const complete = schoolLeaves.reduce((n, s) => n + s.complete, 0);
            const visible =
              schoolLeaves.length
                ? schoolLeaves
                : area.schools.filter((leaf) =>
                    placeMatch(prov.province, area.area, leaf.school.id)
                  );
            const rollup = rollupFromSchoolPcts(visible.map((s) => s.pct));
            return {
              ...area,
              schools: visible,
              bookings: schoolLeaves.length ? bookings : area.bookings,
              complete: schoolLeaves.length ? complete : area.complete,
              lastDate: schoolLeaves.length
                ? latestDate(schoolLeaves.map((s) => s.lastDate))
                : area.lastDate,
              level: rollup.level,
              pct: rollup.pct,
            };
          })
          .filter(Boolean) as typeof prov.areas;

        if (selectedPlaces.size > 0 && areas.length === 0 && !selectedPlaces.has(`p:${prov.province}`)) {
          return null;
        }
        if (needle && areas.length === 0 && !prov.province.toLowerCase().includes(needle)) {
          return null;
        }
        if (areas.length === 0 && selectedPlaces.size === 0 && needle) return null;

        const useAreas =
          areas.length > 0
            ? areas
            : selectedPlaces.has(`p:${prov.province}`)
              ? prov.areas
              : areas;

        if (useAreas.length === 0) return null;

        const bookings = useAreas.reduce((n, a) => n + a.bookings, 0);
        const complete = useAreas.reduce((n, a) => n + a.complete, 0);
        const schoolPcts = useAreas.flatMap((a) => a.schools.map((s) => s.pct));
        const rollup = rollupFromSchoolPcts(schoolPcts);
        return {
          ...prov,
          areas: useAreas,
          bookings,
          complete,
          schoolCount: useAreas.reduce((n, a) => n + a.schools.length, 0),
          lastDate: latestDate(useAreas.map((a) => a.lastDate)),
          level: rollup.level,
          pct: rollup.pct,
        };
      })
      .filter(Boolean) as typeof provinceTree;
  }, [provinceTree, selectedPlaces, needle]);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const totalBookings = filteredEvents.length;
  const totalComplete = countCompleteEvents(filteredEvents, filteredReports);

  return (
    <section className="ed-card p-4 space-y-3 so-activity">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="so-panel-toggle"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
        >
          <h2 className="ed-section-title text-base m-0 flex items-center gap-2">
            <Activity size={18} /> ภาพรวมกิจกรรมทั้งระบบ
            <ChevronDown
              size={18}
              className={`so-panel-toggle__chevron ${isExpanded ? 'is-open' : ''}`}
            />
          </h2>
        </button>
        <div className="so-activity__kpis">
          <MetricLink
            href={schoolsHref({ status: 'all' })}
            value={schools.length}
            label="โรงเรียนทั้งหมด"
          />
          <MetricLink
            href={schoolsHref({ visit: 'planned' })}
            value={totalBookings}
            label="นัดหมาย"
          />
          <div className="so-metric so-metric--static">
            <strong>{totalComplete}</strong>
            <span>กิจกรรมครบ</span>
          </div>
        </div>
      </div>

      {isExpanded ? (
      <>
      <div className="so-activity__filters">
        <MonthMultiDropdown
          label="เดือน"
          options={monthOptions}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          emptyLabel="ทุกเดือน"
        />
        <div className="score-mode-switch so-track-switch" role="tablist" aria-label="มุมมองกิจกรรม">
          <button
            type="button"
            className={tab === 'people' ? 'is-active' : ''}
            onClick={() => setTab('people')}
          >
            <UserRound size={14} aria-hidden />
            <span>ติดตามบุคคล</span>
          </button>
          <button
            type="button"
            className={tab === 'schools' ? 'is-active' : ''}
            onClick={() => setTab('schools')}
          >
            <School size={14} aria-hidden />
            <span>ติดตามโรงเรียน</span>
          </button>
        </div>
        {tab === 'people' ? (
          <HierarchicalFilterDropdown
            label="บุคคล"
            tree={personFilterTree}
            selected={selectedPeople}
            onChange={setSelectedPeople}
            emptyLabel="ทุกคน"
          />
        ) : (
          <HierarchicalFilterDropdown
            label="พื้นที่"
            tree={placeFilterTree}
            selected={selectedPlaces}
            onChange={setSelectedPlaces}
            emptyLabel="ทุกพื้นที่"
          />
        )}
        <input
          className="form-input so-activity__search"
          placeholder="ค้นหาชื่อ / จังหวัด / โรงเรียน"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="so-perf-legend" aria-label="ระดับสีผลงาน">
        <span>ผลงานรายงาน/นัด:</span>
        {[
          [0, '0–19%'],
          [1, '20–39%'],
          [2, '40–59%'],
          [3, '60–79%'],
          [4, '80–100%'],
        ].map(([lv, text]) => (
          <span key={String(lv)} className={`so-perf-chip so-perf--${lv}`}>
            {text}
          </span>
        ))}
      </div>

      {tab === 'people' ? (
        <div className="so-tree">
          {filteredPersonSections.length === 0 ? (
            <p className="text-sm text-slate-500 m-0">ไม่พบผู้กำกับดูแลตามตัวกรอง</p>
          ) : (
            (() => {
              const rollupPeople = (list: ActivityPerson[]) => {
                const pcts = list.map((p) => personMetrics.get(p.id)?.pct ?? 0);
                const rollup = rollupFromSchoolPcts(pcts);
                const bookings = list.reduce(
                  (n, p) => n + (personMetrics.get(p.id)?.bookings ?? 0),
                  0
                );
                const reportsDone = list.reduce(
                  (n, p) => n + (personMetrics.get(p.id)?.reportsDone ?? 0),
                  0
                );
                const schools = list.reduce(
                  (n, p) => n + (personMetrics.get(p.id)?.schools ?? 0),
                  0
                );
                const last = latestDate(
                  list.map(
                    (p) =>
                      overseerLastDate.get(p.id) ||
                      personMetrics.get(p.id)?.lastDate ||
                      ''
                  )
                );
                return { ...rollup, bookings, reportsDone, schools, last };
              };

              const renderPersonLeaf = (
                person: ActivityPerson,
                indent: '' | 'indent' | 'indent2'
              ) => {
                const sm = personMetrics.get(person.id);
                const active = Boolean(sm?.hasActivity);
                const sl = sm?.level ?? 0;
                const indentClass =
                  indent === 'indent2'
                    ? 'so-tree__row--indent2'
                    : indent === 'indent'
                      ? 'so-tree__row--indent'
                      : '';
                const roleLabel = roleDisplayLabel(person.role, person.overseer_tier);
                return (
                  <div
                    key={person.id}
                    className={`so-tree__row so-tree__row--leaf ${indentClass} so-perf-row so-perf--${sl} ${
                      active ? 'so-tree__row--active' : ''
                    }`}
                  >
                    <span className="so-tree__dot" aria-hidden />
                    <div className="so-tree__main">
                      <strong>
                        {labelOf(person)}
                        <span className="so-tree__last">
                          ล่าสุด {formatThaiDate(sm?.lastDate || '')}
                        </span>
                      </strong>
                      <span className="so-tree__meta">
                        {roleLabel}
                        {active
                          ? ` · มีกิจกรรม · รายงาน ${sm?.pct ?? 0}%`
                          : ' · ยังไม่มีกิจกรรม'}
                      </span>
                    </div>
                    <div className="so-tree__metrics">
                      <MetricLink
                        href={schoolsHref({ person: person.id })}
                        value={sm?.schools ?? 0}
                        label="รร."
                      />
                      <MetricLink
                        href={schoolsHref({ person: person.id, visit: 'planned' })}
                        value={sm?.bookings ?? 0}
                        label="นัด"
                      />
                      <MetricLink
                        href={schoolsHref({ person: person.id, visit: 'visited' })}
                        value={sm?.reportsDone ?? 0}
                        label="รายงาน"
                      />
                    </div>
                  </div>
                );
              };

              /** Type 2 = gov_domain level; staff under them = school level */
              const renderType2Node = (
                t2: ActivityPerson,
                parentSelected: boolean,
                indent: '' | 'indent'
              ) => {
                const staffKids = visibleStaffOf(
                  t2.id,
                  parentSelected || selectedPeople.has(t2.id)
                );
                const m = personMetrics.get(t2.id);
                const last = overseerLastDate.get(t2.id) || m?.lastDate || '';
                const level = m?.level ?? 0;
                const roleLabel = roleDisplayLabel(t2.role, t2.overseer_tier);
                const indentClass = indent === 'indent' ? 'so-tree__row--indent' : '';
                const staffIndent = indent === 'indent' ? 'indent2' : 'indent';

                if (staffKids.length === 0) {
                  return renderPersonLeaf(t2, indent === 'indent' ? 'indent' : '');
                }

                const open = openOverseers.has(t2.id);
                return (
                  <div key={t2.id} className="so-tree__node">
                    <button
                      type="button"
                      className={`so-tree__row so-tree__row--branch ${indentClass} so-perf-row so-perf--${level}`}
                      onClick={() => toggle(openOverseers, t2.id, setOpenOverseers)}
                      aria-expanded={open}
                    >
                      <ChevronDown
                        size={16}
                        className={`so-tree__chevron ${open ? 'is-open' : ''}`}
                      />
                      <div className="so-tree__main">
                        <strong>
                          {labelOf(t2)}
                          <span className="so-tree__last">ล่าสุด {formatThaiDate(last)}</span>
                        </strong>
                        <span className="so-tree__meta">
                          {roleLabel} · ลูกทีม {staffKids.length} คน
                          {m ? ` · รายงาน ${m.pct}%` : ''}
                        </span>
                      </div>
                      <div className="so-tree__metrics" onClick={(e) => e.stopPropagation()}>
                        <MetricLink
                          href={schoolsHref({ person: t2.id })}
                          value={m?.schools ?? 0}
                          label="รร."
                        />
                        <MetricLink
                          href={schoolsHref({ person: t2.id, visit: 'planned' })}
                          value={m?.bookings ?? 0}
                          label="นัด"
                        />
                        <MetricLink
                          href={schoolsHref({ person: t2.id, visit: 'visited' })}
                          value={m?.reportsDone ?? 0}
                          label="รายงาน"
                        />
                      </div>
                    </button>
                    {open && (
                      <div className="so-tree__children">
                        {staffKids.map((st) => renderPersonLeaf(st, staffIndent))}
                      </div>
                    )}
                  </div>
                );
              };

              /** Role group = province level (อาสาสมัคร / เจ้าหน้าที่) */
              const renderRoleGroup = (
                groupKey: string,
                title: string,
                hint: string,
                members: ActivityPerson[],
                mode: 'type2' | 'staff',
                nested: boolean,
                parentSelected: boolean
              ) => {
                if (members.length === 0) return null;
                const open = openRoleGroups.has(groupKey);
                const agg = rollupPeople(members);
                const indentClass = nested ? 'so-tree__row--indent' : '';
                const childIndent = nested ? ('indent' as const) : ('' as const);

                return (
                  <div key={groupKey} className="so-tree__node">
                    <button
                      type="button"
                      className={`so-tree__row so-tree__row--branch ${indentClass} so-perf-row so-perf--${agg.level}`}
                      onClick={() => toggle(openRoleGroups, groupKey, setOpenRoleGroups)}
                      aria-expanded={open}
                    >
                      <ChevronDown
                        size={16}
                        className={`so-tree__chevron ${open ? 'is-open' : ''}`}
                      />
                      <div className="so-tree__main">
                        <strong>
                          {title}
                          <span className="so-tree__last">
                            ล่าสุด {formatThaiDate(agg.last)}
                          </span>
                        </strong>
                        <span className="so-tree__meta">
                          {hint} · {members.length} คน · รายงาน {agg.pct}%
                        </span>
                      </div>
                      <div className="so-tree__metrics" onClick={(e) => e.stopPropagation()}>
                        <span className="so-metric so-metric--static">
                          <strong>{agg.schools}</strong>
                          <span>รร.</span>
                        </span>
                        <span className="so-metric so-metric--static">
                          <strong>{agg.bookings}</strong>
                          <span>นัด</span>
                        </span>
                        <span className="so-metric so-metric--static">
                          <strong>{agg.reportsDone}</strong>
                          <span>รายงาน</span>
                        </span>
                      </div>
                    </button>
                    {open && (
                      <div className="so-tree__children">
                        {mode === 'type2'
                          ? members.map((t2) =>
                              renderType2Node(t2, parentSelected, childIndent)
                            )
                          : members.map((st) =>
                              renderPersonLeaf(
                                st,
                                nested ? 'indent2' : 'indent'
                              )
                            )}
                      </div>
                    )}
                  </div>
                );
              };

              return filteredPersonSections.map((section) => {
                if (section.kind === 'role-type2') {
                  return renderRoleGroup(
                    'role:type2',
                    ROLE_LABELS.volunteer,
                    'กลุ่มอาสาสมัคร (Type 2)',
                    section.people,
                    'type2',
                    false,
                    false
                  );
                }
                if (section.kind === 'role-staff') {
                  return renderRoleGroup(
                    'role:staff',
                    ROLE_LABELS.staff,
                    'กลุ่มเจ้าหน้าที่',
                    section.people,
                    'staff',
                    false,
                    false
                  );
                }

                const ov = section.person;
                const open = openOverseers.has(ov.id);
                const m = personMetrics.get(ov.id);
                const teamCount = section.type2.length + section.staff.length;
                const last = overseerLastDate.get(ov.id) || m?.lastDate || '';
                const level = m?.level ?? 0;
                const roleLabel = roleDisplayLabel(ov.role, ov.overseer_tier);
                const parentSelected = selectedPeople.has(ov.id);

                return (
                  <div key={ov.id} className="so-tree__node">
                    <button
                      type="button"
                      className={`so-tree__row so-tree__row--branch so-perf-row so-perf--${level}`}
                      onClick={() => toggle(openOverseers, ov.id, setOpenOverseers)}
                      aria-expanded={open}
                    >
                      <ChevronDown
                        size={16}
                        className={`so-tree__chevron ${open ? 'is-open' : ''}`}
                      />
                      <div className="so-tree__main">
                        <strong>
                          {labelOf(ov)}
                          <span className="so-tree__last">ล่าสุด {formatThaiDate(last)}</span>
                        </strong>
                        <span className="so-tree__meta">
                          {roleLabel} · ลูกทีม {teamCount} คน
                          {m ? ` · รายงาน ${m.pct}%` : ''}
                        </span>
                      </div>
                      <div className="so-tree__metrics" onClick={(e) => e.stopPropagation()}>
                        <MetricLink
                          href={schoolsHref({ person: ov.id })}
                          value={m?.schools ?? 0}
                          label="รร."
                        />
                        <MetricLink
                          href={schoolsHref({ person: ov.id, visit: 'planned' })}
                          value={m?.bookings ?? 0}
                          label="นัด"
                        />
                        <MetricLink
                          href={schoolsHref({ person: ov.id, visit: 'visited' })}
                          value={m?.reportsDone ?? 0}
                          label="รายงาน"
                        />
                      </div>
                    </button>
                    {open && (
                      <div className="so-tree__children">
                        {teamCount === 0 ? (
                          <p className="text-xs text-slate-500 px-3 py-2 m-0">
                            ไม่มีลูกทีมในสาย
                          </p>
                        ) : (
                          <>
                            {renderRoleGroup(
                              `role:type2:${ov.id}`,
                              ROLE_LABELS.volunteer,
                              'กลุ่มอาสาสมัคร (Type 2)',
                              section.type2,
                              'type2',
                              true,
                              parentSelected
                            )}
                            {renderRoleGroup(
                              `role:staff:${ov.id}`,
                              ROLE_LABELS.staff,
                              'กลุ่มเจ้าหน้าที่',
                              section.staff,
                              'staff',
                              true,
                              parentSelected
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>
      ) : (
        <div className="so-tree">
          {filteredProvinces.length === 0 ? (
            <p className="text-sm text-slate-500 m-0">ไม่พบข้อมูลตามตัวกรอง</p>
          ) : (
            filteredProvinces.map((prov) => {
              const pOpen = openProvinces.has(prov.province);
              return (
                <div key={prov.province} className="so-tree__node">
                  <button
                    type="button"
                    className={`so-tree__row so-tree__row--branch so-perf-row so-perf--${prov.level}`}
                    onClick={() => toggle(openProvinces, prov.province, setOpenProvinces)}
                    aria-expanded={pOpen}
                  >
                    <ChevronDown
                      size={16}
                      className={`so-tree__chevron ${pOpen ? 'is-open' : ''}`}
                    />
                    <div className="so-tree__main">
                      <strong>
                        {prov.province}
                        <span className="so-tree__last">
                          ล่าสุด {formatThaiDate(prov.lastDate)}
                        </span>
                      </strong>
                      <span className="so-tree__meta">
                        {prov.areas.length} เขต · {prov.schoolCount} รร. · รายงาน {prov.pct}%
                      </span>
                    </div>
                    <div className="so-tree__metrics" onClick={(e) => e.stopPropagation()}>
                      <MetricLink
                        href={schoolsHref({ province: prov.province })}
                        value={prov.schoolCount}
                        label="รร."
                      />
                      <MetricLink
                        href={schoolsHref({ province: prov.province, visit: 'planned' })}
                        value={prov.bookings}
                        label="นัด"
                      />
                      <MetricLink
                        href={schoolsHref({ province: prov.province, visit: 'visited' })}
                        value={prov.complete}
                        label="ครบ"
                      />
                    </div>
                  </button>
                  {pOpen && (
                    <div className="so-tree__children">
                      {prov.areas.map((area) => {
                        const areaKey = `${prov.province}||${area.area}`;
                        const aOpen = openAreas.has(areaKey);
                        return (
                          <div key={areaKey} className="so-tree__node">
                            <button
                              type="button"
                              className={`so-tree__row so-tree__row--branch so-tree__row--indent so-perf-row so-perf--${area.level}`}
                              onClick={() => toggle(openAreas, areaKey, setOpenAreas)}
                              aria-expanded={aOpen}
                            >
                              <ChevronDown
                                size={16}
                                className={`so-tree__chevron ${aOpen ? 'is-open' : ''}`}
                              />
                              <div className="so-tree__main">
                                <strong>
                                  {area.area}
                                  <span className="so-tree__last">
                                    ล่าสุด {formatThaiDate(area.lastDate)}
                                  </span>
                                </strong>
                                <span className="so-tree__meta">
                                  เขตพื้นที่ · {area.schools.length} รร. · รายงาน {area.pct}%
                                </span>
                              </div>
                              <div
                                className="so-tree__metrics"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MetricLink
                                  href={schoolsHref({
                                    province: prov.province,
                                    area: area.area,
                                  })}
                                  value={area.schools.length}
                                  label="รร."
                                />
                                <MetricLink
                                  href={schoolsHref({
                                    province: prov.province,
                                    area: area.area,
                                    visit: 'planned',
                                  })}
                                  value={area.bookings}
                                  label="นัด"
                                />
                                <MetricLink
                                  href={schoolsHref({
                                    province: prov.province,
                                    area: area.area,
                                    visit: 'visited',
                                  })}
                                  value={area.complete}
                                  label="ครบ"
                                />
                              </div>
                            </button>
                            {aOpen && (
                              <div className="so-tree__children">
                                {area.schools.map((leaf) => (
                                  <div
                                    key={leaf.school.id}
                                    className={`so-tree__row so-tree__row--leaf so-tree__row--indent2 so-perf-row so-perf--${leaf.level} ${
                                      leaf.hasActivity ? 'so-tree__row--active' : ''
                                    }`}
                                  >
                                    <span className="so-tree__dot" aria-hidden />
                                    <div className="so-tree__main">
                                      <strong>
                                        <Link
                                          href={`/schools/${leaf.school.id}`}
                                          className="hover:underline"
                                        >
                                          {leaf.school.name}
                                        </Link>
                                        <span className="so-tree__last">
                                          ล่าสุด {formatThaiDate(leaf.lastDate)}
                                        </span>
                                      </strong>
                                      <span className="so-tree__meta">
                                        {leaf.hasActivity
                                          ? `โดย ${leaf.byWho.map((w) => w.name).join(', ')} · รายงาน ${leaf.pct}%`
                                          : 'ยังไม่มีกิจกรรม'}
                                      </span>
                                    </div>
                                    <div className="so-tree__metrics">
                                      <MetricLink
                                        href={schoolsHref({ q: leaf.school.name })}
                                        value={leaf.bookings}
                                        label="นัด"
                                      />
                                      <span className="so-metric so-metric--static">
                                        <strong>{leaf.complete}</strong>
                                        <span>ครบ</span>
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      </>
      ) : null}
    </section>
  );
}
