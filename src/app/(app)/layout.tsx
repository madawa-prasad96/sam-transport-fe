'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Spinner } from '@/components/ui';
import { useLogout, useSession } from '@/lib/auth';
import type { AuthUser } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  visible: (user: AuthUser) => boolean;
}

const NAV: NavItem[] = [
  {
    href: '/inquiries',
    label: 'Inquiries',
    visible: (u) => u.role !== 'SUPER_ADMIN',
  },
  {
    href: '/connections',
    label: 'Connections',
    visible: (u) => u.role !== 'SUPER_ADMIN',
  },
  {
    href: '/quarantine',
    label: 'Quarantine',
    visible: (u) => u.role !== 'SUPER_ADMIN',
  },
  {
    href: '/users',
    label: 'Team',
    visible: (u) => u.role === 'COMPANY_ADMIN',
  },
  {
    href: '/company',
    label: 'Company',
    visible: (u) => u.role === 'COMPANY_ADMIN',
  },
  {
    href: '/admin/companies',
    label: 'Companies',
    visible: (u) => u.role === 'SUPER_ADMIN',
  },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isLoading, isError } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && (isError || !data)) router.replace('/login');
  }, [data, isError, isLoading, router]);

  if (isLoading || !data) return <Spinner label="Loading your workspace" />;

  const user = data.user;
  const items = NAV.filter((item) => item.visible(user));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href={user.role === 'SUPER_ADMIN' ? '/admin/companies' : '/inquiries'}
            className="text-sm font-semibold text-slate-900"
          >
            Transport Inquiries
          </Link>

          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => logout.mutate()}
              loading={logout.isPending}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
