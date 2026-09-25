'use client';

import { useState, useTransition } from 'react';
import { saveSiteSettings } from '@/app/actions/admin';

export function SiteSettingsForm({
  initial,
}: {
  initial: { site_title: string; hero_text: string };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel-card space-y-4"
      action={(fd) => {
        start(async () => {
          const res = await saveSiteSettings(fd);
          setMsg(res.ok ? 'บันทึกแล้ว' : res.error || 'ล้มเหลว');
        });
      }}
    >
      <label className="block text-sm">
        ชื่อเว็บไซต์
        <input name="site_title" className="form-input" defaultValue={initial.site_title.replace(/^"|"$/g, '')} />
      </label>
      <label className="block text-sm">
        ข้อความ Hero
        <textarea name="hero_text" className="form-input" rows={3} defaultValue={initial.hero_text.replace(/^"|"$/g, '')} />
      </label>
      <button type="submit" className="navbar__login" disabled={pending}>
        บันทึก site_settings
      </button>
      {msg && <p className="text-sm text-tm-blue font-medium">{msg}</p>}
    </form>
  );
}
