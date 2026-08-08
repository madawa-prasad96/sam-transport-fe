'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { del, get, post } from '@/lib/api';
import {
  EMAIL_STATUS_STYLES,
  formatDateTime,
  humanise,
  relativeTime,
} from '@/lib/format';
import type {
  AuthUser,
  Comment,
  EmailLogEntry,
  Inquiry,
  Recipient,
  TimelineEvent,
} from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from './ui';

// --- Timeline -------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  INQUIRY_CREATED: 'created the inquiry',
  INQUIRY_SUBMITTED: 'submitted the inquiry',
  INQUIRY_AMENDED: 'amended the inquiry',
  VEHICLE_PROVIDED: 'assigned a vehicle',
  VEHICLE_UPDATED: 'revised the vehicle details',
  INQUIRY_DECLINED: 'declined the inquiry',
  INQUIRY_RESUBMITTED: 're-submitted the inquiry',
  INQUIRY_CANCELLED: 'cancelled the inquiry',
  INQUIRY_COMPLETED: 'marked it completed',
  COMMENT_ADDED: 'commented',
  INBOUND_REPLY: 'replied by email',
  RECIPIENT_ADDED: 'added a recipient',
  RECIPIENT_REMOVED: 'removed a recipient',
};

export function TimelinePanel({ inquiryId }: { inquiryId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inquiry', inquiryId, 'timeline'],
    queryFn: () => get<TimelineEvent[]>(`/inquiries/${inquiryId}/timeline`),
  });

  if (isLoading) return <Spinner />;
  if (!data?.length) {
    return <p className="text-sm text-slate-500">Nothing has happened yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {[...data].reverse().map((event) => {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        return (
          <li key={event.id} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-slate-300"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800">
                <span className="font-medium">{event.actorName}</span>{' '}
                {EVENT_LABELS[event.type] ?? humanise(event.type)}
                {event.type === 'INBOUND_REPLY' && (
                  <Badge className="ml-2 bg-slate-100 text-slate-600 ring-slate-200">
                    via email
                  </Badge>
                )}
              </p>
              {typeof payload.preview === 'string' && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  “{payload.preview}”
                </p>
              )}
              {typeof payload.vehicleNumber === 'string' && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {String(payload.vehicleNumber)} (version{' '}
                  {String(payload.version ?? '1')})
                </p>
              )}
              {typeof payload.reason === 'string' && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Reason: {String(payload.reason)}
                </p>
              )}
              {typeof payload.email === 'string' && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {String(payload.email)}
                </p>
              )}
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- Comments -------------------------------------------------------------

export function CommentsPanel({
  inquiryId,
  disabled,
}: {
  inquiryId: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inquiry', inquiryId, 'comments'],
    queryFn: () => get<Comment[]>(`/inquiries/${inquiryId}/comments`),
  });

  const add = useMutation({
    mutationFn: () => post(`/inquiries/${inquiryId}/comments`, { body }),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
    },
  });

  return (
    <div className="space-y-4">
      {isLoading && <Spinner />}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((comment) => (
            <li
              key={comment.id}
              className="rounded-md bg-slate-50 p-3 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {comment.authorName ?? comment.authorEmail ?? 'Unknown'}
                </span>
                {comment.source === 'EMAIL' && (
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
                    via email
                  </Badge>
                )}
                {comment.isExternal && (
                  <Badge className="bg-amber-50 text-amber-800 ring-amber-200">
                    external sender
                  </Badge>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {relativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-slate-500">
          No comments yet. Anything discussed here stays on the record — and
          replies to the inquiry emails land here too.
        </p>
      )}

      {!disabled && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) add.mutate();
          }}
        >
          {add.isError && <Alert>{(add.error as Error).message}</Alert>}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment. Everyone on the thread is notified."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={add.isPending}
              disabled={!body.trim()}
            >
              Post comment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// --- Recipients (CC / BCC) ------------------------------------------------

export function RecipientsPanel({
  inquiry,
  user,
}: {
  inquiry: Inquiry;
  user: AuthUser;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'CC' | 'BCC'>('CC');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] });

  const add = useMutation({
    mutationFn: () =>
      post(`/inquiries/${inquiry.id}/recipients`, {
        email,
        name: name || undefined,
        type,
      }),
    onSuccess: () => {
      setEmail('');
      setName('');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (recipientId: string) =>
      del(`/inquiries/${inquiry.id}/recipients/${recipientId}`),
    onSuccess: invalidate,
  });

  const grouped = (kind: Recipient['type']) =>
    inquiry.recipients.filter((r) => r.type === kind);

  const canRemove = (recipient: Recipient) =>
    recipient.type !== 'TO' && recipient.addedByUnitId === user.unitId;

  return (
    <div className="space-y-4">
      {(['TO', 'CC', 'BCC'] as const).map((kind) => {
        const list = grouped(kind);
        if (kind === 'BCC' && list.length === 0) return null;
        return (
          <div key={kind}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {kind}
              {kind === 'BCC' && (
                <span className="ml-1.5 normal-case tracking-normal text-slate-400">
                  — visible only to you and your company admin
                </span>
              )}
            </p>
            {list.length === 0 ? (
              <p className="text-sm text-slate-400">None</p>
            ) : (
              <ul className="space-y-1">
                {list.map((recipient) => (
                  <li
                    key={recipient.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {recipient.name ? `${recipient.name} · ` : ''}
                      {recipient.email}
                    </span>
                    {recipient.kind === 'EXTERNAL' && (
                      <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
                        external
                      </Badge>
                    )}
                    {canRemove(recipient) && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(recipient.id)}
                        className="text-xs text-slate-400 hover:text-rose-600"
                      >
                        remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <form
        className="space-y-3 border-t border-slate-200 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        {add.isError && <Alert>{(add.error as Error).message}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" required>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>

        <Field label="Copy type">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as 'CC' | 'BCC')}
          >
            <option value="CC">CC — visible to everyone on the thread</option>
            <option value="BCC">BCC — hidden from other recipients</option>
          </Select>
        </Field>

        {type === 'BCC' && (
          <Alert tone="warning">
            BCC recipients are hidden from everyone else on this inquiry, but the
            addition is recorded in the audit log. If a BCC recipient replies,
            their reply is held for review rather than posted — otherwise it
            would reveal them to the thread.
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={add.isPending} disabled={!email}>
            Add recipient
          </Button>
        </div>
      </form>
    </div>
  );
}

// --- Email log ------------------------------------------------------------

export function EmailLogPanel({ inquiryId }: { inquiryId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inquiry', inquiryId, 'emails'],
    queryFn: () => get<EmailLogEntry[]>(`/inquiries/${inquiryId}/emails`),
  });

  if (isLoading) return <Spinner />;
  if (!data?.length) {
    return (
      <p className="text-sm text-slate-500">
        No emails have been sent for this inquiry yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Every notification sent for this inquiry, and whether it arrived. All of
        them share one mail thread.
      </p>
      <ul className="divide-y divide-slate-100">
        {data.map((message) => (
          <li key={message.id} className="py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-800">
                {humanise(message.eventType)}
              </span>
              <Badge
                className={`ring-transparent ${
                  EMAIL_STATUS_STYLES[message.status] ??
                  'bg-slate-100 text-slate-600'
                }`}
              >
                {message.status.toLowerCase()}
              </Badge>
              <span className="ml-auto text-xs text-slate-400">
                {formatDateTime(message.sentAt ?? message.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {message.recipients
                .map((r) => `${r.type}: ${r.email}`)
                .join(' · ')}
            </p>
            {message.lastError && (
              <p className="mt-1 text-xs text-rose-600">{message.lastError}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Provide vehicle form -------------------------------------------------

export function VehicleForm({
  inquiryId,
  isRevision,
  onDone,
}: {
  inquiryId: string;
  isRevision: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vehicleNumber: '',
    vehicleType: 'LORRY_MEDIUM',
    transporterName: '',
    driverName: '',
    driverPhone: '',
    expectedPickupAt: '',
    notes: '',
  });

  const submit = useMutation({
    mutationFn: () =>
      post(`/inquiries/${inquiryId}/vehicle`, {
        ...form,
        transporterName: form.transporterName || undefined,
        notes: form.notes || undefined,
        expectedPickupAt: new Date(form.expectedPickupAt).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      onDone();
    },
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
    >
      {submit.isError && <Alert>{(submit.error as Error).message}</Alert>}

      {isRevision && (
        <Alert tone="warning">
          This replaces the current vehicle details. The previous version is kept
          in the history, and everyone on the thread is notified that the details
          changed.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle number / plate" required>
          <Input
            required
            value={form.vehicleNumber}
            onChange={(e) => set('vehicleNumber')(e.target.value)}
          />
        </Field>
        <Field label="Vehicle type" required>
          <Select
            required
            value={form.vehicleType}
            onChange={(e) => set('vehicleType')(e.target.value)}
          >
            {[
              'VAN',
              'LORRY_SMALL',
              'LORRY_MEDIUM',
              'LORRY_LARGE',
              'FLATBED',
              'TRAILER',
              'CONTAINER_20',
              'CONTAINER_40',
              'REEFER',
              'OTHER',
            ].map((type) => (
              <option key={type} value={type}>
                {humanise(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Transporter / carrier" hint="If it is not your own vehicle.">
          <Input
            value={form.transporterName}
            onChange={(e) => set('transporterName')(e.target.value)}
          />
        </Field>
        <Field label="Expected pickup" required>
          <Input
            type="datetime-local"
            required
            value={form.expectedPickupAt}
            onChange={(e) => set('expectedPickupAt')(e.target.value)}
          />
        </Field>
        <Field label="Driver name" required>
          <Input
            required
            value={form.driverName}
            onChange={(e) => set('driverName')(e.target.value)}
          />
        </Field>
        <Field label="Driver contact number" required>
          <Input
            required
            value={form.driverPhone}
            onChange={(e) => set('driverPhone')(e.target.value)}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={submit.isPending}>
          {isRevision ? 'Update vehicle details' : 'Send vehicle details'}
        </Button>
      </div>
    </form>
  );
}

// --- Vehicle history ------------------------------------------------------

export function VehicleHistory({ inquiry }: { inquiry: Inquiry }) {
  if (!inquiry.vehicleDetails.length) {
    return (
      <p className="text-sm text-slate-500">
        No vehicle has been assigned yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {inquiry.vehicleDetails.map((vehicle, index) => (
        <li
          key={vehicle.id}
          className={
            index === 0
              ? 'rounded-md bg-blue-50 p-3 ring-1 ring-blue-200'
              : 'rounded-md bg-slate-50 p-3 ring-1 ring-slate-200 opacity-75'
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {vehicle.vehicleNumber}
            </span>
            <Badge
              className={
                index === 0
                  ? 'bg-blue-100 text-blue-800 ring-blue-200'
                  : 'bg-slate-200 text-slate-600 ring-slate-300'
              }
            >
              {index === 0 ? 'Current' : `Superseded · v${vehicle.version}`}
            </Badge>
            <span className="ml-auto text-xs text-slate-400">
              {formatDateTime(vehicle.createdAt)}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Type</dt>
              <dd className="text-slate-800">{humanise(vehicle.vehicleType)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Expected pickup</dt>
              <dd className="text-slate-800">
                {formatDateTime(vehicle.expectedPickupAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Driver</dt>
              <dd className="text-slate-800">{vehicle.driverName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Driver phone</dt>
              <dd className="text-slate-800">{vehicle.driverPhone}</dd>
            </div>
            {vehicle.transporterName && (
              <div>
                <dt className="text-xs text-slate-500">Transporter</dt>
                <dd className="text-slate-800">{vehicle.transporterName}</dd>
              </div>
            )}
            {vehicle.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Notes</dt>
                <dd className="text-slate-800">{vehicle.notes}</dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

export { Card };
