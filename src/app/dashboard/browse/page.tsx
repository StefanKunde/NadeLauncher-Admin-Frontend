'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map,
  Loader2,
  ChevronRight,
  Plus,
  Target,
  Layers,
  BookOpen,
  Star,
} from 'lucide-react';
import { collectionsApi } from '@/lib/api';
import { MAPS, MAP_COLORS, GRENADE_TYPES } from '@/lib/constants';
import type { LineupCollection, Lineup } from '@/lib/types';
import MapRadar from '@/components/ui/MapRadar';
import toast from 'react-hot-toast';

type GrenadeFilter = 'all' | 'smoke' | 'flash' | 'molotov' | 'he';

export default function BrowsePage() {
  const [selectedMap, setSelectedMap] = useState(MAPS[0].name as string);
  const [collections, setCollections] = useState<LineupCollection[]>([]);
  const [allCollections, setAllCollections] = useState<LineupCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  const [grenadeFilter, setGrenadeFilter] = useState<GrenadeFilter>('all');
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingLineups, setLoadingLineups] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [openAddMenuId, setOpenAddMenuId] = useState<string | null>(null);
  const lineupListRef = useRef<HTMLDivElement>(null);

  // Load collections for selected map
  useEffect(() => {
    let cancelled = false;
    setLoadingCollections(true);
    setSelectedCollectionId(null);
    setLineups([]);
    setSelectedLineupId(null);
    collectionsApi
      .getAll(selectedMap)
      .then((data) => {
        if (!cancelled) setCollections(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load collections');
          setCollections([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCollections(false);
      });
    return () => { cancelled = true; };
  }, [selectedMap]);

  // Load all collections once (for "add to" targets)
  useEffect(() => {
    collectionsApi.getAll().then((data) => {
      setAllCollections(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, []);

  const selectCollection = useCallback(async (collectionId: string) => {
    if (collectionId === selectedCollectionId) {
      setSelectedCollectionId(null);
      setLineups([]);
      setSelectedLineupId(null);
      return;
    }
    setSelectedCollectionId(collectionId);
    setSelectedLineupId(null);
    setOpenAddMenuId(null);
    setLoadingLineups(true);
    try {
      const data = await collectionsApi.getById(collectionId);
      setLineups(data.lineups);
    } catch {
      toast.error('Failed to load lineups');
      setLineups([]);
    } finally {
      setLoadingLineups(false);
    }
  }, [selectedCollectionId]);

  const selectLineup = useCallback((lineupId: string) => {
    setSelectedLineupId((prev) => (prev === lineupId ? null : lineupId));
    setOpenAddMenuId(null);
    // Scroll into view in the list
    setTimeout(() => {
      if (lineupListRef.current) {
        const el = lineupListRef.current.querySelector(`[data-lineup-id="${lineupId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  }, []);

  const handleAddToCollection = useCallback(async (lineupId: string, targetCollectionId: string) => {
    const key = `${lineupId}::${targetCollectionId}`;
    setAddingKey(key);
    try {
      await collectionsApi.addLineup(targetCollectionId, lineupId);
      toast.success('Added to collection');
      setOpenAddMenuId(null);
      setAllCollections((prev) =>
        prev.map((c) =>
          c.id === targetCollectionId ? { ...c, lineupCount: c.lineupCount + 1 } : c,
        ),
      );
      // Also update the sidebar collections list if the target is on the current map
      setCollections((prev) =>
        prev.map((c) =>
          c.id === targetCollectionId ? { ...c, lineupCount: c.lineupCount + 1 } : c,
        ),
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to add lineup');
    } finally {
      setAddingKey(null);
    }
  }, []);

  const filteredLineups = useMemo(() => {
    if (grenadeFilter === 'all') return lineups;
    return lineups.filter((l) => l.grenadeType === grenadeFilter);
  }, [lineups, grenadeFilter]);

  // Group sidebar collections
  const presetCollections = collections.filter((c) => c.isDefault);
  const trainingCollections = collections.filter((c) => c.isTraining && !c.isDefault);
  const otherCollections = collections.filter((c) => !c.isDefault && !c.isTraining);

  // Add-to targets: all collections except the current one, grouped by map
  const addTargetsByMap = useMemo(() => {
    const grouped: Record<string, LineupCollection[]> = {};
    for (const c of allCollections) {
      if (c.id === selectedCollectionId) continue;
      if (!grouped[c.mapName]) grouped[c.mapName] = [];
      grouped[c.mapName].push(c);
    }
    return grouped;
  }, [allCollections, selectedCollectionId]);

  const mapColor = MAP_COLORS[selectedMap] || '#f0a500';
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Page Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#f0a500]/10 border border-[#f0a500]/20">
            <Map className="w-6 h-6 text-[#f0a500]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Browse Collections</h1>
            <p className="text-[#6b6b8a] text-sm mt-0.5">
              Browse all collections and add lineups to course collections
            </p>
          </div>
        </div>

        {/* Map tabs */}
        <div className="flex flex-wrap gap-2">
          {MAPS.map((map) => {
            const color = MAP_COLORS[map.name] || '#f0a500';
            const isActive = selectedMap === map.name;
            return (
              <button
                key={map.name}
                onClick={() => setSelectedMap(map.name)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'border'
                    : 'text-[#6b6b8a] hover:text-[#e8e8e8] bg-[#12121a] border border-[#2a2a3e] hover:border-[#3a3a5e]'
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${color}20`, borderColor: `${color}60`, color }
                    : {}
                }
              >
                {map.displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Collection sidebar */}
        <div className="w-56 shrink-0 flex flex-col gap-0.5 overflow-y-auto">
          {loadingCollections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#f0a500]" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-sm text-[#6b6b8a] text-center py-4">No collections</p>
          ) : (
            <>
              {presetCollections.length > 0 && (
                <CollectionGroup
                  label="Preset"
                  icon={<Star className="h-3 w-3" />}
                  collections={presetCollections}
                  selectedId={selectedCollectionId}
                  onSelect={selectCollection}
                />
              )}
              {trainingCollections.length > 0 && (
                <CollectionGroup
                  label="Training / Course"
                  icon={<Target className="h-3 w-3" />}
                  collections={trainingCollections}
                  selectedId={selectedCollectionId}
                  onSelect={selectCollection}
                />
              )}
              {otherCollections.length > 0 && (
                <CollectionGroup
                  label="Collections"
                  icon={<Layers className="h-3 w-3" />}
                  collections={otherCollections}
                  selectedId={selectedCollectionId}
                  onSelect={selectCollection}
                />
              )}
            </>
          )}
        </div>

        {/* Center: Map radar */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Grenade filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(['all', 'smoke', 'flash', 'molotov', 'he'] as const).map((type) => {
              const isActive = grenadeFilter === type;
              const color = type === 'all' ? mapColor : GRENADE_TYPES[type].color;
              return (
                <button
                  key={type}
                  onClick={() => setGrenadeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                    isActive ? 'border' : 'text-[#6b6b8a] hover:text-[#e8e8e8] bg-[#12121a] border border-[#2a2a3e]'
                  }`}
                  style={isActive ? { backgroundColor: `${color}20`, borderColor: `${color}50`, color } : {}}
                >
                  {type === 'all' ? 'All' : GRENADE_TYPES[type].label}
                </button>
              );
            })}
            {selectedCollection && (
              <span className="ml-auto text-xs text-[#6b6b8a]">
                <span style={{ color: mapColor }}>{selectedCollection.name}</span>
                {' · '}{filteredLineups.length} lineup{filteredLineups.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Map radar fills remaining height */}
          <div className="flex-1 min-h-0 relative">
            {!selectedCollectionId && !loadingCollections && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center">
                  <Map className="h-12 w-12 text-[#2a2a3e] mx-auto mb-3" />
                  <p className="text-[#6b6b8a] text-sm">Select a collection to view lineups</p>
                </div>
              </div>
            )}
            <MapRadar
              mapName={selectedMap}
              lineups={filteredLineups}
              selectedLineupId={selectedLineupId}
              onLineupClick={(l) => selectLineup(l.id)}
            />
          </div>
        </div>

        {/* Right: Nade list */}
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <div className="text-xs text-[#6b6b8a] mb-2 shrink-0 flex items-center gap-2">
            {loadingLineups ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f0a500]" />
            ) : selectedCollectionId ? (
              <span>{filteredLineups.length} lineup{filteredLineups.length !== 1 ? 's' : ''}</span>
            ) : (
              <span>Select a collection</span>
            )}
          </div>

          <div ref={lineupListRef} className="flex-1 overflow-y-auto space-y-0.5">
            {!loadingLineups && filteredLineups.map((lineup) => (
              <NadeListItem
                key={lineup.id}
                lineup={lineup}
                isSelected={lineup.id === selectedLineupId}
                onSelect={() => selectLineup(lineup.id)}
                isMenuOpen={openAddMenuId === lineup.id}
                onToggleMenu={() =>
                  setOpenAddMenuId((prev) => (prev === lineup.id ? null : lineup.id))
                }
                addTargetsByMap={addTargetsByMap}
                addingKey={addingKey}
                onAddToCollection={handleAddToCollection}
              />
            ))}
            {!loadingLineups && selectedCollectionId && filteredLineups.length === 0 && (
              <p className="text-sm text-[#6b6b8a] text-center py-8">No lineups match filter</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CollectionGroup({
  label,
  icon,
  collections,
  selectedId,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  collections: LineupCollection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-1 py-1 text-[10px] font-semibold text-[#6b6b8a] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all text-sm ${
            selectedId === c.id
              ? 'bg-[#f0a500]/10 text-[#f0a500]'
              : 'text-[#9b9bba] hover:bg-[#1a1a2e] hover:text-[#e8e8e8]'
          }`}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform ${
              selectedId === c.id ? 'rotate-90 text-[#f0a500]' : ''
            }`}
          />
          <span className="truncate flex-1">{c.name}</span>
          <span className="text-[10px] text-[#6b6b8a] shrink-0">{c.lineupCount}</span>
        </button>
      ))}
    </div>
  );
}

function NadeListItem({
  lineup,
  isSelected,
  onSelect,
  isMenuOpen,
  onToggleMenu,
  addTargetsByMap,
  addingKey,
  onAddToCollection,
}: {
  lineup: Lineup;
  isSelected: boolean;
  onSelect: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  addTargetsByMap: Record<string, LineupCollection[]>;
  addingKey: string | null;
  onAddToCollection: (lineupId: string, collectionId: string) => void;
}) {
  const gt = GRENADE_TYPES[lineup.grenadeType as keyof typeof GRENADE_TYPES];
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggleMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMenuOpen, onToggleMenu]);

  const mapsWithTargets = MAPS.filter((m) => (addTargetsByMap[m.name]?.length ?? 0) > 0);

  return (
    <div ref={containerRef} className="relative" data-lineup-id={lineup.id}>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer group ${
          isSelected
            ? 'bg-[#1a1a2e] ring-1 ring-[#f0a500]/20'
            : 'hover:bg-[#1a1a2e]'
        }`}
        onClick={onSelect}
      >
        {/* Grenade type badge */}
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
          style={{ backgroundColor: `${gt?.color}18`, color: gt?.color }}
        >
          {gt?.label.slice(0, 2)}
        </span>

        <span className="text-sm text-[#e8e8e8] truncate flex-1">{lineup.name}</span>

        {lineup.playerName && (
          <span className="text-[10px] text-[#6b6b8a] shrink-0 truncate max-w-[60px]">
            {lineup.playerName}
          </span>
        )}

        {/* Add to collection button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          className={`p-1 rounded transition-all shrink-0 ${
            isMenuOpen
              ? 'bg-[#f0a500]/10 text-[#f0a500]'
              : 'text-[#6b6b8a] hover:text-[#f0a500] opacity-0 group-hover:opacity-100'
          }`}
          title="Add to collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Add-to-collection dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-50 w-64 max-h-80 overflow-y-auto bg-[#12121a] border border-[#2a2a3e] rounded-xl shadow-2xl"
          >
            <div className="p-2">
              <p className="text-[10px] font-semibold text-[#6b6b8a] uppercase tracking-wider px-2 mb-1.5">
                Add to collection
              </p>

              {mapsWithTargets.length === 0 && (
                <p className="text-xs text-[#6b6b8a] px-2 py-2">No other collections available</p>
              )}

              {mapsWithTargets.map((map) => (
                <div key={map.name}>
                  <div className="text-[9px] font-semibold text-[#6b6b8a]/60 uppercase tracking-wider px-2 pt-2 pb-0.5">
                    {map.displayName}
                  </div>
                  {addTargetsByMap[map.name].map((c) => {
                    const key = `${lineup.id}::${c.id}`;
                    const isAdding = addingKey === key;
                    return (
                      <button
                        key={c.id}
                        onClick={() => !isAdding && onAddToCollection(lineup.id, c.id)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1a1a2e] transition-colors text-left disabled:opacity-50"
                      >
                        {isAdding ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f0a500] shrink-0" />
                        ) : c.isTraining ? (
                          <Target className="h-3.5 w-3.5 text-[#f0a500] shrink-0" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5 text-[#6b6b8a] shrink-0" />
                        )}
                        <span className="text-sm text-[#e8e8e8] truncate flex-1">{c.name}</span>
                        <span className="text-[10px] text-[#6b6b8a] shrink-0">{c.lineupCount}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
