'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  changePassword,
  changePasswordForced,
  getSessionProfile,
  issueTemporaryPassword,
  loginWithPassword,
  logoutSession,
  postLoginPath,
  readAuthSession,
} from '@/lib/auth/session';
import { updateUserProfileFields } from '@/lib/auth/user-store';
import { isOverseerType2, isVolunteerRole, normalizeRole, ROLE_LABELS } from '@/lib/types';
import { cookies } from 'next/headers';
import {
  AUTH_SESSION_COOKIE,
  idleTimeoutMs,
  type AuthSession,
} from '@/lib/auth/mock-users';
import { upsertVolunteerProfile } from '@/lib/supabase/volunteer-profiles';
import { parseThaiBirthDateToYmd } from '@/lib/format/date';

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; redirectTo?: string } | null> {
  const login = String(formData.get('login') || formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '').trim();
  const result = await loginWithPassword(login, password);
  if (!result.ok) return { error: result.error };

  revalidatePath('/', 'layout');
  // Return URL for client navigation — avoid redirect() which throws and can
  // leave client submit state stuck when invoked via await from the form.
  if (result.mustChangePassword) {
    return { redirectTo: '/change-password' };
  }
  if (next.startsWith('/') && !next.startsWith('//')) {
    return { redirectTo: next };
  }
  return { redirectTo: result.redirectTo };
}

export async function changePasswordAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean } | null> {
  const next = String(formData.get('next') || '');
  const confirm = String(formData.get('confirm') || '');

  if (next !== confirm) return { error: 'รหัสผ่านใหม่ไม่ตรงกัน' };

  const result = await changePasswordForced(next);
  if (!result.ok) return { error: result.error };

  revalidatePath('/', 'layout');
  const session = await readAuthSession();
  redirect(postLoginPath(normalizeRole(session?.role)));
}

export async function logoutAction() {
  try {
    await logoutSession();
  } catch {
    // Cookie purge may fail mid-clear; client still hard-navigates away
  }
  revalidatePath('/', 'layout');
  // No redirect() — AppNavbar does a full document load to /login so home
  // (about-page) HTML cannot soft-hydrate against the login route.
}

export async function updateAssignedZonesAction(_formData: FormData) {
  return { error: 'การมอบหมายพื้นที่ทำได้เฉพาะผู้ดูแลระบบเท่านั้น' };
}

export async function issueTempPasswordAction(formData: FormData) {
  const userId = String(formData.get('userId') || '');
  const temp = String(formData.get('tempPassword') || '');
  // OTP / forgot-password always clears permanent password → forces first-login flow
  const result = await issueTemporaryPassword(userId, temp, { clearPermanent: true });
  if (!result.ok) return { error: result.error };
  revalidatePath('/admin/settings');
  revalidatePath('/admin/accounts');
  return { ok: true };
}

/** Logged-in user changes own password from profile (requires current password) */
export async function changeOwnPasswordAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const current = String(formData.get('current') || '');
  const next = String(formData.get('next') || '');
  const confirm = String(formData.get('confirm') || '');
  if (next.trim().length < 8) return { ok: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
  if (next !== confirm) return { ok: false, error: 'รหัสผ่านใหม่ไม่ตรงกัน' };
  const result = await changePassword(current, next);
  if (!result.ok) return result;
  revalidatePath('/staff/profile');
  return { ok: true };
}

export async function updateSelfProfileAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { profile, isAuthenticated, session } = await getSessionProfile();
  if (!isAuthenticated || !profile || !session || profile.id === 'guest') {
    return { ok: false, error: 'ต้องเข้าสู่ระบบก่อน' };
  }

  const full_name = String(formData.get('full_name') || '').trim();
  // Keep empty string as "" in FormData; persist blank as null (greeting falls back to "คุณ")
  const name_prefix_raw = formData.get('name_prefix');
  const name_prefix =
    name_prefix_raw == null ? '' : String(name_prefix_raw).trim();
  let position = String(formData.get('position') || '').trim();
  // Volunteer roles keep their role label as position when blanked
  if (isOverseerType2(profile.role, profile.overseer_tier)) {
    position = ROLE_LABELS[normalizeRole(profile.role)] || ROLE_LABELS.volunteer_border;
  }

  if (!full_name) return { ok: false, error: 'กรุณากรอกชื่อ–นามสกุล' };
  if (!position) return { ok: false, error: 'กรุณากรอกตำแหน่ง' };

  const textOrNull = (key: string) => {
    const v = String(formData.get(key) || '').trim();
    return v.length ? v : null;
  };

  const result = await updateUserProfileFields(profile.id, {
    full_name,
    name_prefix: name_prefix.length > 0 ? name_prefix : null,
    position,
  });
  if (!result.ok) return result;

  const role = normalizeRole(profile.role);
  if (
    isVolunteerRole(role) ||
    isOverseerType2(profile.role, profile.overseer_tier)
  ) {
    const birthRaw = String(formData.get('birth_date') || '').trim();
    let birth_date: string | null = null;
    if (birthRaw) {
      birth_date = parseThaiBirthDateToYmd(birthRaw);
      if (!birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birthRaw)) {
        birth_date = birthRaw;
      }
      if (!birth_date) {
        return { ok: false, error: 'รูปแบบวันเกิดไม่ถูกต้อง' };
      }
    }
    const vlRes = await upsertVolunteerProfile(profile.id, {
      contact_address: textOrNull('contact_address'),
      contact_tel: textOrNull('contact_tel'),
      contact_email: textOrNull('contact_email'),
      duty: textOrNull('duty'),
      last_position_title: textOrNull('last_position_title'),
      last_position_year: textOrNull('last_position_year'),
      last_position_affiliation: textOrNull('last_position_affiliation'),
      education_bachelor: textOrNull('education_bachelor'),
      education_master: textOrNull('education_master'),
      birth_date,
    });
    if (!vlRes.ok) return vlRes;
  }

  const jar = await cookies();
  const nextSession: AuthSession = {
    ...session,
    full_name,
    position,
    lastActiveAt: Date.now(),
  };
  jar.set(AUTH_SESSION_COOKIE, JSON.stringify(nextSession), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: Math.ceil(idleTimeoutMs(nextSession.role) / 1000),
  });

  revalidatePath('/staff/profile');
  revalidatePath('/home');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function saveSelfAvatarAction(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || profile.id === 'guest') {
    return { ok: false, error: 'ต้องเข้าสู่ระบบก่อน' };
  }

  const avatar_url = String(formData.get('avatar_url') || '').trim();
  if (!avatar_url) return { ok: false, error: 'ไม่พบ URL รูปโปรไฟล์' };

  const result = await updateUserProfileFields(profile.id, { avatar_url });
  if (!result.ok) return result;

  revalidatePath('/staff/profile');
  revalidatePath('/home');
  revalidatePath('/volunteers');
  revalidatePath('/', 'layout');
  return { ok: true };
}
