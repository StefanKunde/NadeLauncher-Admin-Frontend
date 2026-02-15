'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  RefreshCw,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Key,
  Clock,
  HardDrive,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  Copy,
} from 'lucide-react';
import { adminCacheApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CacheStatus {
  configured: boolean;
  connected: boolean;
  status: string;
  info: Record<string, string> | null;
}

interface CacheKey {
  key: string;
  ttl: number;
  size: number;
}

interface TestResult {
  success: boolean;
  setMs: number;
  getMs: number;
  delMs: number;
  error?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTtl(ttl: number): string {
  if (ttl === -1) return 'No expiry';
  if (ttl === -2) return 'Expired';
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`;
  return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`;
}

export default function RedisDebugPage() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [keys, setKeys] = useState<CacheKey[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [inspectingKey, setInspectingKey] = useState<string | null>(null);
  const [inspectedValue, setInspectedValue] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [s, k] = await Promise.all([
        adminCacheApi.getStatus(),
        adminCacheApi.getKeys().catch(() => []),
      ]);
      setStatus(s);
      setKeys(k);
    } catch {
      toast.error('Failed to load Redis status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminCacheApi.test();
      setTestResult(result);
      if (result.success) {
        toast.success(`Test passed (${(result.setMs + result.getMs + result.delMs).toFixed(1)}ms total)`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch {
      toast.error('Test request failed');
    } finally {
      setTesting(false);
    }
  };

  const handleFlush = async () => {
    setFlushing(true);
    try {
      await adminCacheApi.flush();
      setKeys([]);
      toast.success('Cache flushed');
    } catch {
      toast.error('Failed to flush cache');
    } finally {
      setFlushing(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    setDeletingKey(key);
    try {
      await adminCacheApi.deleteKey(key);
      setKeys((prev) => prev.filter((k) => k.key !== key));
      if (inspectingKey === key) {
        setInspectingKey(null);
        setInspectedValue(null);
      }
      toast.success(`Deleted: ${key}`);
    } catch {
      toast.error('Failed to delete key');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleInspect = async (key: string) => {
    if (inspectingKey === key) {
      setInspectingKey(null);
      setInspectedValue(null);
      return;
    }
    setInspectingKey(key);
    setInspectedValue(null);
    try {
      const result = await adminCacheApi.getKeyValue(key);
      setInspectedValue(result.value);
    } catch {
      toast.error('Failed to fetch key value');
      setInspectingKey(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#f0a500]" />
      </div>
    );
  }

  const infoFields = status?.info
    ? [
        { label: 'Redis Version', key: 'redis_version' },
        { label: 'Uptime', key: 'uptime_in_seconds', format: (v: string) => formatTtl(parseInt(v)) },
        { label: 'Used Memory', key: 'used_memory_human' },
        { label: 'Peak Memory', key: 'used_memory_peak_human' },
        { label: 'Connected Clients', key: 'connected_clients' },
        { label: 'Total Commands', key: 'total_commands_processed' },
        { label: 'Keyspace Hits', key: 'keyspace_hits' },
        { label: 'Keyspace Misses', key: 'keyspace_misses' },
        { label: 'Hit Rate', key: '_hit_rate', format: () => {
          const hits = parseInt(status!.info!.keyspace_hits || '0');
          const misses = parseInt(status!.info!.keyspace_misses || '0');
          const total = hits + misses;
          return total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : 'N/A';
        }},
        { label: 'Evicted Keys', key: 'evicted_keys' },
        { label: 'Role', key: 'role' },
        { label: 'OS', key: 'os' },
      ]
    : [];

  const totalSize = keys.reduce((acc, k) => acc + k.size, 0);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8e8]">Redis Debug</h1>
          <p className="mt-1 text-sm text-[#6b6b8a]">Monitor and debug Redis cache</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadAll(); }}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </motion.div>

      {/* Status Cards */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              status?.connected ? 'bg-[#00c850]/10' : status?.configured ? 'bg-[#ff4444]/10' : 'bg-[#6b6b8a]/10'
            }`}>
              <Database className={`h-5 w-5 ${
                status?.connected ? 'text-[#00c850]' : status?.configured ? 'text-[#ff4444]' : 'text-[#6b6b8a]'
              }`} />
            </div>
            <div>
              <p className="text-xs text-[#6b6b8a]">Connection</p>
              <p className={`text-sm font-semibold ${
                status?.connected ? 'text-[#00c850]' : status?.configured ? 'text-[#ff4444]' : 'text-[#6b6b8a]'
              }`}>
                {status?.connected ? 'Connected' : status?.configured ? 'Disconnected' : 'Not Configured'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#6b6b8a]">
            Status: <span className="text-[#b8b8cc]">{status?.status ?? 'unknown'}</span>
          </p>
        </div>

        {/* Keys Count */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0a500]/10">
              <Key className="h-5 w-5 text-[#f0a500]" />
            </div>
            <div>
              <p className="text-xs text-[#6b6b8a]">Cached Keys</p>
              <p className="text-lg font-bold text-[#e8e8e8]">{keys.length}</p>
            </div>
          </div>
          <p className="text-xs text-[#6b6b8a]">
            Total size: <span className="text-[#b8b8cc]">{formatBytes(totalSize)}</span>
          </p>
        </div>

        {/* Memory */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#a78bfa]/10">
              <HardDrive className="h-5 w-5 text-[#a78bfa]" />
            </div>
            <div>
              <p className="text-xs text-[#6b6b8a]">Memory</p>
              <p className="text-lg font-bold text-[#e8e8e8]">
                {status?.info?.used_memory_human ?? 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#6b6b8a]">
            Peak: <span className="text-[#b8b8cc]">{status?.info?.used_memory_peak_human ?? 'N/A'}</span>
          </p>
        </div>

        {/* Hit Rate */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#60a5fa]/10">
              <Zap className="h-5 w-5 text-[#60a5fa]" />
            </div>
            <div>
              <p className="text-xs text-[#6b6b8a]">Hit Rate</p>
              <p className="text-lg font-bold text-[#e8e8e8]">
                {(() => {
                  const hits = parseInt(status?.info?.keyspace_hits || '0');
                  const misses = parseInt(status?.info?.keyspace_misses || '0');
                  const total = hits + misses;
                  return total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : 'N/A';
                })()}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#6b6b8a]">
            Hits: <span className="text-[#00c850]">{status?.info?.keyspace_hits ?? '0'}</span>
            {' / '}
            Misses: <span className="text-[#ff4444]">{status?.info?.keyspace_misses ?? '0'}</span>
          </p>
        </div>
      </motion.div>

      {/* Actions Row */}
      <motion.div variants={item} className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing || !status?.connected}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Test Connection
        </button>
        <button
          onClick={handleFlush}
          disabled={flushing || !status?.connected}
          className="btn-danger flex items-center gap-2 disabled:opacity-50"
        >
          {flushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Flush All
        </button>
      </motion.div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          variants={item}
          className={`rounded-xl border p-4 ${
            testResult.success
              ? 'border-[#00c850]/30 bg-[#00c850]/5'
              : 'border-[#ff4444]/30 bg-[#ff4444]/5'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-[#00c850]" />
            ) : (
              <XCircle className="h-5 w-5 text-[#ff4444]" />
            )}
            <span className={`text-sm font-semibold ${testResult.success ? 'text-[#00c850]' : 'text-[#ff4444]'}`}>
              {testResult.success ? 'Test Passed' : 'Test Failed'}
            </span>
            {testResult.error && (
              <span className="text-xs text-[#ff4444]/70 ml-2">{testResult.error}</span>
            )}
          </div>
          {testResult.success && (
            <div className="flex gap-6 text-xs text-[#6b6b8a]">
              <span>SET: <span className="text-[#e8e8e8] font-mono">{testResult.setMs}ms</span></span>
              <span>GET: <span className="text-[#e8e8e8] font-mono">{testResult.getMs}ms</span></span>
              <span>DEL: <span className="text-[#e8e8e8] font-mono">{testResult.delMs}ms</span></span>
              <span>Total: <span className="text-[#f0a500] font-mono">{(testResult.setMs + testResult.getMs + testResult.delMs).toFixed(1)}ms</span></span>
            </div>
          )}
        </motion.div>
      )}

      {/* Server Info (collapsible) */}
      {status?.info && (
        <motion.div variants={item} className="glass rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex w-full items-center gap-2 px-5 py-4 text-sm font-semibold text-[#e8e8e8] hover:bg-[#1a1a2e]/50 transition-colors"
          >
            {showInfo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Server Info
            <span className="text-xs text-[#6b6b8a] font-normal ml-2">
              Redis {status.info.redis_version ?? '?'}
            </span>
          </button>
          {showInfo && (
            <div className="border-t border-[#2a2a3e]/50 px-5 py-4">
              <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                {infoFields.map(({ label, key, format }) => {
                  const val = key.startsWith('_')
                    ? format?.('') ?? ''
                    : status.info![key] ?? 'N/A';
                  const display = format && !key.startsWith('_') ? format(val) : val;
                  return (
                    <div key={key} className="flex justify-between text-xs py-1">
                      <span className="text-[#6b6b8a]">{label}</span>
                      <span className="text-[#b8b8cc] font-mono">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Not configured warning */}
      {!status?.configured && (
        <motion.div variants={item} className="rounded-xl border border-[#f0a500]/30 bg-[#f0a500]/5 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#f0a500]" />
            <div>
              <p className="text-sm font-semibold text-[#f0a500]">Redis Not Configured</p>
              <p className="text-xs text-[#6b6b8a] mt-1">
                Set the <code className="text-[#b8b8cc] bg-[#1a1a2e] px-1.5 py-0.5 rounded">REDIS_URL</code> environment variable in your backend to enable caching.
                Example: <code className="text-[#b8b8cc] bg-[#1a1a2e] px-1.5 py-0.5 rounded">redis://localhost:6379</code>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Disconnected warning */}
      {status?.configured && !status?.connected && (
        <motion.div variants={item} className="rounded-xl border border-[#ff4444]/30 bg-[#ff4444]/5 p-5">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-[#ff4444]" />
            <div>
              <p className="text-sm font-semibold text-[#ff4444]">Redis Disconnected</p>
              <p className="text-xs text-[#6b6b8a] mt-1">
                Redis is configured but not connected. Status: <code className="text-[#b8b8cc] bg-[#1a1a2e] px-1.5 py-0.5 rounded">{status.status}</code>.
                Check that your Redis server is running and the URL is correct.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cached Keys Table */}
      <motion.div variants={item} className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a3e]/50">
          <h2 className="text-sm font-semibold text-[#e8e8e8]">
            Cached Keys
            <span className="ml-2 text-xs font-normal text-[#6b6b8a]">({keys.length})</span>
          </h2>
        </div>
        {keys.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#6b6b8a]">
            {status?.connected ? 'No cached keys' : 'Redis not available'}
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a3e]/30">
            {keys.map((k) => (
              <div key={k.key}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a2e]/30 transition-colors">
                  <Key className="h-3.5 w-3.5 shrink-0 text-[#6b6b8a]" />
                  <span className="flex-1 min-w-0 truncate text-sm font-mono text-[#e8e8e8]">{k.key}</span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-[#6b6b8a]">
                      <Clock className="h-3 w-3" />
                      {formatTtl(k.ttl)}
                    </span>
                    <span className="text-xs text-[#6b6b8a] font-mono w-16 text-right">
                      {formatBytes(k.size)}
                    </span>
                    <button
                      onClick={() => handleInspect(k.key)}
                      className="p-1.5 rounded text-[#6b6b8a] hover:text-[#60a5fa] hover:bg-[#60a5fa]/10 transition-colors"
                      title="Inspect value"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(k.key)}
                      disabled={deletingKey === k.key}
                      className="p-1.5 rounded text-[#6b6b8a] hover:text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors disabled:opacity-50"
                      title="Delete key"
                    >
                      {deletingKey === k.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {/* Inspected value */}
                {inspectingKey === k.key && (
                  <div className="px-5 pb-3">
                    <div className="rounded-lg border border-[#2a2a3e]/50 bg-[#0a0a0f] p-3 relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#6b6b8a] font-semibold">Value</span>
                        <div className="flex gap-1">
                          {inspectedValue && (
                            <button
                              onClick={() => copyToClipboard(inspectedValue)}
                              className="p-1 rounded text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e]"
                              title="Copy"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => { setInspectingKey(null); setInspectedValue(null); }}
                            className="p-1 rounded text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {inspectedValue === null ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#6b6b8a]" />
                      ) : (
                        <pre className="text-xs text-[#b8b8cc] font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto scrollbar-thin">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(inspectedValue), null, 2);
                            } catch {
                              return inspectedValue;
                            }
                          })()}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
