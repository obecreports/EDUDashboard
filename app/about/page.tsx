import { fetchSchools, formatFetchError } from '@/lib/supabase/schools';
import { AboutProjectMockup } from '@/components/landing/AboutProjectMockup';

export const revalidate = 60;

export default async function AboutPage() {
  let schools: Awaited<ReturnType<typeof fetchSchools>> = [];
  let errorMsg: string | null = null;
  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    errorMsg = formatFetchError(e);
  }

  const generalSchools = schools.length || 143;
  const provinces = new Set(schools.map((s) => s.province).filter(Boolean)).size || 35;
  const vocationalSchools = 10;

  return (
    <>
      {errorMsg && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-amber-800 bg-amber-50 text-sm">
            ใช้ตัวเลขประมาณการบางส่วน — {errorMsg}
          </div>
        </div>
      )}
      <AboutProjectMockup
        generalSchools={generalSchools}
        vocationalSchools={vocationalSchools}
        provinces={provinces}
      />
    </>
  );
}
