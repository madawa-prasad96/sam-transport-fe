'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Spinner,
} from '@/components/ui';
import { del, get } from '@/lib/api';
import { isCompanyAdmin, useSession } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { QuarantineItem } from '@/lib/types';

export default function QuarantinePage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const admin = isCompanyAdmin(session?.user);

  const { data, isLoading } = useQuery({
    queryKey: ['quarantine'],
    queryFn: () => get<QuarantineItem[]>('/inbound/quarantine'),
  });

  const discard = useMutation({
    mutationFn: (id: string) => del(`/inbound/quarantine/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['quarantine'] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Quarantined replies
        </h1>
        <p className="text-sm text-slate-500">
          Emails that arrived for one of your inquiries but could not be safely
          attributed to a sender. Nothing here has been posted to a timeline.
        </p>
      </div>

      {discard.isError && <Alert>{(discard.error as Error).message}</Alert>}
      {isLoading && <Spinner />}

      {data && data.length === 0 && (
        <Card>
          <EmptyState
            title="Nothing in quarantine"
            description="Replies from people on an inquiry post automatically. Anything from an unknown sender, a BCC recipient, or a closed inquiry is held here instead."
          />
        </Card>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((item) => (
            <li key={item.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {item.fromName
                        ? `${item.fromName} · ${item.fromAddress}`
                        : item.fromAddress}
                    </p>
                    {item.inquiry && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        For{' '}
                        <Link
                          href={`/inquiries/${item.inquiry.id}`}
                          className="font-medium text-slate-700 hover:underline"
                        >
                          {item.inquiry.number}
                        </Link>
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDateTime(item.receivedAt)}
                    </p>
                  </div>
                  {admin && (
                    <Button
                      variant="secondary"
                      loading={
                        discard.isPending && discard.variables === item.id
                      }
                      onClick={() => discard.mutate(item.id)}
                    >
                      Discard
                    </Button>
                  )}
                </div>

                {item.quarantineReason && (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                    {item.quarantineReason}
                  </p>
                )}

                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
                  {item.bodyText}
                </pre>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
