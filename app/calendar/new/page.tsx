import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, isSchoolInScope } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageBanner } from '@/components/layout/PageBanner';
import { NewScheduleClient } from '@/components/calendar/NewScheduleClient';

export const dynamic = 'force-dynamic';

export default async function NewSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ school_id?: string; date?: string }>;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/calendar/new');
  }

  const sp = await searchParams;
  const schools = await fetchSchools().catch(() => []);
  const domain = schools
    .filter((s) => r === 'super_overseer' || isSchoolInScope(profile, s))
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th,
      province: s.province ?? '',
      district: s.district ?? '',
      area_id: String(s.area_id || ''),
      area_name: s.area_name || '',
    }));

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.calendar}
        title="นัดหมายลงพื้นที่"
        subtitle="เลือกโรงเรียน วันที่ และกิจกรรมก่อนบันทึกลงปฏิทิน — สามารถนัดหลายรายการในวันเดียวกันได้"
        quote="“ลงพื้นที่ เรียนรู้ รับฟัง ร่วมพัฒนา เพื่อเด็กไทยทุกคน”"
      />
      <NewScheduleClient
        schools={domain}
        initialSchoolId={sp.school_id ?? ''}
        initialDate={sp.date ?? ''}
      />
    </div>
  );
}
