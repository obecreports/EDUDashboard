import { createClient } from '@/lib/supabase/server';
import type { DataTicket, TicketStatus } from '@/lib/auth/ticket-types';

type TicketRow = {
  id: string;
  school_id: number | string | null;
  school_name: string | null;
  requester_id: string | null;
  requester_name: string | null;
  requester_role: string | null;
  subject: string;
  detail: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: TicketRow): DataTicket {
  return {
    id: row.id,
    school_id: row.school_id != null ? String(row.school_id) : '',
    school_name: row.school_name ?? '',
    requester_id: row.requester_id ?? '',
    requester_name: row.requester_name ?? '',
    requester_role: row.requester_role ?? '',
    subject: row.subject,
    detail: row.detail ?? '',
    status: row.status as TicketStatus,
    admin_note: row.admin_note ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT =
  'id, school_id, school_name, requester_id, requester_name, requester_role, subject, detail, status, admin_note, created_at, updated_at';

export async function fetchAllTickets(): Promise<DataTicket[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('data_tickets')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as TicketRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function insertTicket(input: {
  school_id: string;
  school_name: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  subject: string;
  detail: string;
}): Promise<{ ok: true; ticket: DataTicket } | { ok: false; error: string }> {
  const schoolNum = Number(String(input.school_id).trim());
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('data_tickets')
      .insert({
        school_id: Number.isFinite(schoolNum) ? schoolNum : null,
        school_name: input.school_name,
        requester_id: input.requester_id || null,
        requester_name: input.requester_name,
        requester_role: input.requester_role,
        subject: input.subject.trim(),
        detail: input.detail.trim(),
        status: 'open',
        admin_note: '',
      })
      .select(SELECT)
      .single();
    if (error || !data) return { ok: false, error: error?.message || 'สร้างคำขอไม่สำเร็จ' };
    return { ok: true, ticket: mapRow(data as TicketRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'สร้างคำขอไม่สำเร็จ' };
  }
}

export async function patchTicketStatus(
  ticketId: string,
  status: TicketStatus,
  admin_note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const body: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (admin_note !== undefined) body.admin_note = admin_note;
    const { error } = await supabase.from('data_tickets').update(body).eq('id', ticketId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'อัปเดตคำขอไม่สำเร็จ' };
  }
}
