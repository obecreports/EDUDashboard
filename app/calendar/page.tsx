import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { readStoredUsers } from '@/lib/auth/user-store';
import {
  listCalendarEventsForStaffIds,
  listMyCalendarEvents,
} from '@/app/actions/visits';
import { calendarPeers, isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS, ROLE_LABELS } from '@/lib/types';
import { fetchSchools } from '@/lib/supabase/schools';
import { StaffVisitHubClient } from '@/components/staff/StaffVisitHubClient';
import { PageBanner } from '@/components/layout/PageBanner';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/calendar');
  }

  const sp = await searchParams;
  const [myEvents, schools, users] = await Promise.all([
    listMyCalendarEvents().catch(() => []),
    fetchSchools().catch(() => []),
    readStoredUsers(),
  ]);

  const peerIds = new Set(
    calendarPeers(
      profile,
      users.map((u) => ({
        id: u.id,
        role: u.role,
        assigned_provinces: u.assigned_provinces,
        assigned_districts: u.assigned_districts,
        reports_to: u.reports_to,
      }))
    )
  );

  const peerEvents = await listCalendarEventsForStaffIds([...peerIds]).catch(() => []);

  const byId = new Map<string, (typeof myEvents)[number]>();
  for (const e of [...(peerEvents ?? []), ...(myEvents ?? [])]) {
    if (peerIds.has(e.staff_id) || e.staff_id === profile.id) byId.set(e.id, e);
  }
  const visibleEvents = [...byId.values()];
  const scoped = schoolsInScope(profile, schools);
  const peerUsers = users
    .filter((u) => peerIds.has(u.id) || u.id === profile.id)
    .map((u) => ({
      id: u.id,
      full_name: u.full_name || u.email || u.id,
      role: normalizeRole(u.role),
      role_label: ROLE_LABELS[normalizeRole(u.role)],
    }));

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
    <div>
      <PageBanner
        src={PAGE_BANNERS.calendar}
        title="ปฏิทินกิจกรรม / นัดหมายลงพื้นที่"
        subtitle="ติดตามและสนับสนุนการพัฒนาโรงเรียนในโครงการกองทุนการศึกษา"
        quote="“ลงพื้นที่ เรียนรู้ รับฟัง ร่วมพัฒนา เพื่อเด็กไทยทุกคน”"
      />
      <StaffVisitHubClient
        events={visibleEvents}
        schools={schoolOpts}
        managedCount={scoped.length}
        currentUserId={profile.id}
        people={peerUsers}
        focusDate={sp.date ?? ''}
      />
    </div>
  );
}
