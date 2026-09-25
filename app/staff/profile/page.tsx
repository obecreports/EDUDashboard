import { getSessionProfile } from '@/lib/auth/session';

export default async function StaffProfilePage() {
  const { profile, isDemo } = await getSessionProfile();

  return (
    <div className="page-shell" style={{ maxWidth: 640 }}>
      <h1 className="section-heading">ตั้งค่าโปรไฟล์</h1>
      <div className="panel-card space-y-4">
        <label className="block text-sm">
          ชื่อ–นามสกุล
          <input className="form-input" defaultValue={profile?.full_name ?? ''} readOnly={isDemo} />
        </label>
        <label className="block text-sm">
          ตำแหน่ง
          <input className="form-input" defaultValue={profile?.position ?? ''} readOnly={isDemo} />
        </label>
        <label className="block text-sm">
          อีเมล
          <input className="form-input" defaultValue={profile?.email ?? ''} readOnly />
        </label>
        <label className="block text-sm">
          เขตที่รับผิดชอบ (assigned_zone)
          <input className="form-input" defaultValue={profile?.assigned_zone ?? ''} readOnly={isDemo} />
        </label>
        {isDemo && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            โหมด Demo — เชื่อม auth.users + user_profiles เพื่อแก้ไขจริง
          </p>
        )}
      </div>
    </div>
  );
}
