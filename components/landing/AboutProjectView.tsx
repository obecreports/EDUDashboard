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
  UserRound,
  Settings2,
  Handshake,
  BookOpen,
  Target,
  Landmark,
  Quote,
} from 'lucide-react';
import { STRATEGY_LABELS } from '@/lib/theme/status';
import { PAGE_BANNERS } from '@/lib/types';

type Props = {
  totalSchools: number;
  provinces: number;
  volunteers: number;
  totalStudents: number;
  denied?: boolean;
  errorMsg?: string | null;
};

const STRATEGY_ICONS = [GraduationCap, Handshake, Users, BookOpen, School] as const;

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

      {/* Hero */}
      <section className="about-hero" aria-label="แบนเนอร์โครงการ">
        <div className="about-hero__bg" aria-hidden>
          <div
            className="about-hero__photo about-hero__photo--full"
            style={{ backgroundImage: `url(${PAGE_BANNERS.about})` }}
          />
          <div className="about-hero__wash" />
        </div>

        <p className="about-hero__side about-hero__side--left" aria-hidden>
          เด็กไทย · โรงเรียนดี · สังคมดี · อนาคตดี
        </p>
        <p className="about-hero__side about-hero__side--right" aria-hidden>
          โอกาส · เริ่มต้นได้ที่นี่ · โรงเรียน คือ ความหวังของชุมชน
        </p>

        <div className="about-hero__content">
          <h1>โครงการกองทุนการศึกษา</h1>
          <p className="about-hero__tagline">“สร้างคนดีให้บ้านเมือง”</p>
          <p className="about-hero__sub">
            พัฒนาคุณภาพการศึกษาอย่างเป็นระบบและยั่งยืน
            <br />
            ร่วมกันสร้างโอกาสทางการศึกษา เพื่อเด็กไทยทุกคน
          </p>
          <div className="about-hero__cta">
            <a href="#history" className="ed-btn ed-btn--primary">
              รู้จักโครงการ <ArrowRight size={18} />
            </a>
            <Link href="/schools" className="ed-btn ed-btn--outline">
              ดูโรงเรียนในโครงการ <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

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
            <a href="#history" className="about-panel__link">
              อ่านรายละเอียดทั้งหมด <ArrowRight size={14} />
            </a>
          </header>
          <p className="about-panel__body">
            โครงการกองทุนการศึกษา จัดตั้งขึ้นเพื่อสนับสนุนการพัฒนาโรงเรียนที่มีความต้องการความช่วยเหลือเป็นพิเศษ
            โดยบูรณาการความร่วมมือจากทุกภาคส่วน เพื่อสร้างโอกาสทางการศึกษา ลดความเหลื่อมล้ำ
            และยกระดับคุณภาพการศึกษาอย่างยั่งยืน
          </p>
          <ol className="about-timeline">
            <li>
              <strong>2541</strong>
              <span>จุดเริ่มต้นโครงการ</span>
            </li>
            <li>
              <strong>2550</strong>
              <span>ขยายผลทั่วประเทศ</span>
            </li>
            <li>
              <strong>2560</strong>
              <span>พัฒนาระบบอย่างเป็นรูปธรรม</span>
            </li>
            <li>
              <strong>ปัจจุบัน</strong>
              <span>{totalSchools} โรงเรียน ก้าวสู่อนาคตที่ยั่งยืน</span>
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

        {/* Pillars + Strategies */}
        <article className="about-panel">
          <header className="about-panel__head">
            <h2>
              <Landmark size={20} aria-hidden />
              3 เสาหลัก และ 5 กลยุทธ์
            </h2>
            <Link href="/strategy" className="about-panel__link">
              ดูรายละเอียด 5 กลยุทธ์ <ArrowRight size={14} />
            </Link>
          </header>
          <div className="about-pillars">
            <div className="about-pillar about-pillar--blue">
              <UserRound size={18} aria-hidden />
              <span>การพัฒนาคน</span>
            </div>
            <div className="about-pillar about-pillar--amber">
              <Settings2 size={18} aria-hidden />
              <span>การพัฒนาระบบ</span>
            </div>
            <div className="about-pillar about-pillar--green">
              <Handshake size={18} aria-hidden />
              <span>การมีส่วนร่วมของทุกภาคส่วน</span>
            </div>
          </div>
          <p className="about-strategies__title">5 กลยุทธ์หลักในการขับเคลื่อน</p>
          <div className="about-strategies">
            {STRATEGY_LABELS.map((s, i) => {
              const Icon = STRATEGY_ICONS[i] ?? School;
              const short = s.label
                .replace('ด้าน', '')
                .replace('การ', '')
                .trim();
              return (
                <div key={s.key} className="about-strategy">
                  <span className="about-strategy__badge" style={{ background: s.color }}>
                    <em>{i + 1}</em>
                    <Icon size={14} />
                  </span>
                  <span className="about-strategy__label">{short}</span>
                </div>
              );
            })}
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
