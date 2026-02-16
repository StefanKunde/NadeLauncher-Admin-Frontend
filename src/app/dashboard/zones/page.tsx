'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Plus,
  Minus,
  Maximize2,
  Pencil,
  Trash2,
  Pentagon,
  Loader2,
  RefreshCw,
  X,
  MousePointer,
  Check,
} from 'lucide-react';
import { zonesApi } from '@/lib/api';
import { MAP_COORDINATES, worldToRadar, radarToWorld } from '@/lib/map-coordinates';
import { MAPS } from '@/lib/constants';
import type { MapZone } from '@/lib/types';
import toast from 'react-hot-toast';

const ZONE_COLORS = [
  '#f0a500', '#ff6633', '#88bbee', '#ff4444', '#4ecdc4',
  '#95e1a3', '#c4a35a', '#a78bfa', '#60a5fa', '#f472b6',
  '#fbbf24', '#34d399', '#fb923c', '#e879f9', '#38bdf8',
];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;

export default function ZonesPage() {
  // Map selection
  const [selectedMap, setSelectedMap] = useState('de_mirage');
  const config = MAP_COORDINATES[selectedMap];
  const hasLayers = !!config?.lowerRadarImage;

  // Zone data
  const [zones, setZones] = useState<MapZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Layer toggle (Nuke)
  const [showLower, setShowLower] = useState(false);

  // Zoom/pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Drawing mode (drag-to-create)
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingVertices, setDrawingVertices] = useState<{ x: number; y: number }[]>([]);
  const [cursorRadar, setCursorRadar] = useState<{ x: number; y: number } | null>(null);
  const drawingReadyRef = useRef(false);
  const [dragCenter, setDragCenter] = useState<{ x: number; y: number } | null>(null);
  const isDragCreating = useRef(false);
  const cursorRadarRef = useRef<{ x: number; y: number } | null>(null);

  // Zone form
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<MapZone | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(ZONE_COLORS[0]);
  const [formPriority, setFormPriority] = useState(5);
  const [formZMin, setFormZMin] = useState('');
  const [formZMax, setFormZMax] = useState('');
  const [saving, setSaving] = useState(false);

  // Z reference
  const [zValues, setZValues] = useState<{ throwZ: number[]; landZ: number[] } | null>(null);
  const [loadingZ, setLoadingZ] = useState(false);

  // Bulk rename
  const [bulkRenaming, setBulkRenaming] = useState(false);

  const radarRef = useRef<HTMLDivElement>(null);

  // ── Data loading ──

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await zonesApi.getAll(selectedMap);
      setZones(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load zones');
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMap]);

  useEffect(() => {
    loadZones();
    setSelectedZoneId(null);
    setIsDrawing(false);
    setDrawingVertices([]);
    setFormOpen(false);
    setShowLower(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedMap, loadZones]);

  // ── Radar image ──

  const radarImage = useMemo(() => {
    if (!config) return null;
    return showLower && config.lowerRadarImage
      ? config.lowerRadarImage
      : config.radarImage;
  }, [config, showLower]);

  // ── Zoom/pan handlers ──

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Drawing mode: start drag to create zone
      if (isDrawing && drawingReadyRef.current && radarRef.current && config) {
        const rect = radarRef.current.getBoundingClientRect();
        const rx = ((e.clientX - rect.left) / rect.width) * 100;
        const ry = ((e.clientY - rect.top) / rect.height) * 100;
        setDragCenter({ x: rx, y: ry });
        setCursorRadar({ x: rx, y: ry });
        cursorRadarRef.current = { x: rx, y: ry };
        isDragCreating.current = true;
        e.preventDefault();
        return;
      }
      if (zoom <= 1) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
    },
    [isDrawing, zoom, pan, config],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Drawing drag: update cursor for radius preview
      if (isDragCreating.current && radarRef.current) {
        const rect = radarRef.current.getBoundingClientRect();
        const rx = ((e.clientX - rect.left) / rect.width) * 100;
        const ry = ((e.clientY - rect.top) / rect.height) * 100;
        setCursorRadar({ x: rx, y: ry });
        cursorRadarRef.current = { x: rx, y: ry };
        return;
      }

      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    // Finalize drag-create zone
    if (isDragCreating.current && dragCenter && config) {
      isDragCreating.current = false;
      const cursor = cursorRadarRef.current;
      if (!cursor) {
        setDragCenter(null);
        return;
      }

      const dx = cursor.x - dragCenter.x;
      const dy = cursor.y - dragCenter.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      if (radius < 1.5) {
        // Too small, ignore
        setDragCenter(null);
        setCursorRadar(null);
        cursorRadarRef.current = null;
        return;
      }

      // Generate octagon in radar %, convert to world coords
      const SIDES = 8;
      const worldVerts: { x: number; y: number }[] = [];
      for (let i = 0; i < SIDES; i++) {
        const angle = (i * Math.PI * 2) / SIDES - Math.PI / 2;
        const rx = dragCenter.x + radius * Math.cos(angle);
        const ry = dragCenter.y + radius * Math.sin(angle);
        worldVerts.push(radarToWorld(rx, ry, config));
      }

      setDrawingVertices(worldVerts);
      setIsDrawing(false);
      drawingReadyRef.current = false;
      setDragCenter(null);
      setCursorRadar(null);
      cursorRadarRef.current = null;

      // Open form to save
      setEditingZone(null);
      setFormName('');
      setFormColor(ZONE_COLORS[zones.length % ZONE_COLORS.length]);
      setFormPriority(5);
      setFormZMin('');
      setFormZMax('');
      setFormOpen(true);
      loadZValuesForPolygon(worldVerts);
      return;
    }

    isDragging.current = false;
  }, [dragCenter, config, zones.length, loadZValuesForPolygon]);

  const isZoomed = zoom !== 1;

  // ── Drawing ──

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    drawingReadyRef.current = false;
    isDragCreating.current = false;
    setDrawingVertices([]);
    setDragCenter(null);
    setCursorRadar(null);
    cursorRadarRef.current = null;
  }, []);

  const startDrawing = useCallback(() => {
    setSelectedZoneId(null);
    setFormOpen(false);
    setEditingZone(null);
    setDrawingVertices([]);
    drawingReadyRef.current = false;
    setIsDrawing(true);
    // Delay accepting clicks so the "Draw Zone" button click doesn't register as a vertex
    requestAnimationFrame(() => {
      drawingReadyRef.current = true;
    });
  }, []);

  // ── Z values loading ──

  const loadZValuesForPolygon = useCallback(
    async (polygon: { x: number; y: number }[]) => {
      if (polygon.length < 3) return;
      setLoadingZ(true);
      try {
        const data = await zonesApi.getZValues(selectedMap, polygon);
        setZValues(data);
      } catch {
        setZValues(null);
      } finally {
        setLoadingZ(false);
      }
    },
    [selectedMap],
  );

  // ── Zone form handlers ──

  const handleEditZone = useCallback(
    (zone: MapZone) => {
      setSelectedZoneId(zone.id);
      setEditingZone(zone);
      setFormName(zone.name);
      setFormColor(zone.color);
      setFormPriority(zone.priority);
      setFormZMin(zone.zMin !== null ? String(zone.zMin) : '');
      setFormZMax(zone.zMax !== null ? String(zone.zMax) : '');
      setDrawingVertices(zone.polygon);
      setFormOpen(true);
      loadZValuesForPolygon(zone.polygon);
    },
    [loadZValuesForPolygon],
  );

  const handleSave = useCallback(async () => {
    const polygon = editingZone ? editingZone.polygon : drawingVertices;
    if (polygon.length < 3) {
      toast.error('Zone needs at least 3 vertices');
      return;
    }
    if (!formName.trim()) {
      toast.error('Zone name is required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        mapName: selectedMap,
        name: formName.trim(),
        polygon,
        zMin: formZMin ? parseFloat(formZMin) : undefined,
        zMax: formZMax ? parseFloat(formZMax) : undefined,
        priority: formPriority,
        color: formColor,
      };

      if (editingZone) {
        await zonesApi.update(editingZone.id, data);
        toast.success('Zone updated');
      } else {
        await zonesApi.create(data);
        toast.success('Zone created');
      }

      setFormOpen(false);
      setEditingZone(null);
      setDrawingVertices([]);
      setZValues(null);
      loadZones();
    } catch {
      toast.error('Failed to save zone');
    } finally {
      setSaving(false);
    }
  }, [editingZone, drawingVertices, formName, formColor, formPriority, formZMin, formZMax, selectedMap, loadZones]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this zone?')) return;
      try {
        await zonesApi.delete(id);
        toast.success('Zone deleted');
        if (selectedZoneId === id) {
          setSelectedZoneId(null);
          setFormOpen(false);
        }
        loadZones();
      } catch {
        toast.error('Failed to delete zone');
      }
    },
    [selectedZoneId, loadZones],
  );

  const handleCancelForm = useCallback(() => {
    setFormOpen(false);
    setEditingZone(null);
    setDrawingVertices([]);
    setZValues(null);
  }, []);

  // ── Bulk rename ──

  const handleBulkRename = useCallback(async () => {
    const mapDisplay = MAPS.find((m) => m.name === selectedMap)?.displayName ?? selectedMap;
    if (!confirm(`Re-resolve names for all preset lineups on ${mapDisplay}?`)) return;
    setBulkRenaming(true);
    try {
      const result = await zonesApi.bulkRename(selectedMap);
      toast.success(`Renamed ${result.updated} of ${result.total} lineups`);
    } catch {
      toast.error('Bulk rename failed');
    } finally {
      setBulkRenaming(false);
    }
  }, [selectedMap]);

  // ── Polygon rendering helpers ──

  const polygonToSvgPoints = useCallback(
    (polygon: { x: number; y: number }[]): string => {
      if (!config) return '';
      return polygon
        .map((p) => {
          const r = worldToRadar(p.x, p.y, config);
          return `${r.x},${r.y}`;
        })
        .join(' ');
    },
    [config],
  );

  const getPolygonCenter = useCallback(
    (polygon: { x: number; y: number }[]): { x: number; y: number } => {
      if (!config || polygon.length === 0) return { x: 50, y: 50 };
      let sx = 0,
        sy = 0;
      for (const p of polygon) {
        const r = worldToRadar(p.x, p.y, config);
        sx += r.x;
        sy += r.y;
      }
      return { x: sx / polygon.length, y: sy / polygon.length };
    },
    [config],
  );

  // ── Z histogram helper ──

  const zHistogram = useMemo(() => {
    if (!zValues) return null;
    const allZ = [...zValues.throwZ, ...zValues.landZ];
    if (allZ.length === 0) return null;

    // Bin into ranges of 50 units
    const bins: Record<number, number> = {};
    for (const z of allZ) {
      const bin = Math.round(z / 50) * 50;
      bins[bin] = (bins[bin] || 0) + 1;
    }

    const entries = Object.entries(bins)
      .map(([k, v]) => [Number(k), v] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const maxCount = Math.max(...entries.map((e) => e[1]));
    return { entries, maxCount, min: allZ[0], max: allZ[allZ.length - 1], total: allZ.length };
  }, [zValues]);

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0a500]/15">
            <Map className="h-5 w-5 text-[#f0a500]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8e8]">Map Zones</h1>
            <p className="text-sm text-[#6b6b8a]">
              Define named zones for automatic nade naming
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
          className="px-3 py-2 bg-[#12121a] border border-[#2a2a3e] rounded-lg text-white text-sm focus:border-[#f0a500] focus:outline-none cursor-pointer"
        >
          {MAPS.map((m) => (
            <option key={m.name} value={m.name}>
              {m.displayName}
            </option>
          ))}
        </select>

        {!isDrawing ? (
          <button onClick={startDrawing} className="btn-primary flex items-center gap-2 text-sm">
            <Pentagon className="h-4 w-4" />
            Draw Zone
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#f0a500] font-medium animate-pulse">
              Click &amp; drag on the map to create a zone
            </span>
            <button
              onClick={cancelDrawing}
              className="px-3 py-1.5 rounded-lg text-sm text-[#6b6b8a] hover:text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[#6b6b8a]">{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
          <button
            onClick={handleBulkRename}
            disabled={bulkRenaming || zones.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1a1a2e] border border-[#2a2a3e] text-[#e8e8e8] hover:border-[#f0a500]/50 transition-colors disabled:opacity-40"
          >
            {bulkRenaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Bulk Rename
          </button>
        </div>
      </div>

      {/* Main content: Radar + Zone list */}
      <div className="flex gap-5">
        {/* Radar */}
        <div className="flex-1 min-w-0 max-w-[640px]">
          <div
            ref={radarRef}
            className={`relative aspect-square w-full overflow-hidden rounded-xl bg-[#0a0a0f] border border-[#2a2a3e] ${
              isDrawing ? 'cursor-crosshair' : zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setCursorRadar(null);
            }}
          >
            <div
              className="absolute inset-0 origin-center"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              <Image
                src={radarImage!}
                alt={`${selectedMap} radar`}
                fill
                className="object-contain"
                unoptimized
                draggable={false}
              />

              {/* SVG overlay for zones */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Existing zones */}
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  const points = polygonToSvgPoints(zone.polygon);
                  return (
                    <g key={zone.id}>
                      <polygon
                        points={points}
                        fill={zone.color}
                        fillOpacity={isSelected ? 0.4 : 0.2}
                        stroke={zone.color}
                        strokeWidth={isSelected ? 0.4 : 0.2}
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}

                {/* Drag-create preview (octagon growing from center) */}
                {isDrawing && dragCenter && cursorRadar && (() => {
                  const dx = cursorRadar.x - dragCenter.x;
                  const dy = cursorRadar.y - dragCenter.y;
                  const radius = Math.sqrt(dx * dx + dy * dy);
                  if (radius < 0.5) return null;
                  const SIDES = 8;
                  const points = Array.from({ length: SIDES }, (_, i) => {
                    const angle = (i * Math.PI * 2) / SIDES - Math.PI / 2;
                    return `${dragCenter.x + radius * Math.cos(angle)},${dragCenter.y + radius * Math.sin(angle)}`;
                  }).join(' ');
                  return (
                    <>
                      <polygon
                        points={points}
                        fill="#f0a500"
                        fillOpacity={0.15}
                        stroke="#f0a500"
                        strokeWidth={0.25}
                        strokeDasharray="0.5 0.3"
                        strokeLinejoin="round"
                      />
                      <circle cx={dragCenter.x} cy={dragCenter.y} r={0.4} fill="#f0a500" />
                    </>
                  );
                })()}

                {/* Drawn polygon preview (after drag, before save) */}
                {!isDrawing && !editingZone && drawingVertices.length > 0 && formOpen && (() => {
                  const points = drawingVertices
                    .map((p) => {
                      const r = worldToRadar(p.x, p.y, config);
                      return `${r.x},${r.y}`;
                    })
                    .join(' ');
                  return (
                    <polygon
                      points={points}
                      fill="#f0a500"
                      fillOpacity={0.2}
                      stroke="#f0a500"
                      strokeWidth={0.25}
                      strokeLinejoin="round"
                    />
                  );
                })()}
              </svg>

              {/* Zone name labels */}
              {zones.map((zone) => {
                const center = getPolygonCenter(zone.polygon);
                const isSelected = zone.id === selectedZoneId;
                return (
                  <div
                    key={`label-${zone.id}`}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${center.x}%`, top: `${center.y}%` }}
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap uppercase tracking-wider ${
                        isSelected ? 'bg-[#0a0a0f]/95 border border-white/30' : 'bg-[#0a0a0f]/80'
                      }`}
                      style={{ color: zone.color }}
                    >
                      {zone.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-2 left-2 z-40 flex flex-col gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setZoom((p) => Math.min(MAX_ZOOM, p + ZOOM_STEP)); }}
                className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((p) => {
                    const n = Math.max(MIN_ZOOM, p - ZOOM_STEP);
                    if (n <= 1) setPan({ x: 0, y: 0 });
                    return n;
                  });
                }}
                className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              {isZoomed && (
                <button
                  onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Layer toggle (Nuke) */}
            {hasLayers && (
              <div className="absolute top-2 right-2 z-40 flex gap-1">
                <button
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    !showLower ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                  onClick={(e) => { e.stopPropagation(); setShowLower(false); }}
                >
                  Upper
                </button>
                <button
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    showLower ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                  onClick={(e) => { e.stopPropagation(); setShowLower(true); }}
                >
                  Lower
                </button>
              </div>
            )}

            {/* Drawing mode indicator */}
            {isDrawing && (
              <div className="absolute top-2 left-2 z-40 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#f0a500]/20 border border-[#f0a500]/40">
                <MousePointer className="h-3.5 w-3.5 text-[#f0a500]" />
                <span className="text-xs font-medium text-[#f0a500]">Drawing</span>
              </div>
            )}
          </div>
        </div>

        {/* Zone list + form sidebar */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Zone form */}
          <AnimatePresence>
            {formOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#e8e8e8]">
                    {editingZone ? 'Edit Zone' : 'New Zone'}
                  </h3>
                  <button onClick={handleCancelForm} className="text-[#6b6b8a] hover:text-[#e8e8e8]">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs text-[#6b6b8a] mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Jungle"
                    className="w-full px-3 py-2 bg-[#12121a] border border-[#2a2a3e] rounded-lg text-sm text-white placeholder-[#555577] focus:border-[#f0a500] focus:outline-none"
                    maxLength={64}
                    autoFocus
                  />
                </div>

                {/* Color + Priority */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-[#6b6b8a] mb-1">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ZONE_COLORS.slice(0, 10).map((c) => (
                        <button
                          key={c}
                          onClick={() => setFormColor(c)}
                          className={`h-6 w-6 rounded-full border-2 transition-all ${
                            formColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-[#6b6b8a] mb-1">Priority</label>
                    <input
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      min={1}
                      max={20}
                      className="w-full px-2 py-2 bg-[#12121a] border border-[#2a2a3e] rounded-lg text-sm text-white text-center focus:border-[#f0a500] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Z range */}
                <div>
                  <label className="block text-xs text-[#6b6b8a] mb-1">
                    Z Range <span className="text-[#555577]">(optional — for vertical overlap)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formZMin}
                      onChange={(e) => setFormZMin(e.target.value)}
                      placeholder="Min"
                      className="flex-1 px-2 py-1.5 bg-[#12121a] border border-[#2a2a3e] rounded-lg text-xs text-white placeholder-[#555577] focus:border-[#f0a500] focus:outline-none"
                    />
                    <span className="text-[#555577] text-xs">to</span>
                    <input
                      type="number"
                      value={formZMax}
                      onChange={(e) => setFormZMax(e.target.value)}
                      placeholder="Max"
                      className="flex-1 px-2 py-1.5 bg-[#12121a] border border-[#2a2a3e] rounded-lg text-xs text-white placeholder-[#555577] focus:border-[#f0a500] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Z Reference */}
                {(loadingZ || zHistogram) && (
                  <div>
                    <label className="block text-xs text-[#6b6b8a] mb-1.5">Z Reference (existing lineups in area)</label>
                    {loadingZ ? (
                      <div className="flex items-center gap-2 text-xs text-[#555577]">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading Z values...
                      </div>
                    ) : zHistogram ? (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-[#555577]">
                          {zHistogram.total} positions — Z range: {zHistogram.min} to {zHistogram.max}
                        </div>
                        <div className="flex items-end gap-px h-10">
                          {zHistogram.entries.map(([bin, count]) => (
                            <button
                              key={bin}
                              className="flex-1 bg-[#f0a500]/30 hover:bg-[#f0a500]/60 rounded-t transition-colors group relative"
                              style={{ height: `${(count / zHistogram.maxCount) * 100}%`, minHeight: 2 }}
                              onClick={() => {
                                setFormZMin(String(bin - 25));
                                setFormZMax(String(bin + 25));
                              }}
                              title={`Z≈${bin} (${count} lineups) — click to set range`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[9px] text-[#555577]">
                          <span>{zHistogram.entries[0]?.[0]}</span>
                          <span>{zHistogram.entries[zHistogram.entries.length - 1]?.[0]}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#555577]">No lineups found in this area</div>
                    )}
                  </div>
                )}

                {/* Save/Cancel */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving || !formName.trim()}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {editingZone ? 'Update' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelForm}
                    className="px-4 py-2 rounded-lg text-sm text-[#6b6b8a] hover:text-[#e8e8e8] hover:bg-[#1a1a2e] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zone list */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6b8a] mb-2">
              Zones ({zones.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#f0a500]" />
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-10">
                <Pentagon className="mx-auto h-8 w-8 text-[#2a2a3e] mb-2" />
                <p className="text-sm text-[#6b6b8a]">No zones defined</p>
                <p className="text-xs text-[#555577] mt-1">Click &quot;Draw Zone&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1a1a2e] border border-[#2a2a3e]'
                          : 'hover:bg-[#12121a] border border-transparent'
                      }`}
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#e8e8e8] block truncate">
                          {zone.name}
                        </span>
                        <span className="text-[10px] text-[#555577]">
                          P{zone.priority} &middot; {zone.polygon.length} pts
                          {zone.zMin !== null || zone.zMax !== null
                            ? ` · Z: ${zone.zMin ?? '∞'}..${zone.zMax ?? '∞'}`
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditZone(zone);
                          }}
                          className="p-1 rounded text-[#6b6b8a] hover:text-[#f0a500] hover:bg-[#f0a500]/10 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(zone.id);
                          }}
                          className="p-1 rounded text-[#6b6b8a] hover:text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
