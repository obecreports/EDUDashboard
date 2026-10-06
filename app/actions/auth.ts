'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  changePasswordForced,
  issueTemporaryPassword,
  loginWithPassword,
  logoutSession,
  readAuthSession,
  updateAssignedZones,
} from '@/lib/auth/session';

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const result = await loginWithPassword(email, password);
  if (!result.ok) return { error: result.error };

  // Global role is public-only — do not keep a "guest login" session for browsing enforcement
  if (result.role === 'global') {
    await logoutSession();
    revalidatePath('/', 'layout');
    redirect('/');
  }

  revalidatePath('/', 'layout');
  if (result.mustChangePassword) {
    redirect('/change-password');
  }
  if (result.role === 'staff') {
    redirect('/staff/dashboard');
  }
  redirect('/');
}

export async function changePasswordAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean } | null> {
  const next = String(formData.get('next') || '');
  const confirm = String(formData.get('confirm') || '');

  if (next !== confirm) return { error: 'รหัสผ่านใหม่ไม่ตรงกัน' };

  // OTP / first-login flow: no current password required (session already verified via OTP)
  const result = await changePasswordForced(next);
  if (!result.ok) return { error: result.error };

  revalidatePath('/', 'layout');
  const session = await readAuthSession();
  if (session?.role === 'staff') redirect('/staff/dashboard');
  redirect('/');
}

export async function logoutAction() {
  await logoutSession();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function updateAssignedZonesAction(formData: FormData) {
  const raw = String(formData.get('zones') || '[]');
  let zones: string[] = [];
  try {
    zones = JSON.parse(raw) as string[];
  } catch {
    return { error: 'รูปแบบเขตไม่ถูกต้อง' };
  }
  const result = await updateAssignedZones(zones);
  if (!result.ok) return { error: result.error };
  revalidatePath('/staff/profile');
  return { ok: true };
}

export async function issueTempPasswordAction(formData: FormData) {
  const userId = String(formData.get('userId') || '');
  const temp = String(formData.get('tempPassword') || '');
  const clearPermanent = formData.get('clearPermanent') === '1';
  const result = await issueTemporaryPassword(userId, temp, { clearPermanent });
  if (!result.ok) return { error: result.error };
  revalidatePath('/admin/settings');
  revalidatePath('/admin/accounts');
  return { ok: true };
}
