import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { readStoredUsers } from '@/lib/auth/user-store';
import { fetchSchools } from '@/lib/supabase/schools';
import {
  calendarPeers,
  isFieldRole,
  isSchoolActionable,
} from '@/lib/auth/scope';
import {
  formatPersonLabel,
  normalizeRole,
  PAGE_BANNERS,
} from '@/lib/types';
import { PageBanner } from '@/components/layout/PageBanner';
import { NewScheduleClient } from '@/components/calendar/NewScheduleClient';
import { fetchSiteVisitById } from '@/lib/supabase/site-visits';

export const dynamic = 'force-dynamic';

export default async function EditSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/calendar');
  }

  const sp = await searchParams;
  const eventId = sp.id?.trim() || '';
  if (!eventId) redirect('/calendar');

  const event = await fetchSiteVisitById(eventId);
  if (!event || event.staff_id !== profile.id) {
    redirect('/calendar');
  }

  const [schools, users] = await Promise.all([
    fetchSchools().catch(() => []),
    readStoredUsers().catch(() => []),
  ]);

  const domain = schools
    .filter((s) => r === 'super_overseer' || isSchoolActionable(profile, s))
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th,
      province: s.province ?? '',
      district: s.district ?? '',
      area_id: String(s.area_id || ''),
      area_name: s.area_name || '',
    }));

  const peerIds = new Set(
    calendarPeers(
      profile,
      users.map((u) => ({
        id: u.id,
        role: u.role,
        overseer_tier: u.overseer_tier ?? null,
        assigned_provinces: u.assigned_provinces,
        assigned_districts: u.assigned_districts,
        reports_to: u.reports_to,
      }))
    )
  );

  const isSo = r === 'super_overseer';
  const teammates = users
    .filter((u) => {
      if (u.disabled) return false;
      const ur = normalizeRole(u.role);
      if (!isFieldRole(ur)) return false;
      if (!(peerIds.has(u.id) || u.id === profile.id)) return false;
      if (!isSo && ur === 'super_overseer') return false;
      return true;
    })
    .map((u) => ({
      id: u.id,
      full_name:
        formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email,
      role: normalizeRole(u.role),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.calendar}
        title="แก้ไขนัดหมาย"
        subtitle="แก้ไขโรงเรียน วันที่ เหตุผล และทีมของนัดที่คุณเป็นเจ้าของ"
        quote="“ลงพื้นที่ เรียนรู้ รับฟัง ร่วมพัฒนา เพื่อเด็กไทยทุกคน”"
      />
      <NewScheduleClient
        schools={domain}
        teammates={teammates}
        currentUserId={profile.id}
        currentUserRole={r}
        mode="edit"
        initialEvent={{
          id: event.id,
          school_id: event.school_id,
          date: event.date,
          visit_reasons: event.visit_reasons,
          activity: String(event.activity),
          participant_ids: event.participant_ids,
          notes: event.notes,
        }}
      />
    </div>
  );
}
