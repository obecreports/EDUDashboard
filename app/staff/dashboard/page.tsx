import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardPen } from 'lucide-react';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { listMyCalendarEvents } from '@/app/actions/visits';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { getDayFlowerTheme } from '@/lib/theme/day-flower';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { StaffScopeMap } from '@/components/staff/StaffScopeMap';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import type { SchoolFull } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PILLAR_LABELS = ['ผู้เรียน', 'การมีส่วนร่วม', 'ครูและผู้บริหาร', 'หลักสูตร', 'โครงสร้างพื้นฐาน'];

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function meanPillars(list: SchoolFull[]): number[] {
  if (list.length === 0) return [0, 0, 0, 0, 0];
  const sums = [0, 0, 0, 0, 0];
  let n = 0;
  for (const s of list) {
    const p = s.pillarScores;
    if (!p) continue;
    sums[0] += p.learner ?? 0;
    sums[1] += p.participation ?? 0;
    sums[2] += p.teacherAdmin ?? 0;
    sums[3] += p.curriculum ?? 0;
    sums[4] += p.infrastructure ?? 0;
    n += 1;
  }
  if (n === 0) return [0, 0, 0, 0, 0];
  return sums.map((v) => v / n);
}

async function DashboardBody() {
  const { profile } = await getSessionProfile();
  const assigned = new Set(parseAreaIds(profile?.assigned_zone));
  const today = todayYmd();
  const flower = getDayFlowerTheme();

  const [schools, myAll] = await Promise.all([
    fetchSchools().catch(() => [] as SchoolFull[]),
    listMyCalendarEvents(),
  ]);

  const recent = [...myAll]
    .filter(
      (e) =>
        e.status === 'completed' || e.status_th === 'เยี่ยมชมเสร็จสิ้น' || e.date <= today
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcoming = [...myAll]
    .filter(
      (e) =>
        (e.status_th ?? 'นัดหมายแล้ว') === 'นัดหมายแล้ว' &&
        (e.status ?? 'scheduled') === 'scheduled' &&
        e.date >= today
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const scopedSchools =
    assigned.size > 0
      ? schools.filter((s) => assigned.has(String(s.area_id || '')))
      : [];

  const needingAttention = [...scopedSchools]
    .sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))
    .slice(0, 5);

  const nationalAvg = meanPillars(schools);
  const scopeAvg = meanPillars(scopedSchools);

  return (
    <div className="page-shell space-y-6">
      <header
        className={`staff-day-banner day-flower ${flower.patternClass}`}
        style={{
          backgroundColor: flower.background,
          borderColor: flower.border,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="staff-day-banner__flower-bg"
          src={flower.imageSrc}
          alt=""
          aria-hidden
          width={280}
          height={280}
          decoding="async"
        />
        <div className="staff-day-banner__content">
          <div className="staff-day-banner__text">
            <h1 className="staff-day-banner__name">
              ยินดีต้อนรับ คุณ {profile?.full_name ?? 'เจ้าหน้าที่'}
            </h1>
            <p className="staff-day-banner__scope">
              คุณมีเขตที่ต้องดูแล <strong>{assigned.size}</strong> เขต และมีโรงเรียนในสังกัด{' '}
              <strong>{scopedSchools.length}</strong> โรงเรียน
            </p>
          </div>
        </div>
      </header>

      <section className="panel-card space-y-3">
        <h2 className="section-heading text-base m-0">แผนที่โรงเรียนในเขตที่รับผิดชอบ</h2>
        <StaffScopeMap schools={scopedSchools} height={360} />
      </section>

      <section className="panel-card space-y-3">
        <h2 className="section-heading text-base m-0">เปรียบเทียบคะแนนเฉลี่ย (เขต vs ทั้งระบบ)</h2>
        {scopedSchools.length === 0 ? (
          <p className="text-slate-500 text-sm m-0">ไม่มีโรงเรียนภายใต้ความรับผิดชอบ</p>
        ) : (
          <DualRadarChart
            labels={PILLAR_LABELS}
            schoolScores={scopeAvg}
            nationalScores={nationalAvg}
            schoolLabel="เฉลี่ยเขตที่รับผิดชอบ"
            nationalLabel="เฉลี่ยทั้งระบบ"
          />
        )}
      </section>

      <div className="staff-dash-split">
        <section className="panel-card">
          <h2 className="section-heading text-base">กิจกรรมล่าสุด</h2>
          {recent.length === 0 ? (
            <p className="text-slate-500 text-sm m-0">ยังไม่มีบันทึกกิจกรรมล่าสุด</p>
          ) : (
            <ul className="space-y-2 m-0 p-0 list-none">
              {recent.map((v) => (
                <li key={v.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <strong>{v.activity}</strong>
                    <span className="cal-badge cal-badge--done">เยี่ยมชมเสร็จสิ้น</span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    {v.date}
                    {v.school_name ? ` · ${v.school_name}` : ''}
                  </div>
                  {v.notes && <div className="mt-1">{v.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-card">
          <h2 className="section-heading text-base">กิจกรรมที่ต้องทำต่อไป</h2>
          {upcoming.length === 0 ? (
            <p className="text-slate-500 text-sm m-0">
              ยังไม่มีนัดหมายถัดไป —{' '}
              <Link href="/staff/calendar" className="text-tm-blue hover:underline">
                เปิดปฏิทิน
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 m-0 p-0 list-none">
              {upcoming.map((v) => (
                <li key={v.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <strong>{v.activity}</strong>
                    <span className="cal-badge cal-badge--sched">นัดหมายแล้ว</span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    {v.date}
                    {v.school_name ? ` · ${v.school_name}` : ''}
                  </div>
                  {v.notes && <div className="mt-1">{v.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel-card">
        <h2 className="section-heading text-base mb-3">โรงเรียนที่มีคะแนนน้อย</h2>
        {!assigned.size ? (
          <p className="text-slate-500 text-sm m-0">
            มอบหมายเขตพื้นที่ในโปรไฟล์ก่อน เพื่อดูโรงเรียนคะแนนต่ำในเขตของคุณ
          </p>
        ) : needingAttention.length === 0 ? (
          <p className="text-slate-500 text-sm m-0">ไม่พบโรงเรียนในเขตที่มอบหมาย</p>
        ) : (
          <ul className="space-y-2 m-0 p-0 list-none">
            {needingAttention.map((s) => (
              <li
                key={String(s.school_id)}
                className="flex justify-between gap-2 rounded-lg border border-slate-100 p-3 text-sm"
              >
                <div>
                  <Link
                    href={`/schools/${s.school_id}`}
                    prefetch
                    className="font-medium text-tm-blue hover:underline"
                  >
                    {s.school_name_th}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {s.area_name || s.area_id} · {s.province}
                  </div>
                </div>
                <span className="font-bold text-amber-700 whitespace-nowrap">
                  {(s.overallScore ?? 0).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Link
            href="/staff/update-school"
            prefetch
            className="navbar__login"
            style={{ background: 'var(--tm-seafoam)', color: 'var(--tm-blue-deeper)' }}
          >
            <ClipboardPen size={16} />
            อัปเดตโรงเรียน
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <DashboardBody />
    </Suspense>
  );
}
