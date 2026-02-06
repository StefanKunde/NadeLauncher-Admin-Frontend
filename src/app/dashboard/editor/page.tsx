'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Square,
  Server,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  FolderOpen,
  Target,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { adminSessionsApi, collectionsApi } from '@/lib/api';
import { MAPS, MAP_COLORS } from '@/lib/constants';
import type { LineupCollection, Session } from '@/lib/types';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const [collections, setCollections] = useState<LineupCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<string>('de_mirage');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load collections
  useEffect(() => {
    loadCollections();
    loadActiveSession();
  }, []);

  // Poll for session updates when active
  useEffect(() => {
    if (!session?.isActive) return;

    const interval = setInterval(loadActiveSession, 5000);
    return () => clearInterval(interval);
  }, [session?.isActive]);

  const loadCollections = async () => {
    try {
      const data = await collectionsApi.getAll();
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSession = async () => {
    try {
      const data = await adminSessionsApi.getActive();
      setSession(data);
    } catch (error) {
      console.error('Failed to load active session:', error);
    }
  };

  // Filter collections by selected map
  const mapCollections = collections.filter((c) => c.mapName === selectedMap);

  // Auto-select first collection when map changes
  useEffect(() => {
    if (mapCollections.length > 0 && !mapCollections.find((c) => c.id === selectedCollectionId)) {
      setSelectedCollectionId(mapCollections[0].id);
    }
  }, [selectedMap, mapCollections, selectedCollectionId]);

  const handleStartSession = async () => {
    if (!selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    setStarting(true);
    try {
      const newSession = await adminSessionsApi.createEditor({
        mapName: selectedMap,
        collectionId: selectedCollectionId,
      });
      setSession(newSession);
      toast.success('Editor session started');
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast.error(error.response?.data?.message || 'Failed to start editor session');
    } finally {
      setStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    setEnding(true);
    try {
      await adminSessionsApi.end(session.id);
      setSession(null);
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const mapColor = MAP_COLORS[selectedMap] || '#f0a500';

  // Status display helpers
  const getStatusDisplay = (status: Session['status']) => {
    switch (status) {
      case 'queued':
        return { label: 'In Queue', color: '#6366f1', icon: RefreshCw };
      case 'pending':
        return { label: 'Pending', color: '#f0a500', icon: Loader2 };
      case 'provisioning':
        return { label: 'Provisioning Server...', color: '#f0a500', icon: Loader2 };
      case 'ready':
        return { label: 'Ready', color: '#22c55e', icon: Server };
      case 'active':
        return { label: 'Active', color: '#22c55e', icon: Server };
      case 'failed':
        return { label: 'Failed', color: '#ef4444', icon: AlertCircle };
      default:
        return { label: status, color: '#6b6b8a', icon: Server };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#f0a500]/10 border border-[#f0a500]/20">
            <Server className="w-6 h-6 text-[#f0a500]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Collection Editor</h1>
          </div>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px] mt-2">
          Start a private server to edit collection lineups in-game
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Session Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          {!session?.isActive ? (
            <>
              <h2 className="text-lg font-semibold text-[#e8e8e8] mb-6">Start Editor Session</h2>

              {/* Map Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                  Map
                </label>
                <div className="relative">
                  <select
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value)}
                    className="w-full appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-3 pr-10"
                  >
                    {MAPS.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                </div>
              </div>

              {/* Collection Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                  Collection to Edit
                </label>
                {mapCollections.length === 0 ? (
                  <div className="bg-[#12121a] border border-[#2a2a3e] rounded-xl px-4 py-3 text-[#6b6b8a] text-sm">
                    No collections for this map. Create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-3 pr-10"
                    >
                      {mapCollections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isDefault ? '(Default)' : ''} - {c.lineupCount} lineups
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Selected Collection Info */}
              {selectedCollection && (
                <div
                  className="mb-6 p-4 rounded-xl border"
                  style={{
                    backgroundColor: `${mapColor}08`,
                    borderColor: `${mapColor}30`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <FolderOpen className="h-5 w-5 mt-0.5" style={{ color: mapColor }} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#e8e8e8]">{selectedCollection.name}</h3>
                      {selectedCollection.description && (
                        <p className="text-sm text-[#6b6b8a] mt-1">{selectedCollection.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm text-[#6b6b8a]">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {selectedCollection.lineupCount} lineups
                        </span>
                        {selectedCollection.isDefault && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${mapColor}15`,
                              color: mapColor,
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStartSession}
                disabled={starting || !selectedCollectionId}
                className="w-full btn-primary"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting Server...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Editor Server
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Active Session */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#e8e8e8]">Active Session</h2>
                {(() => {
                  const statusInfo = getStatusDisplay(session.status);
                  const Icon = statusInfo.icon;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${statusInfo.color}15`,
                        color: statusInfo.color,
                      }}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 ${
                          session.status === 'provisioning' || session.status === 'pending'
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      {statusInfo.label}
                    </span>
                  );
                })()}
              </div>

              {/* Session Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Map</label>
                  <div className="text-[#e8e8e8]">
                    {MAPS.find((m) => m.name === session.mapName)?.displayName || session.mapName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6b6b8a] mb-1">Collection</label>
                  <div className="text-[#e8e8e8]">{session.editingCollectionName || 'Unknown'}</div>
                </div>

                {session.provisioningError && (
                  <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
                    <div className="flex items-start gap-2 text-sm text-[#ef4444]">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{session.provisioningError}</span>
                    </div>
                  </div>
                )}

                {session.queuePosition && (
                  <div className="p-4 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 text-center">
                    <div className="text-3xl font-bold text-[#6366f1]">#{session.queuePosition}</div>
                    <div className="text-sm text-[#6b6b8a] mt-1">Position in queue</div>
                  </div>
                )}

                {(session.status === 'ready' || session.status === 'active') && session.serverIp && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#6b6b8a] mb-1">
                        Server Address
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#12121a] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] font-mono">
                          {session.serverIp}:{session.serverPort || 27015}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${session.serverIp}:${session.serverPort || 27015}`,
                              'address'
                            )
                          }
                          className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#f0a500] border border-[#2a2a3e] transition-all"
                        >
                          {copiedField === 'address' ? (
                            <Check className="h-4 w-4 text-[#22c55e]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {session.serverPassword && (
                      <div>
                        <label className="block text-xs font-medium text-[#6b6b8a] mb-1">
                          Password
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-[#12121a] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] font-mono">
                            {session.serverPassword}
                          </code>
                          <button
                            onClick={() => copyToClipboard(session.serverPassword!, 'password')}
                            className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#f0a500] border border-[#2a2a3e] transition-all"
                          >
                            {copiedField === 'password' ? (
                              <Check className="h-4 w-4 text-[#22c55e]" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-[#6b6b8a] mb-1">
                        Console Connect Command
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#12121a] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] font-mono break-all">
                          connect {session.serverIp}:{session.serverPort || 27015}
                          {session.serverPassword ? `; password ${session.serverPassword}` : ''}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `connect ${session.serverIp}:${session.serverPort || 27015}${
                                session.serverPassword ? `; password ${session.serverPassword}` : ''
                              }`,
                              'connect'
                            )
                          }
                          className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#f0a500] border border-[#2a2a3e] transition-all"
                        >
                          {copiedField === 'connect' ? (
                            <Check className="h-4 w-4 text-[#22c55e]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Steam Connect Button */}
                    <a
                      href={`steam://connect/${session.serverIp}:${session.serverPort || 27015}/${session.serverPassword || ''}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f0a500] px-4 py-3 text-sm font-bold text-[#0a0a12] transition-all hover:bg-[#d4900a] hover:shadow-lg hover:shadow-[#f0a500]/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Connect via Steam
                    </a>
                  </>
                )}
              </div>

              {/* End Session Button */}
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="w-full btn-secondary text-[#ff4444] hover:bg-[#ff4444]/10 hover:border-[#ff4444]/30"
              >
                {ending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ending Session...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    End Session
                  </>
                )}
              </button>
            </>
          )}
        </motion.div>

        {/* Right: Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-[#e8e8e8] mb-4">How It Works</h2>
          <div className="space-y-4 text-sm text-[#6b6b8a]">
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#f0a500]/15 text-[#f0a500] flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="text-[#e8e8e8] font-medium">Select a map and collection</p>
                <p className="mt-1">Choose the collection you want to edit lineups for.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#f0a500]/15 text-[#f0a500] flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="text-[#e8e8e8] font-medium">Start the server</p>
                <p className="mt-1">
                  A private server will be provisioned with only the collection&apos;s lineups loaded.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#f0a500]/15 text-[#f0a500] flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="text-[#e8e8e8] font-medium">Connect and edit</p>
                <p className="mt-1">
                  Join the server using the connect command. Use the same in-game commands to create,
                  edit, and delete lineups.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#f0a500]/15 text-[#f0a500] flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <p className="text-[#e8e8e8] font-medium">Auto-sync to collection</p>
                <p className="mt-1">
                  All lineups you create will automatically be added to the collection. If editing a
                  default collection, they&apos;ll be marked as presets.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[#f0a500]/5 border border-[#f0a500]/20">
            <h3 className="text-sm font-semibold text-[#f0a500] mb-2">Available Commands</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <code className="text-[#e8e8e8]">!save &lt;name&gt;</code>
                <span className="text-[#6b6b8a]">Save current position as lineup</span>
              </div>
              <div className="flex justify-between">
                <code className="text-[#e8e8e8]">!nades</code>
                <span className="text-[#6b6b8a]">Browse collection lineups</span>
              </div>
              <div className="flex justify-between">
                <code className="text-[#e8e8e8]">!delete</code>
                <span className="text-[#6b6b8a]">Delete last used lineup</span>
              </div>
              <div className="flex justify-between">
                <code className="text-[#e8e8e8]">!rethrow</code>
                <span className="text-[#6b6b8a]">Teleport to last lineup</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
