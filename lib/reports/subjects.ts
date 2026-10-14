import { REPORT_SUBJECTS } from '@/lib/types';

export type ReportSubjectKey = (typeof REPORT_SUBJECTS)[number]['key'];
export type ReportSubjectDetails = Record<ReportSubjectKey, string>;

export function emptySubjectDetails(): ReportSubjectDetails {
  return {
    good: '',
    improve: '',
    suggest: '',
    praise: '',
  };
}

/** Assemble one comment body; empty subjects are omitted. */
export function assembleReportComment(details: ReportSubjectDetails): string {
  return REPORT_SUBJECTS.map((s) => {
    const body = (details[s.key] ?? '').trim();
    if (!body) return null;
    return `- ${s.label}\n${body}`;
  })
    .filter(Boolean)
    .join('\n\n');
}

/** Best-effort parse of a saved guided comment back into subject fields. */
export function parseReportComment(text: string): ReportSubjectDetails {
  const out = emptySubjectDetails();
  const raw = text.trim();
  if (!raw) return out;

  const labels = REPORT_SUBJECTS.map((s) => s.label);
  const pattern = new RegExp(
    `(?:^|\\n)-\\s*(${labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*\\n?`,
    'g'
  );
  const matches = [...raw.matchAll(pattern)];
  if (!matches.length) {
    out.good = raw;
    return out;
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const label = m[1];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
    const body = raw.slice(start, end).trim();
    const subject = REPORT_SUBJECTS.find((s) => s.label === label);
    if (subject) out[subject.key] = body;
  }
  return out;
}

export function hasAnySubjectDetail(details: ReportSubjectDetails): boolean {
  return REPORT_SUBJECTS.some((s) => (details[s.key] ?? '').trim().length > 0);
}
