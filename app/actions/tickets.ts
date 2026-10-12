'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { isAdminRole, isFieldRole } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import {
  createTicket,
  listAllTickets,
  listTicketsForUser,
  updateTicketStatus,
} from '@/lib/auth/ticket-store';
import type { TicketStatus } from '@/lib/auth/ticket-types';

export async function createTicketAction(formData: FormData) {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isFieldRole(normalizeRole(profile.role))) {
    return { ok: false as const, error: 'ต้องเป็นเจ้าหน้าที่ภาคสนามที่ล็อกอินแล้ว' };
  }

  const school_id = String(formData.get('school_id') || '');
  const school_name = String(formData.get('school_name') || '').trim();
  const subject = String(formData.get('subject') || '');
  const detail = String(formData.get('detail') || '');
  if (!school_name || !subject.trim() || !detail.trim()) {
    return { ok: false as const, error: 'กรุณากรอกข้อมูลให้ครบ' };
  }

  const ticket = await createTicket({
    school_id: school_id || school_name,
    school_name,
    requester_id: profile.id,
    requester_name: profile.full_name ?? profile.email ?? profile.id,
    requester_role: profile.role,
    subject,
    detail,
  });

  revalidatePath('/tickets');
  revalidatePath('/admin/tickets');
  return { ok: true as const, ticket };
}

export async function updateTicketStatusAction(formData: FormData) {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isAdminRole(normalizeRole(profile.role))) {
    return { ok: false as const, error: 'ต้องเป็น Admin' };
  }
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'open') as TicketStatus;
  const admin_note = String(formData.get('admin_note') || '');
  if (!['open', 'in_progress', 'done', 'rejected'].includes(status)) {
    return { ok: false as const, error: 'สถานะไม่ถูกต้อง' };
  }
  if (status === 'rejected' && !admin_note.trim()) {
    return { ok: false as const, error: 'กรุณาระบุเหตุผลเมื่อปฏิเสธคำขอ' };
  }
  const result = await updateTicketStatus(id, status, admin_note);
  if (!result.ok) return result;
  revalidatePath('/admin/tickets');
  revalidatePath('/tickets');
  return { ok: true as const };
}

export async function loadMyTicketsAction() {
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile) return [];
  if (isAdminRole(normalizeRole(profile.role))) return listAllTickets();
  return listTicketsForUser(profile.id);
}
