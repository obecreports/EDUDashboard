import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { listReportDraftsForStaff, readAllSchoolExtras } from '@/lib/auth/user-store';
import { fetchReportDraftsForStaff } from '@/lib/supabase/report-drafts';
import { fetchSchools } from '@/lib/supabase/schools';
import { fetchSchoolExtrasBundle } from '@/lib/supabase/school-swot';
import { isFieldRole, isSchoolInScope } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { ReportsClient } from '@/components/reports/ReportsClient';
import { PageBanner } from '@/components/layout/PageBanner';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/reports');
  }

  const schools = await fetchSchools().catch(() => []);
  const domainSchools = schools.filter(
    (s) => r === 'super_overseer' || isSchoolInScope(profile, s)
  );

  const emptyExtras: Awaited<ReturnType<typeof fetchSchoolExtrasBundle>> = {};
  const [extrasMap, drafts] = await Promise.all([
    isDbOnlyMode()
      ? fetchSchoolExtrasBundle(domainSchools.map((s) => s.school_id)).catch(() => emptyExtras)
      : readAllSchoolExtras(),
    isDbOnlyMode()
      ? fetchReportDraftsForStaff(profile.id)
      : listReportDraftsForStaff(profile.id),
  ]);

  const rows = domainSchools
    .flatMap((s) => {
      const comments = extrasMap[String(s.school_id)]?.comments ?? [];
      return comments.map((c) => ({
        id: c.id,
        school_id: String(s.school_id),
        school_name: s.school_name_th,
        province: s.province ?? '',
        district: s.district ?? '',
        school_size: String(s.school_size || ''),
        staff_id: c.staff_id,
        staff_name: c.staff_name,
        text: c.text,
        created_at: c.created_at,
        edited_at: c.edited_at ?? null,
        tags: c.tags ?? [],
        image_urls: c.image_urls ?? [],
      }));
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.reports}
        title="รายงานกิจกรรม"
        subtitle="บันทึกความคิดเห็นหรือกิจกรรมต่างๆของโรงเรียน"
        quote="“ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้”"
      />
      <ReportsClient rows={rows} currentUserId={profile.id} drafts={drafts} />
    </div>
  );
}
