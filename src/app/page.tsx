'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useSession } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const { data, isLoading, isError } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      router.replace('/login');
      return;
    }
    router.replace(
      data.user.role === 'SUPER_ADMIN' ? '/admin/companies' : '/inquiries',
    );
  }, [data, isError, isLoading, router]);

  return <Spinner />;
}
