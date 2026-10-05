import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { listMyCalendarEvents } from '@/app/actions/visits';
import { StaffCalendarClient } from '@/components/staff/StaffCalendarClient';
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
  // Zero-school fallback: never dump the full system school list
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
  }));

  return (
    <div className="page-shell" style={{ maxWidth: 920 }}>
      <h1 className="section-heading" style={{ fontSize: '1.75rem' }}>
        ปฏิทินลงพื้นที่
      </h1>
      <p className="text-slate-800 mt-[-0.5rem] mb-5" style={{ fontSize: '1.15rem', lineHeight: 1.55 }}>
        เลือกมุมมองวันนี้ / สัปดาห์ / เดือน แล้วกด “เพิ่มวันลงพื้นที่” เพื่อบันทึกกิจกรรม
      </p>
      <StaffCalendarClient events={events} schools={schoolOpts} />
    </div>
  );
}

export default function StaffCalendarPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <CalendarBody />
    </Suspense>
  );
}
