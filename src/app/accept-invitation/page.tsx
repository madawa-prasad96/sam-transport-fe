'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Alert, Button, Field, Input, Spinner } from '@/components/ui';
import { post } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

function AcceptInvitationForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [mismatch, setMismatch] = useState(false);

  const accept = useMutation({
    mutationFn: () =>
      post<{ user: AuthUser }>('/auth/accept-invitation', {
        token,
        password: form.password,
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
      }),
    onSuccess: () => router.replace('/inquiries'),
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  if (!token) {
    return (
      <Alert>
        This invitation link is missing its token. Please use the link exactly as
        it appears in your email.
      </Alert>
    );
  }

  return (
    <form
      className="space-y-5 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.password !== form.confirm) {
          setMismatch(true);
          return;
        }
        setMismatch(false);
        accept.mutate();
      }}
    >
      {accept.isError && <Alert>{(accept.error as Error).message}</Alert>}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Your details</h2>
        <Field label="Full name">
          <Input
            value={form.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            placeholder="As it should appear on inquiries"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          required
          hint="At least 10 characters."
          error={mismatch ? 'Passwords do not match' : undefined}
        >
          <Input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password')(e.target.value)}
          />
        </Field>
        <Field label="Confirm password" required>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => set('confirm')(e.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" loading={accept.isPending} className="w-full">
        Accept invitation
      </Button>
    </form>
  );
}

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Set up your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set a password to finish setting up your SAM Transport account.
          </p>
        </div>
        <Suspense fallback={<Spinner />}>
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </main>
  );
}
