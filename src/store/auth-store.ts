import { create } from 'zustand';
import type { User } from '@/lib/types';
import { getRefreshToken, setRefreshToken, removeRefreshToken } from '@/lib/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setTokens: (accessToken, refreshToken, user) => {
    // Only allow admin and worker roles
    if (user.role !== 'admin' && user.role !== 'worker') {
      console.error('Access denied: insufficient permissions');
      return;
    }
    setRefreshToken(refreshToken);
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  logout: () => {
    removeRefreshToken();
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      set({ refreshToken });
    }
  },
}));
