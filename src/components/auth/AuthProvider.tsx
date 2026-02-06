'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, refreshToken, setTokens, logout, hydrate } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedRefreshToken = useAuthStore.getState().refreshToken;

      if (!storedRefreshToken) {
        setChecking(false);
        router.replace('/login');
        return;
      }

      try {
        const data = await authApi.refresh(storedRefreshToken);
        // Check if user has admin or worker role
        if (data.user.role !== 'admin' && data.user.role !== 'worker') {
          logout();
          router.replace('/login?error=unauthorized');
          return;
        }
        setTokens(data.accessToken, data.refreshToken, data.user);
      } catch {
        logout();
        router.replace('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [refreshToken, setTokens, logout, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-[#2a2a3e]" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-[#f0a500] border-t-transparent animate-spin" />
          </div>
          <p className="text-[#6b6b8a] text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
