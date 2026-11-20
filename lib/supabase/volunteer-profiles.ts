import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';

export type VolunteerProfile = {
  user_id: string;
  contact_address: string | null;
  contact_tel: string | null;
  contact_email: string | null;
  duty: string | null;
  last_position_title: string | null;
  last_position_year: string | null;
  last_position_affiliation: string | null;
  education_bachelor: string | null;
  education_master: string | null;
  /** YYYY-MM-DD (CE) */
  birth_date: string | null;
};

const SELECT_COLS =
  'user_id, contact_address, contact_tel, contact_email, duty, last_position_title, last_position_year, last_position_affiliation, education_bachelor, education_master, birth_date';

function mapRow(row: Record<string, unknown>): VolunteerProfile {
  const text = (v: unknown) =>
    v == null ? null : String(v).trim() || null;
  return {
    user_id: String(row.user_id),
    contact_address: text(row.contact_address),
    contact_tel: text(row.contact_tel),
    contact_email: text(row.contact_email),
    duty: text(row.duty),
    last_position_title: text(row.last_position_title),
    last_position_year: text(row.last_position_year),
    last_position_affiliation: text(row.last_position_affiliation),
    education_bachelor: text(row.education_bachelor),
    education_master: text(row.education_master),
    birth_date:
      row.birth_date != null ? String(row.birth_date).slice(0, 10) : null,
  };
}

export async function fetchVolunteerProfileByUserId(
  userId: string
): Promise<VolunteerProfile | null> {
  const id = userId.trim();
  if (!id) return null;
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('volunteer_profiles')
      .select(SELECT_COLS)
      .eq('user_id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function fetchVolunteerProfilesByUserIds(
  userIds: string[]
): Promise<Map<string, VolunteerProfile>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, VolunteerProfile>();
  if (!unique.length) return map;
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('volunteer_profiles')
      .select(SELECT_COLS)
      .in('user_id', unique);
    if (error || !data) return map;
    for (const row of data) {
      const p = mapRow(row as Record<string, unknown>);
      map.set(p.user_id, p);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function upsertVolunteerProfile(
  userId: string,
  patch: Partial<Omit<VolunteerProfile, 'user_id'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = userId.trim();
  if (!id) return { ok: false, error: 'ไม่พบผู้ใช้' };
  try {
    const supabase = await createClient();
    const body: Record<string, unknown> = {
      user_id: id,
      updated_at: new Date().toISOString(),
    };
    if (patch.contact_address !== undefined) {
      body.contact_address = patch.contact_address;
    }
    if (patch.contact_tel !== undefined) body.contact_tel = patch.contact_tel;
    if (patch.contact_email !== undefined) {
      body.contact_email = patch.contact_email;
    }
    if (patch.duty !== undefined) body.duty = patch.duty;
    if (patch.last_position_title !== undefined) {
      body.last_position_title = patch.last_position_title;
    }
    if (patch.last_position_year !== undefined) {
      body.last_position_year = patch.last_position_year;
    }
    if (patch.last_position_affiliation !== undefined) {
      body.last_position_affiliation = patch.last_position_affiliation;
    }
    if (patch.education_bachelor !== undefined) {
      body.education_bachelor = patch.education_bachelor;
    }
    if (patch.education_master !== undefined) {
      body.education_master = patch.education_master;
    }
    if (patch.birth_date !== undefined) body.birth_date = patch.birth_date;

    const { error } = await supabase.from('volunteer_profiles').upsert(body, {
      onConflict: 'user_id',
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'บันทึกโปรไฟล์อาสาสมัครไม่สำเร็จ',
    };
  }
}
