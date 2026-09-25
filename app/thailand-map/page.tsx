import { fetchSchools } from '@/lib/supabase/schools';
import { ThailandMapClient } from '@/components/map/ThailandMapClient';

export const dynamic = 'force-dynamic';

export default async function ThailandMapPage() {
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
        จุดจาก School_Basic (lat/long) · จัดกลุ่มตามอำเภอหรือเขตพื้นที่ (Gov_Domain)
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
