'use client';

import { clsx } from 'clsx';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

// --- Button ---------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 focus-visible:outline-slate-900',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 disabled:bg-rose-300 focus-visible:outline-rose-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

// --- Form fields ----------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      )}
    </label>
  );
}

const CONTROL =
  'block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500';

export const Input = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={clsx(CONTROL, className)} />
);

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={clsx(CONTROL, 'min-h-20', className)} />
);

export const Select = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={clsx(CONTROL, 'pr-8', className)}>
    {children}
  </select>
);

// --- Layout bits ----------------------------------------------------------

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        'rounded-lg bg-white shadow-sm ring-1 ring-slate-200',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info' | 'warning' | 'success';
  children: ReactNode;
}) {
  const tones = {
    error: 'bg-rose-50 text-rose-800 ring-rose-200',
    info: 'bg-slate-50 text-slate-700 ring-slate-200',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  } as const;
  return (
    <div
      className={clsx(
        'rounded-md px-3 py-2 text-sm ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
      />
      {label}…
    </div>
  );
}

export function DescriptionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  const visible = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== '',
  );
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm break-words text-slate-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
