'use client';

import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useLogin } from '@/lib/auth';

export default function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Transport Inquiry Platform
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to raise and track transport inquiries.
          </p>
        </div>

        <form
          className="space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate({ email, password });
          }}
        >
          {login.isError && (
            <Alert>{(login.error as Error).message}</Alert>
          )}

          <Field label="Email" required>
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </Field>

          <Field label="Password" required>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" loading={login.isPending} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Invited by a company? Use the link in your invitation email to set a
          password.
        </p>
      </div>
    </main>
  );
}
