'use client';

import { useEffect, useState } from 'react';
import {
  Trophy,
  Upload,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { proNadesApi } from '@/lib/api';
import { MAPS } from '@/lib/constants';
import type { ProMatch, ProTeam, DemoStatus } from '@/lib/types';

const STATUS_CONFIG: Record<DemoStatus, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#6b6b8a', icon: <Clock className="h-3.5 w-3.5" />, label: 'Pending' },
  downloading: { color: '#3b82f6', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'Downloading' },
  extracting: { color: '#8b5cf6', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'Extracting' },
  analyzing: { color: '#f0a500', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'Analyzing' },
  completed: { color: '#22c55e', icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Completed' },
  failed: { color: '#ff4444', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Failed' },
};

interface AnalyzeForm {
  url: string;
  mapName: string;
  matchDate: string;
  team1Name: string;
  team2Name: string;
  eventName: string;
  score: string;
  hltvMatchId: string;
}

const INITIAL_FORM: AnalyzeForm = {
  url: '',
  mapName: '',
  matchDate: new Date().toISOString().split('T')[0],
  team1Name: '',
  team2Name: '',
  eventName: '',
  score: '',
  hltvMatchId: '',
};

export default function ProNadesAdminPage() {
  const [matches, setMatches] = useState<ProMatch[]>([]);
  const [teams, setTeams] = useState<ProTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Analyze form
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [form, setForm] = useState<AnalyzeForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Refresh collections
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [matchData, teamData] = await Promise.all([
        proNadesApi.getMatches().catch(() => []),
        proNadesApi.getTeams().catch(() => []),
      ]);
      setMatches(Array.isArray(matchData) ? matchData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
    } catch {
      toast.error('Failed to load pro nades data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url || !form.mapName || !form.matchDate) {
      toast.error('URL, map, and match date are required');
      return;
    }
    setSubmitting(true);
    try {
      await proNadesApi.analyze({
        url: form.url,
        mapName: form.mapName,
        matchDate: form.matchDate,
        team1Name: form.team1Name || undefined,
        team2Name: form.team2Name || undefined,
        eventName: form.eventName || undefined,
        score: form.score || undefined,
        hltvMatchId: form.hltvMatchId ? parseInt(form.hltvMatchId) : undefined,
      });
      toast.success('Demo analysis triggered');
      setShowAnalyze(false);
      setForm(INITIAL_FORM);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to trigger analysis';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshCollections = async () => {
    setRefreshing(true);
    try {
      await proNadesApi.refreshCollections();
      toast.success('Collection refresh triggered');
    } catch {
      toast.error('Failed to refresh collections');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#f0a500]" />
        <span className="ml-3 text-[#6b6b8a]">Loading pro nades data...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-[#f0a500]" />
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8e8]">Pro Nades</h1>
            <p className="text-sm text-[#6b6b8a]">
              Manage professional demo analysis and collections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshCollections}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Collections
          </button>
          <button
            onClick={() => setShowAnalyze(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Analyze Demo
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-[#2a2a3e] bg-[#12121a] p-5">
          <p className="text-2xl font-bold text-[#e8e8e8]">{matches.length}</p>
          <p className="text-xs text-[#6b6b8a] mt-1">Matches Analyzed</p>
        </div>
        <div className="rounded-xl border border-[#2a2a3e] bg-[#12121a] p-5">
          <p className="text-2xl font-bold text-[#e8e8e8]">{teams.length}</p>
          <p className="text-xs text-[#6b6b8a] mt-1">Pro Teams</p>
        </div>
        <div className="rounded-xl border border-[#2a2a3e] bg-[#12121a] p-5">
          <p className="text-2xl font-bold text-[#e8e8e8]">
            {matches.reduce((sum, m) => sum + m.demos.reduce((ds, d) => ds + d.throwsExtracted, 0), 0)}
          </p>
          <p className="text-xs text-[#6b6b8a] mt-1">Throws Extracted</p>
        </div>
      </div>

      {/* Matches list */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e8e8e8]">Matches</h2>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-[#2a2a3e] bg-[#12121a] px-8 py-12 text-center">
          <Trophy className="h-10 w-10 mx-auto text-[#2a2a3e] mb-3" />
          <p className="text-sm text-[#6b6b8a]">No matches analyzed yet. Click &ldquo;Analyze Demo&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="rounded-xl border border-[#2a2a3e] bg-[#12121a] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8e8e8]">
                    {match.team1Name || 'Team 1'} vs {match.team2Name || 'Team 2'}
                    {match.score && <span className="ml-2 text-[#6b6b8a]">({match.score})</span>}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#6b6b8a]">
                    <span>{match.mapName}</span>
                    <span>{formatDate(match.matchDate)}</span>
                    {match.eventName && <span>{match.eventName}</span>}
                  </div>
                </div>
              </div>

              {/* Demos */}
              {match.demos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {match.demos.map((demo) => {
                    const config = STATUS_CONFIG[demo.status];
                    return (
                      <div
                        key={demo.id}
                        className="flex items-center justify-between rounded-lg bg-[#0a0a0f] px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6b6b8a] truncate max-w-48">{demo.fileName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {demo.status === 'completed' && (
                            <div className="flex items-center gap-3 text-xs text-[#6b6b8a]">
                              <span>{demo.throwsExtracted} throws</span>
                              <span>{demo.patternsDetected} patterns</span>
                            </div>
                          )}
                          <div
                            className="flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: config.color }}
                          >
                            {config.icon}
                            {config.label}
                          </div>
                          {demo.errorMessage && (
                            <span title={demo.errorMessage}>
                              <AlertCircle className="h-4 w-4 text-[#ff4444]" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analyze Modal */}
      <AnimatePresence>
        {showAnalyze && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowAnalyze(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-[#2a2a3e] bg-[#12121a] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-[#e8e8e8] mb-4">Analyze Demo</h2>
              <form onSubmit={handleAnalyze} className="space-y-4">
                {/* URL */}
                <div>
                  <label className="block text-xs font-medium text-[#6b6b8a] mb-1">.rar URL *</label>
                  <input
                    type="url"
                    required
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://example.com/match.rar"
                    className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                  />
                </div>

                {/* Map + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Map *</label>
                    <select
                      required
                      value={form.mapName}
                      onChange={(e) => setForm((f) => ({ ...f, mapName: e.target.value }))}
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] focus:border-[#f0a500]/40 focus:outline-none"
                    >
                      <option value="">Select map</option>
                      {MAPS.map((m) => (
                        <option key={m.name} value={m.name}>{m.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Match Date *</label>
                    <input
                      type="date"
                      required
                      value={form.matchDate}
                      onChange={(e) => setForm((f) => ({ ...f, matchDate: e.target.value }))}
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] focus:border-[#f0a500]/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Team 1</label>
                    <input
                      type="text"
                      value={form.team1Name}
                      onChange={(e) => setForm((f) => ({ ...f, team1Name: e.target.value }))}
                      placeholder="e.g. MOUZ"
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Team 2</label>
                    <input
                      type="text"
                      value={form.team2Name}
                      onChange={(e) => setForm((f) => ({ ...f, team2Name: e.target.value }))}
                      placeholder="e.g. Spirit"
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Event + Score */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Event</label>
                    <input
                      type="text"
                      value={form.eventName}
                      onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                      placeholder="e.g. ESL Pro League S21"
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Score</label>
                    <input
                      type="text"
                      value={form.score}
                      onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                      placeholder="e.g. 16-13"
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* HLTV Match ID */}
                <div>
                  <label className="block text-xs font-medium text-[#6b6b8a] mb-1">HLTV Match ID</label>
                  <input
                    type="number"
                    value={form.hltvMatchId}
                    onChange={(e) => setForm((f) => ({ ...f, hltvMatchId: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a6a] focus:border-[#f0a500]/40 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAnalyze(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Trigger Analysis
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
