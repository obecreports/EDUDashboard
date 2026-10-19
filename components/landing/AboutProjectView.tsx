import Link from 'next/link';
import {
  School,
  MapPinned,
  Users,
  GraduationCap,
  ArrowRight,
  HeartHandshake,
  TrendingUp,
  Sprout,
  BookOpen,
  Target,
  Landmark,
  Quote,
} from 'lucide-react';
import { PAGE_BANNERS } from '@/lib/types';
import { LANDING_PILLARS, LANDING_STRATEGIES } from '@/lib/theme/pillars-strategies';

type Props = {
  totalSchools: number;
  provinces: number;
  volunteers: number;
  totalStudents: number;
  denied?: boolean;
  errorMsg?: string | null;
};

export function AboutProjectView({
  totalSchools,
  provinces,
  volunteers,
  totalStudents,
  denied,
  errorMsg,
}: Props) {
  return (
    <div className="about-page">
      {denied && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-amber-800 bg-amber-50 border-amber-200">
            ไม่มีสิทธิ์เข้าถึงหน้านี้ — กรุณาเข้าสู่ระบบด้วยบทบาทที่เหมาะสม
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-red-700 bg-red-50">{errorMsg}</div>
        </div>
      )}

      {/* Hero — Banner_Landingpage (text baked into image) */}
      <section className="about-hero about-hero--banner" aria-label="แบนเนอร์โครงการ">
        <div className="about-hero__bg" aria-hidden>
          <div
            className="about-hero__photo about-hero__photo--full"
            style={{ backgroundImage: `url(${PAGE_BANNERS.landing})` }}
          />
        </div>
        <h1 className="sr-only">โครงการกองทุนการศึกษา</h1>
      </section>
      <div className="landing-cta-bar">
        <Link href="/about" className="ed-btn ed-btn--primary ed-btn--sm">
          เกี่ยวกับโครงการ <ArrowRight size={16} />
        </Link>
        <Link href="/schools" className="ed-btn ed-btn--outline ed-btn--sm">
          ดูโรงเรียนในโครงการ <ArrowRight size={16} />
        </Link>
      </div>

      {/* Metrics */}
      <section className="page-shell about-metrics" aria-label="สรุปตัวเลขโครงการ">
        <div className="about-metrics__grid">
          <article className="about-metric">
            <span className="about-metric__icon" style={{ background: '#DBEAFE', color: '#0B4DA2' }}>
              <School size={22} />
            </span>
            <div>
              <div className="about-metric__value">{totalSchools.toLocaleString('th-TH')}</div>
              <div className="about-metric__label">โรงเรียนในโครงการ</div>
            </div>
          </article>
          <article className="about-metric">
            <span className="about-metric__icon" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <MapPinned size={22} />
            </span>
            <div>
              <div className="about-metric__value">{provinces.toLocaleString('th-TH')}</div>
              <div className="about-metric__label">จังหวัดทั่วประเทศ</div>
            </div>
          </article>
          <article className="about-metric">
            <span className="about-metric__icon" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
              <Users size={22} />
            </span>
            <div>
              <div className="about-metric__value">{volunteers.toLocaleString('th-TH')}</div>
              <div className="about-metric__label">อาสาสมัคร</div>
            </div>
          </article>
          <article className="about-metric">
            <span className="about-metric__icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
              <GraduationCap size={22} />
            </span>
            <div>
              <div className="about-metric__value">{totalStudents.toLocaleString('th-TH')}</div>
              <div className="about-metric__label">นักเรียนในโครงการ</div>
            </div>
          </article>
          <aside className="about-quote-card">
            <Quote size={20} className="about-quote-card__mark" aria-hidden />
            <p>“การศึกษาที่ดี คือรากฐานของสังคมที่เข้มแข็ง”</p>
            <span>โครงการกองทุนการศึกษา</span>
          </aside>
        </div>
      </section>

      {/* Core 3 columns */}
      <section className="page-shell about-core" aria-label="เนื้อหาหลักโครงการ">
        {/* History */}
        <article id="history" className="about-panel">
          <header className="about-panel__head">
            <h2>
              <BookOpen size={20} aria-hidden />
              ความเป็นมาของโครงการ
            </h2>
          </header>
          <p className="about-panel__body">
            โครงการกองทุนการศึกษา จัดตั้งขึ้นเพื่อสนับสนุนการพัฒนาโรงเรียนที่มีความต้องการความช่วยเหลือเป็นพิเศษ
            โดยบูรณาการความร่วมมือจากทุกภาคส่วน เพื่อสร้างโอกาสทางการศึกษา ลดความเหลื่อมล้ำ
            และยกระดับคุณภาพการศึกษาอย่างยั่งยืน
          </p>
          <ol className="about-timeline">
            <li>
              <strong>ก.พ. 2555</strong>
              <b>จัดตั้งโครงการทางการ</b>
              <span>ในหลวง ร.9 พระราชทานทรัพย์ส่วนพระองค์ มอบองคมนตรีขับเคลื่อนงาน</span>
            </li>
            <li>
              <strong>2555–2559</strong>
              <b>ขยายผลสู่ 143 โรงเรียน</b>
              <span>คัดเลือกโรงเรียนเข้าร่วมปีละ 1 รุ่น รวม 4 รุ่น ครอบคลุมโรงเรียน สพฐ. และ สช.</span>
            </li>
            <li>
              <strong>ปัจจุบัน</strong>
              <b>ต่อยอดโมเดลคุณธรรม</b>
              <span>ประยุกต์ &quot;บางมูลนากโมเดล&quot; สร้างความเข้มแข็งร่วมกับภาคเอกชนและอาสาสมัคร</span>
            </li>
          </ol>
        </article>

        {/* Goals */}
        <article className="about-panel">
          <header className="about-panel__head">
            <h2>
              <Target size={20} aria-hidden />
              เป้าหมายของโครงการ
            </h2>
          </header>
          <div className="about-goals">
            <div className="about-goal about-goal--red">
              <HeartHandshake size={22} aria-hidden />
              <div>
                <strong>สร้างคนดี</strong>
                <p>ปลูกฝังคุณธรรม จริยธรรม และความรับผิดชอบต่อสังคม</p>
              </div>
            </div>
            <div className="about-goal about-goal--blue">
              <TrendingUp size={22} aria-hidden />
              <div>
                <strong>สร้างโอกาส</strong>
                <p>ยกระดับคุณภาพและลดความเหลื่อมล้ำทางการศึกษา</p>
              </div>
            </div>
            <div className="about-goal about-goal--green">
              <Sprout size={22} aria-hidden />
              <div>
                <strong>สร้างความเข้มแข็ง</strong>
                <p>พัฒนาครู ผู้บริหาร โรงเรียน และเครือข่าย ให้สามารถพัฒนาตนเองได้อย่างยั่งยืน</p>
              </div>
            </div>
          </div>
        </article>

        {/* 3 pillars ↔ 5 strategies */}
        <article className="about-panel about-panel--map">
          <header className="about-panel__head">
            <h2>
              <Landmark size={20} aria-hidden />
              3 เสาหลัก 5 กลยุทธ์
            </h2>
          </header>
          <div className="about-ps-map" aria-label="3 เสาหลัก และ 5 กลยุทธ์">
            <div className="about-ps-map__col about-ps-map__col--pillars">
              <p className="about-ps-map__heading">3 เสาหลัก</p>
              <ol className="about-ps-map__list">
                {LANDING_PILLARS.map((p) => (
                  <li key={p.id} className={`about-ps-map__pillar about-ps-map__pillar--${p.id}`}>
                    <span className="about-ps-map__num">{p.id}</span>
                    <span className="about-ps-map__text">{p.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="about-ps-map__col about-ps-map__col--strategies">
              <p className="about-ps-map__heading">5 กลยุทธ์</p>
              <ol className="about-ps-map__list">
                {LANDING_STRATEGIES.map((s) => (
                  <li key={s.id} className="about-ps-map__strategy">
                    <span className="about-ps-map__num about-ps-map__num--strategy">{s.id}</span>
                    <span className="about-ps-map__text">{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </section>

      {/* Stakeholders */}
      <section className="about-eco" aria-label="ผู้มีส่วนร่วม">
        <div className="page-shell about-eco__inner">
          <h2 className="about-eco__title">
            <Users size={22} aria-hidden />
            ใครมีส่วนร่วมในโครงการ
          </h2>
          <div className="about-eco__row">
            <div className="about-eco__chain">
              <div className="about-eco__box">
                หน่วยงานส่วนกลาง
                <small>(สพฐ. และหน่วยงานที่เกี่ยวข้อง)</small>
              </div>
              <span className="about-eco__arrow" aria-hidden>
                ↔
              </span>
              <div className="about-eco__box about-eco__box--accent">
                อาสาสมัครโครงการกองทุนการศึกษา
                <small>(ผู้ประสาน สนับสนุน ติดตาม และให้คำแนะนำ)</small>
              </div>
              <span className="about-eco__arrow" aria-hidden>
                ↔
              </span>
              <div className="about-eco__box">
                โรงเรียน
                <small>(schooling)</small>
              </div>
              <span className="about-eco__arrow" aria-hidden>
                ↔
              </span>
              <div className="about-eco__box">
                ชุมชน / เครือข่าย
                <small>(ท้องถิ่น เอกชน มหาวิทยาลัย ฯลฯ)</small>
              </div>
            </div>
            <aside className="about-eco__quote">
              <Quote size={18} aria-hidden />
              <p>
                “เพราะการพัฒนาโรงเรียน คือการพัฒนาคน และการพัฒนาคือการลงทุนที่คุ้มค่าที่สุด”
              </p>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
