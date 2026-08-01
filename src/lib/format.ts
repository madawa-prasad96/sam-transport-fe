import type { InquiryStatus } from './types';

export const humanise = (value?: string | null): string => {
  if (!value) return '—';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const relativeTime = (value?: string | null): string => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

/** For datetime-local inputs, which want local time without a timezone suffix. */
export const toLocalInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const STATUS_STYLES: Record<InquiryStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SUBMITTED: 'bg-amber-50 text-amber-800 ring-amber-200',
  VEHICLE_PROVIDED: 'bg-blue-50 text-blue-800 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  DECLINED: 'bg-rose-50 text-rose-800 ring-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting vehicle',
  VEHICLE_PROVIDED: 'Vehicle assigned',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

export const EMAIL_STATUS_STYLES: Record<string, string> = {
  QUEUED: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  BOUNCED: 'bg-rose-50 text-rose-700',
  COMPLAINED: 'bg-rose-50 text-rose-700',
  FAILED: 'bg-rose-100 text-rose-800',
};
