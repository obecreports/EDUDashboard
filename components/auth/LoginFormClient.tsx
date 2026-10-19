'use client';

import { useState, useTransition } from 'react';
import { loginAction } from '@/app/actions/auth';
import { PasswordField } from '@/components/auth/PasswordField';

const INVALID_LOGIN_MSG = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';

export function LoginFormClient() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel-card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set('login', login.trim());
        fd.set('password', password);
        start(async () => {
          const res = await loginAction(null, fd);
          if (res?.error) {
            setPassword('');
            setError(INVALID_LOGIN_MSG);
          }
        });
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
          placeholder="OS10 / OS10T01 / staff03"
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
      <button type="submit" className="navbar__login w-full justify-center" disabled={pending}>
        {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
