import Link from 'next/link';
import { LoginFormClient } from '@/components/auth/LoginFormClient';

export default function LoginPage() {
  return (
    <div className="page-shell" style={{ maxWidth: 480 }}>
      <h1 className="section-heading">เข้าใช้งานระบบ</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        กรอกรหัสผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
      </p>

      <LoginFormClient />

      <p className="text-xs text-slate-400 mt-4 mb-0">
        ผู้เยี่ยมชม (Guest) ใช้งานสาธารณะได้โดยไม่ต้องเข้าสู่ระบบ ·{' '}
        <Link href="/" className="text-tm-blue">
          ← กลับหน้าหลัก
        </Link>
      </p>
    </div>
  );
}
