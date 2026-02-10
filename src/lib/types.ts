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
  // Pro demo metadata
  playerName?: string;
  teamName?: string;
  teamSide?: string;
  roundNumber?: number;
  roundTimeSeconds?: number;
  roundWon?: boolean;
  playersAliveCt?: number;
  playersAliveT?: number;
  isPistolRound?: boolean;
  totalDamage?: number;
  enemiesBlinded?: number;
  totalBlindDuration?: number;
  flashAssists?: number;
  proMatchId?: string;
  proDemoId?: string;
  fixPointIndex?: number;
  collectionId?: string;
  collectionName?: string;
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

// Pro Nades types
export type DemoStatus = 'pending' | 'downloading' | 'extracting' | 'analyzing' | 'completed' | 'failed';

export interface ProTeam {
  id: string;
  name: string;
  hltvId?: number;
  logoUrl?: string;
  createdAt: string;
}

export interface ProPlayer {
  id: string;
  nickname: string;
  steamId: string;
  teamId?: string;
  teamName?: string;
  hltvId?: number;
  createdAt: string;
}

export interface ProDemo {
  id: string;
  matchId?: string;
  fileName: string;
  sourceUrl?: string;
  status: DemoStatus;
  errorMessage?: string;
  throwsExtracted: number;
  patternsDetected: number;
  processedAt?: string;
  createdAt: string;
}

export interface ProMatch {
  id: string;
  hltvMatchId?: number;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  mapName: string;
  matchDate: string;
  eventName?: string;
  score?: string;
  demos: ProDemo[];
  createdAt: string;
}

// Refresh collections result
export interface CollectionSyncEntry {
  name: string;
  raw: number;
  clustered: number;
  added: number;
  removed: number;
}

export interface RefreshCollectionsResult {
  message: string;
  lineupsFound: number;
  maps: string[];
  collectionsCreated: number;
  teams?: string[];
  players?: string[];
  diagnostics?: {
    totalClusters: number;
    qualifiedClusters: number;
    withProMatchId: number;
    withoutProMatchId: number;
    withDamage: number;
    withBlind: number;
    withFlashAssists: number;
    pistolCount: number;
    grenadeTypeCounts: Record<string, number>;
    teamMapCounts: Record<string, Record<string, number>>;
    collectionSyncLog: CollectionSyncEntry[];
  };
}

// Session types
export type SessionStatus = 'queued' | 'pending' | 'provisioning' | 'ready' | 'active' | 'ending' | 'ended' | 'failed';

export interface Session {
  id: string;
  userId: string;
  token: string;
  serverIp?: string;
  serverPort?: number;
  serverPassword?: string;
  mapName: string;
  isActive: boolean;
  status: SessionStatus;
  provisioningError?: string;
  startedAt?: string | null;
  endedAt?: string;
  endReason?: string;
  expiresAt: string;
  connectionTimeoutAt?: string;
  createdAt: string;
  queuedAt?: string;
  queuePosition?: number;
  isEditorSession?: boolean;
  editingCollectionId?: string;
  editingCollectionName?: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
}
