'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Crown,
  FolderOpen,
  Target,
  Activity,
  TrendingUp,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  Server,
  MapPin,
  Clock,
  Square,
} from 'lucide-react';
import { adminStatsApi, adminLineupsApi, adminSessionsApi } from '@/lib/api';
import type { DashboardStats, Session } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<'all' | 'presets' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [runningSessions, setRunningSessions] = useState<Session[]>([]);
  const [endingSession, setEndingSession] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const [data, sessions] = await Promise.all([
        adminStatsApi.getDashboard(),
        adminSessionsApi.getRunning().catch(() => []),
      ]);
      setStats(data);
      setRunningSessions(sessions);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setEndingSession(sessionId);
    try {
      await adminSessionsApi.end(sessionId);
      toast.success('Session ended');
      setRunningSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      toast.error('Failed to end session');
    } finally {
      setEndingSession(null);
    }
  };

  const formatDuration = (startedAt: string | null | undefined) => {
    if (!startedAt) return 'Not connected';
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDelete = async () => {
    if (!deleteModal) return;

    const expectedText = deleteModal === 'all' ? 'DELETE ALL' : 'DELETE PRESETS';
    if (confirmText !== expectedText) {
      toast.error(`Please type "${expectedText}" to confirm`);
      return;
    }

    setDeleting(true);
    try {
      const result = deleteModal === 'all'
        ? await adminLineupsApi.deleteAll()
        : await adminLineupsApi.deletePresets();

      toast.success(`Deleted ${result.deletedCount} lineups`);
      setDeleteModal(null);
      setConfirmText('');
      loadStats(); // Refresh stats
    } catch (error) {
      toast.error('Failed to delete lineups');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: '#e8e8e8',
      bgColor: 'rgba(232, 232, 232, 0.1)',
    },
    {
      label: 'Premium Users',
      value: stats?.premiumUsers ?? 0,
      icon: Crown,
      color: '#f0a500',
      bgColor: 'rgba(240, 165, 0, 0.1)',
    },
    {
      label: 'Free Users',
      value: stats?.freeUsers ?? 0,
      icon: Users,
      color: '#6b6b8a',
      bgColor: 'rgba(107, 107, 138, 0.1)',
    },
    {
      label: 'Collections',
      value: stats?.totalCollections ?? 0,
      icon: FolderOpen,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Total Lineups',
      value: stats?.totalLineups ?? 0,
      icon: Target,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
    },
    {
      label: 'Active Sessions',
      value: stats?.activeSessions ?? 0,
      icon: Activity,
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
    },
    {
      label: 'Total Sessions',
      value: stats?.totalSessions ?? 0,
      icon: TrendingUp,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'Subscriptions',
      value: stats?.totalSubscriptions ?? 0,
      icon: FolderOpen,
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.1)',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient-gold mb-2">Dashboard</h1>
        <p className="text-[#6b6b8a]">Overview of NadeLauncher statistics</p>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="glass rounded-xl p-5 card-hover"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#6b6b8a] text-sm font-medium mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Role Distribution */}
      <motion.div
        className="mt-8 glass rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-[#e8e8e8] mb-4">
          Role Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#a78bfa]" />
              <span className="text-[#6b6b8a] text-sm">Admins</span>
            </div>
            <p className="text-2xl font-bold text-[#a78bfa]">
              {stats?.adminCount ?? 0}
            </p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#60a5fa]" />
              <span className="text-[#6b6b8a] text-sm">Workers</span>
            </div>
            <p className="text-2xl font-bold text-[#60a5fa]">
              {stats?.workerCount ?? 0}
            </p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#6b6b8a]" />
              <span className="text-[#6b6b8a] text-sm">Regular Users</span>
            </div>
            <p className="text-2xl font-bold text-[#e8e8e8]">
              {(stats?.totalUsers ?? 0) - (stats?.adminCount ?? 0) - (stats?.workerCount ?? 0)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Running Servers */}
      <motion.div
        className="mt-8 glass rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#e8e8e8]">
            Running Servers
          </h2>
          <span className="text-sm text-[#6b6b8a]">
            {runningSessions.length} active
          </span>
        </div>

        {runningSessions.length === 0 ? (
          <div className="text-center py-8">
            <Server className="w-12 h-12 text-[#2a2a3e] mx-auto mb-3" />
            <p className="text-[#6b6b8a]">No servers running</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runningSessions.map((session) => (
              <div
                key={session.id}
                className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] flex items-center gap-4"
              >
                {/* Status indicator */}
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'active' || session.status === 'ready'
                      ? 'bg-[#22c55e]'
                      : session.status === 'queued'
                        ? 'bg-[#6366f1]'
                        : 'bg-[#f0a500]'
                  }`} />
                  {(session.status === 'active' || session.status === 'ready') && (
                    <div className="absolute inset-0 rounded-full bg-[#22c55e] animate-ping opacity-75" />
                  )}
                </div>

                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#e8e8e8] font-medium truncate">
                      {session.user?.username ?? 'Unknown User'}
                    </span>
                    {session.isEditorSession && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] font-medium">
                        EDITOR
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      session.status === 'active' || session.status === 'ready'
                        ? 'bg-[#22c55e]/15 text-[#22c55e]'
                        : session.status === 'queued'
                          ? 'bg-[#6366f1]/15 text-[#6366f1]'
                          : 'bg-[#f0a500]/15 text-[#f0a500]'
                    }`}>
                      {session.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#6b6b8a]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.mapName}
                    </span>
                    {session.serverIp && (
                      <span className="font-mono text-xs">
                        {session.serverIp}:{session.serverPort}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.startedAt)}
                    </span>
                  </div>
                </div>

                {/* End button */}
                <button
                  onClick={() => handleEndSession(session.id)}
                  disabled={endingSession === session.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {endingSession === session.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  End
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Data Management - Admin only */}
      {isAdmin && (
        <motion.div
          className="mt-8 glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-[#e8e8e8] mb-4">
            Data Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#e8e8e8] font-medium mb-1">Delete All Lineups</h3>
                  <p className="text-[#6b6b8a] text-sm">
                    Remove all {stats?.totalLineups ?? 0} lineups from the database
                  </p>
                </div>
                <button
                  onClick={() => setDeleteModal('all')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
              </div>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#e8e8e8] font-medium mb-1">Delete Preset Lineups</h3>
                  <p className="text-[#6b6b8a] text-sm">
                    Remove only seeded preset lineups
                  </p>
                </div>
                <button
                  onClick={() => setDeleteModal('presets')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 rounded-lg border border-orange-500/30 hover:bg-orange-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Presets
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            className="bg-[#12121a] border border-[#2a2a3e] rounded-xl p-6 max-w-md w-full mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-[#e8e8e8]">
                Confirm Deletion
              </h3>
              <button
                onClick={() => {
                  setDeleteModal(null);
                  setConfirmText('');
                }}
                className="ml-auto text-[#6b6b8a] hover:text-[#e8e8e8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[#6b6b8a] mb-4">
              {deleteModal === 'all'
                ? `This will permanently delete ALL ${stats?.totalLineups ?? 0} lineups from the database. This action cannot be undone.`
                : 'This will delete all preset lineups (seeded lineups). User-created lineups will be preserved.'}
            </p>

            <p className="text-[#e8e8e8] text-sm mb-2">
              Type <span className="font-mono text-red-500 font-bold">
                {deleteModal === 'all' ? 'DELETE ALL' : 'DELETE PRESETS'}
              </span> to confirm:
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg text-[#e8e8e8] focus:outline-none focus:border-red-500/50 mb-4"
              placeholder={deleteModal === 'all' ? 'DELETE ALL' : 'DELETE PRESETS'}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModal(null);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2 bg-[#1a1a2e] text-[#e8e8e8] rounded-lg border border-[#2a2a3e] hover:bg-[#2a2a3e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== (deleteModal === 'all' ? 'DELETE ALL' : 'DELETE PRESETS')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
