import { Suspense } from 'react';
import { fetchGovDomains, fetchSchools } from '@/lib/supabase/schools';
import { SchoolListClient } from '@/components/schools/SchoolListClient';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function SchoolsBody() {
  const [schools, areas] = await Promise.all([fetchSchools(), fetchGovDomains()]);
  return (
    <div className="page-shell">
      <h1 className="section-heading">รายชื่อโรงเรียน</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        ค้นหาและกรองจาก School_Basic / Gov_Domain · แสดงหน้าละ 20 โรงเรียน
      </p>
      <SchoolListClient schools={schools} areas={areas} />
    </div>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <SchoolsBody />
    </Suspense>
  );
}
