'use client';

import { useState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';

const INVALID_LOGIN_MSG = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';

export function LoginFormClient() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="panel-card space-y-4"
      data-no-pending="1"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        const fd = new FormData();
        fd.set('login', login.trim());
        fd.set('password', password);
        setSubmitting(true);
        void (async () => {
          try {
            const res = await loginAction(null, fd);
            if (res?.error) {
              setPassword('');
              setError(INVALID_LOGIN_MSG);
              setSubmitting(false);
              return;
            }
            if (res?.redirectTo) {
              window.location.assign(res.redirectTo);
              return;
            }
            setSubmitting(false);
          } catch {
            setPassword('');
            setError(INVALID_LOGIN_MSG);
            setSubmitting(false);
          }
        })();
      }}
    >
      <label className="block text-sm">
        รหัสผู้ใช้
        <input
          name="login"
          type="text"
          className="form-input"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder=""
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
      <PasswordField
        name="password"
        label="รหัสผ่าน"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="navbar__login w-full justify-center"
        disabled={submitting}
      >
        {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
