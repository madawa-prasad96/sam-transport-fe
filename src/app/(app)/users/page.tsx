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
import { get, patch, post } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/format';
import type { OrgUser } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  INVITED: 'bg-amber-50 text-amber-800 ring-amber-200',
  DEACTIVATED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'UNIT_USER',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => get<OrgUser[]>('/users'),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] });

  const invite = useMutation({
    mutationFn: () =>
      post('/users/invite', {
        ...form,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      setInviteOpen(false);
      setForm({ email: '', fullName: '', phone: '', role: 'UNIT_USER' });
      invalidate();
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/users/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      patch(`/users/${id}/role`, { role }),
    onSuccess: invalidate,
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const mutationError = (setStatus.error ?? setRole.error) as Error | null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">
            People in your company who can raise and act on inquiries.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Invite someone</Button>
      </div>

      {mutationError && <Alert>{mutationError.message}</Alert>}
      {isLoading && <Spinner />}

      {data && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Unit</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((user) => {
                  const isSelf = user.id === session?.user.id;
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {user.fullName}
                          {isSelf && (
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                              (you)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {user.unit?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            setRole.mutate({
                              id: user.id,
                              role: e.target.value,
                            })
                          }
                          className="max-w-44"
                        >
                          <option value="UNIT_ADMIN">Unit admin</option>
                          <option value="UNIT_USER">Unit user</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            STATUS_STYLES[user.status] ??
                            'bg-slate-100 text-slate-600 ring-slate-200'
                          }
                        >
                          {user.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {user.lastLoginAt
                          ? relativeTime(user.lastLoginAt)
                          : `invited ${formatDate(user.createdAt)}`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && user.status !== 'DEACTIVATED' && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setStatus.mutate({
                                id: user.id,
                                status: 'DEACTIVATED',
                              })
                            }
                          >
                            Deactivate
                          </Button>
                        )}
                        {user.status === 'DEACTIVATED' && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setStatus.mutate({
                                id: user.id,
                                status: 'ACTIVE',
                              })
                            }
                          >
                            Reactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Accounts are deactivated rather than deleted, so the history on past
        inquiries stays intact.
      </p>

      <Modal
        open={inviteOpen}
        title="Invite a team member"
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
          <Field label="Email" required>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          </Field>
          <Field label="Full name" required>
            <Input
              required
              value={form.fullName}
              onChange={(e) => set('fullName')(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
            />
          </Field>
          <Field
            label="Role"
            hint="Admins manage the team, the company profile and connections."
          >
            <Select
              value={form.role}
              onChange={(e) => set('role')(e.target.value)}
            >
              <option value="UNIT_USER">Unit user</option>
              <option value="UNIT_ADMIN">Unit admin</option>
            </Select>
          </Field>
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
