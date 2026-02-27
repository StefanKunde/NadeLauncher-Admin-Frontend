'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Target,
  Layers,
  BookOpen,
  Star,
  Search,
  X,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import { collectionsApi, adminCollectionsApi } from '@/lib/api';
import { MAPS, MAP_COLORS, GRENADE_TYPES } from '@/lib/constants';
import type { LineupCollection, Lineup, AdminSearchedCollection } from '@/lib/types';
import MapRadar from '@/components/ui/MapRadar';
import toast from 'react-hot-toast';

type GrenadeFilter = 'all' | 'smoke' | 'flash' | 'molotov' | 'he';
type SidebarMode = 'preset' | 'search';
type SearchType = 'all' | 'community' | 'user';

const PAGE_LIMIT = 20;

export default function BrowsePage() {
  const [selectedMap, setSelectedMap] = useState(MAPS[0].name as string);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('preset');

  // Preset mode state
  const [presetCollections, setPresetCollections] = useState<LineupCollection[]>([]);
  const [loadingPreset, setLoadingPreset] = useState(true);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [searchResults, setSearchResults] = useState<AdminSearchedCollection[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInitialised = useRef(false);

  // Shared state
  const [allCollections, setAllCollections] = useState<LineupCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  const [grenadeFilter, setGrenadeFilter] = useState<GrenadeFilter>('all');
  const [loadingLineups, setLoadingLineups] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [openAddMenuId, setOpenAddMenuId] = useState<string | null>(null);
  const lineupListRef = useRef<HTMLDivElement>(null);

  // Load preset collections when map changes
  useEffect(() => {
    let cancelled = false;
    setLoadingPreset(true);
    collectionsApi
      .getAll(selectedMap)
      .then((data) => { if (!cancelled) setPresetCollections(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) { toast.error('Failed to load collections'); setPresetCollections([]); } })
      .finally(() => { if (!cancelled) setLoadingPreset(false); });
    return () => { cancelled = true; };
  }, [selectedMap]);

  // Load all collections for "add to" targets (once)
  useEffect(() => {
    collectionsApi.getAll().then((d) => setAllCollections(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  // Run search with debounce when query/type changes in search mode
  useEffect(() => {
    if (sidebarMode !== 'search') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(1), 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchType, sidebarMode]);

  const runSearch = useCallback(async (page: number) => {
    setLoadingSearch(true);
    setSearchPage(page);
    try {
      const result = await adminCollectionsApi.search({
        search: searchQuery || undefined,
        type: searchType,
        page,
        limit: PAGE_LIMIT,
      });
      setSearchResults(result.items);
      setSearchTotal(result.total);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoadingSearch(false);
    }
  }, [searchQuery, searchType]);

  const handleSwitchToSearch = useCallback(() => {
    setSidebarMode('search');
    if (!searchInitialised.current) {
      searchInitialised.current = true;
      runSearch(1);
    }
  }, [runSearch]);

  const selectCollection = useCallback(async (collectionId: string, mapName?: string) => {
    if (collectionId === selectedCollectionId) {
      setSelectedCollectionId(null);
      setLineups([]);
      setSelectedLineupId(null);
      return;
    }
    if (mapName && mapName !== selectedMap) setSelectedMap(mapName);
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
  }, [selectedCollectionId, selectedMap]);

  const selectLineup = useCallback((lineupId: string) => {
    setSelectedLineupId((prev) => (prev === lineupId ? null : lineupId));
    setOpenAddMenuId(null);
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
      const bump = (list: LineupCollection[]) =>
        list.map((c) => c.id === targetCollectionId ? { ...c, lineupCount: c.lineupCount + 1 } : c);
      setAllCollections(bump);
      setPresetCollections(bump);
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

  const presetGroups = useMemo(() => ({
    defaults: presetCollections.filter((c) => c.isDefault),
    training: presetCollections.filter((c) => c.isTraining && !c.isDefault),
    other: presetCollections.filter((c) => !c.isDefault && !c.isTraining),
  }), [presetCollections]);

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
  const selectedCollection = presetCollections.find((c) => c.id === selectedCollectionId);
  const totalSearchPages = Math.ceil(searchTotal / PAGE_LIMIT);

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
                style={isActive ? { backgroundColor: `${color}20`, borderColor: `${color}60`, color } : {}}
              >
                {map.displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Left: Sidebar ── */}
        <div className="w-60 shrink-0 flex flex-col min-h-0">
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[#2a2a3e] mb-3 shrink-0">
            <button
              onClick={() => setSidebarMode('preset')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                sidebarMode === 'preset'
                  ? 'bg-[#f0a500]/10 text-[#f0a500]'
                  : 'text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Preset
            </button>
            <div className="w-px bg-[#2a2a3e]" />
            <button
              onClick={handleSwitchToSearch}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                sidebarMode === 'search'
                  ? 'bg-[#f0a500]/10 text-[#f0a500]'
                  : 'text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e]'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          </div>

          {/* ── Preset mode ── */}
          {sidebarMode === 'preset' && (
            <div className="flex-1 overflow-y-auto">
              {loadingPreset ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#f0a500]" />
                </div>
              ) : presetCollections.length === 0 ? (
                <p className="text-sm text-[#6b6b8a] text-center py-4">No collections for this map</p>
              ) : (
                <>
                  {presetGroups.defaults.length > 0 && (
                    <CollectionGroup
                      label="Preset"
                      icon={<Star className="h-3 w-3" />}
                      collections={presetGroups.defaults}
                      selectedId={selectedCollectionId}
                      onSelect={(id) => selectCollection(id)}
                    />
                  )}
                  {presetGroups.training.length > 0 && (
                    <CollectionGroup
                      label="Training / Course"
                      icon={<Target className="h-3 w-3" />}
                      collections={presetGroups.training}
                      selectedId={selectedCollectionId}
                      onSelect={(id) => selectCollection(id)}
                    />
                  )}
                  {presetGroups.other.length > 0 && (
                    <CollectionGroup
                      label="Collections"
                      icon={<Layers className="h-3 w-3" />}
                      collections={presetGroups.other}
                      selectedId={selectedCollectionId}
                      onSelect={(id) => selectCollection(id)}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Search mode ── */}
          {sidebarMode === 'search' && (
            <div className="flex flex-col flex-1 min-h-0 gap-2">
              {/* Search input */}
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b6b8a] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, description or username…"
                  className="w-full bg-[#12121a] border border-[#2a2a3e] rounded-lg text-xs text-[#e8e8e8] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#f0a500]/40 pl-8 pr-7 py-2 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] hover:text-[#e8e8e8] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Type filter */}
              <div className="flex rounded-lg overflow-hidden border border-[#2a2a3e] shrink-0">
                {([
                  { value: 'all' as const, label: 'All', icon: <Layers className="h-3 w-3" /> },
                  { value: 'community' as const, label: 'Public', icon: <Globe className="h-3 w-3" /> },
                  { value: 'user' as const, label: 'Private', icon: <Lock className="h-3 w-3" /> },
                ]).map(({ value, label, icon }, i) => (
                  <button
                    key={value}
                    onClick={() => setSearchType(value)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
                      i > 0 ? 'border-l border-[#2a2a3e]' : ''
                    } ${
                      searchType === value
                        ? 'bg-[#f0a500]/10 text-[#f0a500]'
                        : 'text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e]'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                {loadingSearch ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#f0a500]" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-[#6b6b8a] text-center py-6">
                    {searchQuery ? 'No results found' : 'No user collections yet'}
                  </p>
                ) : (
                  searchResults.map((c) => (
                    <SearchResultItem
                      key={c.id}
                      collection={c}
                      isSelected={c.id === selectedCollectionId}
                      onSelect={() => selectCollection(c.id, c.mapName)}
                    />
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalSearchPages > 1 && (
                <div className="flex items-center justify-between shrink-0 pt-1 border-t border-[#2a2a3e]">
                  <button
                    onClick={() => runSearch(searchPage - 1)}
                    disabled={searchPage <= 1 || loadingSearch}
                    className="p-1.5 rounded-lg text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e] disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] text-[#6b6b8a]">
                    {searchPage} / {totalSearchPages}
                    <span className="ml-1 text-[#6b6b8a]/60">({searchTotal})</span>
                  </span>
                  <button
                    onClick={() => runSearch(searchPage + 1)}
                    disabled={searchPage >= totalSearchPages || loadingSearch}
                    className="p-1.5 rounded-lg text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e] disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Center: Map radar ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Grenade filter + info */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(['all', 'smoke', 'flash', 'molotov', 'he'] as const).map((type) => {
              const isActive = grenadeFilter === type;
              const color = type === 'all' ? mapColor : GRENADE_TYPES[type].color;
              return (
                <button
                  key={type}
                  onClick={() => setGrenadeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                    isActive
                      ? 'border'
                      : 'text-[#6b6b8a] hover:text-[#e8e8e8] bg-[#12121a] border border-[#2a2a3e]'
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

          {/* Radar */}
          <div className="flex-1 min-h-0 relative">
            {!selectedCollectionId && (
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

        {/* ── Right: Nade list ── */}
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <div className="text-xs text-[#6b6b8a] mb-2 shrink-0 flex items-center gap-2 h-7">
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
                onToggleMenu={() => setOpenAddMenuId((p) => (p === lineup.id ? null : lineup.id))}
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
  label, icon, collections, selectedId, onSelect,
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
        {icon}{label}
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
            className={`h-3 w-3 shrink-0 transition-transform ${selectedId === c.id ? 'rotate-90 text-[#f0a500]' : ''}`}
          />
          <span className="truncate flex-1">{c.name}</span>
          <span className="text-[10px] text-[#6b6b8a] shrink-0">{c.lineupCount}</span>
        </button>
      ))}
    </div>
  );
}

function SearchResultItem({
  collection, isSelected, onSelect,
}: {
  collection: AdminSearchedCollection;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const mapColor = MAP_COLORS[collection.mapName] || '#f0a500';
  const mapDisplay = MAPS.find((m) => m.name === collection.mapName)?.displayName ?? collection.mapName;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex flex-col gap-0.5 px-2 py-2 rounded-lg text-left transition-all ${
        isSelected
          ? 'bg-[#f0a500]/10 ring-1 ring-[#f0a500]/20'
          : 'hover:bg-[#1a1a2e]'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#f0a500]' : 'text-[#6b6b8a]'}`}
        />
        <span className={`text-sm truncate flex-1 font-medium ${isSelected ? 'text-[#f0a500]' : 'text-[#e8e8e8]'}`}>
          {collection.name}
        </span>
        <span className="text-[10px] text-[#6b6b8a] shrink-0">{collection.lineupCount}</span>
      </div>
      <div className="flex items-center gap-2 pl-4 flex-wrap">
        <span className="text-[10px] font-medium" style={{ color: mapColor }}>{mapDisplay}</span>
        <span className="text-[10px] text-[#6b6b8a] flex items-center gap-0.5">
          <Users className="h-2.5 w-2.5" />{collection.ownerName}
        </span>
        {collection.isPublished ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e]">public</span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#6b6b8a]/10 text-[#6b6b8a]">private</span>
        )}
      </div>
    </button>
  );
}

function NadeListItem({
  lineup, isSelected, onSelect, isMenuOpen, onToggleMenu, addTargetsByMap, addingKey, onAddToCollection,
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
          isSelected ? 'bg-[#1a1a2e] ring-1 ring-[#f0a500]/20' : 'hover:bg-[#1a1a2e]'
        }`}
        onClick={onSelect}
      >
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
          style={{ backgroundColor: `${gt?.color}18`, color: gt?.color }}
        >
          {gt?.label.slice(0, 2)}
        </span>
        <span className="text-sm text-[#e8e8e8] truncate flex-1">{lineup.name}</span>
        {lineup.playerName && (
          <span className="text-[10px] text-[#6b6b8a] shrink-0 truncate max-w-[56px]">{lineup.playerName}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
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
