import type { StaffCalendarEvent } from '@/lib/auth/mock-users';

export type ReportActivityLink = {
  id: string;
  school_id: string;
  staff_id: string;
  report_date: string | null;
  calendar_event_id?: string | null;
};

/** A booking is "complete" when a report maps to the same schedule (id or school+staff+date). */
export function reportMatchesEvent(
  report: ReportActivityLink,
  event: StaffCalendarEvent
): boolean {
  if (report.calendar_event_id && report.calendar_event_id === event.id) return true;
  if (!event.school_id || !event.staff_id) return false;
  if (String(report.school_id) !== String(event.school_id)) return false;
  if (report.staff_id !== event.staff_id) return false;
  const rd = report.report_date ? report.report_date.slice(0, 10) : null;
  return Boolean(rd && rd === event.date);
}

export function eventHasMappedReport(
  event: StaffCalendarEvent,
  reports: ReportActivityLink[]
): boolean {
  return reports.some((r) => reportMatchesEvent(r, event));
}

export function countCompleteEvents(
  events: StaffCalendarEvent[],
  reports: ReportActivityLink[]
): number {
  return events.filter((e) => eventHasMappedReport(e, reports)).length;
}
