import type { SchoolFull } from '@/lib/types';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import {
  eventHasMappedReport,
  type ReportActivityLink,
} from '@/lib/activity/complete';

/** Merge calendar bookings into school visitStatus + lastActivityAt.
 *  "visited" prefers schedule+report mapping when reports are provided.
 */
export function enrichSchoolsWithVisits(
  schools: SchoolFull[],
  events: StaffCalendarEvent[],
  reports: ReportActivityLink[] = []
): SchoolFull[] {
  if (!events.length) return schools;

  const bySchool = new Map<string, StaffCalendarEvent[]>();
  for (const e of events) {
    if (!e.school_id) continue;
    const key = String(e.school_id);
    const list = bySchool.get(key) ?? [];
    list.push(e);
    bySchool.set(key, list);
  }

  return schools.map((s) => {
    const evs = bySchool.get(String(s.school_id));
    if (!evs?.length) return s;

    const mappedComplete =
      reports.length > 0 && evs.some((e) => eventHasMappedReport(e, reports));
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
    if (mappedComplete || statusComplete) visitStatus = 'visited';
    else if (planned) visitStatus = 'planned';

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
