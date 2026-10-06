import Link from 'next/link';
import { ArrowRight, BookOpen, Hexagon, Map, School } from 'lucide-react';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="home-placeholder">
      {sp?.denied && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-amber-800 bg-amber-50 border-amber-200">
            ไม่มีสิทธิ์เข้าถึงหน้านี้ — กรุณาเข้าสู่ระบบด้วยบทบาทที่เหมาะสม
          </div>
        </div>
      )}

      <section className="home-placeholder__hero">
        <div className="page-shell home-placeholder__inner">
          <p className="home-placeholder__eyebrow">โครงการกองทุนการศึกษา</p>
          <h1>สร้างคนดีให้บ้านเมือง</h1>
          <p className="home-placeholder__lead">
            ระบบติดตามและพัฒนาคุณภาพโรงเรียนในโครงการกองทุนการศึกษา
            เลือกเมนูด้านบนเพื่อเริ่มสำรวจข้อมูล
          </p>
          <div className="home-placeholder__cta">
            <Link href="/about" className="ed-btn ed-btn--primary">
              เกี่ยวกับโครงการ <ArrowRight size={18} />
            </Link>
            <Link href="/strategy" className="ed-btn ed-btn--outline">
              ภาพรวม 5 กลยุทธ์ <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell home-placeholder__links">
        {[
          { href: '/about', label: 'เกี่ยวกับโครงการ', desc: 'ความเป็นมา เป้าหมาย และผู้มีส่วนร่วม', icon: BookOpen },
          { href: '/strategy', label: 'ภาพรวม 5 กลยุทธ์', desc: 'คะแนนเฉลี่ยและการกระจายสถานะ', icon: Hexagon },
          { href: '/thailand-map', label: 'แผนที่', desc: 'สำรวจโรงเรียนตามพื้นที่', icon: Map },
          { href: '/schools', label: 'โรงเรียนในความดูแล', desc: 'รายชื่อและการ์ดโรงเรียน', icon: School },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="home-placeholder__card ed-card">
            <item.icon size={22} className="text-tm-blue" />
            <strong>{item.label}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
