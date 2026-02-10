'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  Search,
  X,
  ChevronDown,
  Loader2,
  Edit2,
  Trash2,
  Target,
  Download,
} from 'lucide-react';
import { collectionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { MAPS, MAP_COLORS } from '@/lib/constants';
import type { LineupCollection } from '@/lib/types';
import toast from 'react-hot-toast';

interface CollectionFormData {
  name: string;
  description: string;
  mapName: string;
  isDefault: boolean;
  sortOrder: number;
}

const initialFormData: CollectionFormData = {
  name: '',
  description: '',
  mapName: 'de_mirage',
  isDefault: false,
  sortOrder: 0,
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<LineupCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterMap, setFilterMap] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await collectionsApi.getAll();
      // Ensure we always have an array
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (collection: LineupCollection) => {
    setEditingId(collection.id);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      mapName: collection.mapName,
      isDefault: collection.isDefault,
      sortOrder: collection.sortOrder,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await collectionsApi.update(editingId, formData);
        toast.success('Collection updated');
        // Reload all collections to reflect any default changes
        await loadCollections();
      } else {
        await collectionsApi.create(formData);
        toast.success('Collection created');
        // Reload all collections to reflect any default changes
        await loadCollections();
      }
      closeModal();
    } catch (error) {
      toast.error(editingId ? 'Failed to update collection' : 'Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin') {
      toast.error('Only admins can delete collections');
      return;
    }

    if (!confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    setDeletingId(id);
    try {
      await collectionsApi.delete(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success('Collection deleted');
    } catch (error) {
      toast.error('Failed to delete collection');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportJson = async (collection: LineupCollection) => {
    setDownloadingId(collection.id);
    try {
      const data = await collectionsApi.getById(collection.id);
      const exportData = {
        collection: {
          id: data.collection.id,
          name: data.collection.name,
          description: data.collection.description,
          mapName: data.collection.mapName,
        },
        lineups: data.lineups.map(({ movementPath, ...lineup }) => lineup),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.lineups.length} lineups`);
    } catch {
      toast.error('Failed to export collection');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredCollections = collections.filter((collection) => {
    if (filterMap !== 'all' && collection.mapName !== filterMap) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        collection.name.toLowerCase().includes(q) ||
        collection.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by map
  const groupedByMap = filteredCollections.reduce((acc, c) => {
    if (!acc[c.mapName]) acc[c.mapName] = [];
    acc[c.mapName].push(c);
    return acc;
  }, {} as Record<string, LineupCollection[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f0a500]/10 border border-[#f0a500]/20">
              <FolderOpen className="w-6 h-6 text-[#f0a500]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-gold">Collections</h1>
            </div>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Collection
          </button>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px] mt-2">
          Manage lineup collections
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Map filter */}
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

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3"
          />
          <input
            type="text"
            placeholder="Search collections..."
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

      {/* Collections by Map */}
      {Object.keys(groupedByMap).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <FolderOpen className="w-16 h-16 text-[#6b6b8a]/30 mx-auto mb-4" />
          <p className="text-[#e8e8e8] text-xl font-semibold mb-2">
            No collections found
          </p>
          <p className="text-[#6b6b8a]">
            Create your first collection to get started
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {MAPS.map((map) => {
            const mapCollections = groupedByMap[map.name];
            if (!mapCollections) return null;

            const mapColor = MAP_COLORS[map.name] || '#f0a500';

            return (
              <motion.div
                key={map.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Map Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: mapColor }}
                  />
                  <h2 className="text-lg font-semibold text-[#e8e8e8]">
                    {map.displayName}
                  </h2>
                  <span className="text-sm text-[#6b6b8a]">
                    {mapCollections.length} collection{mapCollections.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Collection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mapCollections.map((collection) => (
                    <motion.div
                      key={collection.id}
                      className={`glass rounded-xl p-4 border transition-all duration-200 ${
                        collection.isDefault
                          ? 'border-[#f0a500]/30 bg-[#f0a500]/5'
                          : 'border-transparent hover:border-[#2a2a3e]'
                      }`}
                      layout
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#e8e8e8] truncate">
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p className="text-sm text-[#6b6b8a] mt-1 line-clamp-2">
                              {collection.description}
                            </p>
                          )}
                        </div>
                        {collection.isDefault && (
                          <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f0a500]/15 text-[#f0a500]">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[#6b6b8a]">
                          <Target className="h-4 w-4" />
                          {collection.lineupCount} lineup{collection.lineupCount !== 1 ? 's' : ''}
                        </div>

                        <div className="flex items-center gap-2">
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleExportJson(collection)}
                              disabled={downloadingId === collection.id}
                              className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#22c55e] hover:border-[#22c55e]/30 border border-[#2a2a3e] transition-all disabled:opacity-50"
                              title="Export as JSON"
                            >
                              {downloadingId === collection.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(collection)}
                            className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#f0a500] hover:border-[#f0a500]/30 border border-[#2a2a3e] transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(collection.id)}
                              disabled={deletingId === collection.id}
                              className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#ff4444] hover:border-[#ff4444]/30 border border-[#2a2a3e] transition-all disabled:opacity-50"
                            >
                              {deletingId === collection.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-[#e8e8e8] mb-6">
                {editingId ? 'Edit Collection' : 'New Collection'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full"
                    placeholder="e.g., Mirage Essentials"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full resize-none"
                    rows={3}
                    placeholder="Optional description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Map
                  </label>
                  <div className="relative">
                    <select
                      value={formData.mapName}
                      onChange={(e) => setFormData({ ...formData, mapName: e.target.value })}
                      className="w-full appearance-none cursor-pointer pr-10"
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

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full"
                      min={0}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      &nbsp;
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="w-5 h-5 rounded border-[#2a2a3e] bg-[#12121a] text-[#f0a500] focus:ring-[#f0a500]/30"
                      />
                      <span className="text-sm text-[#e8e8e8]">Default collection</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary flex-1"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? (
                      'Update'
                    ) : (
                      'Create'
                    )}
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
