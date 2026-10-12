'use client';

import { useMemo, useState, useTransition } from 'react';
import { updateTicketStatusAction } from '@/app/actions/tickets';
import {
  TICKET_STATUS_LABEL,
  type DataTicket,
  type TicketStatus,
} from '@/lib/auth/ticket-types';

type Tab = 'pending' | 'done';

const PENDING: TicketStatus[] = ['open', 'in_progress'];
const DONE: TicketStatus[] = ['done', 'rejected'];

export function AdminTicketsClient({ tickets: initial }: { tickets: DataTicket[] }) {
  const [tickets, setTickets] = useState(initial);
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      tickets.filter((t) => (tab === 'pending' ? PENDING.includes(t.status) : DONE.includes(t.status))),
    [tickets, tab]
  );

  const pendingCount = tickets.filter((t) => PENDING.includes(t.status)).length;
  const doneCount = tickets.filter((t) => DONE.includes(t.status)).length;

  return (
    <div className="grid gap-4">
      <div className="score-mode-switch w-fit" role="tablist">
        <button
          type="button"
          className={tab === 'pending' ? 'is-active' : ''}
          onClick={() => setTab('pending')}
        >
          คำขอรอดำเนินการ ({pendingCount})
        </button>
        <button
          type="button"
          className={tab === 'done' ? 'is-active' : ''}
          onClick={() => setTab('done')}
        >
          เสร็จสิ้น / ปฏิเสธ ({doneCount})
        </button>
      </div>

      {visible.length === 0 && (
        <div className="ed-card p-4 text-slate-500">
          {tab === 'pending' ? 'ไม่มีคำขอที่รอดำเนินการ' : 'ยังไม่มีคำขอที่ปิดแล้ว'}
        </div>
      )}

      {visible.map((t) => (
        <article key={t.id} className="ed-card p-4 grid gap-2">
          <div className="flex flex-wrap justify-between gap-2">
            <strong className="text-tm-blue">{t.subject}</strong>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100">
              {TICKET_STATUS_LABEL[t.status] ?? t.status}
            </span>
          </div>
          <p className="text-sm m-0">{t.school_name}</p>
          <p className="text-sm whitespace-pre-wrap m-0">{t.detail}</p>
          <p className="text-xs text-slate-500 m-0">
            {t.requester_name} ({t.requester_role}) ·{' '}
            {new Date(t.created_at).toLocaleString('th-TH')}
          </p>
          {t.status === 'rejected' && t.admin_note && (
            <p className="text-sm m-0 p-2 rounded bg-rose-50 text-rose-900 border border-rose-100">
              เหตุผลที่ปฏิเสธ: {t.admin_note}
            </p>
          )}
          {t.status !== 'rejected' && t.admin_note && (
            <p className="text-sm m-0 p-2 rounded bg-amber-50 text-amber-900">
              หมายเหตุ: {t.admin_note}
            </p>
          )}
          <form
            className="flex flex-wrap gap-2 items-end mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const status = String(fd.get('status') || '') as TicketStatus;
              const note = String(fd.get('admin_note') || '').trim();
              if (status === 'rejected' && !note) {
                alert('กรุณาระบุเหตุผลเมื่อปฏิเสธคำขอ');
                return;
              }
              startTransition(async () => {
                const res = await updateTicketStatusAction(fd);
                if (res.ok) {
                  setTickets((prev) =>
                    prev.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            status,
                            admin_note: note || x.admin_note,
                            updated_at: new Date().toISOString(),
                          }
                        : x
                    )
                  );
                }
              });
            }}
          >
            <input type="hidden" name="id" value={t.id} />
            <label className="grid gap-1 text-xs">
              สถานะ
              <select name="status" className="border rounded px-2 py-1" defaultValue={t.status}>
                <option value="open">{TICKET_STATUS_LABEL.open}</option>
                <option value="in_progress">{TICKET_STATUS_LABEL.in_progress}</option>
                <option value="done">{TICKET_STATUS_LABEL.done}</option>
                <option value="rejected">{TICKET_STATUS_LABEL.rejected}</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs flex-1 min-w-[180px]">
              หมายเหตุ / เหตุผลปฏิเสธ
              <input
                name="admin_note"
                className="border rounded px-2 py-1"
                defaultValue={t.admin_note}
                placeholder="จำเป็นเมื่อปฏิเสธ"
              />
            </label>
            <button type="submit" className="ed-btn ed-btn--primary ed-btn--sm" disabled={pending}>
              อัปเดต
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
