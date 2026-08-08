'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  CommentsPanel,
  EmailLogPanel,
  RecipientsPanel,
  TimelinePanel,
  VehicleForm,
  VehicleHistory,
} from '@/components/inquiry-panels';
import {
  Alert,
  Badge,
  Button,
  Card,
  DescriptionList,
  Field,
  Modal,
  Spinner,
  Textarea,
} from '@/components/ui';
import { get, post } from '@/lib/api';
import { useSession } from '@/lib/auth';
import {
  formatDateTime,
  humanise,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/lib/format';
import type { Inquiry } from '@/lib/types';

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const inquiryId = params.id;
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data: inquiry, isLoading, isError, error } = useQuery({
    queryKey: ['inquiry', inquiryId],
    queryFn: () => get<Inquiry>(`/inquiries/${inquiryId}`),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });

  const action = (path: string, body?: unknown) =>
    post(`/inquiries/${inquiryId}/${path}`, body);

  const submit = useMutation({
    mutationFn: () => action('submit'),
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: () => action('decline', { reason: declineReason }),
    onSuccess: () => {
      setDeclineOpen(false);
      setDeclineReason('');
      invalidate();
    },
  });
  const cancel = useMutation({
    mutationFn: () => action('cancel', { reason: cancelReason || undefined }),
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason('');
      invalidate();
    },
  });
  const complete = useMutation({
    mutationFn: () => action('complete'),
    onSuccess: invalidate,
  });

  if (isLoading) return <Spinner />;
  if (isError || !inquiry) {
    return (
      <Alert>
        {(error as Error)?.message ??
          'This inquiry does not exist, or you do not have access to it.'}
      </Alert>
    );
  }

  const user = session!.user;
  const isRequester = inquiry.requesterUnitId === user.unitId;
  const isProvider = inquiry.providerUnitId === user.unitId;
  const counterparty = isRequester
    ? inquiry.providerUnit
    : inquiry.requesterUnit;

  const closed =
    inquiry.status === 'COMPLETED' || inquiry.status === 'CANCELLED';

  const canSubmit =
    isRequester && (inquiry.status === 'DRAFT' || inquiry.status === 'DECLINED');
  const canProvideVehicle =
    isProvider &&
    (inquiry.status === 'SUBMITTED' || inquiry.status === 'VEHICLE_PROVIDED');
  const canDecline = isProvider && inquiry.status === 'SUBMITTED';
  const canCancel = isRequester && !closed;
  const canComplete = inquiry.status === 'VEHICLE_PROVIDED';

  const anyPending =
    submit.isPending || complete.isPending || cancel.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {inquiry.number}
            </h1>
            <Badge className={STATUS_STYLES[inquiry.status]}>
              {STATUS_LABELS[inquiry.status]}
            </Badge>
            {inquiry.priority === 'URGENT' && (
              <Badge className="bg-rose-50 text-rose-700 ring-rose-200">
                Urgent
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isRequester ? 'Sent to' : 'Received from'}{' '}
            <span className="font-medium text-slate-700">
              {counterparty.name}
            </span>{' '}
            · raised by {inquiry.createdBy.fullName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/inquiries">
            <Button variant="ghost">Back</Button>
          </Link>
          {canSubmit && (
            <Button loading={submit.isPending} onClick={() => submit.mutate()}>
              {inquiry.status === 'DECLINED' ? 'Re-submit' : 'Submit inquiry'}
            </Button>
          )}
          {canProvideVehicle && (
            <Button onClick={() => setShowVehicleForm(true)}>
              {inquiry.status === 'VEHICLE_PROVIDED'
                ? 'Change vehicle'
                : 'Provide vehicle'}
            </Button>
          )}
          {canDecline && (
            <Button variant="danger" onClick={() => setDeclineOpen(true)}>
              Decline
            </Button>
          )}
          {canComplete && (
            <Button
              variant="secondary"
              loading={complete.isPending}
              onClick={() => complete.mutate()}
            >
              Mark completed
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {inquiry.status === 'DECLINED' && inquiry.declineReason && (
        <Alert tone="error">
          <span className="font-medium">Declined:</span> {inquiry.declineReason}
        </Alert>
      )}
      {inquiry.status === 'DRAFT' && (
        <Alert tone="info">
          This is a draft. Nothing has been sent yet — the counterparty cannot
          see it until you submit.
        </Alert>
      )}
      {(submit.isError || complete.isError) && (
        <Alert>
          {((submit.error ?? complete.error) as Error).message}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {showVehicleForm && (
            <Card title="Vehicle details">
              <VehicleForm
                inquiryId={inquiry.id}
                isRevision={inquiry.status === 'VEHICLE_PROVIDED'}
                onDone={() => setShowVehicleForm(false)}
              />
            </Card>
          )}

          <Card title="Vehicle">
            <VehicleHistory inquiry={inquiry} />
          </Card>

          <Card title="Request details">
            <DescriptionList
              items={[
                { label: 'Pickup', value: inquiry.pickupLocation },
                {
                  label: 'Pickup contact',
                  value: `${inquiry.pickupContactName} · ${inquiry.pickupContactPhone}`,
                },
                { label: 'Delivery', value: inquiry.deliveryLocation },
                {
                  label: 'Delivery contact',
                  value: `${inquiry.deliveryContactName} · ${inquiry.deliveryContactPhone}`,
                },
                { label: 'Ready by', value: formatDateTime(inquiry.readyByAt) },
                {
                  label: 'Required by',
                  value: formatDateTime(inquiry.requiredByAt),
                },
                { label: 'Cargo', value: inquiry.cargoDescription },
                { label: 'Packages', value: String(inquiry.packageCount) },
                {
                  label: 'Gross weight',
                  value: `${inquiry.grossWeight} ${inquiry.weightUom}`,
                },
                {
                  label: 'Volume',
                  value: inquiry.volumeCbm ? `${inquiry.volumeCbm} CBM` : null,
                },
                { label: 'Dimensions', value: inquiry.dimensions },
                {
                  label: 'Packaging',
                  value: inquiry.packagingType
                    ? humanise(inquiry.packagingType)
                    : null,
                },
                {
                  label: 'Vehicle requested',
                  value: inquiry.requestedVehicleType
                    ? humanise(inquiry.requestedVehicleType)
                    : null,
                },
                { label: 'Reference', value: inquiry.referenceNumber },
                {
                  label: 'Special handling',
                  value: inquiry.specialHandlingNotes,
                },
              ]}
            />
          </Card>

          <Card title="Conversation">
            <CommentsPanel inquiryId={inquiry.id} disabled={closed} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Who is copied">
            <RecipientsPanel inquiry={inquiry} user={user} />
          </Card>

          <Card title="History">
            <TimelinePanel inquiryId={inquiry.id} />
          </Card>

          <Card title="Email trace">
            <EmailLogPanel inquiryId={inquiry.id} />
          </Card>
        </div>
      </div>

      <Modal
        open={declineOpen}
        title="Decline this inquiry"
        onClose={() => setDeclineOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            decline.mutate();
          }}
        >
          {decline.isError && <Alert>{(decline.error as Error).message}</Alert>}
          <Field
            label="Reason"
            required
            hint="At least 10 characters. The requester sees this, so make it useful."
          >
            <Textarea
              required
              minLength={10}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="No flatbed available on that date; earliest we could do is…"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeclineOpen(false)}
            >
              Keep open
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={decline.isPending}
              disabled={declineReason.trim().length < 10}
            >
              Decline inquiry
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancel this inquiry"
        onClose={() => setCancelOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            cancel.mutate();
          }}
        >
          {cancel.isError && <Alert>{(cancel.error as Error).message}</Alert>}
          {inquiry.status === 'VEHICLE_PROVIDED' && (
            <Alert tone="warning">
              A vehicle has already been assigned to this inquiry. Cancelling
              notifies the other company immediately — the vehicle may already be
              on its way.
            </Alert>
          )}
          <Field label="Reason" hint="Optional, but helpful to the other side.">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelOpen(false)}
            >
              Keep open
            </Button>
            <Button type="submit" variant="danger" loading={anyPending}>
              Cancel inquiry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
