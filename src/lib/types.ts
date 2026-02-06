export type UserRole = 'user' | 'worker' | 'admin';

export interface User {
  id: string;
  steamId: string;
  username: string;
  avatar?: string;
  profileUrl?: string;
  isPremium: boolean;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Lineup {
  id: string;
  creatorId: string;
  creatorName?: string;
  mapName: string;
  isPublic: boolean;
  isPreset: boolean;
  grenadeType: 'smoke' | 'flash' | 'molotov' | 'he';
  name: string;
  description?: string;
  throwPosition: { x: number; y: number; z: number };
  throwAngles: { pitch: number; yaw: number };
  landingPosition: { x: number; y: number; z: number };
  releasePosition?: { x: number; y: number; z: number };
  movementPath?: { x: number; y: number; z: number; pitch: number; yaw: number }[];
  throwType: string;
  throwStrength?: string;
  instructions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LineupCollection {
  id: string;
  name: string;
  description?: string;
  mapName: string;
  coverImage?: string;
  isDefault: boolean;
  sortOrder: number;
  lineupCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithLineups {
  collection: LineupCollection;
  lineups: Lineup[];
}

// Admin-specific types
export interface AdminUser extends User {
  usageSeconds?: number;
  subscriptionCount?: number;
  lastActiveAt?: string;
}

export interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  adminCount: number;
  workerCount: number;
  totalCollections: number;
  totalLineups: number;
  totalSessions: number;
  activeSessions: number;
  totalSubscriptions: number;
}

export interface UsageStatsData {
  dailyUsage: { date: string; sessions: number; totalSeconds: number }[];
  topUsers: { userId: string; username: string; totalSeconds: number }[];
}
