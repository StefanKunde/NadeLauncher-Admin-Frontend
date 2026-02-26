'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Plus,
  Search,
  X,
  ChevronDown,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { adminAchievementsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { MAPS } from '@/lib/constants';
import type { Achievement, AchievementTier } from '@/lib/types';
import toast from 'react-hot-toast';

interface AchievementFormData {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  mapName: string;
  criteriaType: string;
  criteriaJson: string;
  sortOrder: number;
}

const initialFormData: AchievementFormData = {
  key: '',
  name: '',
  description: '',
  icon: 'trophy',
  tier: 'bronze',
  mapName: '',
  criteriaType: 'total_sessions',
  criteriaJson: '{}',
  sortOrder: 0,
};

const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
};

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
};

const ICON_OPTIONS = ['trophy', 'star', 'flame', 'crown', 'target', 'map', 'medal', 'zap'];

const CRITERIA_TYPES = [
  { value: 'course_complete', label: 'Course Complete' },
  { value: 'all_courses_map', label: 'All Courses on Map' },
  { value: 'streak_days', label: 'Streak Days' },
  { value: 'first_perfect', label: 'First Perfect Score' },
  { value: 'total_sessions', label: 'Total Sessions' },
];

function getCriteriaSummary(criteria: Record<string, unknown>): string {
  const type = criteria.type as string;
  switch (type) {
    case 'course_complete':
      return `Course complete (min ${criteria.minScore ?? 0}%)`;
    case 'all_courses_map':
      return `All courses on ${criteria.mapName ?? 'map'} (min ${criteria.minScore ?? 0}%)`;
    case 'streak_days':
      return `${criteria.days ?? 0} day streak`;
    case 'first_perfect':
      return `First 100% score`;
    case 'total_sessions':
      return `${criteria.count ?? 0} sessions`;
    default:
      return JSON.stringify(criteria);
  }
}

function getIconEmoji(icon: string): string {
  const map: Record<string, string> = {
    trophy: '\uD83C\uDFC6',
    star: '\u2B50',
    flame: '\uD83D\uDD25',
    crown: '\uD83D\uDC51',
    target: '\uD83C\uDFAF',
    map: '\uD83D\uDDFA\uFE0F',
    medal: '\uD83C\uDFC5',
    zap: '\u26A1',
  };
  return map[icon] || '\uD83C\uDFC6';
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AchievementFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const data = await adminAchievementsApi.getAll();
      setAchievements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      toast.error('Failed to load achievements');
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (achievement: Achievement) => {
    setEditingId(achievement.id);
    const criteria = achievement.criteria;
    setFormData({
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      tier: achievement.tier,
      mapName: achievement.mapName ?? '',
      criteriaType: (criteria.type as string) || 'total_sessions',
      criteriaJson: JSON.stringify(criteria, null, 2),
      sortOrder: achievement.sortOrder,
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
    if (!formData.key.trim() || !formData.name.trim()) {
      toast.error('Key and name are required');
      return;
    }

    let criteria: Record<string, unknown>;
    try {
      criteria = JSON.parse(formData.criteriaJson);
    } catch {
      toast.error('Invalid criteria JSON');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Achievement> = {
        key: formData.key,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        tier: formData.tier,
        mapName: formData.mapName || null,
        criteria,
        sortOrder: formData.sortOrder,
      };

      if (editingId) {
        await adminAchievementsApi.update(editingId, payload);
        toast.success('Achievement updated');
      } else {
        await adminAchievementsApi.create(payload);
        toast.success('Achievement created');
      }
      await loadAchievements();
      closeModal();
    } catch (error) {
      toast.error(editingId ? 'Failed to update achievement' : 'Failed to create achievement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin') {
      toast.error('Only admins can delete achievements');
      return;
    }
    if (!confirm('Delete this achievement? User progress will be lost.')) return;

    setDeletingId(id);
    try {
      await adminAchievementsApi.delete(id);
      setAchievements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Achievement deleted');
    } catch (error) {
      toast.error('Failed to delete achievement');
    } finally {
      setDeletingId(null);
    }
  };

  const buildCriteriaJson = (type: string, existing: string): string => {
    try {
      const current = JSON.parse(existing);
      const base = { type };
      switch (type) {
        case 'course_complete':
          return JSON.stringify(
            { ...base, courseId: current.courseId || '', minScore: current.minScore ?? 1 },
            null,
            2,
          );
        case 'all_courses_map':
          return JSON.stringify(
            { ...base, mapName: current.mapName || '', minScore: current.minScore ?? 1 },
            null,
            2,
          );
        case 'streak_days':
          return JSON.stringify(
            { ...base, days: current.days || 3 },
            null,
            2,
          );
        case 'first_perfect':
          return JSON.stringify(
            { ...base, minScore: 100 },
            null,
            2,
          );
        case 'total_sessions':
          return JSON.stringify(
            { ...base, count: current.count || 10 },
            null,
            2,
          );
        default:
          return JSON.stringify(base, null, 2);
      }
    } catch {
      return JSON.stringify({ type }, null, 2);
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (filterTier !== 'all' && a.tier !== filterTier) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.key.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group: map-specific first, then global
  const mapAchievements = filteredAchievements.filter((a) => a.mapName);
  const globalAchievements = filteredAchievements.filter((a) => !a.mapName);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading achievements...</p>
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
              <Trophy className="w-6 h-6 text-[#f0a500]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-gold">Achievements</h1>
            </div>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Achievement
          </button>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px] mt-2">
          Manage milestones and rewards ({achievements.length} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-2 pr-10"
          >
            <option value="all">All Tiers</option>
            {Object.entries(TIER_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
        </div>

        <div className="relative ml-auto">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3" />
          <input
            type="text"
            placeholder="Search achievements..."
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

      {filteredAchievements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Trophy className="w-16 h-16 text-[#6b6b8a]/30 mx-auto mb-4" />
          <p className="text-[#e8e8e8] text-xl font-semibold mb-2">
            No achievements found
          </p>
          <p className="text-[#6b6b8a]">
            Create your first achievement to get started
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Achievement Table */}
          <div className="glass rounded-xl border border-[#2a2a3e] overflow-hidden">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[#2a2a3e]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider w-12">
                    Icon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider w-20">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider w-28">
                    Map
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider">
                    Criteria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider w-16">
                    Order
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b6b8a] uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a3e]/50">
                {/* Global achievements section header */}
                {globalAchievements.length > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-2 bg-[#1a1a2e]/50 text-xs font-bold text-[#6b6b8a] uppercase tracking-wider"
                    >
                      Global Achievements ({globalAchievements.length})
                    </td>
                  </tr>
                )}
                {globalAchievements.map((a) => (
                  <AchievementRow
                    key={a.id}
                    achievement={a}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    isAdmin={user?.role === 'admin'}
                  />
                ))}
                {/* Map achievements section header */}
                {mapAchievements.length > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-2 bg-[#1a1a2e]/50 text-xs font-bold text-[#6b6b8a] uppercase tracking-wider"
                    >
                      Map Achievements ({mapAchievements.length})
                    </td>
                  </tr>
                )}
                {mapAchievements.map((a) => (
                  <AchievementRow
                    key={a.id}
                    achievement={a}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    isAdmin={user?.role === 'admin'}
                  />
                ))}
              </tbody>
            </table>
          </div>
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
              className="glass rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-[#e8e8e8] mb-6">
                {editingId ? 'Edit Achievement' : 'New Achievement'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Key (unique)
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      onChange={(e) =>
                        setFormData({ ...formData, key: e.target.value })
                      }
                      className="w-full"
                      placeholder="e.g., dust2_beginner"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full"
                      placeholder="e.g., Dust2 Rookie"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full resize-none"
                    rows={2}
                    placeholder="Achievement description..."
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Icon
                    </label>
                    <div className="relative">
                      <select
                        value={formData.icon}
                        onChange={(e) =>
                          setFormData({ ...formData, icon: e.target.value })
                        }
                        className="w-full appearance-none cursor-pointer pr-10"
                      >
                        {ICON_OPTIONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {getIconEmoji(icon)} {icon}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Tier
                    </label>
                    <div className="relative">
                      <select
                        value={formData.tier}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tier: e.target.value as AchievementTier,
                          })
                        }
                        className="w-full appearance-none cursor-pointer pr-10"
                      >
                        {Object.entries(TIER_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Map (leave empty for global)
                    </label>
                    <div className="relative">
                      <select
                        value={formData.mapName}
                        onChange={(e) =>
                          setFormData({ ...formData, mapName: e.target.value })
                        }
                        className="w-full appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Global</option>
                        {MAPS.map((m) => (
                          <option key={m.name} value={m.name}>
                            {m.displayName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                    </div>
                  </div>

                  <div className="w-24">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      min={0}
                    />
                  </div>
                </div>

                {/* Criteria Builder */}
                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Criteria Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.criteriaType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFormData({
                          ...formData,
                          criteriaType: newType,
                          criteriaJson: buildCriteriaJson(newType, formData.criteriaJson),
                        });
                      }}
                      className="w-full appearance-none cursor-pointer pr-10"
                    >
                      {CRITERIA_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                    Criteria JSON
                  </label>
                  <textarea
                    value={formData.criteriaJson}
                    onChange={(e) =>
                      setFormData({ ...formData, criteriaJson: e.target.value })
                    }
                    className="w-full resize-none font-mono text-xs"
                    rows={4}
                    placeholder='{"type": "total_sessions", "count": 10}'
                  />
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

function AchievementRow({
  achievement,
  onEdit,
  onDelete,
  deletingId,
  isAdmin,
}: {
  achievement: Achievement;
  onEdit: (a: Achievement) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  isAdmin: boolean;
}) {
  const tierColor = TIER_COLORS[achievement.tier];
  const mapDisplay = achievement.mapName
    ? MAPS.find((m) => m.name === achievement.mapName)?.displayName ?? achievement.mapName
    : 'Global';

  return (
    <tr className="hover:bg-[#1a1a2e]/50 transition-colors">
      <td className="px-4 py-3 text-center text-lg">
        {getIconEmoji(achievement.icon)}
      </td>
      <td className="px-4 py-3">
        <div>
          <span className="text-sm font-medium text-[#e8e8e8]">
            {achievement.name}
          </span>
          <p className="text-xs text-[#6b6b8a] mt-0.5">
            {achievement.key}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
          style={{
            backgroundColor: `${tierColor}20`,
            color: tierColor,
          }}
        >
          {TIER_LABELS[achievement.tier]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#6b6b8a]">{mapDisplay}</td>
      <td className="px-4 py-3 text-xs text-[#6b6b8a]">
        {getCriteriaSummary(achievement.criteria)}
      </td>
      <td className="px-4 py-3 text-sm text-[#6b6b8a] text-center">
        {achievement.sortOrder}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(achievement)}
            className="p-1.5 rounded-lg text-[#6b6b8a] hover:text-[#f0a500] hover:bg-[#f0a500]/10 transition-all"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(achievement.id)}
              disabled={deletingId === achievement.id}
              className="p-1.5 rounded-lg text-[#6b6b8a] hover:text-[#ff4444] hover:bg-[#ff4444]/10 transition-all disabled:opacity-50"
            >
              {deletingId === achievement.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
