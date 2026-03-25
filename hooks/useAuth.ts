'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const user = session?.user;

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Optional: redirect to login for protected pages
      // router.push('/login');
    }
  }, [status, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    status,
  };
}
