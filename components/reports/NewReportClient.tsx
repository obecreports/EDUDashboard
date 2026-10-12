'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { postSchoolCommentsBatchAction } from '@/app/actions/school-extras';
import { deleteReportDraftAction, saveReportDraftAction } from '@/app/actions/reports';
import { REPORT_HASHTAGS } from '@/lib/types';
import type { ReportDraft } from '@/lib/auth/mock-users';
import { REPORT_IMAGE_MAX } from '@/lib/media/compress-image';
import { uploadReportImage } from '@/lib/media/storage-upload';
import { mediaThumbUrl } from '@/lib/media/image-display';

type SchoolOpt = {
  id: string;
  name: string;
  province: string;
  district: string;
};

type ScheduleHint = {
  school_id: string;
  school_name: string;
  date: string;
};

type DraftBox = {
  key: string;
  text: string;
  tags: string[];
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftYmd(base: string, delta: number) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newBox(): DraftBox {
  return { key: `box-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text: '', tags: [] };
}

export function NewReportClient({
  schools,
  initialSchoolId = '',
  scheduleHints = [],
  initialDraft = null,
}: {
  schools: SchoolOpt[];
  initialSchoolId?: string;
  scheduleHints?: ScheduleHint[];
  initialDraft?: ReportDraft | null;
}) {
  const router = useRouter();
  const seed =
    schools.find((s) => s.id === (initialDraft?.school_id || initialSchoolId)) ??
    schools.find((s) => s.id === initialSchoolId);

  const [draftId, setDraftId] = useState(initialDraft?.id ?? '');
  const [q, setQ] = useState('');
  const [province, setProvince] = useState(initialDraft?.province || seed?.province || '');
  const [district, setDistrict] = useState(initialDraft?.district || seed?.district || '');
  const [schoolId, setSchoolId] = useState(initialDraft?.school_id || initialSchoolId);
  const [datePreset, setDatePreset] = useState<'yesterday' | 'today' | 'tomorrow' | 'custom'>(
    'today'
  );
  const [reportDate, setReportDate] = useState(initialDraft?.report_date || todayYmd);
  const [boxes, setBoxes] = useState<DraftBox[]>(() => {
    if (initialDraft?.boxes?.length) {
      return initialDraft.boxes.map((b, i) => ({
        key: `box-${i}-${Date.now()}`,
        text: b.text,
        tags: b.tags ?? [],
      }));
    }
    return [newBox()];
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const provinces = useMemo(() => {
    let list = schools;
    if (district) list = list.filter((s) => s.district === district);
    return [...new Set(list.map((s) => s.province).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [schools, district]);

  const districts = useMemo(() => {
    let list = schools;
    if (province) list = list.filter((s) => s.province === province);
    return [...new Set(list.map((s) => s.district).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [schools, province]);

  const filteredSchools = useMemo(() => {
    let list = [...schools];
    if (province) list = list.filter((s) => s.province === province);
    if (district) list = list.filter((s) => s.district === district);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(n) || s.id.includes(n));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [schools, province, district, q]);

  const selected =
    filteredSchools.find((s) => s.id === schoolId) ?? schools.find((s) => s.id === schoolId);

  const applyDatePreset = (key: 'yesterday' | 'today' | 'tomorrow') => {
    setDatePreset(key);
    const t = todayYmd();
    if (key === 'yesterday') setReportDate(shiftYmd(t, -1));
    else if (key === 'tomorrow') setReportDate(shiftYmd(t, 1));
    else setReportDate(t);
  };

  const toggleTag = (boxKey: string, tag: string) => {
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.key !== boxKey) return b;
        const has = b.tags.includes(tag);
        return { ...b, tags: has ? b.tags.filter((t) => t !== tag) : [...b.tags, tag] };
      })
    );
  };

  const pickSchool = (id: string) => {
    setSchoolId(id);
    const s = schools.find((x) => x.id === id);
    if (s) {
      setProvince(s.province);
      setDistrict(s.district);
      setQ(s.name);
    }
  };

  const clearSchool = () => {
    setSchoolId('');
    setQ('');
    setMsg(null);
  };

  const submitAll = () => {
    const pendingBoxes = boxes.filter((b) => b.text.trim());
    if (!schoolId || pendingBoxes.length === 0) {
      setMsg('เลือกโรงเรียนและกรอกความคิดเห็นอย่างน้อย 1 ข้อ');
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set('school_id', schoolId);
        fd.set('report_date', reportDate);
        fd.set(
          'boxes',
          JSON.stringify(pendingBoxes.map((b) => ({ text: b.text.trim(), tags: b.tags })))
        );
        fd.set('image_urls', JSON.stringify(imageUrls));
        const res = await postSchoolCommentsBatchAction(fd);
        if (!res.ok) {
          setMsg(res.error || 'บันทึกไม่สำเร็จ');
          return;
        }
        if (draftId) {
          const dfd = new FormData();
          dfd.set('draft_id', draftId);
          await deleteReportDraftAction(dfd);
        }
        setBoxes([newBox()]);
        setImageUrls([]);
        setDraftId('');
        setMsg(`บันทึกแล้ว ${res.count} รายการ`);
        router.push('/reports');
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      }
    });
  };

  const saveDraft = () => {
    if (!schoolId || !selected) {
      setMsg('เลือกโรงเรียนก่อนบันทึกร่าง');
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const fd = new FormData();
        if (draftId) fd.set('draft_id', draftId);
        fd.set('school_id', schoolId);
        fd.set('school_name', selected.name);
        fd.set('province', selected.province);
        fd.set('district', selected.district);
        fd.set('report_date', reportDate);
        fd.set(
          'boxes',
          JSON.stringify(boxes.map((b) => ({ text: b.text, tags: b.tags })))
        );
        const res = await saveReportDraftAction(fd);
        if (!res.ok) {
          setMsg(res.error || 'บันทึกร่างไม่สำเร็จ');
          return;
        }
        setDraftId(res.draft.id);
        window.alert('บันทึกร่างสำเร็จแล้ว\nคุณสามารถกลับมาเขียนต่อได้จากหน้ารายงานทั้งหมด');
        router.push('/reports');
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'บันทึกร่างไม่สำเร็จ');
      }
    });
  };

  const removeDraft = () => {
    if (!draftId) return;
    start(async () => {
      const fd = new FormData();
      fd.set('draft_id', draftId);
      const res = await deleteReportDraftAction(fd);
      if (!res.ok) {
        setMsg(res.error || 'ลบร่างไม่สำเร็จ');
        return;
      }
      setDraftId('');
      setMsg('ลบร่างแล้ว');
      router.push('/reports/new');
      router.refresh();
    });
  };

  return (
    <div className="page-shell py-5 grid gap-4 max-w-3xl">
      <Link href="/reports" className="text-sm text-tm-blue font-semibold inline-flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> กลับหน้ารายงาน
      </Link>

      {draftId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600 m-0">กำลังเขียนต่อจากร่างที่บันทึกไว้</p>
          <button
            type="button"
            className="ed-btn ed-btn--danger ed-btn--sm"
            disabled={pending}
            onClick={removeDraft}
          >
            ลบร่างนี้
          </button>
        </div>
      )}

      <div className="ed-card p-5 space-y-4">
        <div>
          <h2 className="ed-section-title text-base m-0">ค้นหาโรงเรียนที่จะรายงาน</h2>
          <p className="text-sm text-slate-600 m-0 mt-1">
            กรองจังหวัด/อำเภอ/โรงเรียน หรือพิมพ์ชื่อ · แนะนำจากนัดหมาย ±7 วัน
          </p>
        </div>

        {scheduleHints.length > 0 && (
          <div>
            <div className="text-sm font-bold mb-2">แนะนำจากตารางนัด (±7 วัน)</div>
            <div className="report-suggest-list">
              {scheduleHints.map((h) => (
                <button
                  key={`${h.school_id}-${h.date}`}
                  type="button"
                  className="report-suggest-chip"
                  onClick={() => pickSchool(h.school_id)}
                >
                  {h.school_name} · {h.date}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            จังหวัด
            <select
              className="form-input"
              value={province}
              onChange={(e) => {
                const value = e.target.value;
                setProvince(value);
                if (district && !schools.some((s) => (!value || s.province === value) && s.district === district)) {
                  setDistrict('');
                }
                setSchoolId('');
                setQ('');
              }}
            >
              <option value="">ทั้งหมด</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            อำเภอ / เขต
            <select
              className="form-input"
              value={district}
              onChange={(e) => {
                const value = e.target.value;
                setDistrict(value);
                if (province && !schools.some((s) => s.province === province && (!value || s.district === value))) {
                  setProvince('');
                }
                setSchoolId('');
                setQ('');
              }}
            >
              <option value="">ทั้งหมด</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            โรงเรียน
            <select
              className="form-input"
              value={schoolId}
              onChange={(e) => pickSchool(e.target.value)}
            >
              <option value="">— เลือก —</option>
              {filteredSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          ค้นหาชื่อโรงเรียน (combo)
          <input
            className="form-input"
            list="school-name-list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              const match = schools.find(
                (s) => s.name === e.target.value || s.name.toLowerCase() === e.target.value.toLowerCase()
              );
              if (match) pickSchool(match.id);
              else setSchoolId('');
            }}
            placeholder="พิมพ์เพื่อค้นหาหรือเลือกจากรายการ"
          />
          <datalist id="school-name-list">
            {filteredSchools.slice(0, 80).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        {selected ? (
          <div className="report-selected-school" role="status">
            <div className="report-selected-school__head">
              <span className="report-selected-school__label">โรงเรียนที่เลือกแล้ว</span>
              <button
                type="button"
                className="report-selected-school__clear"
                aria-label="ยกเลิกการเลือกโรงเรียน"
                onClick={clearSchool}
              >
                <X size={14} />
              </button>
            </div>
            <strong className="report-selected-school__name">{selected.name}</strong>
            <span className="report-selected-school__meta">
              {[selected.district, selected.province].filter(Boolean).join(' · ') || '—'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 m-0">ยังไม่ได้เลือกโรงเรียน</p>
        )}
      </div>

      <div className="ed-card p-5 space-y-4">
        <div>
          <h2 className="ed-section-title text-base m-0">วันที่รายงาน</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {(
              [
                ['yesterday', 'เมื่อวาน'],
                ['today', 'วันนี้'],
                ['tomorrow', 'พรุ่งนี้'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`navbar__link ${datePreset === key ? 'navbar__link--active' : ''}`}
                onClick={() => applyDatePreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm font-semibold mt-3">
            หรือเลือกเองจากปฏิทิน
            <input
              type="date"
              className="form-input"
              value={reportDate}
              onChange={(e) => {
                setDatePreset('custom');
                setReportDate(e.target.value);
              }}
            />
          </label>
        </div>

        <div className="space-y-3">
          <h2 className="ed-section-title text-base m-0">รูปแนบรายงาน</h2>
          <p className="text-xs text-slate-500 m-0">
            สูงสุด {REPORT_IMAGE_MAX} รูป · แอปบีบอัดเป็น 2 ขนาดให้อัตโนมัติ (thumb + เต็ม) เพื่อประหยัดโควตา
          </p>
          <div className="report-attach">
            {imageUrls.map((url) => (
              <div key={url} className="report-attach__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaThumbUrl(url)}
                  alt=""
                  loading="lazy"
                  width={96}
                  height={72}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback !== '1' && img.src !== url) {
                      img.dataset.fallback = '1';
                      img.src = url;
                    }
                  }}
                />
                <button
                  type="button"
                  className="report-attach__remove"
                  aria-label="ลบรูป"
                  onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {imageUrls.length < REPORT_IMAGE_MAX && (
              <label className="report-attach__add">
                <ImagePlus size={18} />
                <span>{uploadingImgs ? 'อัปโหลด…' : 'เพิ่มรูป'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={uploadingImgs || pending || !schoolId}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (!files.length) return;
                    if (!schoolId) {
                      setMsg('เลือกโรงเรียนก่อนแนบรูป');
                      return;
                    }
                    const room = REPORT_IMAGE_MAX - imageUrls.length;
                    if (room <= 0) {
                      setMsg(`แนบได้สูงสุด ${REPORT_IMAGE_MAX} รูปต่อรายงาน`);
                      return;
                    }
                    const picked = files.slice(0, room);
                    setUploadingImgs(true);
                    setMsg(null);
                    void (async () => {
                      const next: string[] = [];
                      for (const file of picked) {
                        const res = await uploadReportImage(schoolId, file);
                        if (!res.ok) {
                          setMsg(res.error || 'อัปโหลดรูปไม่สำเร็จ');
                          break;
                        }
                        next.push(res.url);
                      }
                      if (next.length) setImageUrls((prev) => [...prev, ...next].slice(0, REPORT_IMAGE_MAX));
                      setUploadingImgs(false);
                      if (files.length > room) {
                        setMsg(`แนบได้สูงสุด ${REPORT_IMAGE_MAX} รูป — เพิ่มแล้ว ${room} รูป`);
                      }
                    })();
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-400 m-0">
            {imageUrls.length}/{REPORT_IMAGE_MAX} รูป
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="ed-section-title text-base m-0">ความคิดเห็น (มากกว่า 1 หัวข้อได้)</h2>
          <p className="text-xs text-slate-500 m-0">
            แต่ละกล่องเลือกแฮชแท็กของตนเอง · บันทึกทั้งหมดพร้อมกัน หรือบันทึกเป็นร่างก่อน
          </p>

          {boxes.map((box, idx) => (
            <div key={box.key} className="report-comment-box">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm text-tm-blue">ความคิดเห็น #{idx + 1}</strong>
                {boxes.length > 1 && (
                  <button
                    type="button"
                    className="navbar__link text-xs"
                    onClick={() => setBoxes((prev) => prev.filter((b) => b.key !== box.key))}
                  >
                    <Trash2 size={14} /> ลบกล่อง
                  </button>
                )}
              </div>
              <div className="report-hashtag-pick" role="group" aria-label="แฮชแท็ก">
                {REPORT_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={box.tags.includes(tag) ? 'is-on' : ''}
                    onClick={() => toggleTag(box.key, tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <textarea
                className="form-input"
                rows={4}
                value={box.text}
                onChange={(e) =>
                  setBoxes((prev) =>
                    prev.map((b) => (b.key === box.key ? { ...b, text: e.target.value } : b))
                  )
                }
                placeholder="พิมพ์รายละเอียด…"
              />
            </div>
          ))}

          <button
            type="button"
            className="ed-btn ed-btn--outline ed-btn--sm w-fit"
            onClick={() => setBoxes((prev) => [...prev, newBox()])}
          >
            <Plus size={14} /> เพิ่มกล่องความคิดเห็น
          </button>
        </div>

        {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ed-btn ed-btn--primary"
            disabled={pending || !schoolId}
            onClick={submitAll}
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึกความคิดเห็นทั้งหมด'}
          </button>
          <button
            type="button"
            className="ed-btn ed-btn--outline"
            disabled={pending || !schoolId}
            onClick={saveDraft}
          >
            บันทึกร่าง
          </button>
          <Link href="/reports" className="ed-btn ed-btn--outline">
            ไปหน้ารายงานทั้งหมด
          </Link>
        </div>
      </div>
    </div>
  );
}
