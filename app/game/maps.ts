export type GameMode = 'team-deathmatch' | 'plant-defuse';
export type Team = 'viper' | 'raven';
export type CompetitiveSide = 'attackers' | 'defenders';
export type MapId = 'iron-divide' | 'sun-relay' | 'lockgate' | 'drax-docks';
export type BombsiteId = 'A' | 'B';

export type AreaBounds = {
  minX: number;
  maxX: number;
  minY?: number;
  maxY?: number;
  minZ: number;
  maxZ: number;
};
export type WorldBounds = AreaBounds;
export type SpawnPoint = { x: number; z: number; yaw: number };
export type TeamSpawn = SpawnPoint;
export type RadarRect = { x: number; z: number; w: number; d: number };
export type MapCallout = {
  id: string;
  x: number;
  z: number;
  vi: string;
  en: string;
  priority?: 'major' | 'minor';
};
export type ObjectiveNodeTag =
  | 'attacker-spawn'
  | 'defender-spawn'
  | 'a-main'
  | 'a-mid'
  | 'a-site'
  | 'a-connector'
  | 'b-main'
  | 'b-mid'
  | 'b-site'
  | 'b-connector'
  | 'central-mid'
  | 'staging'
  | 'anchor'
  | 'post-plant';
export type ObjectiveNavNode = {
  id: string;
  tag: ObjectiveNodeTag;
  x: number;
  z: number;
  siteId?: BombsiteId;
};
export type BombsiteDefinition = {
  id: BombsiteId;
  labelVi: string;
  labelEn: string;
  bounds: AreaBounds;
  attackerApproaches: readonly string[];
  defenderConnector: string;
  plantSpots: ReadonlyArray<{ x: number; z: number }>;
  defenderAnchorHints: ReadonlyArray<{ x: number; z: number }>;
  postPlantHints: ReadonlyArray<{ x: number; z: number }>;
};
export type PlantDefuseMapData = {
  attackerSpawns: readonly SpawnPoint[];
  defenderSpawns: readonly SpawnPoint[];
  bombsites: readonly BombsiteDefinition[];
  navigationNodes: readonly ObjectiveNavNode[];
  calloutZones: readonly MapCallout[];
};
export type MapDefinition = {
  id: MapId;
  name: string;
  title: readonly [string, string];
  vi: string;
  en: string;
  supportedModes: readonly GameMode[];
  bounds: AreaBounds;
  plantDefuse?: PlantDefuseMapData;
};

export const WORLD_BOUNDS: WorldBounds = {
  minX: -24,
  maxX: 24,
  minZ: -34,
  maxZ: 34,
};
export const DOCKS_BOUNDS: WorldBounds = {
  minX: -30,
  maxX: 30,
  minZ: -38,
  maxZ: 38,
};

export const LOCKGATE_LAYOUT = {
  bounds: WORLD_BOUNDS,
  spawns: {
    viper: [
      { x: -19, z: 29.5, yaw: 0 },
      { x: -12, z: 30, yaw: 0 },
      { x: -3, z: 29.5, yaw: 0 },
      { x: 4, z: 30, yaw: 0 },
      { x: 13, z: 29.5, yaw: 0 },
      { x: 20, z: 30, yaw: 0 },
    ],
    raven: [
      { x: 19, z: -29.5, yaw: Math.PI },
      { x: 12, z: -30, yaw: Math.PI },
      { x: 3, z: -29.5, yaw: Math.PI },
      { x: -4, z: -30, yaw: Math.PI },
      { x: -13, z: -29.5, yaw: Math.PI },
      { x: -20, z: -30, yaw: Math.PI },
    ],
  } satisfies Record<Team, TeamSpawn[]>,
  coverNodes: [
    { x: -19, z: -22 }, { x: -13, z: -21 }, { x: -2, z: -21 }, { x: 6, z: -20 }, { x: 17, z: -21 }, { x: 21, z: -17 },
    { x: -18, z: -14 }, { x: -12, z: -13 }, { x: -1, z: -14 }, { x: 6, z: -11 }, { x: 13, z: -13 }, { x: 19, z: -10 },
    { x: -20, z: -6 }, { x: -13, z: -4 }, { x: -6, z: -4 }, { x: 0, z: -10 }, { x: 7, z: -5 }, { x: 18, z: -4 },
    { x: -20, z: 6 }, { x: -13, z: 4 }, { x: -6, z: 4 }, { x: 0, z: 10 }, { x: 7, z: 5 }, { x: 18, z: 4 },
    { x: -18, z: 14 }, { x: -12, z: 13 }, { x: -1, z: 14 }, { x: 6, z: 11 }, { x: 13, z: 13 }, { x: 19, z: 10 },
    { x: -19, z: 22 }, { x: -13, z: 21 }, { x: -2, z: 21 }, { x: 6, z: 20 }, { x: 17, z: 21 }, { x: 21, z: 17 },
  ],
  callouts: [
    { id: 'workshop-n', x: -17, z: -16, vi: 'XƯỞNG BẮC', en: 'WORKSHOP N', priority: 'major' },
    { id: 'connector-n', x: 0, z: -12, vi: 'NỐI BẮC', en: 'N LINK', priority: 'minor' },
    { id: 'pump', x: 0, z: 0, vi: 'TRẠM BƠM', en: 'PUMP', priority: 'major' },
    { id: 'quay', x: 17, z: 0, vi: 'ĐƯỜNG BẾN', en: 'QUAY', priority: 'major' },
    { id: 'connector-s', x: 0, z: 12, vi: 'NỐI NAM', en: 'S LINK', priority: 'minor' },
    { id: 'workshop-s', x: -17, z: 16, vi: 'XƯỞNG NAM', en: 'WORKSHOP S', priority: 'major' },
  ] satisfies MapCallout[],
  probes: {
    workshop: { x: -20, z: 0 }, pumpNorth: { x: 0, z: -10 }, pumpSouth: { x: 0, z: 10 }, quay: { x: 18, z: 4 },
    northWestLink: { x: -12, z: -12 }, northEastLink: { x: 10, z: -12 }, southWestLink: { x: -12, z: 12 }, southEastLink: { x: 6, z: 12 },
  },
} as const;

export const DRAX_DOCKS_LAYOUT = {
  bounds: DOCKS_BOUNDS,
  attackerSpawns: [
    { x: -4.5, z: 32.5, yaw: 0 },
    { x: -1.5, z: 32.5, yaw: 0 },
    { x: 1.5, z: 32.5, yaw: 0 },
    { x: 4.5, z: 32.5, yaw: 0 },
  ],
  defenderSpawns: [
    { x: 4.5, z: -32.5, yaw: Math.PI },
    { x: 1.5, z: -32.5, yaw: Math.PI },
    { x: -1.5, z: -32.5, yaw: Math.PI },
    { x: -4.5, z: -32.5, yaw: Math.PI },
  ],
  bombsites: [
    {
      id: 'A',
      labelVi: 'CẦU CẢNG',
      labelEn: 'PIER',
      bounds: { minX: -24, maxX: -16, minY: -0.1, maxY: 0.6, minZ: -12, maxZ: -4 },
      attackerApproaches: ['a-main', 'a-mid'],
      defenderConnector: 'a-connector',
      plantSpots: [{ x: -21.5, z: -8.5 }, { x: -18.6, z: -6.2 }, { x: -19.2, z: -10.2 }],
      defenderAnchorHints: [{ x: -24, z: -16.5 }, { x: -16, z: -16.5 }],
      postPlantHints: [{ x: -22.8, z: -1.3 }, { x: -13.8, z: -7.2 }, { x: -19.5, z: 2.2 }],
    },
    {
      id: 'B',
      labelVi: 'KHO CONTAINER',
      labelEn: 'CONTAINER HALL',
      bounds: { minX: 15.5, maxX: 24.5, minY: -0.1, maxY: 0.6, minZ: -12, maxZ: -4 },
      attackerApproaches: ['b-main', 'b-mid'],
      defenderConnector: 'b-connector',
      plantSpots: [{ x: 21.8, z: -8.6 }, { x: 18.1, z: -6.1 }, { x: 19.1, z: -10.4 }],
      defenderAnchorHints: [{ x: 24, z: -16.5 }, { x: 16, z: -16.5 }],
      postPlantHints: [{ x: 23.6, z: -1.5 }, { x: 12.5, z: -7 }, { x: 19.7, z: 2.2 }],
    },
  ] satisfies BombsiteDefinition[],
  navigationNodes: [
    { id: 'atk-0', tag: 'attacker-spawn', x: 0, z: 31 },
    { id: 'a-stage-0', tag: 'staging', siteId: 'A', x: -18, z: 12 },
    { id: 'a-stage-1', tag: 'staging', siteId: 'A', x: -22, z: 9 },
    { id: 'a-main-0', tag: 'a-main', siteId: 'A', x: -17, z: 5 },
    { id: 'a-main-1', tag: 'a-main', siteId: 'A', x: -20, z: 0 },
    { id: 'a-mid-0', tag: 'a-mid', siteId: 'A', x: -10, z: 3 },
    { id: 'a-mid-1', tag: 'a-mid', siteId: 'A', x: -13, z: -5 },
    { id: 'a-site-0', tag: 'a-site', siteId: 'A', x: -20, z: -8 },
    { id: 'a-connector-0', tag: 'a-connector', siteId: 'A', x: -20, z: -18 },
    { id: 'a-anchor-0', tag: 'anchor', siteId: 'A', x: -24, z: -16.5 },
    { id: 'a-anchor-1', tag: 'anchor', siteId: 'A', x: -16, z: -16.5 },
    { id: 'a-post-0', tag: 'post-plant', siteId: 'A', x: -23, z: -1 },
    { id: 'a-post-1', tag: 'post-plant', siteId: 'A', x: -14, z: -7 },
    { id: 'b-stage-0', tag: 'staging', siteId: 'B', x: 18, z: 12 },
    { id: 'b-stage-1', tag: 'staging', siteId: 'B', x: 22, z: 9 },
    { id: 'b-main-0', tag: 'b-main', siteId: 'B', x: 17, z: 5 },
    { id: 'b-main-1', tag: 'b-main', siteId: 'B', x: 20, z: 0 },
    { id: 'b-mid-0', tag: 'b-mid', siteId: 'B', x: 10, z: 3 },
    { id: 'b-mid-1', tag: 'b-mid', siteId: 'B', x: 13, z: -5 },
    { id: 'b-site-0', tag: 'b-site', siteId: 'B', x: 20, z: -8 },
    { id: 'b-connector-0', tag: 'b-connector', siteId: 'B', x: 20, z: -18 },
    { id: 'b-anchor-0', tag: 'anchor', siteId: 'B', x: 24, z: -16.5 },
    { id: 'b-anchor-1', tag: 'anchor', siteId: 'B', x: 16, z: -16.5 },
    { id: 'b-post-0', tag: 'post-plant', siteId: 'B', x: 23, z: -1 },
    { id: 'b-post-1', tag: 'post-plant', siteId: 'B', x: 12.5, z: -7 },
    { id: 'mid-south', tag: 'central-mid', x: 0, z: 18 },
    { id: 'mid-cover-s', tag: 'central-mid', x: 1.5, z: 10 },
    { id: 'mid-contest', tag: 'central-mid', x: 0, z: 2 },
    { id: 'mid-cover-n', tag: 'central-mid', x: 2, z: -7 },
    { id: 'mid-north', tag: 'central-mid', x: 0, z: -18 },
    { id: 'def-0', tag: 'defender-spawn', x: 0, z: -31 },
  ] satisfies ObjectiveNavNode[],
  calloutZones: [
    { id: 'attack-spawn', x: 0, z: 31, vi: 'XUẤT PHÁT TẤN CÔNG', en: 'ATTACK SPAWN', priority: 'minor' },
    { id: 'a-main', x: -20, z: 4, vi: 'A MAIN', en: 'A MAIN', priority: 'major' },
    { id: 'a-site', x: -20, z: -8, vi: 'A · CẦU CẢNG', en: 'A · PIER', priority: 'major' },
    { id: 'a-connector', x: -20, z: -19, vi: 'NỐI A', en: 'A CONNECTOR', priority: 'minor' },
    { id: 'central-mid', x: 0, z: 3, vi: 'MID', en: 'MID', priority: 'major' },
    { id: 'b-main', x: 20, z: 4, vi: 'B MAIN', en: 'B MAIN', priority: 'major' },
    { id: 'b-site', x: 20, z: -8, vi: 'B · KHO', en: 'B · HALL', priority: 'major' },
    { id: 'b-connector', x: 20, z: -19, vi: 'NỐI B', en: 'B CONNECTOR', priority: 'minor' },
    { id: 'def-spawn', x: 0, z: -31, vi: 'XUẤT PHÁT PHÒNG THỦ', en: 'DEF SPAWN', priority: 'minor' },
  ] satisfies MapCallout[],
  probes: {
    aMainChoke: { x: -17, z: 5 },
    bMainChoke: { x: 17, z: 5 },
    midContest: { x: 0, z: 2 },
    aAnchor: { x: -20, z: -16.5 },
    bAnchor: { x: 20, z: -16.5 },
    aRotate: { x: -20, z: -19 },
    bRotate: { x: 20, z: -19 },
  },
} as const satisfies PlantDefuseMapData & { bounds: WorldBounds; probes: Record<string, { x: number; z: number }> };

export const MAPS: Record<MapId, MapDefinition> = {
  'iron-divide': {
    id: 'iron-divide', name: 'IRON DIVIDE', title: ['IRON', 'DIVIDE'],
    vi: 'Bến hàng · ba đường hẹp', en: 'Freight yard · tight three lanes',
    supportedModes: ['team-deathmatch'], bounds: WORLD_BOUNDS,
  },
  'sun-relay': {
    id: 'sun-relay', name: 'SUN RELAY', title: ['SUN', 'RELAY'],
    vi: 'Trạm năng lượng · sân giữa, hành lang bên', en: 'Solar station · courtyard and side corridors',
    supportedModes: ['team-deathmatch'], bounds: WORLD_BOUNDS,
  },
  lockgate: {
    id: 'lockgate', name: 'LOCKGATE', title: ['LOCK', 'GATE'],
    vi: 'Cửa âu · xưởng, trạm bơm và đường bến', en: 'Lock station · workshop, pumps and quay',
    supportedModes: ['team-deathmatch'], bounds: WORLD_BOUNDS,
  },
  'drax-docks': {
    id: 'drax-docks', name: 'DRAX DOCKS', title: ['DRAX FPS', 'DOCKS'],
    vi: 'BẾN TÀU VỰC ĐEN · cầu cảng, Mid và kho container',
    en: 'Isolated industrial dock · pier, Mid and container hall',
    supportedModes: ['plant-defuse'], bounds: DOCKS_BOUNDS,
    plantDefuse: DRAX_DOCKS_LAYOUT,
  },
};

// DRAX Docks / Plant-Defuse is intentionally retired from the playable map rotation.
// Keep its data in the codebase for now so existing arena assets/tests can be cleaned up safely
// without risking unrelated regressions in the three stable TDM maps.
export const PLAYABLE_MAP_IDS = ['iron-divide', 'sun-relay', 'lockgate'] as const satisfies readonly MapId[];

export const MAP_RADAR_RECTS: Record<MapId, RadarRect[]> = {
  'iron-divide': [
    { x: -8, z: -15, w: 2.4, d: 7.2 }, { x: 8, z: -15, w: 2.4, d: 7.2 }, { x: -8, z: -6, w: 2.4, d: 7.2 }, { x: 8, z: -6, w: 2.4, d: 7.2 },
    { x: -8, z: 6, w: 2.4, d: 7.2 }, { x: 8, z: 6, w: 2.4, d: 7.2 }, { x: -8, z: 15, w: 2.4, d: 7.2 }, { x: 8, z: 15, w: 2.4, d: 7.2 }, { x: 0, z: 0, w: 3.2, d: 3.2 },
  ],
  'sun-relay': [
    { x: -9, z: -11, w: 2.4, d: 12 }, { x: 9, z: -11, w: 2.4, d: 12 }, { x: -9, z: 11, w: 2.4, d: 12 }, { x: 9, z: 11, w: 2.4, d: 12 },
    { x: 0, z: 0, w: 3.8, d: 3.8 }, { x: -17, z: -9, w: 4.5, d: 2.4 }, { x: 17, z: 9, w: 4.5, d: 2.4 },
  ],
  lockgate: [
    { x: -22.35, z: -9.5, w: 1.1, d: 22 }, { x: -22.35, z: 9.5, w: 1.1, d: 22 }, { x: -9.55, z: -18.2, w: 1, d: 10.8 }, { x: -9.55, z: 18.2, w: 1, d: 10.8 },
    { x: -16, z: 0, w: 2.8, d: 2.2 }, { x: -3.15, z: 0, w: 2.5, d: 8.2 }, { x: 3.15, z: 0, w: 2.5, d: 8.2 }, { x: -4.8, z: -12.2, w: 5, d: 1.1 }, { x: -4.8, z: 12.2, w: 5, d: 1.1 },
    { x: 8.2, z: -11.4, w: 1.3, d: 5.2 }, { x: 8.2, z: 11.4, w: 1.3, d: 5.2 }, { x: 15.8, z: -17.5, w: 4.5, d: 2.1 }, { x: 15.8, z: 17.5, w: 4.5, d: 2.1 }, { x: 14.2, z: 0, w: 1.55, d: 6.2 },
  ],
  'drax-docks': [
    { x: -10.5, z: 18, w: 4.5, d: 7 }, { x: 10.5, z: 18, w: 4.5, d: 7 },
    { x: -9.5, z: 8, w: 5, d: 2 }, { x: 9.5, z: 8, w: 5, d: 2 },
    { x: -7.5, z: -3.5, w: 2.2, d: 7 }, { x: 7.5, z: -3.5, w: 2.2, d: 7 },
    { x: -26.8, z: -7.5, w: 2, d: 12 },
    { x: -20, z: -8, w: 4.4, d: 2.2 }, { x: -17.2, z: -14.8, w: 4, d: 2 },
    { x: 17.2, z: -8.7, w: 2.2, d: 5.2 }, { x: 23.2, z: -7.7, w: 3.8, d: 2.2 }, { x: 20.5, z: -14.8, w: 6, d: 2 },
    { x: -9.5, z: -22, w: 7, d: 2 }, { x: 9.5, z: -22, w: 7, d: 2 },
  ],
};

export function mapsForMode(mode: GameMode) {
  return PLAYABLE_MAP_IDS.filter((id) => MAPS[id].supportedModes.includes(mode));
}
export function mapSupportsMode(mapId: MapId, mode: GameMode) {
  return MAPS[mapId]?.supportedModes.includes(mode) ?? false;
}
export function fallbackMapForMode(mode: GameMode): MapId {
  return mapsForMode(mode)[0] ?? 'iron-divide';
}

export function worldToRadar(
  x: number,
  z: number,
  width = 140,
  height = 168,
  insetX = 10,
  insetY = 6,
  bounds: WorldBounds = WORLD_BOUNDS,
) {
  return {
    x: insetX + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * width,
    y: insetY + ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * height,
  };
}

export function worldSizeToRadar(
  w: number,
  d: number,
  width = 140,
  height = 168,
  bounds: WorldBounds = WORLD_BOUNDS,
) {
  return {
    w: (w / (bounds.maxX - bounds.minX)) * width,
    h: (d / (bounds.maxZ - bounds.minZ)) * height,
  };
}
