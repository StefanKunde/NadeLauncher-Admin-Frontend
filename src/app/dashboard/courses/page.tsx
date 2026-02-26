'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Play,
  Square,
  Server,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { coursesApi, collectionsApi, adminSessionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { MAPS, MAP_COLORS } from '@/lib/constants';
import type { Course, CourseDifficulty, CollectionDifficulty, LineupCollection, Session } from '@/lib/types';
import toast from 'react-hot-toast';

interface CourseFormData {
  name: string;
  description: string;
  mapName: string;
  difficulty: CourseDifficulty;
  sortOrder: number;
  isPublished: boolean;
}

const initialFormData: CourseFormData = {
  name: '',
  description: '',
  mapName: '',
  difficulty: 'beginner',
  sortOrder: 0,
  isPublished: false,
};

const COLL_DIFFICULTY_COLORS: Record<CollectionDifficulty, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const COLL_DIFFICULTY_LABELS: Record<CollectionDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const getStatusDisplay = (status: Session['status']) => {
  switch (status) {
    case 'queued':
      return { label: 'In Queue', color: '#6366f1', icon: RefreshCw };
    case 'pending':
      return { label: 'Pending', color: '#f0a500', icon: Loader2 };
    case 'provisioning':
      return { label: 'Provisioning...', color: '#f0a500', icon: Loader2 };
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterMap, setFilterMap] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Collection picker state
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [availableCollections, setAvailableCollections] = useState<LineupCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [addingCollectionId, setAddingCollectionId] = useState<string | null>(null);
  const [removingCollectionId, setRemovingCollectionId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Create new collection inline form
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollDifficulty, setNewCollDifficulty] = useState<CollectionDifficulty>('easy');
  const [newCollSourceId, setNewCollSourceId] = useState<string>('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Inline collection edit state
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editCollName, setEditCollName] = useState('');
  const [editCollDifficulty, setEditCollDifficulty] = useState<CollectionDifficulty | ''>('');
  const [savingCollection, setSavingCollection] = useState(false);

  // Editor session state
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [startingEditor, setStartingEditor] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { user } = useAuthStore();

  useEffect(() => {
    loadCourses();
    loadActiveSession();
  }, []);

  // Poll for session updates when active
  useEffect(() => {
    if (!activeSession?.isActive) return;
    const interval = setInterval(loadActiveSession, 5000);
    return () => clearInterval(interval);
  }, [activeSession?.isActive]);

  const loadCourses = async () => {
    try {
      const data = await coursesApi.getAll();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSession = async () => {
    try {
      const data = await adminSessionsApi.getActive();
      setActiveSession(data);
    } catch {
      // no active session
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      name: course.name,
      description: course.description || '',
      mapName: course.mapName,
      difficulty: course.difficulty,
      sortOrder: course.sortOrder,
      isPublished: course.isPublished,
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
    if (!editingId && !formData.mapName) {
      toast.error('Map is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
      };
      if (editingId) {
        await coursesApi.update(editingId, payload);
        toast.success('Course updated');
      } else {
        await coursesApi.create(payload);
        toast.success('Course created');
      }
      await loadCourses();
      closeModal();
    } catch {
      toast.error(editingId ? 'Failed to update course' : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin') {
      toast.error('Only admins can delete courses');
      return;
    }
    if (!confirm('Are you sure you want to delete this course?')) return;

    setDeletingId(id);
    try {
      await coursesApi.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success('Course deleted');
    } catch {
      toast.error('Failed to delete course');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublished = async (course: Course) => {
    try {
      await coursesApi.update(course.id, { isPublished: !course.isPublished });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, isPublished: !c.isPublished } : c,
        ),
      );
      toast.success(course.isPublished ? 'Course unpublished' : 'Course published');
    } catch {
      toast.error('Failed to toggle publish status');
    }
  };

  const toggleExpand = (courseId: string) => {
    if (expandedId === courseId) {
      setExpandedId(null);
      setShowAddCollection(false);
      setShowCreateCollection(false);
      return;
    }
    setExpandedId(courseId);
    setShowAddCollection(false);
    setShowCreateCollection(false);
  };

  const openAddCollection = async (course: Course) => {
    setShowAddCollection(true);
    setShowCreateCollection(false);
    setLoadingCollections(true);
    try {
      const allCollections = await collectionsApi.getAll(course.mapName);
      const existingIds = new Set(
        (course.courseCollections ?? []).map((cc) => cc.collectionId),
      );
      setAvailableCollections(
        (Array.isArray(allCollections) ? allCollections : []).filter(
          (c) => !existingIds.has(c.id),
        ),
      );
    } catch {
      toast.error('Failed to load collections');
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleAddCollection = async (courseId: string, collectionId: string) => {
    setAddingCollectionId(collectionId);
    try {
      await coursesApi.addCollection(courseId, collectionId);
      await loadCourses();
      setAvailableCollections((prev) =>
        prev.filter((c) => c.id !== collectionId),
      );
      toast.success('Collection added to course');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add collection');
    } finally {
      setAddingCollectionId(null);
    }
  };

  const handleRemoveCollection = async (courseId: string, collectionId: string) => {
    setRemovingCollectionId(collectionId);
    try {
      await coursesApi.removeCollection(courseId, collectionId);
      await loadCourses();
      toast.success('Collection removed from course');
    } catch {
      toast.error('Failed to remove collection');
    } finally {
      setRemovingCollectionId(null);
    }
  };

  const handleMoveCollection = async (
    course: Course,
    collectionId: string,
    direction: 'up' | 'down',
  ) => {
    const sorted = [...(course.courseCollections ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const idx = sorted.findIndex((cc) => cc.collectionId === collectionId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = sorted.map((cc) => cc.collectionId);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    setReordering(true);
    try {
      await coursesApi.reorderCollections(course.id, newOrder);
      await loadCourses();
    } catch {
      toast.error('Failed to reorder');
    } finally {
      setReordering(false);
    }
  };

  // Create new collection for a course
  const handleCreateCollection = async (courseId: string) => {
    if (!newCollName.trim()) {
      toast.error('Collection name is required');
      return;
    }

    setCreatingCollection(true);
    try {
      await coursesApi.createAndAddCollection(courseId, {
        name: newCollName.trim(),
        difficulty: newCollDifficulty,
        ...(newCollSourceId ? { sourceCollectionId: newCollSourceId } : {}),
      });
      await loadCourses();
      setNewCollName('');
      setNewCollDifficulty('easy');
      setNewCollSourceId('');
      setShowCreateCollection(false);
      toast.success(
        newCollSourceId
          ? 'Collection created with cloned lineups'
          : 'Collection created and added',
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create collection');
    } finally {
      setCreatingCollection(false);
    }
  };

  const startEditCollection = (cc: { collectionId: string; collection?: { name?: string; difficulty?: string | null } }) => {
    setEditingCollectionId(cc.collectionId);
    setEditCollName(cc.collection?.name ?? '');
    setEditCollDifficulty((cc.collection?.difficulty as CollectionDifficulty) || '');
  };

  const cancelEditCollection = () => {
    setEditingCollectionId(null);
    setEditCollName('');
    setEditCollDifficulty('');
  };

  const handleSaveCollection = async (collectionId: string) => {
    if (!editCollName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingCollection(true);
    try {
      await collectionsApi.update(collectionId, {
        name: editCollName.trim(),
        difficulty: editCollDifficulty || undefined,
      });
      await loadCourses();
      cancelEditCollection();
      toast.success('Collection updated');
    } catch {
      toast.error('Failed to update collection');
    } finally {
      setSavingCollection(false);
    }
  };

  // Start editor for a collection
  const handleStartEditor = async (mapName: string, collectionId: string) => {
    if (activeSession?.isActive && activeSession.editingCollectionId !== collectionId) {
      if (!confirm('You already have an active editor session. End it and start a new one?')) return;
      try {
        await adminSessionsApi.end(activeSession.id);
      } catch {
        toast.error('Failed to end current session');
        return;
      }
    }

    setStartingEditor(collectionId);
    try {
      const newSession = await adminSessionsApi.createEditor({ mapName, collectionId });
      setActiveSession(newSession);
      toast.success('Editor session started');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to start editor session');
    } finally {
      setStartingEditor(null);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setEndingSession(true);
    try {
      await adminSessionsApi.end(activeSession.id);
      setActiveSession(null);
      toast.success('Session ended');
    } catch {
      toast.error('Failed to end session');
    } finally {
      setEndingSession(false);
    }
  };

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const filteredCourses = courses.filter((course) => {
    if (filterMap !== 'all' && course.mapName !== filterMap) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        course.name.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupedByMap = filteredCourses.reduce((acc, c) => {
    if (!acc[c.mapName]) acc[c.mapName] = [];
    acc[c.mapName].push(c);
    return acc;
  }, {} as Record<string, Course[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading courses...</p>
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
            <BookOpen className="w-6 h-6 text-[#f0a500]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Courses</h1>
          </div>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px] mt-2">
          Manage map courses, add collections, and edit lineups in-game
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

        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Course
        </button>

        <div className="relative ml-auto">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3" />
          <input
            type="text"
            placeholder="Search courses..."
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

      {/* Courses by Map */}
      {Object.keys(groupedByMap).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <BookOpen className="w-16 h-16 text-[#6b6b8a]/30 mx-auto mb-4" />
          <p className="text-[#e8e8e8] text-xl font-semibold mb-2">
            No courses found
          </p>
          <p className="text-[#6b6b8a]">
            Courses will be auto-created for each map on first startup
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {MAPS.map((map) => {
            const mapCourses = groupedByMap[map.name];
            if (!mapCourses) return null;

            const mapColor = MAP_COLORS[map.name] || '#f0a500';

            return (
              <motion.div
                key={map.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: mapColor }}
                  />
                  <h2 className="text-lg font-semibold text-[#e8e8e8]">
                    {map.displayName}
                  </h2>
                </div>

                <div className="space-y-4">
                  {mapCourses.map((course) => {
                    const collectionCount = course.courseCollections?.length ?? 0;
                    const isExpanded = expandedId === course.id;

                    return (
                      <motion.div
                        key={course.id}
                        className={`glass rounded-xl border transition-all duration-200 ${
                          isExpanded
                            ? 'border-[#f0a500]/30'
                            : 'border-transparent hover:border-[#2a2a3e]'
                        }`}
                        layout
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <button
                              onClick={() => toggleExpand(course.id)}
                              className="flex-1 min-w-0 text-left flex items-center gap-2"
                            >
                              <ChevronRight
                                className={`h-4 w-4 text-[#6b6b8a] shrink-0 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-[#e8e8e8] truncate">
                                    {course.name}
                                  </h3>
                                  {!course.isPublished && (
                                    <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6b6b8a]/15 text-[#6b6b8a]">
                                      DRAFT
                                    </span>
                                  )}
                                </div>
                                {course.description && (
                                  <p className="text-sm text-[#6b6b8a] mt-1 line-clamp-2">
                                    {course.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-[#6b6b8a]">
                              <span>{collectionCount} collection{collectionCount !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePublished(course)}
                                className={`p-2 rounded-lg border transition-all ${
                                  course.isPublished
                                    ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30 hover:bg-[#22c55e]/20'
                                    : 'bg-[#1a1a2e] text-[#6b6b8a] border-[#2a2a3e] hover:text-[#e8e8e8]'
                                }`}
                                title={course.isPublished ? 'Unpublish' : 'Publish'}
                              >
                                {course.isPublished ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditModal(course)}
                                className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#f0a500] hover:border-[#f0a500]/30 border border-[#2a2a3e] transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDelete(course.id)}
                                  disabled={deletingId === course.id}
                                  className="p-2 rounded-lg bg-[#1a1a2e] text-[#6b6b8a] hover:text-[#ff4444] hover:border-[#ff4444]/30 border border-[#2a2a3e] transition-all disabled:opacity-50"
                                >
                                  {deletingId === course.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded: Collection list + editor */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-[#2a2a3e]"
                            >
                              <div className="p-4 space-y-2">
                                {collectionCount === 0 ? (
                                  <p className="text-sm text-[#6b6b8a] text-center py-4">
                                    No collections in this course yet
                                  </p>
                                ) : (
                                  [...(course.courseCollections ?? [])]
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((cc, idx, arr) => {
                                      const diff = cc.collection?.difficulty as CollectionDifficulty | null | undefined;
                                      const diffColor = diff ? COLL_DIFFICULTY_COLORS[diff] : null;
                                      const isActiveForThis = activeSession?.isActive && activeSession.editingCollectionId === cc.collectionId;

                                      const isEditing = editingCollectionId === cc.collectionId;

                                      return (
                                        <div key={cc.id}>
                                          {isEditing ? (
                                            /* Inline edit row */
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12121a] border border-[#f0a500]/30">
                                              <span className="text-xs font-bold text-[#6b6b8a] w-6 text-center">
                                                {idx + 1}
                                              </span>
                                              <input
                                                type="text"
                                                value={editCollName}
                                                onChange={(e) => setEditCollName(e.target.value)}
                                                className="flex-1 bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] px-2 py-1 focus:outline-none focus:border-[#f0a500]/40"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleSaveCollection(cc.collectionId);
                                                  if (e.key === 'Escape') cancelEditCollection();
                                                }}
                                                autoFocus
                                              />
                                              <div className="relative w-24 shrink-0">
                                                <select
                                                  value={editCollDifficulty}
                                                  onChange={(e) =>
                                                    setEditCollDifficulty(e.target.value as CollectionDifficulty | '')
                                                  }
                                                  className="w-full appearance-none bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-xs text-[#e8e8e8] cursor-pointer px-2 py-1 pr-6 focus:outline-none focus:border-[#f0a500]/40"
                                                >
                                                  <option value="">None</option>
                                                  <option value="easy">Easy</option>
                                                  <option value="medium">Medium</option>
                                                  <option value="hard">Hard</option>
                                                </select>
                                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6b6b8a] pointer-events-none" />
                                              </div>
                                              <button
                                                onClick={() => handleSaveCollection(cc.collectionId)}
                                                disabled={savingCollection || !editCollName.trim()}
                                                className="p-1 rounded text-[#22c55e] hover:text-[#4ade80] disabled:opacity-50 transition-colors"
                                                title="Save"
                                              >
                                                {savingCollection ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  <Check className="h-3.5 w-3.5" />
                                                )}
                                              </button>
                                              <button
                                                onClick={cancelEditCollection}
                                                className="p-1 rounded text-[#6b6b8a] hover:text-[#e8e8e8] transition-colors"
                                                title="Cancel"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            /* Normal display row */
                                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#12121a] border border-[#2a2a3e]">
                                              <span className="text-xs font-bold text-[#6b6b8a] w-6 text-center">
                                                {idx + 1}
                                              </span>
                                              <span
                                                className="flex-1 text-sm text-[#e8e8e8] truncate cursor-pointer hover:text-[#f0a500] transition-colors"
                                                onClick={() => startEditCollection(cc)}
                                                title="Click to rename"
                                              >
                                                {cc.collection?.name ?? cc.collectionId}
                                              </span>
                                              {diff && diffColor && (
                                                <span
                                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
                                                  style={{
                                                    backgroundColor: `${diffColor}15`,
                                                    color: diffColor,
                                                  }}
                                                >
                                                  {COLL_DIFFICULTY_LABELS[diff]}
                                                </span>
                                              )}
                                              <span className="text-[10px] text-[#6b6b8a] shrink-0">
                                                {cc.collection?.lineupCount ?? 0} lineups
                                              </span>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => startEditCollection(cc)}
                                                  className="p-1 rounded text-[#6b6b8a] hover:text-[#f0a500] transition-colors"
                                                  title="Rename"
                                                >
                                                  <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleMoveCollection(course, cc.collectionId, 'up')
                                                  }
                                                  disabled={idx === 0 || reordering}
                                                  className="p-1 rounded text-[#6b6b8a] hover:text-[#e8e8e8] disabled:opacity-30 transition-colors"
                                                >
                                                  <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleMoveCollection(course, cc.collectionId, 'down')
                                                  }
                                                  disabled={idx === arr.length - 1 || reordering}
                                                  className="p-1 rounded text-[#6b6b8a] hover:text-[#e8e8e8] disabled:opacity-30 transition-colors"
                                                >
                                                  <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                                {/* Start Editor button */}
                                                <button
                                                  onClick={() =>
                                                    handleStartEditor(course.mapName, cc.collectionId)
                                                  }
                                                  disabled={startingEditor === cc.collectionId || isActiveForThis}
                                                  className={`p-1 rounded transition-colors ml-1 ${
                                                    isActiveForThis
                                                      ? 'text-[#22c55e]'
                                                      : 'text-[#6b6b8a] hover:text-[#f0a500]'
                                                  } disabled:opacity-50`}
                                                  title={isActiveForThis ? 'Editor active' : 'Start Editor'}
                                                >
                                                  {startingEditor === cc.collectionId ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                  ) : (
                                                    <Play className="h-3.5 w-3.5" />
                                                  )}
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleRemoveCollection(course.id, cc.collectionId)
                                                  }
                                                  disabled={removingCollectionId === cc.collectionId}
                                                  className="p-1 rounded text-[#6b6b8a] hover:text-[#ff4444] disabled:opacity-50 transition-colors ml-1"
                                                >
                                                  {removingCollectionId === cc.collectionId ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                  ) : (
                                                    <X className="h-3.5 w-3.5" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Active session panel for this collection */}
                                          {isActiveForThis && activeSession && (
                                            <div className="mt-1 ml-9 p-3 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/5">
                                              <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-[#e8e8e8]">Editor Session</span>
                                                {(() => {
                                                  const statusInfo = getStatusDisplay(activeSession.status);
                                                  const Icon = statusInfo.icon;
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                                      style={{
                                                        backgroundColor: `${statusInfo.color}15`,
                                                        color: statusInfo.color,
                                                      }}
                                                    >
                                                      <Icon
                                                        className={`h-3 w-3 ${
                                                          activeSession.status === 'provisioning' || activeSession.status === 'pending'
                                                            ? 'animate-spin'
                                                            : ''
                                                        }`}
                                                      />
                                                      {statusInfo.label}
                                                    </span>
                                                  );
                                                })()}
                                              </div>

                                              {activeSession.provisioningError && (
                                                <div className="mb-2 p-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
                                                  <div className="flex items-start gap-1.5 text-xs text-[#ef4444]">
                                                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                    <span>{activeSession.provisioningError}</span>
                                                  </div>
                                                </div>
                                              )}

                                              {activeSession.queuePosition != null && activeSession.queuePosition > 0 && (
                                                <div className="mb-2 text-center text-sm text-[#6366f1]">
                                                  Queue position: #{activeSession.queuePosition}
                                                </div>
                                              )}

                                              {(activeSession.status === 'ready' || activeSession.status === 'active') && activeSession.serverIp && (
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-2">
                                                    <code className="flex-1 bg-[#0a0a12] rounded px-2 py-1 text-xs text-[#e8e8e8] font-mono">
                                                      {activeSession.serverIp}:{activeSession.serverPort || 27015}
                                                    </code>
                                                    <button
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          `${activeSession.serverIp}:${activeSession.serverPort || 27015}`,
                                                          'address'
                                                        )
                                                      }
                                                      className="p-1 rounded text-[#6b6b8a] hover:text-[#f0a500] transition-colors"
                                                    >
                                                      {copiedField === 'address' ? (
                                                        <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                                                      ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                      )}
                                                    </button>
                                                  </div>

                                                  {activeSession.serverPassword && (
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[10px] text-[#6b6b8a] w-10">Pass:</span>
                                                      <code className="flex-1 bg-[#0a0a12] rounded px-2 py-1 text-xs text-[#e8e8e8] font-mono">
                                                        {activeSession.serverPassword}
                                                      </code>
                                                      <button
                                                        onClick={() => copyToClipboard(activeSession.serverPassword!, 'password')}
                                                        className="p-1 rounded text-[#6b6b8a] hover:text-[#f0a500] transition-colors"
                                                      >
                                                        {copiedField === 'password' ? (
                                                          <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                                                        ) : (
                                                          <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                      </button>
                                                    </div>
                                                  )}

                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          `connect ${activeSession.serverIp}:${activeSession.serverPort || 27015}${
                                                            activeSession.serverPassword ? `; password ${activeSession.serverPassword}` : ''
                                                          }`,
                                                          'connect'
                                                        )
                                                      }
                                                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1a1a2e] border border-[#2a2a3e] text-[10px] text-[#6b6b8a] hover:text-[#f0a500] transition-colors"
                                                    >
                                                      {copiedField === 'connect' ? (
                                                        <Check className="h-3 w-3 text-[#22c55e]" />
                                                      ) : (
                                                        <Copy className="h-3 w-3" />
                                                      )}
                                                      Copy connect cmd
                                                    </button>
                                                    <a
                                                      href={`steam://run/730//+connect%20${activeSession.serverIp}:${activeSession.serverPort || 27015}%20+password%20${activeSession.serverPassword || ''}`}
                                                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#f0a500]/10 border border-[#f0a500]/30 text-[10px] text-[#f0a500] hover:bg-[#f0a500]/20 transition-colors"
                                                    >
                                                      <ExternalLink className="h-3 w-3" />
                                                      Steam Connect
                                                    </a>
                                                  </div>
                                                </div>
                                              )}

                                              <button
                                                onClick={handleEndSession}
                                                disabled={endingSession}
                                                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff4444]/30 bg-[#ff4444]/5 text-xs text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors disabled:opacity-50"
                                              >
                                                {endingSession ? (
                                                  <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Ending...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Square className="h-3 w-3" />
                                                    End Session
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                )}

                                {/* Create new collection / Add existing */}
                                {!showCreateCollection && !showAddCollection && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setShowCreateCollection(true);
                                        setShowAddCollection(false);
                                      }}
                                      className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border border-dashed border-[#2a2a3e] text-sm text-[#6b6b8a] hover:border-[#f0a500]/40 hover:text-[#f0a500] transition-all"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Create New Collection
                                    </button>
                                    <button
                                      onClick={() => openAddCollection(course)}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#2a2a3e] text-sm text-[#6b6b8a] hover:border-[#6b6b8a]/60 hover:text-[#e8e8e8] transition-all"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Existing
                                    </button>
                                  </div>
                                )}

                                {/* Create new collection inline form */}
                                {showCreateCollection && (
                                  <div className="p-3 rounded-lg border border-[#f0a500]/30 bg-[#f0a500]/5">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-medium text-[#e8e8e8]">
                                        Create New Collection
                                      </span>
                                      <button
                                        onClick={() => setShowCreateCollection(false)}
                                        className="text-[#6b6b8a] hover:text-[#e8e8e8]"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="flex items-end gap-3 flex-wrap">
                                      <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[10px] font-medium text-[#6b6b8a] mb-1">
                                          Name
                                        </label>
                                        <input
                                          type="text"
                                          value={newCollName}
                                          onChange={(e) => setNewCollName(e.target.value)}
                                          placeholder="e.g., A-Site Smokes"
                                          className="w-full bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] placeholder-[#6b6b8a]/50 px-3 py-2 focus:outline-none focus:border-[#f0a500]/40"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateCollection(course.id);
                                          }}
                                        />
                                      </div>
                                      <div className="w-28">
                                        <label className="block text-[10px] font-medium text-[#6b6b8a] mb-1">
                                          Difficulty
                                        </label>
                                        <div className="relative">
                                          <select
                                            value={newCollDifficulty}
                                            onChange={(e) =>
                                              setNewCollDifficulty(e.target.value as CollectionDifficulty)
                                            }
                                            className="w-full appearance-none bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] cursor-pointer px-3 py-2 pr-8 focus:outline-none focus:border-[#f0a500]/40"
                                          >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                          </select>
                                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b8a] pointer-events-none" />
                                        </div>
                                      </div>
                                      {(course.courseCollections?.length ?? 0) > 0 && (
                                        <div className="w-44">
                                          <label className="block text-[10px] font-medium text-[#6b6b8a] mb-1">
                                            Based on
                                          </label>
                                          <div className="relative">
                                            <select
                                              value={newCollSourceId}
                                              onChange={(e) => setNewCollSourceId(e.target.value)}
                                              className="w-full appearance-none bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] cursor-pointer px-3 py-2 pr-8 focus:outline-none focus:border-[#f0a500]/40"
                                            >
                                              <option value="">None (empty)</option>
                                              {[...(course.courseCollections ?? [])]
                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                .map((cc) => (
                                                  <option key={cc.collectionId} value={cc.collectionId}>
                                                    {cc.collection?.name ?? cc.collectionId.slice(0, 8)}
                                                  </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b8a] pointer-events-none" />
                                          </div>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleCreateCollection(course.id)}
                                        disabled={creatingCollection || !newCollName.trim()}
                                        className="px-4 py-2 rounded-lg bg-[#f0a500] text-[#0a0a12] text-sm font-bold hover:bg-[#d4900a] disabled:opacity-50 transition-all flex items-center gap-1.5"
                                      >
                                        {creatingCollection ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Plus className="h-3.5 w-3.5" />
                                        )}
                                        Create
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Add existing collection picker */}
                                {showAddCollection && (
                                  <div className="p-3 rounded-lg border border-[#2a2a3e] bg-[#0a0a12]">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-[#e8e8e8]">
                                        Add Existing Collection
                                      </span>
                                      <button
                                        onClick={() => setShowAddCollection(false)}
                                        className="text-[#6b6b8a] hover:text-[#e8e8e8]"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    {loadingCollections ? (
                                      <div className="flex items-center justify-center py-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#f0a500]" />
                                      </div>
                                    ) : availableCollections.length === 0 ? (
                                      <p className="text-xs text-[#6b6b8a] text-center py-2">
                                        No available collections for this map
                                      </p>
                                    ) : (
                                      <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {availableCollections.map((col) => (
                                          <button
                                            key={col.id}
                                            onClick={() =>
                                              handleAddCollection(course.id, col.id)
                                            }
                                            disabled={addingCollectionId === col.id}
                                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-[#e8e8e8] hover:bg-[#1a1a2e] transition-colors disabled:opacity-50"
                                          >
                                            {addingCollectionId === col.id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                            ) : (
                                              <Plus className="h-3.5 w-3.5 shrink-0 text-[#6b6b8a]" />
                                            )}
                                            <span className="truncate">{col.name}</span>
                                            <span className="text-xs text-[#6b6b8a] ml-auto shrink-0">
                                              {col.lineupCount} lineups
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
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
                {editingId ? 'Edit Course' : 'New Course'}
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
                    placeholder="e.g., Dust II Training"
                  />
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
                    rows={3}
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Map
                    </label>
                    <div className="relative">
                      <select
                        value={formData.mapName}
                        onChange={(e) => setFormData({ ...formData, mapName: e.target.value })}
                        disabled={!!editingId}
                        className="w-full appearance-none bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] px-3 py-2 pr-8 focus:outline-none focus:border-[#f0a500]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select map...</option>
                        {MAPS.map((m) => (
                          <option key={m.name} value={m.name}>{m.displayName}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b8a] pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      Difficulty
                    </label>
                    <div className="relative">
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as CourseDifficulty })}
                        className="w-full appearance-none bg-[#0a0a12] border border-[#2a2a3e] rounded-lg text-sm text-[#e8e8e8] px-3 py-2 pr-8 focus:outline-none focus:border-[#f0a500]/40"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b8a] pointer-events-none" />
                    </div>
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

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                      &nbsp;
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) =>
                          setFormData({ ...formData, isPublished: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-[#2a2a3e] bg-[#12121a] text-[#f0a500] focus:ring-[#f0a500]/30"
                      />
                      <span className="text-sm text-[#e8e8e8]">Published</span>
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
