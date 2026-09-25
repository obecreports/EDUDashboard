'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export async function createVisitLog(formData: FormData) {
  const schoolId = Number(formData.get('school_id'));
  const notes = String(formData.get('notes') || '');
  const status = String(formData.get('survey_status') || 'Pending');
  const { profile, isDemo } = await getSessionProfile();

  if (isDemo || !profile || profile.id === 'demo') {
    return { ok: false, error: 'ต้องเข้าสู่ระบบด้วย Supabase Auth ก่อนบันทึก (ไม่ใช่โหมด Demo)' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('school_visit_logs').insert({
    school_id: schoolId,
    staff_id: profile.id,
    notes,
    survey_status: status,
    visit_date: new Date().toISOString(),
    photo_urls: [],
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/staff/dashboard');
  revalidatePath('/staff/calendar');
  return { ok: true };
}
