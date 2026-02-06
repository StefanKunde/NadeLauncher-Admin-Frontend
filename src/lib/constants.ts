export const MAPS = [
  { name: 'de_mirage', displayName: 'Mirage' },
  { name: 'de_dust2', displayName: 'Dust II' },
  { name: 'de_inferno', displayName: 'Inferno' },
  { name: 'de_nuke', displayName: 'Nuke' },
  { name: 'de_overpass', displayName: 'Overpass' },
  { name: 'de_ancient', displayName: 'Ancient' },
  { name: 'de_anubis', displayName: 'Anubis' },
  { name: 'de_vertigo', displayName: 'Vertigo' },
] as const;

export const GRENADE_TYPES = {
  smoke: { label: 'Smoke', color: '#88bbee' },
  flash: { label: 'Flashbang', color: '#ffee44' },
  molotov: { label: 'Molotov', color: '#ff6633' },
  he: { label: 'HE Grenade', color: '#ff4444' },
} as const;

export const MAP_COLORS: Record<string, string> = {
  de_mirage: '#f0a500',
  de_dust2: '#d4a574',
  de_inferno: '#ff6b35',
  de_nuke: '#4ecdc4',
  de_overpass: '#95e1a3',
  de_ancient: '#c4a35a',
  de_anubis: '#e6c35c',
  de_vertigo: '#7dd3fc',
};
