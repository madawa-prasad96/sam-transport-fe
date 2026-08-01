'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Spinner,
} from '@/components/ui';
import { get, patch, post } from '@/lib/api';
import { isCompanyAdmin, useSession } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { Connection } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  INVITED: 'bg-amber-50 text-amber-800 ring-amber-200',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const admin = isCompanyAdmin(session?.user);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    country: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => get<Connection[]>('/connections'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['connections', 'available'] });
  };

  const invite = useMutation({
    mutationFn: () =>
      post('/connections/invite', {
        ...form,
        contactPhone: form.contactPhone || undefined,
        country: form.country || undefined,
      }),
    onSuccess: () => {
      setInviteOpen(false);
      setForm({
        companyName: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        country: '',
      });
      invalidate();
    },
  });

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      post(`/connections/${id}/respond`, { accept }),
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/connections/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Connections</h1>
          <p className="text-sm text-slate-500">
            You can only raise an inquiry with a company you are actively
            connected to.
          </p>
        </div>
        {admin && (
          <Button onClick={() => setInviteOpen(true)}>Invite a company</Button>
        )}
      </div>

      {isLoading && <Spinner />}

      {data && data.length === 0 && (
        <Card>
          <EmptyState
            title="No connections yet"
            description="Invite the companies you exchange transport requests with. They will receive an email and set up their own account."
            action={
              admin ? (
                <Button onClick={() => setInviteOpen(true)}>
                  Invite a company
                </Button>
              ) : (
                <span className="text-sm text-slate-500">
                  Ask a company admin to set these up.
                </span>
              )
            }
          />
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((connection) => {
            const pendingOnUs =
              connection.status === 'INVITED' && !connection.initiatedByUs;
            return (
              <Card key={connection.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {connection.counterparty.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {connection.counterparty.primaryContactName} ·{' '}
                      {connection.counterparty.primaryContactEmail}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {connection.counterparty.country} · since{' '}
                      {formatDate(connection.createdAt)}
                    </p>
                  </div>
                  <Badge
                    className={
                      STATUS_STYLES[connection.status] ??
                      'bg-slate-100 text-slate-600 ring-slate-200'
                    }
                  >
                    {connection.status.toLowerCase()}
                  </Badge>
                </div>

                {admin && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingOnUs && (
                      <>
                        <Button
                          onClick={() =>
                            respond.mutate({ id: connection.id, accept: true })
                          }
                          loading={respond.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            respond.mutate({ id: connection.id, accept: false })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {connection.status === 'ACTIVE' && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setStatus.mutate({
                            id: connection.id,
                            status: 'SUSPENDED',
                          })
                        }
                      >
                        Suspend
                      </Button>
                    )}
                    {connection.status === 'SUSPENDED' && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setStatus.mutate({
                            id: connection.id,
                            status: 'ACTIVE',
                          })
                        }
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                )}

                {connection.status === 'INVITED' && connection.initiatedByUs && (
                  <p className="mt-3 text-xs text-slate-500">
                    Invitation sent — waiting for them to accept.
                  </p>
                )}
                {connection.status === 'SUSPENDED' && (
                  <p className="mt-3 text-xs text-slate-500">
                    New inquiries are blocked. Inquiries already in flight
                    continue to completion.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={inviteOpen}
        title="Invite a company"
        onClose={() => setInviteOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate();
          }}
        >
          {invite.isError && <Alert>{(invite.error as Error).message}</Alert>}
          <p className="text-sm text-slate-500">
            They receive an email invitation and set up their own account. If the
            address already belongs to a company here, we send them a connection
            request instead of creating a duplicate.
          </p>
          <Field label="Company name" required>
            <Input
              required
              value={form.companyName}
              onChange={(e) => set('companyName')(e.target.value)}
            />
          </Field>
          <Field label="Contact name" required>
            <Input
              required
              value={form.contactName}
              onChange={(e) => set('contactName')(e.target.value)}
            />
          </Field>
          <Field label="Contact email" required>
            <Input
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => set('contactEmail')(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact phone">
              <Input
                value={form.contactPhone}
                onChange={(e) => set('contactPhone')(e.target.value)}
              />
            </Field>
            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => set('country')(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={invite.isPending}>
              Send invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
