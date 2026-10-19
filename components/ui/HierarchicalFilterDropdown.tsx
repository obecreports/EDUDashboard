'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type FilterTreeNode = {
  id: string;
  label: string;
  hint?: string;
  children?: FilterTreeNode[];
  /** Group header only — checkbox selects/deselects all selectable descendants */
  groupOnly?: boolean;
};

type Props = {
  label: string;
  tree: FilterTreeNode[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  emptyLabel?: string;
  className?: string;
};

/** Selectable person/place ids (excludes group-only headers) */
function collectSelectableIds(nodes: FilterTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (list: FilterTreeNode[]) => {
    for (const n of list) {
      if (!n.groupOnly) out.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function collectExpandableIds(nodes: FilterTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (list: FilterTreeNode[]) => {
    for (const n of list) {
      if (n.children?.length) {
        out.push(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/** Ids controlled by a node checkbox (group → all selectable descendants; else self) */
function idsForToggle(node: FilterTreeNode): string[] {
  if (node.groupOnly) {
    return collectSelectableIds(node.children ?? []);
  }
  return [node.id];
}

function findLabel(nodes: FilterTreeNode[], id: string): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.label;
    if (n.children?.length) {
      const hit = findLabel(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function HierarchicalFilterDropdown({
  label,
  tree,
  selected,
  onChange,
  emptyLabel = 'ทั้งหมด',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const allIds = useMemo(() => collectSelectableIds(tree), [tree]);
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);

  const summary =
    selected.size === 0
      ? emptyLabel
      : selected.size === 1
        ? findLabel(tree, [...selected][0]) || '1 รายการ'
        : `${selected.size} รายการ`;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNode = (node: FilterTreeNode) => {
    const ids = idsForToggle(node);
    if (ids.length === 0) return;
    const next = new Set(selected);
    const allOn = ids.every((id) => next.has(id));
    if (allOn) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onChange(next);
  };

  const nodeChecked = (node: FilterTreeNode) => {
    const ids = idsForToggle(node);
    if (ids.length === 0) return false;
    return ids.every((id) => selected.has(id));
  };

  const nodeIndeterminate = (node: FilterTreeNode) => {
    if (!node.groupOnly) return false;
    const ids = idsForToggle(node);
    if (ids.length === 0) return false;
    const n = ids.filter((id) => selected.has(id)).length;
    return n > 0 && n < ids.length;
  };

  const renderNode = (node: FilterTreeNode, depth: number) => {
    const hasKids = Boolean(node.children?.length);
    const isOpen = expanded.has(node.id);
    const checked = nodeChecked(node);
    const indeterminate = nodeIndeterminate(node);
    return (
      <div key={node.id} className="so-filter-tree__node">
        <div
          className="so-filter-dd__item so-filter-tree__row"
          style={{ paddingLeft: `${0.35 + depth * 0.75}rem` }}
        >
          {hasKids ? (
            <button
              type="button"
              className="so-filter-tree__exp"
              aria-label={isOpen ? 'ยุบ' : 'ขยาย'}
              aria-expanded={isOpen}
              onClick={() => toggleExpand(node.id)}
            >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="so-filter-tree__exp-spacer" aria-hidden />
          )}
          <label className="so-filter-tree__check">
            <input
              type="checkbox"
              checked={checked}
              ref={(el) => {
                if (el) el.indeterminate = indeterminate;
              }}
              onChange={() => toggleNode(node)}
            />
            <span>
              {node.label}
              {node.hint ? <em>{node.hint}</em> : null}
            </span>
          </label>
        </div>
        {hasKids && isOpen
          ? node.children!.map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  };

  return (
    <div className={`so-filter-dd ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="so-filter-dd__btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="so-filter-dd__label">{label}</span>
        <span className="so-filter-dd__value">{summary}</span>
        <ChevronDown size={14} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="so-filter-dd__menu" role="listbox" aria-multiselectable>
          <div className="so-filter-dd__actions">
            <button type="button" onClick={() => onChange(new Set())}>
              ล้าง
            </button>
            <button type="button" onClick={() => onChange(new Set(allIds))}>
              เลือกทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setExpanded(new Set(expandableIds))}
            >
              ขยายทั้งหมด
            </button>
            <button type="button" onClick={() => setExpanded(new Set())}>
              ยุบทั้งหมด
            </button>
          </div>
          <div className="so-filter-dd__list">
            {tree.length === 0 ? (
              <p className="text-xs text-slate-500 m-0 px-2 py-1">ไม่มีรายการ</p>
            ) : (
              tree.map((n) => renderNode(n, 0))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
