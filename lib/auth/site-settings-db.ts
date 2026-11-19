import 'server-only';

import { createAnonClient } from '@/lib/supabase/anon';

export type SettingWriteResult = { ok: true } | { ok: false; error: string };

function unwrapSettingValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return value;
  }
  return value;
}

export async function getSiteSetting(key: string): Promise<unknown | null> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error || data == null) return null;
    return unwrapSettingValue(data.value);
  } catch {
    return null;
  }
}

export async function getSiteSettingsMap(
  keys: string[]
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (!keys.length) return out;
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', keys);
    if (error || !data) return out;
    for (const row of data) {
      out[row.key] = unwrapSettingValue(row.value);
    }
  } catch {
    /* empty */
  }
  return out;
}

export async function upsertSiteSetting(
  key: string,
  value: unknown,
  updatedBy?: string | null
): Promise<SettingWriteResult> {
  try {
    const supabase = createAnonClient();
    const { error } = await supabase.from('site_settings').upsert(
      {
        key,
        value,
        updated_by: updatedBy?.startsWith('mock-') ? null : updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'บันทึกการตั้งค่าไม่สำเร็จ',
    };
  }
}

export async function upsertSiteSettings(
  rows: Array<{ key: string; value: unknown }>,
  updatedBy?: string | null
): Promise<SettingWriteResult> {
  for (const row of rows) {
    const res = await upsertSiteSetting(row.key, row.value, updatedBy);
    if (!res.ok) return res;
  }
  return { ok: true };
}
