export interface MapCoordinateConfig {
  posX: number;
  posY: number;
  scale: number;
  radarImage: string;
  lowerRadarImage?: string;
  zSplitThreshold?: number;
}

export const MAP_COORDINATES: Record<string, MapCoordinateConfig> = {
  de_dust2: {
    posX: -2476,
    posY: 3239,
    scale: 4.4,
    radarImage: '/maps/radar/de_dust2.png',
  },
  de_mirage: {
    posX: -3230,
    posY: 1713,
    scale: 5.0,
    radarImage: '/maps/radar/de_mirage.png',
  },
  de_inferno: {
    posX: -2087,
    posY: 3870,
    scale: 4.9,
    radarImage: '/maps/radar/de_inferno.png',
  },
  de_nuke: {
    posX: -3453,
    posY: 2887,
    scale: 7.0,
    radarImage: '/maps/radar/de_nuke.png',
    lowerRadarImage: '/maps/radar/de_nuke_lower.png',
    zSplitThreshold: -495,
  },
  de_overpass: {
    posX: -4831,
    posY: 1781,
    scale: 5.2,
    radarImage: '/maps/radar/de_overpass.png',
  },
  de_ancient: {
    posX: -2953,
    posY: 2164,
    scale: 5.0,
    radarImage: '/maps/radar/de_ancient.png',
  },
  de_anubis: {
    posX: -2796,
    posY: 3328,
    scale: 5.22,
    radarImage: '/maps/radar/de_anubis.png',
  },
};

const RADAR_SIZE = 1024;

export function worldToRadar(
  worldX: number,
  worldY: number,
  config: MapCoordinateConfig,
): { x: number; y: number } {
  const x = ((worldX - config.posX) / (config.scale * RADAR_SIZE)) * 100;
  const y = ((config.posY - worldY) / (config.scale * RADAR_SIZE)) * 100;
  return { x, y };
}

export function radarToWorld(
  radarX: number,
  radarY: number,
  config: MapCoordinateConfig,
): { x: number; y: number } {
  const x = (radarX / 100) * (config.scale * RADAR_SIZE) + config.posX;
  const y = config.posY - (radarY / 100) * (config.scale * RADAR_SIZE);
  return { x, y };
}
