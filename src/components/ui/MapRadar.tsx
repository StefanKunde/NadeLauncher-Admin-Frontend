'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { MAP_COORDINATES, worldToRadar } from '@/lib/map-coordinates';
import { GRENADE_TYPES } from '@/lib/constants';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface MapLineup {
  id: string;
  name?: string;
  grenadeType: string;
  throwPosition: Position;
  landingPosition: Position;
}

interface MapRadarProps {
  mapName: string;
  lineups: MapLineup[];
  selectedLineupId?: string | null;
  onLineupClick?: (lineup: MapLineup) => void;
  mini?: boolean;
}

const GRENADE_COLORS: Record<string, string> = {
  smoke: GRENADE_TYPES.smoke.color,
  flash: GRENADE_TYPES.flash.color,
  molotov: GRENADE_TYPES.molotov.color,
  he: GRENADE_TYPES.he.color,
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;

export default function MapRadar({
  mapName,
  lineups,
  selectedLineupId,
  onLineupClick,
  mini = false,
}: MapRadarProps) {
  const config = MAP_COORDINATES[mapName];
  const hasLayers = !!config?.lowerRadarImage;
  const [showLower, setShowLower] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const radarImage = useMemo(() => {
    if (!config) return null;
    return showLower && config.lowerRadarImage
      ? config.lowerRadarImage
      : config.radarImage;
  }, [config, showLower]);

  const markers = useMemo(() => {
    if (!config) return [];
    return lineups
      .filter((l) => {
        if (!hasLayers || !config.zSplitThreshold) return true;
        const z = l.throwPosition.z;
        return showLower
          ? z < config.zSplitThreshold
          : z >= config.zSplitThreshold;
      })
      .map((l) => {
        const throwPos = worldToRadar(l.throwPosition.x, l.throwPosition.y, config);
        const landingPos = worldToRadar(l.landingPosition.x, l.landingPosition.y, config);
        return { lineup: l, throwPos, landingPos };
      });
  }, [lineups, config, showLower, hasLayers]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (mini) return;
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, [mini]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mini || zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [mini, zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, prev - ZOOM_STEP);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (!config) {
    return (
      <div className="aspect-square bg-[#0a0a0f] rounded-xl flex items-center justify-center text-[#666]">
        No radar available
      </div>
    );
  }

  const selectedMarker = markers.find((m) => m.lineup.id === selectedLineupId);
  const dotSize = mini ? 6 : 10;
  const selectedDotSize = mini ? 8 : 16;
  const isZoomed = zoom !== 1;

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-xl bg-[#0a0a0f] ${
        !mini && zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute inset-0 origin-center"
        style={
          !mini
            ? {
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
              }
            : undefined
        }
      >
        <Image
          src={radarImage!}
          alt={`${mapName} radar`}
          fill
          className="object-contain"
          unoptimized
          draggable={false}
        />

        {/* Throw->landing line for selected */}
        {!mini && selectedMarker && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <line
              x1={`${selectedMarker.throwPos.x}%`}
              y1={`${selectedMarker.throwPos.y}%`}
              x2={`${selectedMarker.landingPos.x}%`}
              y2={`${selectedMarker.landingPos.y}%`}
              stroke={GRENADE_COLORS[selectedMarker.lineup.grenadeType] || '#fff'}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.7"
            />
            <circle
              cx={`${selectedMarker.landingPos.x}%`}
              cy={`${selectedMarker.landingPos.y}%`}
              r="6"
              fill="none"
              stroke={GRENADE_COLORS[selectedMarker.lineup.grenadeType] || '#fff'}
              strokeWidth="2"
              opacity="0.8"
            />
            <line
              x1={`${selectedMarker.landingPos.x - 0.6}%`}
              y1={`${selectedMarker.landingPos.y}%`}
              x2={`${selectedMarker.landingPos.x + 0.6}%`}
              y2={`${selectedMarker.landingPos.y}%`}
              stroke={GRENADE_COLORS[selectedMarker.lineup.grenadeType] || '#fff'}
              strokeWidth="2"
              opacity="0.8"
            />
            <line
              x1={`${selectedMarker.landingPos.x}%`}
              y1={`${selectedMarker.landingPos.y - 0.6}%`}
              x2={`${selectedMarker.landingPos.x}%`}
              y2={`${selectedMarker.landingPos.y + 0.6}%`}
              stroke={GRENADE_COLORS[selectedMarker.lineup.grenadeType] || '#fff'}
              strokeWidth="2"
              opacity="0.8"
            />
          </svg>
        )}

        {/* Markers */}
        {markers.map(({ lineup, throwPos }) => {
          const isSelected = lineup.id === selectedLineupId;
          const color = GRENADE_COLORS[lineup.grenadeType] || '#fff';
          const size = isSelected ? selectedDotSize : dotSize;

          return (
            <div
              key={lineup.id}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${
                !mini ? 'cursor-pointer hover:scale-125' : ''
              } ${isSelected ? 'ring-2 ring-white/50' : ''}`}
              style={{
                left: `${throwPos.x}%`,
                top: `${throwPos.y}%`,
                width: size,
                height: size,
                backgroundColor: color,
                boxShadow: isSelected
                  ? `0 0 12px ${color}, 0 0 24px ${color}40`
                  : `0 0 4px ${color}80`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!mini && onLineupClick) onLineupClick(lineup);
              }}
              title={!mini ? lineup.name : undefined}
            />
          );
        })}

        {/* Selected label */}
        {!mini && selectedMarker && (() => {
          const dx = selectedMarker.landingPos.x - selectedMarker.throwPos.x;
          const dy = selectedMarker.landingPos.y - selectedMarker.throwPos.y;
          const offsetDistance = 4;
          const length = Math.sqrt(dx * dx + dy * dy) || 1;
          const offsetX = -(dx / length) * offsetDistance;
          const offsetY = -(dy / length) * offsetDistance;
          let labelX = Math.max(8, Math.min(92, selectedMarker.throwPos.x + offsetX));
          let labelY = Math.max(3, Math.min(97, selectedMarker.throwPos.y + offsetY));

          return (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${labelX}%`, top: `${labelY}%` }}
            >
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0a0a0f]/90 text-white whitespace-nowrap border border-[#2a2a3e]">
                {selectedMarker.lineup.name}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Zoom controls */}
      {!mini && (
        <div className="absolute bottom-2 left-2 z-40 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
            title="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
            title="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          {isZoomed && (
            <button
              onClick={handleResetZoom}
              className="flex items-center justify-center h-7 w-7 rounded bg-[#0a0a0f]/80 text-white/70 hover:text-white hover:bg-[#0a0a0f] border border-[#2a2a3e]/50 transition-colors"
              title="Reset zoom"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Nuke layer toggle */}
      {hasLayers && !mini && (
        <div className="absolute top-2 right-2 z-40 flex gap-1">
          <button
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              !showLower
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            onClick={() => setShowLower(false)}
          >
            Upper
          </button>
          <button
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              showLower
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            onClick={() => setShowLower(true)}
          >
            Lower
          </button>
        </div>
      )}
    </div>
  );
}
