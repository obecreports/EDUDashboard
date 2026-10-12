import Link from 'next/link';
import {
  BookOpen,
  Target,
  Crown,
  Building2,
  School,
  GraduationCap,
  Users,
  MapPin,
  HeartHandshake,
  Sprout,
  Briefcase,
  Globe2,
  ArrowRight,
} from 'lucide-react';
import { PAGE_BANNERS } from '@/lib/types';

type Props = {
  generalSchools: number;
  vocationalSchools: number;
  provinces: number;
};

export function AboutProjectMockup({
  generalSchools,
  vocationalSchools,
  provinces,
}: Props) {
  return (
    <div className="about-mock">
      {/* Banner_Aboutproject — artwork includes title/copy */}
      <section className="about-mock__banner" aria-label="แบนเนอร์เกี่ยวกับโครงการ">
        <div
          className="about-mock__banner-img"
          style={{ backgroundImage: `url(${PAGE_BANNERS.about})` }}
          role="img"
          aria-label="โครงการกองทุนการศึกษา สร้างคนดีให้บ้านเมือง"
        />
        <h1 className="sr-only">โครงการกองทุนการศึกษา</h1>
      </section>

      <div className="page-shell about-mock__grid">
        <article className="about-mock__card">
          <div className="about-mock__icon">
            <BookOpen size={22} />
          </div>
          <h2>ที่มาของโครงการ</h2>
          <p>
            จากพระราชดำริของพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร
            เมื่อเดือนกุมภาพันธ์ พ.ศ. 2555 ให้ช่วยพัฒนาโรงเรียนและสร้างคนดีให้บ้านเมือง
            โดยสนับสนุนงบประมาณเพื่อพัฒนาโรงเรียน ครู และนักเรียน
          </p>
          <p>
            พระบาทสมเด็จพระเจ้าอยู่หัวได้สืบสาน รักษา และต่อยอด เพื่อสร้างรากฐานให้เยาวชนมีทัศนคติที่ถูกต้อง
            มีชีวิตที่มั่นคง และเป็นพลเมืองที่ดีของประเทศ
          </p>
        </article>

        <article className="about-mock__card">
          <div className="about-mock__icon">
            <Target size={22} />
          </div>
          <h2>วัตถุประสงค์ของโครงการ</h2>
          <ol className="about-mock__objectives">
            <li>
              <span className="about-mock__obj-icon about-mock__obj-icon--1" aria-hidden>
                <School size={18} />
              </span>
              <div>
                <strong>ด้านโรงเรียน</strong>
                <span>
                  พัฒนาโรงเรียนที่ขาดแคลน โดยเฉพาะพื้นที่ห่างไกล ให้พร้อมด้านสภาพแวดล้อมและอุปกรณ์
                </span>
              </div>
            </li>
            <li>
              <span className="about-mock__obj-icon about-mock__obj-icon--2" aria-hidden>
                <GraduationCap size={18} />
              </span>
              <div>
                <strong>ด้านครูและบุคลากร</strong>
                <span>สร้างขวัญ กำลังใจ ศักดิ์ศรีวิชาชีพ และพัฒนาทักษะทางวิชาการ</span>
              </div>
            </li>
            <li>
              <span className="about-mock__obj-icon about-mock__obj-icon--3" aria-hidden>
                <Users size={18} />
              </span>
              <div>
                <strong>ด้านนักเรียน</strong>
                <span>
                  ปลูกฝังคุณธรรม จริยธรรม วินัย ความสามัคคี และสนับสนุนการศึกษาอย่างต่อเนื่อง
                </span>
              </div>
            </li>
          </ol>
        </article>

        <article className="about-mock__card">
          <div className="about-mock__icon">
            <Crown size={22} />
          </div>
          <h2>สืบสาน รักษา ต่อยอด</h2>
          <p>
            ตามแนวพระราชดำริให้สานต่อพระราชกรณียกิจด้านการพัฒนาเยาวชน เพื่อให้มีรากฐานชีวิตที่มั่นคง
          </p>
          <div className="about-mock__values">
            {[
              { n: '1', icon: HeartHandshake, label: 'มีทัศนคติที่ถูกต้องต่อบ้านเมือง', color: '#ea580c' },
              { n: '2', icon: Sprout, label: 'มีพื้นฐานชีวิตที่มั่นคง — มีคุณธรรม', color: '#0b4da2' },
              { n: '3', icon: Briefcase, label: 'มีงานทำ และมีอาชีพ', color: '#059669' },
              { n: '4', icon: Globe2, label: 'เป็นพลเมืองที่ดี', color: '#7c3aed' },
            ].map((v) => (
              <div key={v.label} className="about-mock__value">
                <span className="about-mock__value-badge" style={{ background: v.color }}>
                  {v.n}
                </span>
                <span className="about-mock__value-icon" style={{ color: v.color, background: `${v.color}18` }}>
                  <v.icon size={16} />
                </span>
                <em>{v.label}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="about-mock__card about-mock__card--stats">
          <div className="about-mock__icon">
            <Building2 size={22} />
          </div>
          <h2>สถานศึกษาในโครงการปัจจุบัน</h2>
          <p>
            เป็นโรงเรียนต้นแบบกระจายอยู่ในกรุงเทพมหานคร ปริมณฑล และ {provinces} จังหวัดทั่วประเทศ
          </p>
          <div className="about-mock__stats">
            <div>
              <School size={22} className="text-tm-blue" />
              <strong>{generalSchools}</strong>
              <span>โรงเรียนสามัญศึกษา</span>
            </div>
            <div>
              <Building2 size={22} style={{ color: '#7c3aed' }} />
              <strong>{vocationalSchools}</strong>
              <span>วิทยาลัยอาชีวศึกษา</span>
            </div>
          </div>
          <p className="about-mock__geo">
            <MapPin size={16} /> กระจายใน กทม. ปริมณฑล และ {provinces} จังหวัดทั่วประเทศ
          </p>
          <Link href="/schools" className="ed-btn ed-btn--primary about-mock__cta">
            ดูรายชื่อโรงเรียน <ArrowRight size={16} />
          </Link>
        </article>
      </div>
    </div>
  );
}
