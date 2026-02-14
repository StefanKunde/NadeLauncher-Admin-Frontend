'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Activity,
  Search,
  X,
  Crown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Clock,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { adminSessionsApi } from '@/lib/api';
import type { Session, PaginatedSessions, SessionStatus, ExhaustedUser } from '@/lib/types';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<SessionStatus, { bg: string; text: string }> = {
  queued: { bg: 'bg-[#6366f1]/15', text: 'text-[#6366f1]' },
  pending: { bg: 'bg-[#f0a500]/15', text: 'text-[#f0a500]' },
  provisioning: { bg: 'bg-[#f0a500]/15', text: 'text-[#f0a500]' },
  ready: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  active: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  recyclable: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]' },
  ending: { bg: 'bg-[#6b6b8a]/15', text: 'text-[#6b6b8a]' },
  ended: { bg: 'bg-[#6b6b8a]/15', text: 'text-[#6b6b8a]' },
  failed: { bg: 'bg-[#ff4444]/15', text: 'text-[#ff4444]' },
};

export default function SessionsPage() {
  const [data, setData] = useState<PaginatedSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [exhaustedUsers, setExhaustedUsers] = useState<ExhaustedUser[]>([]);
  const [loadingExhausted, setLoadingExhausted] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchText);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminSessionsApi.getHistory({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchDebounced || undefined,
      });
      setData(result);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchDebounced]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    adminSessionsApi.getExhaustedUsers()
      .then(setExhaustedUsers)
      .catch(() => {})
      .finally(() => setLoadingExhausted(false));
  }, []);

  const formatDuration = (startedAt?: string | null, endedAt?: string) => {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${seconds % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const getEndReasonLabel = (reason?: string) => {
    if (!reason) return '-';
    const labels: Record<string, string> = {
      user_ended: 'User Left',
      expired: 'Time Expired',
      disconnected: 'Disconnected',
      connection_timeout: 'Connection Timeout',
      recycled: 'Recycled',
      admin_ended: 'Admin Ended',
      kicked: 'Usage Limit',
      provisioning_failed: 'Provisioning Failed',
    };
    return labels[reason] || reason;
  };

  const getEndReasonColor = (reason?: string) => {
    if (!reason) return 'text-[#6b6b8a]';
    if (reason === 'user_ended') return 'text-[#22c55e]';
    if (reason === 'expired' || reason === 'kicked') return 'text-[#f59e0b]';
    if (reason === 'disconnected' || reason === 'connection_timeout') return 'text-[#ff4444]';
    if (reason === 'recycled') return 'text-[#6366f1]';
    return 'text-[#6b6b8a]';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20">
            <Activity className="w-6 h-6 text-[#06b6d4]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Sessions</h1>
          </div>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px]">
          All session history with user details and usage
        </p>
      </div>

      {/* Exhausted Users Banner */}
      {!loadingExhausted && exhaustedUsers.length > 0 && (
        <motion.div
          className="mb-6 glass rounded-xl p-5 border border-[#f59e0b]/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-[#f59e0b]">
              Users at Weekly Limit ({exhaustedUsers.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {exhaustedUsers.map((u) => (
              <div
                key={u.userId}
                className="flex items-center gap-2 bg-[#1a1a2e] rounded-lg px-3 py-2 border border-[#2a2a3e]"
              >
                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#0a0a0f]">
                  {u.avatar ? (
                    <Image src={u.avatar} alt={u.username} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-[#6b6b8a]">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm text-[#e8e8e8]">{u.username}</span>
                <span className="text-xs text-[#f59e0b]">
                  {formatSeconds(u.usedSeconds)} / {formatSeconds(u.limitSeconds)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-2 pr-10"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="provisioning">Provisioning</option>
            <option value="recyclable">Recyclable</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] placeholder-[#6b6b8a]/50 w-64 focus:outline-none focus:border-[#f0a500]/40 transition-colors pl-10 pr-10 py-2"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b8a] hover:text-[#e8e8e8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <motion.div
        className="glass rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Map</th>
                <th>Collection</th>
                <th>Duration</th>
                <th>End Reason</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#f0a500]" />
                    </div>
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((session) => {
                  const statusStyle = STATUS_COLORS[session.status] || STATUS_COLORS.ended;
                  return (
                    <tr key={session.id}>
                      {/* User */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#1a1a2e]">
                            {session.user?.avatar ? (
                              <Image
                                src={session.user.avatar}
                                alt={session.user.username}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#6b6b8a]">
                                {(session.user?.username || '?').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#e8e8e8] text-sm">
                              {session.user?.username ?? 'Unknown'}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {session.user?.isPremium ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-[#f0a500]">
                                  <Crown className="h-2.5 w-2.5" />
                                  Premium
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#6b6b8a]">Free</span>
                              )}
                              {session.isEditorSession && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] font-medium">
                                  EDITOR
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {session.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Map */}
                      <td>
                        <span className="flex items-center gap-1 text-sm text-[#9a9ab0]">
                          <MapPin className="w-3 h-3" />
                          {session.mapName}
                        </span>
                      </td>

                      {/* Collection */}
                      <td>
                        {session.editingCollectionName || session.practiceCollectionName ? (
                          <span className="flex items-center gap-1 text-sm text-[#9a9ab0]">
                            <FolderOpen className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">
                              {session.editingCollectionName || session.practiceCollectionName}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-[#6b6b8a]">-</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td>
                        <span className="flex items-center gap-1 text-sm text-[#9a9ab0]">
                          <Clock className="w-3 h-3" />
                          {formatDuration(session.startedAt, session.endedAt)}
                        </span>
                      </td>

                      {/* End Reason */}
                      <td>
                        <span className={`text-sm ${getEndReasonColor(session.endReason)}`}>
                          {getEndReasonLabel(session.endReason)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="text-[#6b6b8a] text-sm whitespace-nowrap">
                        {formatDate(session.createdAt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-[#6b6b8a]/30 mx-auto mb-4" />
                      <p className="text-[#6b6b8a]">No sessions found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a3e]">
            <p className="text-sm text-[#6b6b8a]">
              Showing {((data.page - 1) * data.limit) + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total} sessions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-[#2a2a3e] text-[#6b6b8a] hover:text-[#e8e8e8] hover:border-[#3a3a5e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number;
                if (data.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-[#f0a500]/15 text-[#f0a500] border border-[#f0a500]/30'
                        : 'border border-[#2a2a3e] text-[#6b6b8a] hover:text-[#e8e8e8] hover:border-[#3a3a5e]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="p-2 rounded-lg border border-[#2a2a3e] text-[#6b6b8a] hover:text-[#e8e8e8] hover:border-[#3a3a5e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#6b6b8a]">
          <p>
            {data.total} total sessions
          </p>
        </div>
      )}
    </div>
  );
}
