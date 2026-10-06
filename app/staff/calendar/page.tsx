import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { listMyCalendarEvents } from '@/app/actions/visits';
import { StaffVisitHubClient } from '@/components/staff/StaffVisitHubClient';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { getSessionProfile } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function CalendarBody() {
  const [{ profile }, schools, events] = await Promise.all([
    getSessionProfile(),
    fetchSchools(),
    listMyCalendarEvents(),
  ]);

  const assigned = new Set(parseAreaIds(profile?.assigned_zone));
  const scoped =
    assigned.size > 0
      ? schools.filter((s) => assigned.has(String(s.area_id || '')))
      : [];

  const schoolOpts = scoped.slice(0, 400).map((s) => ({
    id: String(s.school_id),
    name: s.school_name_th,
    area_id: String(s.area_id || ''),
    area_name: s.area_name || '',
    province: s.province || '',
    district: s.district || '',
    overallScore: s.overallScore,
    students: s.studentSummary?.totalStudents,
    teachers: s.personnelSummary?.totalPersonnel,
    size: String(s.school_size || ''),
    phone: s.phone || '',
    director: s.director_name || '',
  }));

  return (
    <StaffVisitHubClient
      events={events}
      schools={schoolOpts}
      managedCount={scoped.length}
    />
  );
}

export default function StaffCalendarPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <CalendarBody />
    </Suspense>
  );
}
