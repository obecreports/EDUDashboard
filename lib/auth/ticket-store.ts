import { isDbOnlyMode } from '@/lib/auth/db-mode';
import { TICKETS_COOKIE } from '@/lib/auth/mock-users';
import {
  readJsonCookie,
  writeJsonCookieWithShrink,
} from '@/lib/auth/cookie-json';
import type { DataTicket, TicketStatus } from '@/lib/auth/ticket-types';
import {
  fetchAllTickets,
  insertTicket,
  patchTicketStatus,
} from '@/lib/supabase/tickets';

export type { DataTicket, TicketStatus } from '@/lib/auth/ticket-types';
export { TICKET_STATUS_LABEL } from '@/lib/auth/ticket-types';

async function readTicketsCookie(): Promise<DataTicket[]> {
  return readJsonCookie<DataTicket[]>(TICKETS_COOKIE, []);
}

async function writeTicketsCookie(tickets: DataTicket[]) {
  await writeJsonCookieWithShrink(TICKETS_COOKIE, tickets, (cur) =>
    cur.length > 1 ? cur.slice(0, -1) : null
  );
}

export async function listAllTickets(): Promise<DataTicket[]> {
  if (isDbOnlyMode()) {
    return fetchAllTickets();
  }
  const tickets = await readTicketsCookie();
  return tickets.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listTicketsForUser(userId: string): Promise<DataTicket[]> {
  const tickets = await listAllTickets();
  return tickets.filter((t) => t.requester_id === userId);
}

export async function createTicket(input: {
  school_id: string;
  school_name: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  subject: string;
  detail: string;
}): Promise<DataTicket> {
  if (isDbOnlyMode()) {
    const res = await insertTicket(input);
    if (!res.ok) throw new Error(res.error);
    return res.ticket;
  }

  const tickets = await readTicketsCookie();
  const now = new Date().toISOString();
  const row: DataTicket = {
    id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    school_id: input.school_id,
    school_name: input.school_name,
    requester_id: input.requester_id,
    requester_name: input.requester_name,
    requester_role: input.requester_role,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    status: 'open',
    admin_note: '',
    created_at: now,
    updated_at: now,
  };
  tickets.unshift(row);
  await writeTicketsCookie(tickets);
  return row;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  admin_note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDbOnlyMode()) {
    return patchTicketStatus(ticketId, status, admin_note);
  }

  const tickets = await readTicketsCookie();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx < 0) return { ok: false, error: 'ไม่พบตั๋ว' };
  tickets[idx] = {
    ...tickets[idx],
    status,
    admin_note: admin_note ?? tickets[idx].admin_note,
    updated_at: new Date().toISOString(),
  };
  await writeTicketsCookie(tickets);
  return { ok: true };
}
