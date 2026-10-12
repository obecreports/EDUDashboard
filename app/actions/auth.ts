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
import { normalizeRole } from '@/lib/types';
import { cookies } from 'next/headers';
import { AUTH_SESSION_COOKIE, type AuthSession } from '@/lib/auth/mock-users';

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '').trim();
  const result = await loginWithPassword(email, password);
  if (!result.ok) return { error: result.error };

  revalidatePath('/', 'layout');
  if (result.mustChangePassword) {
    redirect('/change-password');
  }
  if (next.startsWith('/') && !next.startsWith('//')) {
    redirect(next);
  }
  redirect(result.redirectTo);
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
    // Still redirect home even if cookie purge fails mid-clear
  }
  revalidatePath('/', 'layout');
  redirect('/');
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
  const position = String(formData.get('position') || '').trim();

  if (!full_name) return { ok: false, error: 'กรุณากรอกชื่อ–นามสกุล' };
  if (!position) return { ok: false, error: 'กรุณากรอกตำแหน่ง' };

  const result = await updateUserProfileFields(profile.id, {
    full_name,
    name_prefix: name_prefix.length > 0 ? name_prefix : null,
    position,
  });
  if (!result.ok) return result;

  const jar = await cookies();
  const nextSession: AuthSession = {
    ...session,
    full_name,
    position,
  };
  jar.set(AUTH_SESSION_COOKIE, JSON.stringify(nextSession), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/staff/profile');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { ok: true };
}
