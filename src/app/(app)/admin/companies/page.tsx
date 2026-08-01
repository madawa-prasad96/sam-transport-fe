'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '@/components/ui';
import { get, patch, post, qs } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Company } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  SUSPENDED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    registrationNumber: '',
    addressLine: '',
    country: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    timezone: 'UTC',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'companies', { search, status }],
    queryFn: () => get<Company[]>(`/companies${qs({ search, status })}`),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });

  const register = useMutation({
    mutationFn: () =>
      post('/companies', {
        ...form,
        registrationNumber: form.registrationNumber || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({
        name: '',
        registrationNumber: '',
        addressLine: '',
        country: '',
        primaryContactName: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        timezone: 'UTC',
      });
      invalidate();
    },
  });

  const setCompanyStatus = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      patch(`/companies/${id}/status`, { status: value }),
    onSuccess: invalidate,
  });

  const resend = useMutation({
    mutationFn: (id: string) => post(`/companies/${id}/resend-invitation`),
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">
            Platform administration. Inquiry contents are not visible here — only
            the companies themselves can read those.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Register a company</Button>
      </div>

      {resend.isSuccess && (
        <Alert tone="success">Invitation email re-sent.</Alert>
      )}
      {setCompanyStatus.isError && (
        <Alert>{(setCompanyStatus.error as Error).message}</Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search company name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-44"
        >
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>

      {isLoading && <Spinner />}

      {data && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Company</th>
                  <th className="px-4 py-2.5 font-medium">Primary contact</th>
                  <th className="px-4 py-2.5 font-medium">Users</th>
                  <th className="px-4 py-2.5 font-medium">Inquiries</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {company.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {company.country} · joined {formatDate(company.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">
                        {company.primaryContactName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {company.primaryContactEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {company._count?.users ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {(company._count?.requestedInquiries ?? 0) +
                        (company._count?.providedInquiries ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          STATUS_STYLES[company.status] ??
                          'bg-slate-100 text-slate-600 ring-slate-200'
                        }
                      >
                        {company.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {company.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          onClick={() => resend.mutate(company.id)}
                        >
                          Resend invite
                        </Button>
                      )}
                      {company.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setCompanyStatus.mutate({
                              id: company.id,
                              value: 'SUSPENDED',
                            })
                          }
                        >
                          Suspend
                        </Button>
                      )}
                      {company.status === 'SUSPENDED' && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setCompanyStatus.mutate({
                              id: company.id,
                              value: 'ACTIVE',
                            })
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={open}
        title="Register a company"
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          {register.isError && (
            <Alert>{(register.error as Error).message}</Alert>
          )}
          <p className="text-sm text-slate-500">
            The primary contact becomes the company&apos;s first admin and
            receives an invitation email. The company activates when they accept.
          </p>
          <Field label="Company name" required>
            <Input
              required
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration number">
              <Input
                value={form.registrationNumber}
                onChange={(e) => set('registrationNumber')(e.target.value)}
              />
            </Field>
            <Field label="Country" required>
              <Input
                required
                value={form.country}
                onChange={(e) => set('country')(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Address" required>
            <Input
              required
              value={form.addressLine}
              onChange={(e) => set('addressLine')(e.target.value)}
            />
          </Field>
          <Field label="Primary contact name" required>
            <Input
              required
              value={form.primaryContactName}
              onChange={(e) => set('primaryContactName')(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" required>
              <Input
                type="email"
                required
                value={form.primaryContactEmail}
                onChange={(e) => set('primaryContactEmail')(e.target.value)}
              />
            </Field>
            <Field label="Contact phone" required>
              <Input
                required
                value={form.primaryContactPhone}
                onChange={(e) => set('primaryContactPhone')(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Timezone">
            <Input
              value={form.timezone}
              onChange={(e) => set('timezone')(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={register.isPending}>
              Register and invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
