import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import type {
  AuthResponse,
  AdminUser,
  DashboardStats,
  UsageStatsData,
  LineupCollection,
  CollectionWithLineups,
  Lineup,
  UserRole,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nadelauncher-backend-a99d397c.apps.deploypilot.stefankunde.dev';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post<{ data: AuthResponse }>(
            `${API_URL}/auth/refresh`,
            { refreshToken },
          );
          const authData = data.data;
          useAuthStore.getState().setTokens(authData.accessToken, authData.refreshToken, authData.user);
          originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  getMe: () => api.get<{ data: AuthResponse }>('/auth/me').then((r) => r.data.data),
  refresh: (refreshToken: string) =>
    api.post<{ data: AuthResponse }>('/auth/refresh', { refreshToken }).then((r) => r.data.data),
};

// Admin Users
export const adminUsersApi = {
  getAll: () => api.get<{ data: AdminUser[] }>('/admin/users').then((r) => r.data.data),
  getById: (id: string) => api.get<{ data: AdminUser }>(`/admin/users/${id}`).then((r) => r.data.data),
  updateRole: (id: string, role: UserRole) =>
    api.put<{ data: AdminUser }>(`/admin/users/${id}/role`, { role }).then((r) => r.data.data),
  updatePremium: (id: string, isPremium: boolean) =>
    api.put<{ data: AdminUser }>(`/admin/users/${id}/premium`, { isPremium }).then((r) => r.data.data),
};

// Admin Stats
export const adminStatsApi = {
  getDashboard: () => api.get<{ data: DashboardStats }>('/admin/stats/dashboard').then((r) => r.data.data),
  getUsage: () => api.get<{ data: UsageStatsData }>('/admin/stats/usage').then((r) => r.data.data),
};

// Collections (admin endpoints)
export const collectionsApi = {
  getAll: (map?: string) =>
    api.get<{ data: LineupCollection[] }>('/api/collections', { params: { map } }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get<{ data: CollectionWithLineups }>(`/api/collections/${id}`).then((r) => r.data.data),
  create: (data: { name: string; description?: string; mapName: string; isDefault?: boolean; sortOrder?: number }) =>
    api.post<{ data: LineupCollection }>('/api/collections', data).then((r) => r.data.data),
  update: (id: string, data: { name?: string; description?: string; isDefault?: boolean; sortOrder?: number }) =>
    api.put<{ data: LineupCollection }>(`/api/collections/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/api/collections/${id}`),
  addLineup: (collectionId: string, lineupId: string) =>
    api.post(`/api/collections/${collectionId}/lineups`, { lineupId }),
  removeLineup: (collectionId: string, lineupId: string) =>
    api.delete(`/api/collections/${collectionId}/lineups/${lineupId}`),
};

// Lineups
export const lineupsApi = {
  getPresets: (map?: string) =>
    api.get<{ data: Lineup[] }>('/api/lineups/presets', { params: { map } }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get<{ data: Lineup }>(`/api/lineups/${id}`).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/api/lineups/${id}`),
};

export default api;
