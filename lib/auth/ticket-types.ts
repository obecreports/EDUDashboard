/** Client-safe ticket types & labels (no next/headers) */

export type TicketStatus = 'open' | 'in_progress' | 'done' | 'rejected';

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'คำขอถูกส่งแล้ว',
  in_progress: 'คำขอกำลังดำเนินการแก้ไข',
  done: 'คำขอได้รับการปรับปรุงข้อมูลแล้ว',
  rejected: 'คำขอถูกปฏิเสธ',
};

export type DataTicket = {
  id: string;
  school_id: string;
  school_name: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  subject: string;
  detail: string;
  status: TicketStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
};
