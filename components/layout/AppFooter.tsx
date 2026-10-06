import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="ed-footer">
      <div className="ed-footer__banner">
        ร่วมกันสร้างโอกาสที่เท่าเทียม เพื่อเด็กไทยทุกคน
      </div>
      <div className="ed-footer__bar">
        <div className="ed-footer__credit">
          โครงการกองทุนการศึกษา | สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)
        </div>
        <div className="ed-footer__links">
          <Link href="/about">ติดต่อเรา</Link>
          <span aria-hidden>|</span>
          <Link href="/strategy">คำถามที่พบบ่อย</Link>
          <span aria-hidden>|</span>
          <Link href="/about">นโยบายความเป็นส่วนตัว</Link>
        </div>
      </div>
    </footer>
  );
}
