'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { get, post } from './api';
import type { AuthUser } from './types';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => get<{ user: AuthUser }>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      post<{ user: AuthUser }>('/auth/login', credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data);
      router.replace(
        data.user.role === 'SUPER_ADMIN' ? '/admin/companies' : '/inquiries',
      );
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => post('/auth/logout'),
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });
}

export const isCompanyAdmin = (user?: AuthUser) =>
  user?.role === 'COMPANY_ADMIN';

export const isSuperAdmin = (user?: AuthUser) => user?.role === 'SUPER_ADMIN';
