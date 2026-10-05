'use client';

import { useState, useTransition } from 'react';
import { saveSiteSettings } from '@/app/actions/admin';

export function SiteSettingsForm({
  initial,
}: {
  initial: {
    site_title: string;
    hero_title: string;
    hero_subtitle: string;
    hero_bg_url: string;
  };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const strip = (v: string) => v.replace(/^"|"$/g, '');

  return (
    <form
      className="panel-card space-y-4"
      action={(fd) => {
        start(async () => {
          const res = await saveSiteSettings(fd);
          setMsg(res.ok ? 'บันทึกแล้ว — Hero จะอัปเดตทันที' : ('error' in res && res.error) || 'ล้มเหลว');
        });
      }}
    >
      <label className="block text-sm">
        ชื่อเว็บไซต์ (site_title)
        <input
          name="site_title"
          className="form-input"
          defaultValue={strip(initial.site_title)}
        />
      </label>
      <label className="block text-sm">
        Hero Header Title
        <input
          name="hero_title"
          className="form-input"
          defaultValue={strip(initial.hero_title)}
          placeholder="ภาพรวมข้อมูลสถานศึกษา เพื่อการพัฒนาอย่างต่อเนื่อง"
        />
      </label>
      <label className="block text-sm">
        Hero Subtitle Description
        <textarea
          name="hero_subtitle"
          className="form-input"
          rows={3}
          defaultValue={strip(initial.hero_subtitle)}
        />
      </label>
      <label className="block text-sm">
        Hero Background Image URL
        <input
          name="hero_bg_url"
          className="form-input"
          type="url"
          placeholder="https://…"
          defaultValue={strip(initial.hero_bg_url)}
        />
      </label>
      <button type="submit" className="navbar__login" disabled={pending}>
        บันทึก site_settings
      </button>
      {msg && <p className="text-sm text-tm-blue font-medium">{msg}</p>}
    </form>
  );
}
