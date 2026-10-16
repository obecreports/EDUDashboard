'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ChangeEventHandler } from 'react';

/** Password field with show/hide; toggle is tabindex=-1 so Tab skips to next control */
export function PasswordField({
  name,
  label,
  required,
  minLength,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  const controlled = value !== undefined;

  return (
    <label className="block text-sm">
      {label}
      <div className="password-field">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          className="form-input"
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...(controlled ? { value, onChange } : {})}
        />
        <button
          type="button"
          className="password-toggle"
          tabIndex={-1}
          aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          onClick={() => setShow((v) => !v)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
