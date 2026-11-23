'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SchoolBuildingCard } from '@/lib/types';
import { SCHOOL_DEFAULT_IMAGE } from '@/lib/schools/images';
import {
  BUILDING_CATEGORY_CLASSROOM_TH,
  buildingCategoryLabel,
  buildingSideLabel,
} from '@/lib/schools/media-paths';

function dash(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  return String(v);
}

/** Append unit when value is present; otherwise em dash */
function withUnit(
  v: string | number | null | undefined,
  unit: string
): string {
  if (v == null || v === '') return '—';
  return `${v} ${unit}`;
}

function formatBudgetBaht(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('th-TH')} บาท`;
}

function useVisibleCount() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setN(mq.matches ? 1 : 3);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return n;
}

function BuildingCard({ building }: { building: SchoolBuildingCard }) {
  const isClassroom =
    buildingCategoryLabel(building.categorize) === BUILDING_CATEGORY_CLASSROOM_TH;
  const hero = building.heroUrl || SCHOOL_DEFAULT_IMAGE;
  const ribbon = buildingCategoryLabel(building.categorize || 'อาคาร');

  return (
    <article className="school-building-card">
      <div className="school-building-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt="" className="school-building-card__hero" />
        <span className="school-building-card__ribbon">{ribbon}</span>
        {building.building_status ? (
          <span className="school-building-card__status">{building.building_status}</span>
        ) : null}
      </div>

      <div className="school-building-card__body">
        <h3 className="school-building-card__title">
          รายการที่ {building.building_number}
        </h3>
        <dl className="school-building-card__facts">
          <div>
            <dt>แบบสิ่งก่อสร้าง</dt>
            <dd>{dash(building.building_type)}</dd>
          </div>
          {isClassroom ? (
            <>
              <div>
                <dt>จำนวนห้องตามแบบ</dt>
                <dd>{withUnit(building.room_plan, 'ห้อง')}</dd>
              </div>
              <div>
                <dt>จำนวนห้องจริง</dt>
                <dd>{withUnit(building.room_build, 'ห้อง')}</dd>
              </div>
              <div>
                <dt>จำนวนห้องพิเศษ</dt>
                <dd>{withUnit(building.room_special, 'ห้อง')}</dd>
              </div>
              <div>
                <dt>ต่อเติมเป็นห้องเรียน</dt>
                <dd>{withUnit(building.room_expand, 'ห้อง')}</dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>ก่อสร้างเมื่อปี</dt>
            <dd>{dash(building.build_year)}</dd>
          </div>
          <div>
            <dt>อายุการใช้งาน</dt>
            <dd>{withUnit(building.building_lifetime, 'ปี')}</dd>
          </div>
          <div>
            <dt>งบประมาณ</dt>
            <dd>{formatBudgetBaht(building.budget_cost)}</dd>
          </div>
          <div>
            <dt>แหล่งที่มางบประมาณ</dt>
            <dd>{dash(building.budget_origin)}</dd>
          </div>
          <div>
            <dt>สภาพการใช้งาน</dt>
            <dd>{dash(building.building_quality)}</dd>
          </div>
          <div>
            <dt>สถานะการใช้งาน</dt>
            <dd>{dash(building.building_status)}</dd>
          </div>
        </dl>

        {building.additionalPhotos.length > 0 ? (
          <div className="school-building-card__extras">
            <p className="school-building-card__extras-label">รูปภาพเพิ่มเติม</p>
            <ul className="school-building-card__thumbs">
              {building.additionalPhotos.map((p) => {
                const sideLabel = buildingSideLabel(p.side);
                return (
                  <li key={`${p.side}-${p.url}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={sideLabel} title={sideLabel} />
                    <span>{sideLabel}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function SchoolBuildingsCarousel({
  buildings,
}: {
  buildings: SchoolBuildingCard[];
}) {
  const visible = useVisibleCount();
  const [index, setIndex] = useState(0);

  const maxIndex = Math.max(0, buildings.length - visible);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const slice = useMemo(
    () => buildings.slice(index, index + visible),
    [buildings, index, visible]
  );

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(maxIndex, i + 1));
  }, [maxIndex]);

  if (buildings.length === 0) {
    return (
      <p className="text-sm text-slate-500 m-0">
        ยังไม่มีข้อมูลสิ่งปลูกสร้างสำหรับโรงเรียนนี้
      </p>
    );
  }

  return (
    <div className="school-buildings-carousel">
      <div className="school-buildings-carousel__toolbar">
        <span className="text-xs text-slate-500">
          {index + 1}–{Math.min(index + visible, buildings.length)} / {buildings.length}
        </span>
        <div className="school-buildings-carousel__nav">
          <button
            type="button"
            className="ed-btn ed-btn--outline ed-btn--sm"
            onClick={prev}
            disabled={index <= 0}
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="ed-btn ed-btn--outline ed-btn--sm"
            onClick={next}
            disabled={index >= maxIndex}
            aria-label="ถัดไป"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        className={`school-buildings-carousel__track school-buildings-carousel__track--${visible}`}
      >
        {slice.map((b) => (
          <BuildingCard key={b.id || String(b.building_number)} building={b} />
        ))}
      </div>
    </div>
  );
}
