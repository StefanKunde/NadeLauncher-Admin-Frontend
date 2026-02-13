'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeOff,
  Eye,
  ChevronDown,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { hiddenLineupsApi } from '@/lib/api';
import { MAPS, GRENADE_TYPES } from '@/lib/constants';
import type { HiddenLineup } from '@/lib/types';
import toast from 'react-hot-toast';

export default function HiddenLineupsPage() {
  const [items, setItems] = useState<HiddenLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [unhidingId, setUnhidingId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await hiddenLineupsApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load hidden lineups');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnhide = async (item: HiddenLineup) => {
    if (!confirm(`Unhide "${item.originalName || 'this lineup'}"? It will reappear on the next import.`)) {
      return;
    }
    setUnhidingId(item.id);
    try {
      await hiddenLineupsApi.unhide(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Lineup unhidden');
    } catch {
      toast.error('Failed to unhide lineup');
    } finally {
      setUnhidingId(null);
    }
  };

  const filtered = items.filter((item) => {
    if (filterMap !== 'all' && item.mapName !== filterMap) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        item.originalName?.toLowerCase().includes(q) ||
        item.reason?.toLowerCase().includes(q) ||
        item.grenadeType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const mapDisplayName = (name: string) =>
    MAPS.find((m) => m.name === name)?.displayName || name;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading hidden lineups...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/20">
            <EyeOff className="w-6 h-6 text-[#ff4444]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Hidden Lineups</h1>
          </div>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px] mt-2">
          Blacklisted lineups excluded from all pro collections
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select
            value={filterMap}
            onChange={(e) => setFilterMap(e.target.value)}
            className="appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-2 pr-10"
          >
            <option value="all">All Maps</option>
            {MAPS.map((m) => (
              <option key={m.name} value={m.name}>
                {m.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
        </div>

        <span className="text-sm text-[#6b6b8a]">
          {filtered.length} hidden lineup{filtered.length !== 1 ? 's' : ''}
        </span>

        <div className="relative ml-auto">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3" />
          <input
            type="text"
            placeholder="Search hidden lineups..."
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

      {/* Table */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <EyeOff className="w-16 h-16 text-[#6b6b8a]/30 mx-auto mb-4" />
          <p className="text-[#e8e8e8] text-xl font-semibold mb-2">
            No hidden lineups
          </p>
          <p className="text-[#6b6b8a]">
            Hide lineups from the Collections page to manage them here
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-[#2a2a3e] overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a3e] text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">Map</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">Hidden At</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((item) => {
                  const gt = GRENADE_TYPES[item.grenadeType as keyof typeof GRENADE_TYPES];
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-[#2a2a3e]/50 hover:bg-[#1a1a2e]/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-[#e8e8e8]">
                        {item.originalName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        {gt && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{
                              backgroundColor: `${gt.color}15`,
                              color: gt.color,
                            }}
                          >
                            {gt.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6b6b8a]">
                        {mapDisplayName(item.mapName)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6b6b8a] max-w-48 truncate">
                        {item.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6b6b8a]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUnhide(item)}
                          disabled={unhidingId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#22c55e] hover:border-[#22c55e]/30 border border-[#2a2a3e] transition-all disabled:opacity-50"
                        >
                          {unhidingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          Unhide
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
