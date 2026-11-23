/** Site setting: ordered user_profile ids for About / admin overseer roster. */
export const OVERSEER_DISPLAY_ORDER_KEY = 'overseer_display_order';

export function parseOverseerDisplayOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Sort by saved display order. Unknown ids go after ordered ones,
 * then ประธานองคมนตรี, then Thai name.
 */
export function sortByOverseerDisplayOrder<
  T extends { id: string; position?: string | null; name?: string; full_name?: string },
>(items: T[], orderIds: string[]): T[] {
  const rank = new Map(orderIds.map((id, i) => [id, i]));
  const nameOf = (x: T) =>
    (x.name ?? x.full_name ?? '').trim() || x.id;

  return [...items].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;

    const aChair = (a.position ?? '').trim() === 'ประธานองคมนตรี' ? 0 : 1;
    const bChair = (b.position ?? '').trim() === 'ประธานองคมนตรี' ? 0 : 1;
    if (aChair !== bChair) return aChair - bChair;
    return nameOf(a).localeCompare(nameOf(b), 'th');
  });
}
