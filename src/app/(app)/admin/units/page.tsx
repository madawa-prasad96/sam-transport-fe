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
import type { Unit } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const EMPTY = {
  name: '',
  code: '',
  registrationNumber: '',
  addressLine: '',
  country: 'Sri Lanka',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  timezone: 'Asia/Colombo',
};

export default function AdminUnitsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'units', { search, status }],
    queryFn: () => get<Unit[]>(`/units${qs({ search, status })}`),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'units'] });

  const create = useMutation({
    mutationFn: () =>
      post('/units', {
        ...form,
        registrationNumber: form.registrationNumber || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY);
      invalidate();
    },
  });

  const setUnitStatus = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      patch(`/units/${id}/status`, { status: value }),
    onSuccess: invalidate,
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Units</h1>
          <p className="text-sm text-slate-500">
            Plants, departments and internally-named entities. Any active unit
            can raise a transport inquiry with any other.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Add a unit</Button>
      </div>

      {setUnitStatus.isError && (
        <Alert>{(setUnitStatus.error as Error).message}</Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or code…"
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
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {isLoading && <Spinner />}

      {data && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Unit</th>
                  <th className="px-4 py-2.5 font-medium">Primary contact</th>
                  <th className="px-4 py-2.5 font-medium">People</th>
                  <th className="px-4 py-2.5 font-medium">Inquiries</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {unit.name}
                        </span>
                        <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
                          {unit.code}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {unit.country} · added {formatDate(unit.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">
                        {unit.primaryContactName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {unit.primaryContactEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {unit._count?.users ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {(unit._count?.requestedInquiries ?? 0) +
                        (unit._count?.providedInquiries ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          STATUS_STYLES[unit.status] ??
                          'bg-slate-100 text-slate-600 ring-slate-200'
                        }
                      >
                        {unit.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        loading={
                          setUnitStatus.isPending &&
                          setUnitStatus.variables?.id === unit.id
                        }
                        onClick={() =>
                          setUnitStatus.mutate({
                            id: unit.id,
                            value:
                              unit.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                      >
                        {unit.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        A unit with inquiries still in progress cannot be deactivated — close or
        cancel them first, so nothing is stranded mid-shipment.
      </p>

      <Modal open={open} title="Add a unit" onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          {create.isError && <Alert>{(create.error as Error).message}</Alert>}
          <p className="text-sm text-slate-500">
            A plant, a department, or an internally-named entity such as SAM
            Lotus — all the same kind of record. Invite its people afterwards
            from the Team screen.
          </p>
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field label="Unit name" required>
              <Input
                required
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                placeholder="SAM Lotus"
              />
            </Field>
            <Field label="Code" required hint="Short, e.g. LOTUS">
              <Input
                required
                value={form.code}
                onChange={(e) => set('code')(e.target.value.toUpperCase())}
                placeholder="LOTUS"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country" required>
              <Input
                required
                value={form.country}
                onChange={(e) => set('country')(e.target.value)}
              />
            </Field>
            <Field label="Timezone">
              <Input
                value={form.timezone}
                onChange={(e) => set('timezone')(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Primary contact name" required>
            <Input
              required
              value={form.primaryContactName}
              onChange={(e) => set('primaryContactName')(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contact email"
              required
              hint="Copied on inquiries addressed to this unit."
            >
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
