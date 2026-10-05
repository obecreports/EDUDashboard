import Link from 'next/link';
import {
  School,
  GraduationCap,
  UserRound,
  MapPinned,
  ArrowRight,
  Map as MapIcon,
} from 'lucide-react';
import { fetchSchools, formatFetchError } from '@/lib/supabase/schools';
import { RadarChart } from '@/components/dashboard/RadarChart';

export const dynamic = 'force-dynamic';

function qualityCategory(score: number | undefined) {
  if (score === undefined) return 'Unknown';
  if (score < 2) return 'Developing';
  if (score < 3) return 'Fair';
  if (score < 4) return 'Good';
  if (score < 5) return 'Great';
  return 'Excellent';
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { denied?: string; need?: string; role?: string };
}) {
  const params = searchParams;
  let schools: Awaited<ReturnType<typeof fetchSchools>> = [];
  let errorMsg: string | null = null;

  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    console.error('[ConED] fetchSchools failed:', e);
    errorMsg = formatFetchError(e);
  }

  const totalSchools = schools.length;
  const totalStudents = schools.reduce(
    (s, x) => s + (x.studentSummary?.totalStudents ?? 0),
    0
  );
  const totalPersonnel = schools.reduce(
    (s, x) => s + (x.personnelSummary?.totalPersonnel ?? 0),
    0
  );
  const districts = new Set(schools.map((s) => s.district).filter(Boolean)).size;
  const avgRatio = totalPersonnel > 0 ? Math.ceil(totalStudents / totalPersonnel) : 0;

  const avgPillar = {
    S: schools.reduce((s, x) => s + (x.pillarScores?.learner ?? 0), 0) / (totalSchools || 1),
    M:
      schools.reduce((s, x) => s + (x.pillarScores?.participation ?? 0), 0) /
      (totalSchools || 1),
    H:
      schools.reduce((s, x) => s + (x.pillarScores?.teacherAdmin ?? 0), 0) /
      (totalSchools || 1),
    C:
      schools.reduce((s, x) => s + (x.pillarScores?.curriculum ?? 0), 0) /
      (totalSchools || 1),
    D:
      schools.reduce((s, x) => s + (x.pillarScores?.infrastructure ?? 0), 0) /
      (totalSchools || 1),
  };
  const overall =
    (avgPillar.S + avgPillar.M + avgPillar.H + avgPillar.C + avgPillar.D) / 5;

  const provinceMap = new Map<string, number>();
  schools.forEach((s) => {
    const p = s.province || 'ไม่ระบุ';
    provinceMap.set(p, (provinceMap.get(p) ?? 0) + (s.studentSummary?.totalStudents ?? 0));
  });
  const provinceData = [...provinceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxProvince = Math.max(...provinceData.map((p) => p[1]), 1);

  if (errorMsg) {
    return (
      <div className="page-shell">
        <div className="panel-card" style={{ color: '#b91c1c', background: '#fee2e2' }}>
          โหลดข้อมูลไม่สำเร็จ: {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-10">
      {params.denied === '1' && (
        <div
          className="panel-card"
          style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#9a3412' }}
        >
          ไม่มีสิทธิ์เข้าถึงหน้านี้
          {params.need ? ` (ต้องการ: ${params.need}` : ''}
          {params.role ? ` · บทบาทปัจจุบัน: ${params.role})` : ')'}
          {' — '}กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์
        </div>
      )}

      <section>
        <h2 className="section-heading">ค่าสถิติต่างๆ</h2>
        <div className="kpi-grid">
          <article className="kpi-card">
            <div className="kpi-card__icon">
              <School size={22} />
            </div>
            <div>
              <div className="kpi-card__label">จำนวนโรงเรียน</div>
              <div className="kpi-card__value">{totalSchools.toLocaleString()}</div>
            </div>
          </article>
          <article className="kpi-card">
            <div className="kpi-card__icon kpi-card__icon--seafoam">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="kpi-card__label">จำนวนนักเรียน</div>
              <div className="kpi-card__value">{totalStudents.toLocaleString()}</div>
            </div>
          </article>
          <article className="kpi-card">
            <div className="kpi-card__icon">
              <UserRound size={22} />
            </div>
            <div>
              <div className="kpi-card__label">บุคลากร</div>
              <div className="kpi-card__value">{totalPersonnel.toLocaleString()}</div>
              <div className="kpi-card__hint">อัตราส่วน {avgRatio}:1</div>
            </div>
          </article>
          <article className="kpi-card">
            <div className="kpi-card__icon">
              <MapPinned size={22} />
            </div>
            <div>
              <div className="kpi-card__label">อำเภอที่ครอบคลุม</div>
              <div className="kpi-card__value">{districts.toLocaleString()}</div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h2 className="section-heading">ภาพรวมทุกด้าน</h2>
        <div className="panel-card grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <RadarChart
              groups={[
                { pillar: 'S', avg: avgPillar.S },
                { pillar: 'M', avg: avgPillar.M },
                { pillar: 'H', avg: avgPillar.H },
                { pillar: 'C', avg: avgPillar.C },
                { pillar: 'D', avg: avgPillar.D },
              ]}
            />
          </div>
          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--tm-blue-50)' }}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              คะแนนรวมเฉลี่ย
            </div>
            <div className="text-5xl font-black text-tm-blue">{overall.toFixed(2)}</div>
            <div className="text-sm mt-2 text-slate-600">
              ระดับ: <strong>{qualityCategory(overall)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">จำนวนนักเรียนแต่ละจังหวัด</h2>
        <div className="panel-card space-y-2">
          {provinceData.map(([province, count]) => (
            <div key={province} className="flex items-center gap-3">
              <span className="w-28 text-sm font-medium truncate">{province}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / maxProvince) * 100}%`,
                    background: 'linear-gradient(90deg, #29568f, #00c6a0)',
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-tm-blue w-16 text-right">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-heading">แผนที่ประเทศไทย</h2>
        <div
          className="panel-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, var(--tm-blue-50), var(--tm-seafoam-50))',
          }}
        >
          <div className="flex gap-3 items-start">
            <div className="kpi-card__icon">
              <MapIcon size={22} />
            </div>
            <div>
              <h3 className="font-bold text-tm-blue m-0 mb-1">สำรวจเครือข่ายบนแผนที่</h3>
              <p className="m-0 text-sm text-slate-600">
                แสดงตำแหน่งโรงเรียนและจัดกลุ่มอำเภอหรือเขตพื้นที่
              </p>
            </div>
          </div>
          <Link href="/thailand-map" className="navbar__login">
            เปิดแผนที่
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
