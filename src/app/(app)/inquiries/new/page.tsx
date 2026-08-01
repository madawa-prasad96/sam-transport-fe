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
  providerCompanyId: string;
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
  providerCompanyId: '',
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

export default function NewInquiryPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['connections', 'available'],
    queryFn: () => get<{ id: string; name: string }[]>('/connections/available'),
  });

  const buildPayload = () => ({
    providerCompanyId: form.providerCompanyId,
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

  const noConnections = !companies?.length;

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

      {noConnections && (
        <Alert tone="warning">
          You have no active connections yet. An inquiry can only be addressed to
          a company you are connected with —{' '}
          <Link href="/connections" className="font-medium underline">
            invite a counterparty
          </Link>{' '}
          first.
        </Alert>
      )}

      <Card title="Who is this for">
        <Field label="Send to" required>
          <Select
            required
            value={form.providerCompanyId}
            onChange={(e) => set('providerCompanyId')(e.target.value)}
          >
            <option value="">Select a connected company…</option>
            {companies?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>
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
          disabled={noConnections}
          onClick={() => create.mutate(false)}
        >
          Save as draft
        </Button>
        <Button
          type="submit"
          loading={create.isPending && create.variables === true}
          disabled={noConnections}
        >
          Submit inquiry
        </Button>
      </div>
    </form>
  );
}
