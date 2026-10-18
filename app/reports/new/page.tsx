import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { calendarPeers, isFieldRole, isSchoolActionable } from '@/lib/auth/scope';
import { formatPersonLabel, normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { NewReportClient } from '@/components/reports/NewReportClient';
import { PageBanner } from '@/components/layout/PageBanner';
import { listMyCalendarEvents } from '@/app/actions/visits';
import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { getReportDraft, readStoredUsers } from '@/lib/auth/user-store';
import { fetchReportDraft } from '@/lib/supabase/report-drafts';
import { normalizeActivity } from '@/lib/visits/labels';

export const dynamic = 'force-dynamic';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    school_id?: string;
    draft_id?: string;
    event_id?: string;
    date?: string;
  }>;
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
  const [schools, myEvents, users] = await Promise.all([
    fetchSchools().catch(() => []),
    listMyCalendarEvents().catch(() => []),
    readStoredUsers().catch(() => []),
  ]);

  const domain = schools
    .filter((s) => r === 'super_overseer' || isSchoolActionable(profile, s))
    .map((s) => ({
      id: String(s.school_id),
      name: s.school_name_th,
      province: s.province ?? '',
      district: s.district ?? '',
    }));

  const domainIds = new Set(domain.map((s) => s.id));
  const nameById = new Map(
    users.map((u) => [
      u.id,
      formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email ||
        u.id,
    ])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  const to = new Date(today);
  to.setDate(to.getDate() + 14);
  const fromStr = ymd(from);
  const toStr = ymd(to);

  type Hint = {
    event_id: string;
    school_id: string;
    school_name: string;
    date: string;
    visit_reasons: string[];
    participants: { id: string; name: string }[];
  };
  const hints: Hint[] = [];

  for (const e of myEvents) {
    const participantIds = e.participant_ids?.length
      ? e.participant_ids
      : e.staff_id
        ? [e.staff_id]
        : [];
    const isMine =
      e.staff_id === profile.id || participantIds.includes(profile.id);
    if (!isMine) continue;

    const schoolIds =
      e.school_ids?.length
        ? e.school_ids.map(String)
        : e.school_id
          ? [String(e.school_id)]
          : [];
    const inDomain = schoolIds.filter((id) => domainIds.has(id));
    if (!inDomain.length) continue;

    const primaryId = inDomain[0]!;
    const schoolName =
      e.school_name || domain.find((d) => d.id === primaryId)?.name || primaryId;
    const reasons =
      e.visit_reasons?.length
        ? e.visit_reasons.map((x) => normalizeActivity(String(x)))
        : [normalizeActivity(String(e.activity || 'เยี่ยมชมโรงเรียน'))];
    const participants = participantIds.map((id) => ({
      id,
      name: nameById.get(id) || id,
    }));

    const hint: Hint = {
      event_id: e.id,
      school_id: primaryId,
      school_name: schoolName,
      date: e.date,
      visit_reasons: reasons,
      participants,
    };

    // Suggest window ±7 / +14; always include URL event_id even outside window
    if (e.date >= fromStr && e.date <= toStr) {
      hints.push(hint);
    }
  }

  hints.sort((a, b) => b.date.localeCompare(a.date));

  let initialLinked: Hint | null = null;
  if (sp.event_id) {
    const fromList = hints.find((h) => h.event_id === sp.event_id);
    if (fromList) {
      initialLinked = fromList;
    } else {
      const e = myEvents.find((ev) => ev.id === sp.event_id);
      if (e) {
        const participantIds = e.participant_ids?.length
          ? e.participant_ids
          : e.staff_id
            ? [e.staff_id]
            : [];
        const sid =
          (e.school_id && domainIds.has(String(e.school_id))
            ? String(e.school_id)
            : (e.school_ids ?? []).map(String).find((id) => domainIds.has(id))) ||
          sp.school_id ||
          '';
        if (sid) {
          initialLinked = {
            event_id: e.id,
            school_id: sid,
            school_name:
              e.school_name || domain.find((d) => d.id === sid)?.name || sid,
            date: sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : e.date,
            visit_reasons: e.visit_reasons?.length
              ? e.visit_reasons.map((x) => normalizeActivity(String(x)))
              : [normalizeActivity(String(e.activity || 'เยี่ยมชมโรงเรียน'))],
            participants: participantIds.map((id) => ({
              id,
              name: nameById.get(id) || id,
            })),
          };
        }
      }
    }
  }

  // Ensure linked event appears in suggest list
  const scheduleHints = [...hints];
  if (initialLinked && !scheduleHints.some((h) => h.event_id === initialLinked!.event_id)) {
    scheduleHints.unshift(initialLinked);
  }

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

  const peopleOptions = users
    .filter((u) => {
      if (u.disabled) return false;
      const ur = normalizeRole(u.role);
      if (!isFieldRole(ur)) return false;
      return peerIds.has(u.id) || u.id === profile.id;
    })
    .map((u) => ({
      id: u.id,
      name:
        formatPersonLabel(u.role, u.name_prefix, u.full_name) ||
        u.full_name ||
        u.email ||
        u.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const currentUser = {
    id: profile.id,
    name:
      formatPersonLabel(profile.role, profile.name_prefix, profile.full_name) ||
      profile.full_name ||
      profile.email ||
      profile.id,
  };

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.reports}
        title="รายงานกิจกรรม"
        subtitle="เลือกจากตารางนัดเพื่อผูกกับนัดหมาย หรือสร้างรายงานอิสระจากโรงเรียน"
        quote="“ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้”"
      />
      <NewReportClient
        schools={domain}
        initialSchoolId={
          draft?.school_id || initialLinked?.school_id || sp.school_id || ''
        }
        scheduleHints={scheduleHints.slice(0, 16)}
        initialLinkedEvent={initialLinked}
        initialDraft={draft}
        peopleOptions={peopleOptions}
        currentUser={currentUser}
      />
    </div>
  );
}
