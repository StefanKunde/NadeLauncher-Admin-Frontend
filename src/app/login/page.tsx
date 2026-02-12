'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nadelauncher-backend-a99d397c.apps.deploypilot.stefankunde.dev';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Handle OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const errorParam = searchParams.get('error');

    if (errorParam === 'unauthorized') {
      setError('Access denied. Admin or worker role required.');
      return;
    }

    if (token && refreshToken) {
      setLoading(true);
      // Set tokens in store temporarily to make the API call work
      useAuthStore.setState({ accessToken: token, refreshToken });

      // Fetch user data to verify role
      authApi
        .getMe()
        .then((data) => {
          if (data.user.role !== 'admin' && data.user.role !== 'worker') {
            setError('Access denied. Admin or worker role required.');
            useAuthStore.getState().logout();
            return;
          }
          setTokens(data.accessToken, data.refreshToken, data.user);
          router.replace('/dashboard');
        })
        .catch(() => {
          setError('Failed to authenticate. Please try again.');
          useAuthStore.getState().logout();
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, setTokens, router]);

  const handleSteamLogin = () => {
    // Redirect to Steam OAuth with admin-frontend as callback
    const callbackUrl = typeof window !== 'undefined' ? window.location.origin + '/login' : '';
    window.location.href = `${API_URL}/auth/steam?redirect=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f0a500]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8b5cf6]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-wider mb-2">
              <span className="text-gradient-gold">NADE</span>
              <span className="text-[#e8e8e8]">PRO</span>
            </h1>
            <p className="text-[#6b6b8a] text-sm">Admin Panel</p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-3 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/30 px-4 py-3"
            >
              <AlertCircle className="h-5 w-5 text-[#ff4444] shrink-0" />
              <p className="text-sm text-[#ff4444]">{error}</p>
            </motion.div>
          )}

          {/* Login button */}
          <button
            onClick={handleSteamLogin}
            disabled={loading}
            className="btn-primary w-full text-base py-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174l4.015-5.884c-1.062-.378-1.825-1.381-1.825-2.566 0-1.504 1.218-2.724 2.724-2.724 1.505 0 2.724 1.22 2.724 2.724 0 .853-.392 1.614-1.004 2.114l2.558 3.75C21.093 18.996 24 15.795 24 12c0-6.627-5.373-12-12-12zm.541 16.464c-.897 0-1.623-.727-1.623-1.623 0-.897.726-1.623 1.623-1.623s1.623.726 1.623 1.623c0 .896-.726 1.623-1.623 1.623z" />
                </svg>
                Sign in with Steam
              </>
            )}
          </button>

          <p className="mt-6 text-center text-xs text-[#6b6b8a]">
            Only authorized administrators and workers can access this panel.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
