'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
} from '@/components/ui';
import { get, patch } from '@/lib/api';
import type { Company } from '@/lib/types';

export default function CompanyPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<Company>>({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: () => get<Company>('/companies/me'),
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      patch<Company>('/companies/me', {
        name: form.name,
        registrationNumber: form.registrationNumber || undefined,
        addressLine: form.addressLine,
        country: form.country,
        primaryContactName: form.primaryContactName,
        primaryContactEmail: form.primaryContactEmail,
        primaryContactPhone: form.primaryContactPhone,
        timezone: form.timezone,
        defaultWeightUom: form.defaultWeightUom,
      }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const set = (key: keyof Company) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  if (isLoading) return <Spinner />;

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Company profile</h1>
        <p className="text-sm text-slate-500">
          The primary contact receives inquiries addressed to your company.
        </p>
      </div>

      {save.isError && <Alert>{(save.error as Error).message}</Alert>}
      {saved && <Alert tone="success">Company profile saved.</Alert>}

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <Input
              required
              value={form.name ?? ''}
              onChange={(e) => set('name')(e.target.value)}
            />
          </Field>
          <Field label="Registration number">
            <Input
              value={form.registrationNumber ?? ''}
              onChange={(e) => set('registrationNumber')(e.target.value)}
            />
          </Field>
          <Field label="Address" required className="sm:col-span-2">
            <Input
              required
              value={form.addressLine ?? ''}
              onChange={(e) => set('addressLine')(e.target.value)}
            />
          </Field>
          <Field label="Country" required>
            <Input
              required
              value={form.country ?? ''}
              onChange={(e) => set('country')(e.target.value)}
            />
          </Field>
          <Field label="Timezone" hint="e.g. Asia/Colombo, Europe/London">
            <Input
              value={form.timezone ?? ''}
              onChange={(e) => set('timezone')(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Primary contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input
              required
              value={form.primaryContactName ?? ''}
              onChange={(e) => set('primaryContactName')(e.target.value)}
            />
          </Field>
          <Field
            label="Email"
            required
            hint="Automatically copied on inquiries addressed to your company."
          >
            <Input
              type="email"
              required
              value={form.primaryContactEmail ?? ''}
              onChange={(e) => set('primaryContactEmail')(e.target.value)}
            />
          </Field>
          <Field label="Phone" required>
            <Input
              required
              value={form.primaryContactPhone ?? ''}
              onChange={(e) => set('primaryContactPhone')(e.target.value)}
            />
          </Field>
          <Field label="Default weight unit">
            <Select
              value={form.defaultWeightUom ?? 'KG'}
              onChange={(e) => set('defaultWeightUom')(e.target.value)}
            >
              <option value="KG">Kilograms</option>
              <option value="LB">Pounds</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
