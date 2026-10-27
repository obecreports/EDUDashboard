import type { SchoolFull } from '@/lib/types';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import {
  eventHasMappedReport,
  type ReportActivityLink,
} from '@/lib/activity/complete';

/** Merge calendar bookings into school visitStatus + lastActivityAt.
 *  "visited" = มีรายงานแล้ว (school has ≥1 report, or a booking mapped to a report).
 */
export function enrichSchoolsWithVisits(
  schools: SchoolFull[],
  events: StaffCalendarEvent[],
  reports: ReportActivityLink[] = []
): SchoolFull[] {
  if (!events.length && !reports.length) return schools;

  const bySchool = new Map<string, StaffCalendarEvent[]>();
  for (const e of events) {
    const keys = new Set<string>();
    if (e.school_id) keys.add(String(e.school_id));
    for (const sid of e.school_ids ?? []) {
      if (sid) keys.add(String(sid));
    }
    for (const key of keys) {
      const list = bySchool.get(key) ?? [];
      list.push(e);
      bySchool.set(key, list);
    }
  }

  const reportSchoolIds = new Set(reports.map((r) => String(r.school_id)));

  return schools.map((s) => {
    const sid = String(s.school_id);
    const evs = bySchool.get(sid) ?? [];
    const hasReport =
      reportSchoolIds.has(sid) ||
      (reports.length > 0 &&
        evs.length > 0 &&
        evs.some((e) => eventHasMappedReport(e, reports)));
    const statusComplete = evs.some(
      (e) => e.status === 'completed' || e.status_th === 'เยี่ยมชมเสร็จสิ้น'
    );
    const planned = evs.some(
      (e) =>
        e.status === 'scheduled' ||
        e.status_th === 'นัดหมายแล้ว' ||
        (!e.status && !e.status_th)
    );

    let visitStatus: SchoolFull['visitStatus'] = s.visitStatus ?? 'never';
    if (hasReport) visitStatus = 'visited';
    else if (planned || statusComplete) visitStatus = 'planned';
    else if (!evs.length && !hasReport) return s;

    const latest = evs
      .map((e) => e.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0];

    const lastActivityAt =
      latest && (!s.lastActivityAt || latest > s.lastActivityAt.slice(0, 10))
        ? `${latest}T12:00:00.000Z`
        : s.lastActivityAt;

    return { ...s, visitStatus, lastActivityAt };
  });
}
