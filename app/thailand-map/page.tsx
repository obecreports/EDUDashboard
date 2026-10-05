import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { ThailandMapClient } from '@/components/map/ThailandMapClient';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function MapBody() {
  let schools: Awaited<ReturnType<typeof fetchSchools>> = [];
  let error: string | null = null;
  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Map data load failed';
  }

  return (
    <div className="page-shell" style={{ maxWidth: 1280 }}>
      <h1 className="section-heading">แผนที่ประเทศไทย</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        คลิกจังหวัดบนแผนที่หรือจากรายละเอียดด้านข้าง · สลับมุมมองตามอำเภอ/เขตพื้นที่
        {schools.length ? ` · ${schools.length} โรงเรียน` : ''}
      </p>
      {error ? (
        <div className="panel-card text-red-700 bg-red-50">{error}</div>
      ) : (
        <ThailandMapClient schools={schools} />
      )}
    </div>
  );
}

export default function ThailandMapPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <MapBody />
    </Suspense>
  );
}
