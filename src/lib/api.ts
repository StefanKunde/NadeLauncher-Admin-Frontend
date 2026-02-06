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

// Helper to unwrap global response wrapper: { data: T, statusCode, timestamp } -> T
const extract = <T>(r: { data: { data: T } }): T => r.data.data;

// Helper to unwrap double-wrapped responses (admin endpoints): { data: { data: T } } -> T
const unwrap = <T>(r: { data: { data: T } }): T => r.data.data;

// Admin Users
export const adminUsersApi = {
  getAll: () => api.get('/admin/users').then((r) => unwrap<AdminUser[]>(r.data)),
  getById: (id: string) => api.get(`/admin/users/${id}`).then((r) => unwrap<AdminUser>(r.data)),
  updateRole: (id: string, role: UserRole) =>
    api.put(`/admin/users/${id}/role`, { role }).then((r) => unwrap<AdminUser>(r.data)),
  updatePremium: (id: string, isPremium: boolean) =>
    api.put(`/admin/users/${id}/premium`, { isPremium }).then((r) => unwrap<AdminUser>(r.data)),
};

// Admin Stats
export const adminStatsApi = {
  getDashboard: () => api.get('/admin/stats/dashboard').then((r) => unwrap<DashboardStats>(r.data)),
  getUsage: () => api.get('/admin/stats/usage').then((r) => unwrap<UsageStatsData>(r.data)),
};

// Collections (admin endpoints)
export const collectionsApi = {
  getAll: (map?: string) =>
    api.get('/collections', { params: { map } }).then((r) => extract<LineupCollection[]>(r)),
  getById: (id: string) =>
    api.get(`/collections/${id}`).then((r) => extract<CollectionWithLineups>(r)),
  create: (data: { name: string; description?: string; mapName: string; isDefault?: boolean; sortOrder?: number }) =>
    api.post('/collections', data).then((r) => extract<LineupCollection>(r)),
  update: (id: string, data: { name?: string; description?: string; isDefault?: boolean; sortOrder?: number }) =>
    api.put(`/collections/${id}`, data).then((r) => extract<LineupCollection>(r)),
  delete: (id: string) => api.delete(`/collections/${id}`),
  addLineup: (collectionId: string, lineupId: string) =>
    api.post(`/collections/${collectionId}/lineups`, { lineupId }),
  removeLineup: (collectionId: string, lineupId: string) =>
    api.delete(`/collections/${collectionId}/lineups/${lineupId}`),
};

// Lineups
export const lineupsApi = {
  getPresets: (map?: string) =>
    api.get('/api/lineups/presets', { params: { map } }).then((r) => extract<Lineup[]>(r)),
  getById: (id: string) =>
    api.get(`/api/lineups/${id}`).then((r) => extract<Lineup>(r)),
  delete: (id: string) => api.delete(`/api/lineups/${id}`),
};

export default api;
