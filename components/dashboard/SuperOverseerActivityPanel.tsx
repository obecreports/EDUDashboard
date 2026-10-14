'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ChevronDown, School, UserRound } from 'lucide-react';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import type { UserRole } from '@/lib/types';
import { ROLE_LABELS, normalizeRole } from '@/lib/types';
import {
  countCompleteEvents,
  eventHasMappedReport,
  type ReportActivityLink,
} from '@/lib/activity/complete';
import {
  HierarchicalFilterDropdown,
  type FilterTreeNode,
} from '@/components/ui/HierarchicalFilterDropdown';

export type ActivityPerson = {
  id: string;
  full_name: string;
  role: UserRole;
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

function formatThaiMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}

function formatThaiShortDate(ymd: string) {
  if (!ymd) return '—';
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

/** 5 pastel levels from red → green by report completion rate */
function perfLevel(bookings: number, complete: number): PerfLevel {
  if (bookings <= 0) return 0;
  const pct = complete / bookings;
  if (pct < 0.2) return 0;
  if (pct < 0.4) return 1;
  if (pct < 0.6) return 2;
  if (pct < 0.8) return 3;
  return 4;
}

function perfPct(bookings: number, complete: number) {
  if (bookings <= 0) return 0;
  return Math.round((complete / bookings) * 100);
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
    <Link href={href} className="so-metric" title={`ไปโดเมนโรงเรียน · ${label}`}>
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
  const [openProvinces, setOpenProvinces] = useState<Set<string>>(new Set());
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());

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
      .map((id) => ({ id, label: formatThaiMonth(id) }));
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

  const overseers = useMemo(
    () =>
      people
        .filter((p) => normalizeRole(p.role) === 'overseer')
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'th')),
    [people]
  );

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

  /** Overseer rollup lastDate includes staff under them (in filtered months) */
  const overseerLastDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const ov of overseers) {
      const dates = [(personMetrics.get(ov.id)?.lastDate || '')];
      for (const st of staffUnder.get(ov.id) ?? []) {
        dates.push(personMetrics.get(st.id)?.lastDate || '');
      }
      map.set(ov.id, latestDate(dates));
    }
    return map;
  }, [overseers, staffUnder, personMetrics]);

  const personFilterTree = useMemo((): FilterTreeNode[] => {
    const nodes: FilterTreeNode[] = overseers.map((ov) => ({
      id: ov.id,
      label: ov.full_name,
      hint: 'Overseer',
      children: (staffUnder.get(ov.id) ?? []).map((st) => ({
        id: st.id,
        label: st.full_name,
        hint: 'Staff',
      })),
    }));
    for (const p of people) {
      if (normalizeRole(p.role) !== 'staff') continue;
      if (p.reports_to && staffUnder.has(p.reports_to)) continue;
      if (nodes.some((n) => n.id === p.id)) continue;
      nodes.push({ id: p.id, label: p.full_name, hint: 'Staff' });
    }
    return nodes;
  }, [overseers, staffUnder, people]);

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
      const leaf =
        schoolMap.get(sid) ??
        ({
          school: school ?? {
            id: sid,
            name: e.school_name || sid,
            province,
            district: school?.district || '',
            area_name: area,
          },
          bookings: 0,
          complete: 0,
          lastDate: '',
          byWho: [],
          hasActivity: false,
          level: 0,
          pct: 0,
        } satisfies SchoolLeaf);
      leaf.bookings += 1;
      leaf.hasActivity = true;
      if (!leaf.lastDate || e.date > leaf.lastDate) leaf.lastDate = e.date;
      if (eventHasMappedReport(e, filteredReports)) leaf.complete += 1;
      if (e.staff_id) {
        const name = peopleById.get(e.staff_id)?.full_name || 'ไม่ระบุ';
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
          level: perfLevel(bookings, complete),
          pct: perfPct(bookings, complete),
        });
      }
      nodes.push({
        province,
        bookings: provBookings,
        complete: provComplete,
        schoolCount,
        lastDate: latestDate(provDates),
        areas,
        level: perfLevel(provBookings, provComplete),
        pct: perfPct(provBookings, provComplete),
      });
    }
    return nodes;
  }, [schools, filteredEvents, filteredReports, schoolById, peopleById]);

  const needle = q.trim().toLowerCase();

  const filteredOverseers = useMemo(() => {
    return overseers.filter((o) => {
      if (selectedPeople.size > 0) {
        const kids = staffUnder.get(o.id) ?? [];
        const hitSelf = selectedPeople.has(o.id);
        const hitKid = kids.some((s) => selectedPeople.has(s.id));
        if (!hitSelf && !hitKid) return false;
      }
      if (!needle) return true;
      if (o.full_name.toLowerCase().includes(needle)) return true;
      return (staffUnder.get(o.id) ?? []).some((s) =>
        s.full_name.toLowerCase().includes(needle)
      );
    });
  }, [overseers, staffUnder, selectedPeople, needle]);

  const visibleStaff = (ovId: string) => {
    const kids = staffUnder.get(ovId) ?? [];
    return kids.filter((st) => {
      if (selectedPeople.size > 0) {
        // If only overseer selected, show all staff; if staff selected, show those
        const ovSelected = selectedPeople.has(ovId);
        const anyStaffSelected = kids.some((k) => selectedPeople.has(k.id));
        if (anyStaffSelected) return selectedPeople.has(st.id);
        if (ovSelected) return true;
        return selectedPeople.has(st.id);
      }
      if (!needle) return true;
      return st.full_name.toLowerCase().includes(needle);
    });
  };

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
            return {
              ...area,
              schools: schoolLeaves.length ? schoolLeaves : area.schools.filter((leaf) =>
                placeMatch(prov.province, area.area, leaf.school.id)
              ),
              bookings: schoolLeaves.length ? bookings : area.bookings,
              complete: schoolLeaves.length ? complete : area.complete,
              lastDate: schoolLeaves.length
                ? latestDate(schoolLeaves.map((s) => s.lastDate))
                : area.lastDate,
              level: schoolLeaves.length
                ? perfLevel(bookings, complete)
                : area.level,
              pct: schoolLeaves.length ? perfPct(bookings, complete) : area.pct,
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
        return {
          ...prov,
          areas: useAreas,
          bookings,
          complete,
          schoolCount: useAreas.reduce((n, a) => n + a.schools.length, 0),
          lastDate: latestDate(useAreas.map((a) => a.lastDate)),
          level: perfLevel(bookings, complete),
          pct: perfPct(bookings, complete),
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
    <section className="ed-card p-3 space-y-2 so-activity so-activity--compact">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ed-section-title text-base m-0 flex items-center gap-2">
            <Activity size={18} /> ภาพรวมกิจกรรมทั้งระบบ
          </h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            กิจกรรมครบ = นัดหมาย + รายงานที่ผูกกัน · สีพาสเทล 5 ระดับตาม % รายงานต่อนัด
          </p>
        </div>
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

      <div className="so-activity__filters">
        <MonthMultiDropdown
          label="เดือน"
          options={monthOptions}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          emptyLabel="ทุกเดือน"
        />
        <div className="score-mode-switch" role="tablist" aria-label="มุมมองกิจกรรม">
          <button
            type="button"
            className={tab === 'people' ? 'is-active' : ''}
            onClick={() => setTab('people')}
          >
            <UserRound size={14} /> ตามบุคคล
          </button>
          <button
            type="button"
            className={tab === 'schools' ? 'is-active' : ''}
            onClick={() => setTab('schools')}
          >
            <School size={14} /> ตามโรงเรียน
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
          {filteredOverseers.length === 0 ? (
            <p className="text-sm text-slate-500 m-0">ไม่พบผู้กำกับดูแลตามตัวกรอง</p>
          ) : (
            filteredOverseers.map((ov) => {
              const open = openOverseers.has(ov.id);
              const m = personMetrics.get(ov.id);
              const kids = visibleStaff(ov.id);
              const last = overseerLastDate.get(ov.id) || m?.lastDate || '';
              const level = m?.level ?? 0;
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
                        {ov.full_name}
                        <span className="so-tree__last">ล่าสุด {formatThaiShortDate(last)}</span>
                      </strong>
                      <span className="so-tree__meta">
                        {ROLE_LABELS[normalizeRole(ov.role)]} · ลูกทีม {kids.length} คน
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
                      {kids.length === 0 ? (
                        <p className="text-xs text-slate-500 px-3 py-2 m-0">ไม่มีเจ้าหน้าที่ในสาย</p>
                      ) : (
                        kids.map((st) => {
                          const sm = personMetrics.get(st.id);
                          const active = Boolean(sm?.hasActivity);
                          const sl = sm?.level ?? 0;
                          return (
                            <div
                              key={st.id}
                              className={`so-tree__row so-tree__row--leaf so-perf-row so-perf--${sl} ${
                                active ? 'so-tree__row--active' : ''
                              }`}
                            >
                              <span className="so-tree__dot" aria-hidden />
                              <div className="so-tree__main">
                                <strong>
                                  {st.full_name}
                                  <span className="so-tree__last">
                                    ล่าสุด {formatThaiShortDate(sm?.lastDate || '')}
                                  </span>
                                </strong>
                                <span className="so-tree__meta">
                                  {ROLE_LABELS[normalizeRole(st.role)]}
                                  {active
                                    ? ` · มีกิจกรรม · รายงาน ${sm?.pct ?? 0}%`
                                    : ' · ยังไม่มีกิจกรรม'}
                                </span>
                              </div>
                              <div className="so-tree__metrics">
                                <MetricLink
                                  href={schoolsHref({ person: st.id })}
                                  value={sm?.schools ?? 0}
                                  label="รร."
                                />
                                <MetricLink
                                  href={schoolsHref({ person: st.id, visit: 'planned' })}
                                  value={sm?.bookings ?? 0}
                                  label="นัด"
                                />
                                <MetricLink
                                  href={schoolsHref({ person: st.id, visit: 'visited' })}
                                  value={sm?.reportsDone ?? 0}
                                  label="รายงาน"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
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
                          ล่าสุด {formatThaiShortDate(prov.lastDate)}
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
                                    ล่าสุด {formatThaiShortDate(area.lastDate)}
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
                                          ล่าสุด {formatThaiShortDate(leaf.lastDate)}
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
    </section>
  );
}
