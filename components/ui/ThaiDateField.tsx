'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatThaiDate, parseThaiDateToYmd } from '@/lib/format/date';
import { ScheduleDateCalendar } from '@/components/calendar/ScheduleDateCalendar';

type Props = {
  /** ISO date YYYY-MM-DD (Christian Era) */
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
  /** Shown under the field */
  hint?: string;
  /** Optional min date for calendar (YYYY-MM-DD) */
  minDate?: string;
};

/**
 * Date field that displays DD/MM/YYYY (Buddhist Era).
 * Click the field or calendar icon to open a mini month calendar.
 * Value in/out is always YYYY-MM-DD (A.D.) for storage.
 */
export function ThaiDateField({
  value,
  onChange,
  className = 'form-input',
  required,
  name,
  id,
  disabled,
  hint = 'คลิกเพื่อเลือกจากปฏิทิน หรือพิมพ์ วว/ดด/ปปปป (พ.ศ.)',
  minDate,
}: Props) {
  const autoId = useId();
  const fieldId = id || name || autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => (value ? formatThaiDate(value) : ''));

  useEffect(() => {
    setText(value ? formatThaiDate(value) : '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (!required) {
        onChange('');
        setText('');
      } else {
        setText(value ? formatThaiDate(value) : '');
      }
      return;
    }
    const ymd = parseThaiDateToYmd(trimmed);
    if (ymd) {
      onChange(ymd);
      setText(formatThaiDate(ymd));
      return;
    }
    setText(value ? formatThaiDate(value) : '');
  };

  const pickFromCal = (ymd: string) => {
    onChange(ymd);
    setText(formatThaiDate(ymd));
    setOpen(false);
  };

  return (
    <div className="thai-date-field" ref={rootRef}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div className="thai-date-field__control">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="วว/ดด/ปปปป"
          className={`${className} thai-date-field__input`}
          id={fieldId}
          required={required && !name}
          disabled={disabled}
          value={text === '—' ? '' : text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={() => commit(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(text);
              setOpen(false);
            }
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
        />
        <button
          type="button"
          className="thai-date-field__cal-btn"
          disabled={disabled}
          aria-label="เปิดปฏิทิน"
          onClick={() => {
            if (!disabled) setOpen((v) => !v);
          }}
        >
          <CalendarDays size={18} />
        </button>
      </div>

      {open && !disabled ? (
        <div
          className="thai-date-field__popover"
          role="dialog"
          aria-label="เลือกวันที่"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ScheduleDateCalendar
            value={value}
            onChange={pickFromCal}
            minDate={minDate}
          />
        </div>
      ) : null}

      {hint ? (
        <span id={`${fieldId}-hint`} className="thai-date-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
