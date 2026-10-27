import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import {
  listReportDraftsForStaff,
  readAllSchoolExtras,
  readStoredUsers,
} from '@/lib/auth/user-store';
import { fetchReportDraftsForStaff } from '@/lib/supabase/report-drafts';
import { fetchSchools } from '@/lib/supabase/schools';
import { fetchSchoolExtrasBundle } from '@/lib/supabase/school-swot';
import {
  calendarPeers,
  isFieldRole,
  isSchoolInScope,
  toScopeDirectory,
} from '@/lib/auth/scope';
import {
  parseT2ViewType1Cookie,
  T2_VIEW_TYPE1S_COOKIE,
} from '@/lib/auth/province-radar';
import {
  formatPersonLabel,
  isOverseerType2,
  normalizeRole,
  PAGE_BANNERS,
  roleDisplayLabel,
} from '@/lib/types';
import { ReportsClient } from '@/components/reports/ReportsClient';
import { PageBanner } from '@/components/layout/PageBanner';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/reports');
  }

  const sp = await searchParams;
  const initialPersonIds = (sp.person ?? '')
    .split(/[,+]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const [schools, users] = await Promise.all([
    fetchSchools().catch(() => []),
    readStoredUsers().catch(() => []),
  ]);
  const directory = toScopeDirectory(users);
  const jar = await cookies();
  const isT2 = isOverseerType2(r, profile.overseer_tier);
  const readableOpts = isT2
    ? {
        selectedType1Ids: parseT2ViewType1Cookie(
          jar.get(T2_VIEW_TYPE1S_COOKIE)?.value
        ),
      }
    : {};
  const domainSchools = schools.filter(
    (s) =>
      r === 'super_overseer' ||
      isSchoolInScope(profile, s, directory, readableOpts)
  );

  const nameById = new Map(
    users.map((u) => [
      u.id,
      formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email ||
        u.id,
    ])
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
      return comments.map((c) => {
        const map = c.visitor_reason_map ?? {};
        const participantIds = Object.keys(map);
        return {
          id: c.id,
          school_id: String(s.school_id),
          school_name: s.school_name_th,
          province: s.province ?? '',
          district: s.district ?? '',
          school_size: String(s.school_size || ''),
          staff_id: c.staff_id,
          staff_name: nameById.get(c.staff_id) || c.staff_name,
          text: c.text,
          created_at: c.created_at,
          edited_at: c.edited_at ?? null,
          updated_at: c.updated_at ?? c.edited_at ?? null,
          updated_by: c.updated_by ?? null,
          updated_by_name: c.updated_by
            ? nameById.get(c.updated_by) || c.updated_by
            : null,
          tags: c.tags ?? [],
          image_urls: c.image_urls ?? [],
          onsite_reasons: c.onsite_reasons ?? [],
          visitor_reason_map: map,
          ops_notes: c.ops_notes ?? null,
          participants: participantIds.map((id) => ({
            id,
            name: nameById.get(id) || id,
          })),
        };
      });
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

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
      })),
      schools
    )
  );
  peerIds.add(profile.id);
  const people = users
    .filter((u) => peerIds.has(u.id))
    .map((u) => ({
      id: u.id,
      full_name:
        formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email ||
        u.id,
      role_label: roleDisplayLabel(u.role, u.overseer_tier),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.reports}
        title="รายงานกิจกรรม"
        subtitle="บันทึกความคิดเห็นหรือกิจกรรมต่างๆของโรงเรียน"
        quote="“ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้”"
      />
      <ReportsClient
        rows={rows}
        currentUserId={profile.id}
        drafts={drafts}
        people={people}
        initialPersonIds={initialPersonIds}
      />
    </div>
  );
}
