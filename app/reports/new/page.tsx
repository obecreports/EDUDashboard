import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, isSchoolInScope } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { NewReportClient } from '@/components/reports/NewReportClient';
import { PageBanner } from '@/components/layout/PageBanner';
import { listMyCalendarEvents } from '@/app/actions/visits';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { getReportDraft } from '@/lib/auth/user-store';
import { fetchReportDraft } from '@/lib/supabase/report-drafts';

export const dynamic = 'force-dynamic';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ school_id?: string; draft_id?: string }>;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/reports/new');
  }

  const sp = await searchParams;
  const draft = sp.draft_id
    ? isDbOnlyMode()
      ? await fetchReportDraft(sp.draft_id, profile.id)
      : await getReportDraft(sp.draft_id, profile.id)
    : null;
  const [schools, myEvents] = await Promise.all([
    fetchSchools().catch(() => []),
    listMyCalendarEvents().catch(() => []),
  ]);

  const domain = schools
    .filter((s) => r === 'super_overseer' || isSchoolInScope(profile, s))
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th,
      province: s.province ?? '',
      district: s.district ?? '',
    }));

  const domainIds = new Set(domain.map((s) => s.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  const to = new Date(today);
  to.setDate(to.getDate() + 7);
  const fromStr = ymd(from);
  const toStr = ymd(to);

  // Suggest only schools from the current user's own schedule (±7 days)
  const bySchool = new Map<string, { school_id: string; school_name: string; date: string }>();
  for (const e of myEvents) {
    if (e.staff_id !== profile.id) continue;
    if (!e.school_id || !domainIds.has(String(e.school_id))) continue;
    if (e.date < fromStr || e.date > toStr) continue;
    const key = String(e.school_id);
    const prev = bySchool.get(key);
    if (!prev || e.date < prev.date) {
      bySchool.set(key, {
        school_id: key,
        school_name: e.school_name || domain.find((d) => d.id === key)?.name || key,
        date: e.date,
      });
    }
  }

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.reports}
        title="รายงานกิจกรรม / ความคิดเห็น"
        subtitle="บันทึกความคิดเห็นหรือกิจกรรมต่างๆของโรงเรียน"
        quote="“ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้”"
      />
      <NewReportClient
        schools={domain}
        initialSchoolId={draft?.school_id || sp.school_id || ''}
        scheduleHints={[...bySchool.values()].slice(0, 12)}
        initialDraft={draft}
      />
    </div>
  );
}
