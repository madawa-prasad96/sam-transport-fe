'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { get, post } from '@/lib/api';
import { humanise } from '@/lib/format';
import {
  PACKAGING_TYPES,
  VEHICLE_TYPES,
  type Inquiry,
} from '@/lib/types';

interface FormState {
  providerUnitId: string;
  pickupLocation: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryLocation: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  readyByAt: string;
  requiredByAt: string;
  cargoDescription: string;
  packageCount: string;
  grossWeight: string;
  weightUom: string;
  volumeCbm: string;
  dimensions: string;
  packagingType: string;
  requestedVehicleType: string;
  referenceNumber: string;
  priority: string;
  specialHandlingNotes: string;
}

const INITIAL: FormState = {
  providerUnitId: '',
  pickupLocation: '',
  pickupContactName: '',
  pickupContactPhone: '',
  deliveryLocation: '',
  deliveryContactName: '',
  deliveryContactPhone: '',
  readyByAt: '',
  requiredByAt: '',
  cargoDescription: '',
  packageCount: '1',
  grossWeight: '',
  weightUom: 'KG',
  volumeCbm: '',
  dimensions: '',
  packagingType: '',
  requestedVehicleType: '',
  referenceNumber: '',
  priority: 'NORMAL',
  specialHandlingNotes: '',
};

interface CopyRow {
  email: string;
  name: string;
  type: 'CC' | 'BCC';
}

export default function NewInquiryPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [copies, setCopies] = useState<CopyRow[]>([]);
  const [copyDraft, setCopyDraft] = useState<CopyRow>({
    email: '',
    name: '',
    type: 'CC',
  });

  const addCopy = () => {
    const email = copyDraft.email.trim().toLowerCase();
    if (!email) return;
    if (copies.some((row) => row.email.toLowerCase() === email)) return;
    setCopies((previous) => [...previous, { ...copyDraft, email }]);
    setCopyDraft({ email: '', name: '', type: copyDraft.type });
  };

  const { data: units, isLoading } = useQuery({
    queryKey: ['units', 'addressable'],
    queryFn: () =>
      get<{ id: string; name: string; code: string }[]>('/units/addressable'),
  });

  const buildPayload = () => ({
    providerUnitId: form.providerUnitId,
    pickupLocation: form.pickupLocation,
    pickupContactName: form.pickupContactName,
    pickupContactPhone: form.pickupContactPhone,
    deliveryLocation: form.deliveryLocation,
    deliveryContactName: form.deliveryContactName,
    deliveryContactPhone: form.deliveryContactPhone,
    readyByAt: new Date(form.readyByAt).toISOString(),
    requiredByAt: new Date(form.requiredByAt).toISOString(),
    cargoDescription: form.cargoDescription,
    packageCount: Number(form.packageCount),
    grossWeight: Number(form.grossWeight),
    weightUom: form.weightUom,
    volumeCbm: form.volumeCbm ? Number(form.volumeCbm) : undefined,
    dimensions: form.dimensions || undefined,
    packagingType: form.packagingType || undefined,
    requestedVehicleType: form.requestedVehicleType || undefined,
    referenceNumber: form.referenceNumber || undefined,
    priority: form.priority,
    specialHandlingNotes: form.specialHandlingNotes || undefined,
    recipients: copies.length
      ? copies.map((row) => ({
          email: row.email,
          name: row.name || undefined,
          type: row.type,
        }))
      : undefined,
  });

  const create = useMutation({
    mutationFn: async (submitNow: boolean) => {
      const inquiry = await post<Inquiry>('/inquiries', buildPayload());
      if (submitNow) await post(`/inquiries/${inquiry.id}/submit`);
      return inquiry;
    },
    onSuccess: (inquiry) => router.push(`/inquiries/${inquiry.id}`),
  });

  const set = (key: keyof FormState) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  if (isLoading) return <Spinner />;

  const noUnits = !units?.length;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(true);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">New inquiry</h1>
          <p className="text-sm text-slate-500">
            Structured details up front mean fewer clarification emails later.
          </p>
        </div>
        <Link href="/inquiries">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      {create.isError && <Alert>{(create.error as Error).message}</Alert>}

      {noUnits && (
        <Alert tone="warning">
          There are no other active units to address this to. Ask an org admin
          to add one.
        </Alert>
      )}

      <Card title="Who is this for">
        <Field label="Send to" required>
          <Select
            required
            value={form.providerUnitId}
            onChange={(e) => set('providerUnitId')(e.target.value)}
          >
            <option value="">Select a unit…</option>
            {units?.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card
        title="Who else should be copied"
        action={
          <span className="text-xs font-normal text-slate-500">
            Optional
          </span>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Anyone added here is copied on the submission email and every update
            after it. They do not need an account — an email address is enough.
          </p>

          {copies.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-md ring-1 ring-slate-200">
              {copies.map((row) => (
                <li
                  key={row.email}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <span
                    className={
                      row.type === 'BCC'
                        ? 'rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800'
                        : 'rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600'
                    }
                  >
                    {row.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {row.name ? `${row.name} · ` : ''}
                    {row.email}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCopies((previous) =>
                        previous.filter((item) => item.email !== row.email),
                      )
                    }
                    className="text-xs text-slate-400 hover:text-rose-600"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end">
            <Field label="Email">
              <Input
                type="email"
                value={copyDraft.email}
                onChange={(e) =>
                  setCopyDraft((previous) => ({
                    ...previous,
                    email: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Enter here must not submit the whole inquiry.
                    e.preventDefault();
                    addCopy();
                  }
                }}
                placeholder="warehouse@company.com"
              />
            </Field>
            <Field label="Name">
              <Input
                value={copyDraft.name}
                onChange={(e) =>
                  setCopyDraft((previous) => ({
                    ...previous,
                    name: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Type">
              <Select
                value={copyDraft.type}
                onChange={(e) =>
                  setCopyDraft((previous) => ({
                    ...previous,
                    type: e.target.value as 'CC' | 'BCC',
                  }))
                }
              >
                <option value="CC">CC</option>
                <option value="BCC">BCC</option>
              </Select>
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={addCopy}
              disabled={!copyDraft.email.trim()}
            >
              Add
            </Button>
          </div>

          {copies.some((row) => row.type === 'BCC') && (
            <Alert tone="warning">
              BCC recipients are hidden from everyone else on this inquiry,
              including the company you are sending it to. The addition is still
              recorded in the audit log, and if a BCC recipient replies, their
              reply is held for review rather than posted.
            </Alert>
          )}
        </div>
      </Card>

      <Card title="Route">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pickup location" required className="sm:col-span-2">
            <Input
              required
              value={form.pickupLocation}
              onChange={(e) => set('pickupLocation')(e.target.value)}
              placeholder="Yard, terminal or full address"
            />
          </Field>
          <Field label="Pickup contact name" required>
            <Input
              required
              value={form.pickupContactName}
              onChange={(e) => set('pickupContactName')(e.target.value)}
            />
          </Field>
          <Field label="Pickup contact phone" required>
            <Input
              required
              value={form.pickupContactPhone}
              onChange={(e) => set('pickupContactPhone')(e.target.value)}
            />
          </Field>
          <Field label="Delivery location" required className="sm:col-span-2">
            <Input
              required
              value={form.deliveryLocation}
              onChange={(e) => set('deliveryLocation')(e.target.value)}
            />
          </Field>
          <Field label="Delivery contact name" required>
            <Input
              required
              value={form.deliveryContactName}
              onChange={(e) => set('deliveryContactName')(e.target.value)}
            />
          </Field>
          <Field label="Delivery contact phone" required>
            <Input
              required
              value={form.deliveryContactPhone}
              onChange={(e) => set('deliveryContactPhone')(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Timing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ready by" required>
            <Input
              type="datetime-local"
              required
              value={form.readyByAt}
              onChange={(e) => set('readyByAt')(e.target.value)}
            />
          </Field>
          <Field
            label="Required by"
            required
            hint="Must be on or after the ready-by time."
          >
            <Input
              type="datetime-local"
              required
              value={form.requiredByAt}
              onChange={(e) => set('requiredByAt')(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Cargo">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cargo description" required className="sm:col-span-2">
            <Textarea
              required
              value={form.cargoDescription}
              onChange={(e) => set('cargoDescription')(e.target.value)}
              placeholder="What is being moved, and in what form"
            />
          </Field>
          <Field label="Number of packages / units" required>
            <Input
              type="number"
              min={1}
              required
              value={form.packageCount}
              onChange={(e) => set('packageCount')(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <Field label="Gross weight" required>
              <Input
                type="number"
                step="0.001"
                min={0}
                required
                value={form.grossWeight}
                onChange={(e) => set('grossWeight')(e.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={form.weightUom}
                onChange={(e) => set('weightUom')(e.target.value)}
              >
                <option value="KG">kg</option>
                <option value="LB">lb</option>
              </Select>
            </Field>
          </div>
          <Field label="Volume (CBM)">
            <Input
              type="number"
              step="0.001"
              min={0}
              value={form.volumeCbm}
              onChange={(e) => set('volumeCbm')(e.target.value)}
            />
          </Field>
          <Field label="Dimensions">
            <Input
              value={form.dimensions}
              onChange={(e) => set('dimensions')(e.target.value)}
              placeholder="L × W × H"
            />
          </Field>
          <Field label="Packaging type">
            <Select
              value={form.packagingType}
              onChange={(e) => set('packagingType')(e.target.value)}
            >
              <option value="">Not specified</option>
              {PACKAGING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanise(type)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Vehicle and reference">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Requested vehicle type"
            hint="Leave blank if the provider should decide."
          >
            <Select
              value={form.requestedVehicleType}
              onChange={(e) => set('requestedVehicleType')(e.target.value)}
            >
              <option value="">No preference</option>
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanise(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference number" hint="PO, invoice, BL or container no.">
            <Input
              value={form.referenceNumber}
              onChange={(e) => set('referenceNumber')(e.target.value)}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={form.priority}
              onChange={(e) => set('priority')(e.target.value)}
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
          <Field label="Special handling notes" className="sm:col-span-2">
            <Textarea
              value={form.specialHandlingNotes}
              onChange={(e) => set('specialHandlingNotes')(e.target.value)}
              placeholder="Crane needed, temperature range, gate pass requirements…"
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          loading={create.isPending && create.variables === false}
          disabled={noUnits}
          onClick={() => create.mutate(false)}
        >
          Save as draft
        </Button>
        <Button
          type="submit"
          loading={create.isPending && create.variables === true}
          disabled={noUnits}
        >
          Submit inquiry
        </Button>
      </div>
    </form>
  );
}
