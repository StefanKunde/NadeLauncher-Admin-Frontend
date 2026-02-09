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
  Session,
  ProTeam,
  ProPlayer,
  ProMatch,
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
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

// Admin Stats
export const adminStatsApi = {
  getDashboard: () => api.get('/admin/stats/dashboard').then((r) => unwrap<DashboardStats>(r.data)),
  getUsage: () => api.get('/admin/stats/usage').then((r) => unwrap<UsageStatsData>(r.data)),
};

// Collections (admin endpoints)
export const collectionsApi = {
  getAll: (map?: string) =>
    api.get('/api/collections', { params: { map } }).then((r) => extract<LineupCollection[]>(r)),
  getById: (id: string) =>
    api.get(`/api/collections/${id}`).then((r) => extract<CollectionWithLineups>(r)),
  create: (data: { name: string; description?: string; mapName: string; isDefault?: boolean; sortOrder?: number }) =>
    api.post('/api/collections', data).then((r) => extract<LineupCollection>(r)),
  update: (id: string, data: { name?: string; description?: string; isDefault?: boolean; sortOrder?: number }) =>
    api.put(`/api/collections/${id}`, data).then((r) => extract<LineupCollection>(r)),
  delete: (id: string) => api.delete(`/api/collections/${id}`),
  addLineup: (collectionId: string, lineupId: string) =>
    api.post(`/api/collections/${collectionId}/lineups`, { lineupId }),
  removeLineup: (collectionId: string, lineupId: string) =>
    api.delete(`/api/collections/${collectionId}/lineups/${lineupId}`),
};

// Lineups
export const lineupsApi = {
  getPresets: (map?: string) =>
    api.get('/api/lineups/presets', { params: { map } }).then((r) => extract<Lineup[]>(r)),
  getById: (id: string) =>
    api.get(`/api/lineups/${id}`).then((r) => extract<Lineup>(r)),
  delete: (id: string) => api.delete(`/api/lineups/${id}`),
};

// Admin Lineups
export const adminLineupsApi = {
  getStats: () =>
    api.get('/admin/lineups/stats').then((r) => unwrap<{
      total: number;
      presets: number;
      userCreated: number;
      public: number;
      private: number;
    }>(r.data)),
  deleteAll: () =>
    api.delete('/admin/lineups/all').then((r) => unwrap<{ deletedCount: number }>(r.data)),
  deletePresets: () =>
    api.delete('/admin/lineups/presets').then((r) => unwrap<{ deletedCount: number }>(r.data)),
};

// Admin Sessions (editor mode)
export const adminSessionsApi = {
  createEditor: (data: { mapName: string; collectionId: string }) =>
    api.post('/admin/sessions/editor', data).then((r) => unwrap<Session>(r.data)),
  getActive: () =>
    api.get('/admin/sessions/active').then((r) => unwrap<Session | null>(r.data)),
  getRunning: () =>
    api.get('/admin/sessions/running').then((r) => unwrap<Session[]>(r.data)),
  end: (id: string) =>
    api.post(`/admin/sessions/${id}/end`).then((r) => r.data),
};

// Pro Nades
export const proNadesApi = {
  getTeams: () =>
    api.get('/api/pro-nades/teams').then((r) => extract<ProTeam[]>(r)),
  getPlayers: () =>
    api.get('/api/pro-nades/players').then((r) => extract<ProPlayer[]>(r)),
  getMatches: () =>
    api.get('/api/pro-nades/matches').then((r) => extract<ProMatch[]>(r)),
  getMatch: (id: string) =>
    api.get(`/api/pro-nades/matches/${id}`).then((r) => extract<ProMatch>(r)),
  createTeam: (data: { name: string; hltvId?: number; logoUrl?: string }) =>
    api.post('/api/pro-nades/teams', data).then((r) => extract<ProTeam>(r)),
  createPlayer: (data: { nickname: string; steamId: string; teamId?: string; hltvId?: number }) =>
    api.post('/api/pro-nades/players', data).then((r) => extract<ProPlayer>(r)),
  analyze: (data: {
    url: string;
    mapName: string;
    matchDate: string;
    team1Name?: string;
    team2Name?: string;
    eventName?: string;
    score?: string;
    hltvMatchId?: number;
  }) => api.post('/api/pro-nades/analyze', data).then((r) => extract<ProMatch>(r)),
  refreshCollections: () =>
    api.post('/api/pro-nades/refresh-collections').then((r) => r.data),
};

export default api;
