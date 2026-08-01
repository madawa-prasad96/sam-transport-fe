'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '@/components/ui';
import { get, qs } from '@/lib/api';
import { useSession } from '@/lib/auth';
import {
  formatDate,
  relativeTime,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/lib/format';
import type { InquiryStatus, InquirySummary, Paginated } from '@/lib/types';

const TABS: { key: string; label: string; params: Record<string, string> }[] = [
  { key: 'all', label: 'All', params: {} },
  {
    key: 'awaiting-us',
    label: 'Awaiting our response',
    params: { direction: 'incoming', status: 'SUBMITTED' },
  },
  {
    key: 'awaiting-them',
    label: 'Awaiting counterparty',
    params: { direction: 'outgoing', status: 'SUBMITTED' },
  },
  {
    key: 'in-progress',
    label: 'Vehicle assigned',
    params: { status: 'VEHICLE_PROVIDED' },
  },
  { key: 'drafts', label: 'Drafts', params: { status: 'DRAFT' } },
  { key: 'closed', label: 'Completed', params: { status: 'COMPLETED' } },
];

export default function InquiriesPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const active = TABS.find((t) => t.key === tab)?.params ?? {};
    return { ...active, search, priority, page, pageSize: 25 };
  }, [tab, search, priority, page]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inquiries', params],
    queryFn: () => get<Paginated<InquirySummary>>(`/inquiries${qs(params)}`),
  });

  const companyId = session?.user.companyId;

  const exportCsv = () => {
    if (!data?.items.length) return;
    const header = [
      'Number',
      'Status',
      'Priority',
      'Direction',
      'Counterparty',
      'Pickup',
      'Delivery',
      'Ready by',
      'Required by',
      'Reference',
      'Vehicle',
      'Driver',
      'Created',
    ];
    const rows = data.items.map((inquiry) => {
      const outgoing = inquiry.requesterCompanyId === companyId;
      const vehicle = inquiry.vehicleDetails[0];
      return [
        inquiry.number,
        inquiry.status,
        inquiry.priority,
        outgoing ? 'Outgoing' : 'Incoming',
        outgoing ? inquiry.providerCompany.name : inquiry.requesterCompany.name,
        inquiry.pickupLocation,
        inquiry.deliveryLocation,
        inquiry.readyByAt,
        inquiry.requiredByAt,
        inquiry.referenceNumber ?? '',
        vehicle?.vehicleNumber ?? '',
        vehicle?.driverName ?? '',
        inquiry.createdAt,
      ];
    });
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Inquiries</h1>
          <p className="text-sm text-slate-500">
            Every transport request, with its full history in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={exportCsv}
            disabled={!data?.items.length}
          >
            Export CSV
          </Button>
          <Link href="/inquiries/new">
            <Button>New inquiry</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setPage(1);
            }}
            className={
              tab === item.key
                ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search number, reference, cargo, location, vehicle, driver…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
        <Select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="max-w-40"
        >
          <option value="">Any priority</option>
          <option value="URGENT">Urgent only</option>
          <option value="NORMAL">Normal only</option>
        </Select>
      </div>

      {isLoading && <Spinner />}
      {isError && (
        <EmptyState
          title="Could not load inquiries"
          description={(error as Error).message}
        />
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg bg-white ring-1 ring-slate-200">
          <EmptyState
            title="Nothing here yet"
            description="When you raise an inquiry, or a connected company sends you one, it will appear in this list."
            action={
              <Link href="/inquiries/new">
                <Button>Raise an inquiry</Button>
              </Link>
            }
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Inquiry</th>
                  <th className="px-4 py-2.5 font-medium">Counterparty</th>
                  <th className="px-4 py-2.5 font-medium">Route</th>
                  <th className="px-4 py-2.5 font-medium">Required by</th>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((inquiry) => {
                  const outgoing = inquiry.requesterCompanyId === companyId;
                  const counterparty = outgoing
                    ? inquiry.providerCompany
                    : inquiry.requesterCompany;
                  const vehicle = inquiry.vehicleDetails[0];
                  return (
                    <tr key={inquiry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/inquiries/${inquiry.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {inquiry.number}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {inquiry.priority === 'URGENT' && (
                            <Badge className="bg-rose-50 text-rose-700 ring-rose-200">
                              Urgent
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400">
                            {relativeTime(inquiry.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-slate-900">{counterparty.name}</div>
                        <div className="text-xs text-slate-500">
                          {outgoing ? 'We requested' : 'They requested'}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 align-top">
                        <div className="truncate text-slate-700">
                          {inquiry.pickupLocation}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          → {inquiry.deliveryLocation}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatDate(inquiry.requiredByAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {vehicle ? (
                          <>
                            <div className="text-slate-900">
                              {vehicle.vehicleNumber}
                            </div>
                            <div className="text-xs text-slate-500">
                              {vehicle.driverName}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge
                          className={STATUS_STYLES[inquiry.status as InquiryStatus]}
                        >
                          {STATUS_LABELS[inquiry.status as InquiryStatus]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm">
              <span className="text-slate-500">
                Page {data.page} of {data.pageCount} · {data.total} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={data.page >= data.pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
