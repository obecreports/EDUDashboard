import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';
import { isFieldRole } from '@/lib/auth/scope';
import { normalizeRole, PAGE_BANNERS } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PageBanner } from '@/components/layout/PageBanner';
import {
  formatBudgetBaht,
  getDomainBudgetSummary,
} from '@/lib/mock/domain-budget';
import { canAccess } from '@/lib/auth/content-access';
import { readContentAccessMapStored } from '@/lib/auth/user-store';

export const dynamic = 'force-dynamic';

async function Body() {
  const { profile, isAuthenticated, role } = await getSessionProfile();
  const r = normalizeRole(role);
  if (!isAuthenticated || !profile || !isFieldRole(r)) {
    redirect('/login?next=/budget');
  }

  const acl = await readContentAccessMapStored();
  if (!canAccess(r, 'budget', 'view', acl)) {
    redirect('/home');
  }

  const budget = getDomainBudgetSummary(profile.id);

  return (
    <>
      <PageBanner
        src={PAGE_BANNERS.schools}
        title="งบประมาณ"
        subtitle="โครงการและงบสนับสนุนในขอบเขต (ข้อมูลจำลอง)"
      />
      <div className="page-shell py-6 space-y-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 m-0">
            ข้อมูลจำลอง · ยังไม่ได้เชื่อมฐานข้อมูลงบจริง
          </p>
          <Link href="/home" className="text-sm font-semibold text-tm-blue">
            ← กลับหน้าของฉัน
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="panel-card !p-4">
            <p className="text-xs font-semibold text-slate-500 m-0">จำนวนโครงการ</p>
            <p className="text-2xl font-bold text-tm-blue m-0 mt-1">
              {budget.projectCount}
            </p>
          </div>
          <div className="panel-card !p-4">
            <p className="text-xs font-semibold text-slate-500 m-0">มูลค่ารวม</p>
            <p className="text-2xl font-bold text-tm-blue m-0 mt-1">
              {formatBudgetBaht(budget.totalCost)}
            </p>
          </div>
        </div>

        <div className="panel-card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold">ปีงบประมาณ</th>
                <th className="px-4 py-3 font-semibold">รายการ / โครงการ</th>
                <th className="px-4 py-3 font-semibold">มูลค่า</th>
                <th className="px-4 py-3 font-semibold">หน่วยสนับสนุน</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {budget.projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap">{p.fiscal_year}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatBudgetBaht(p.cost)}
                  </td>
                  <td className="px-4 py-3">{p.unit}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Body />
    </Suspense>
  );
}
