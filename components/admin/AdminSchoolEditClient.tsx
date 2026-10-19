'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  saveSchoolCoverAction,
  updateSchoolDetailAction,
} from '@/app/actions/admin-schools';
import { SWOT_SECTIONS, type SchoolSwot } from '@/lib/swot/schema';
import { uploadSchoolCover } from '@/lib/media/storage-upload';
import { SCHOOL_DEFAULT_IMAGE } from '@/lib/schools/images';

type AreaOption = { id: string; name: string };

export type AdminSchoolEditInitial = {
  school_id: string;
  school_name: string;
  director_id: string | null;
  director_label: string;
  /** Kept for form save sync / legacy */
  director_name: string;
  phone_number: string;
  moo: string;
  village_name: string;
  subdistrict_name: string;
  district_name: string;
  province_name: string;
  zip_code: string;
  lat: string;
  long: string;
  area_id: string;
  cover_image_url: string;
  swot: SchoolSwot;
};

export function AdminSchoolEditClient({
  initial,
  areas,
}: {
  initial: AdminSchoolEditInitial;
  areas: AreaOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState(initial.school_name);
  const [phone, setPhone] = useState(initial.phone_number);
  const [moo, setMoo] = useState(initial.moo);
  const [village, setVillage] = useState(initial.village_name);
  const [subdistrict, setSubdistrict] = useState(initial.subdistrict_name);
  const [district, setDistrict] = useState(initial.district_name);
  const [province, setProvince] = useState(initial.province_name);
  const [zip, setZip] = useState(initial.zip_code);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.long);
  const [areaId, setAreaId] = useState(initial.area_id);
  const [coverUrl, setCoverUrl] = useState(initial.cover_image_url);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [swot, setSwot] = useState<SchoolSwot>(initial.swot);

  useEffect(() => {
    setCoverUrl(initial.cover_image_url);
  }, [initial.cover_image_url]);

  const areaOptions = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [areas]
  );

  const setSwotField = (path: string, value: string) => {
    setSwot((prev) => {
      const next = structuredClone(prev);
      if (path === 'internal.strengths') next.internal.strengths = value;
      else if (path === 'internal.weaknesses') next.internal.weaknesses = value;
      else if (path === 'external.strengths') next.external.strengths = value;
      else if (path === 'external.threats') next.external.threats = value;
      return next;
    });
  };

  const swotValue = (path: string) => {
    if (path === 'internal.strengths') return swot.internal.strengths;
    if (path === 'internal.weaknesses') return swot.internal.weaknesses;
    if (path === 'external.strengths') return swot.external.strengths;
    if (path === 'external.threats') return swot.external.threats;
    return '';
  };

  const save = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      const fd = new FormData();
      fd.set('school_id', initial.school_id);
      fd.set('school_name', schoolName);
      // Director assigned via /admin/directors — keep denormalized name on save
      fd.set('director_name', initial.director_name);
      fd.set('phone_number', phone);
      fd.set('moo', moo);
      fd.set('village_name', village);
      fd.set('subdistrict_name', subdistrict);
      fd.set('district_name', district);
      fd.set('province_name', province);
      fd.set('zip_code', zip);
      fd.set('lat', lat);
      fd.set('long', lng);
      fd.set('area_id', areaId);
      fd.set('cover_image_url', coverUrl);
      fd.set('swot_json', JSON.stringify(swot));
      const res = await updateSchoolDetailAction(fd);
      if (!res.ok) {
        setErr(res.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      setMsg('บันทึกข้อมูลโรงเรียนแล้ว');
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/schools" className="text-sm text-tm-blue hover:underline">
            ← รายชื่อโรงเรียน
          </Link>
          <h1 className="section-heading m-0 mt-1">แก้ไขข้อมูลโรงเรียน</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            รหัส {initial.school_id} · แก้ไขระดับรายละเอียด (Admin)
          </p>
        </div>
        <button
          type="button"
          className="ed-btn ed-btn--primary"
          disabled={pending}
          onClick={save}
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกทั้งหมด'}
        </button>
      </div>

      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}
      {err && <div className="ed-card p-3 text-sm text-rose-700 bg-rose-50">{err}</div>}

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">รูปโปรไฟล์โรงเรียน</h2>
        <p className="text-xs text-slate-500 m-0">
          อัปโหลดไปยัง Supabase Storage · บีบอัดอัตโนมัติก่อนบันทึกเพื่อประหยัดโควตา
        </p>
        <div className="admin-school-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl || SCHOOL_DEFAULT_IMAGE}
            alt=""
            className="admin-school-cover__preview"
            key={coverUrl || 'default'}
          />
          <div className="grid gap-2">
            <label className="ed-btn ed-btn--outline ed-btn--sm w-fit cursor-pointer">
              {uploadingCover ? 'กำลังอัปโหลด…' : 'เลือก / เปลี่ยนรูป'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingCover || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setUploadingCover(true);
                  setErr(null);
                  setMsg(null);
                  void (async () => {
                    const up = await uploadSchoolCover(initial.school_id, file);
                    if (!up.ok) {
                      setUploadingCover(false);
                      setErr(up.error || 'อัปโหลดรูปไม่สำเร็จ');
                      return;
                    }
                    const fd = new FormData();
                    fd.set('school_id', initial.school_id);
                    fd.set('cover_image_url', up.url);
                    const saved = await saveSchoolCoverAction(fd);
                    setUploadingCover(false);
                    if (!saved.ok) {
                      setErr(saved.error || 'บันทึก URL รูปไม่สำเร็จ');
                      return;
                    }
                    setCoverUrl(up.url);
                    setMsg('บันทึกรูปโปรไฟล์โรงเรียนแล้ว');
                    router.refresh();
                  })();
                }}
              />
            </label>
            {coverUrl ? (
              <button
                type="button"
                className="ed-btn ed-btn--outline ed-btn--sm w-fit"
                disabled={pending || uploadingCover}
                onClick={() => {
                  setUploadingCover(true);
                  setErr(null);
                  void (async () => {
                    const fd = new FormData();
                    fd.set('school_id', initial.school_id);
                    fd.set('cover_image_url', '');
                    const saved = await saveSchoolCoverAction(fd);
                    setUploadingCover(false);
                    if (!saved.ok) {
                      setErr(saved.error || 'ลบรูปไม่สำเร็จ');
                      return;
                    }
                    setCoverUrl('');
                    setMsg('ลบรูปโปรไฟล์แล้ว — ใช้รูปเริ่มต้น');
                    router.refresh();
                  })();
                }}
              >
                ลบรูป (ใช้รูปเริ่มต้น)
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">ข้อมูลหลัก</h2>
        <label className="grid gap-1 text-sm font-semibold">
          ชื่อโรงเรียน
          <input
            className="form-input"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1 text-sm font-semibold">
            ผู้อำนวยการ
            <div className="form-input flex flex-wrap items-center justify-between gap-2 bg-slate-50">
              <span>
                {initial.director_id ? initial.director_label : 'TBA'}
              </span>
              <Link
                href={`/admin/directors/assign?school=${encodeURIComponent(initial.school_id)}`}
                className="text-tm-blue underline text-xs font-semibold"
              >
                ย้าย / มอบหมาย
              </Link>
            </div>
            <p className="text-xs text-slate-500 m-0 font-normal">
              จัดการผู้อำนวยการที่หน้ามอบหมาย (ไม่แก้ชื่อตรงนี้)
            </p>
          </div>
          <label className="grid gap-1 text-sm font-semibold">
            เบอร์โทรศัพท์
            <input
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </label>
        </div>
      </section>

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">ที่อยู่ (ตามคอลัมน์ในฐานข้อมูล)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            หมู่ (moo)
            <input className="form-input" value={moo} onChange={(e) => setMoo(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            หมู่บ้าน (village_name)
            <input
              className="form-input"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            ตำบล (subdistrict_name)
            <input
              className="form-input"
              value={subdistrict}
              onChange={(e) => setSubdistrict(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            อำเภอ (district_name)
            <input
              className="form-input"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            จังหวัด (province_name)
            <input
              className="form-input"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            รหัสไปรษณีย์ (zip_code)
            <input className="form-input" value={zip} onChange={(e) => setZip(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">พิกัด · เขตพื้นที่การศึกษา</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            ละติจูด (lat)
            <input
              className="form-input"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
              placeholder="เช่น 13.7563"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            ลองจิจูด (long)
            <input
              className="form-input"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              inputMode="decimal"
              placeholder="เช่น 100.5018"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          เขตพื้นที่การศึกษา (Gov_Domain)
          <select
            className="form-input"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">— ไม่ระบุ —</option>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="ed-card p-4 space-y-4">
        <h2 className="ed-section-title text-base m-0">SWOT (4 หัวข้อ)</h2>
        {SWOT_SECTIONS.map((section) => (
          <div key={section.group} className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 m-0">{section.group}</h3>
            {section.items.map((item) => (
              <label key={item.key} className="grid gap-1 text-sm font-semibold">
                {item.code} {item.label}
                <textarea
                  className="form-input"
                  rows={5}
                  value={swotValue(item.key)}
                  onChange={(e) => setSwotField(item.key, e.target.value)}
                  placeholder="ข้อความยาว…"
                />
              </label>
            ))}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ed-btn ed-btn--primary"
          disabled={pending}
          onClick={save}
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกทั้งหมด'}
        </button>
        <Link href={`/schools/${initial.school_id}`} className="ed-btn ed-btn--outline">
          ดูหน้ารายละเอียดสาธารณะ
        </Link>
      </div>
    </div>
  );
}
