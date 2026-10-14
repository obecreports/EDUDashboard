'use client';

import { useEffect, useState } from 'react';
import { formatThaiDate, parseThaiDateToYmd } from '@/lib/format/date';

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
};

/**
 * Date field that displays / accepts DD/MM/YYYY (Buddhist Era).
 * Value in/out is always YYYY-MM-DD (A.D.) for storage and comparisons.
 */
export function ThaiDateField({
  value,
  onChange,
  className = 'form-input',
  required,
  name,
  id,
  disabled,
  hint = 'วว/ดด/ปปปป (พ.ศ.)',
}: Props) {
  const [text, setText] = useState(() => (value ? formatThaiDate(value) : ''));

  useEffect(() => {
    setText(value ? formatThaiDate(value) : '');
  }, [value]);

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

  return (
    <div className="thai-date-field">
      {/* Hidden CE value for native form posts (name=date → YYYY-MM-DD) */}
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="วว/ดด/ปปปป"
        className={className}
        id={id}
        required={required && !name}
        disabled={disabled}
        value={text === '—' ? '' : text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(text);
          }
        }}
        aria-describedby={hint ? `${id || name || 'thai-date'}-hint` : undefined}
      />
      {hint ? (
        <span id={`${id || name || 'thai-date'}-hint`} className="thai-date-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
