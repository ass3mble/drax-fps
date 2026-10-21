export type WeaponId = 'ranger' | 'specter' | 'sentinel' | 'breaker';

export type HitZone = 'head' | 'chest' | 'stomach' | 'arm' | 'leg' | 'foot';

export type WeaponProfile = {
  id: WeaponId;
  name: string;
  shortName: string;
  role: string;
  magSize: number;
  reserve: number;
  fireInterval: number;
  reloadTime: number;
  damage: number;
  pellets: number;
  hipSpread: number;
  aimSpread: number;
  recoil: number;
  range: number;
  automatic: boolean;
  moveSpeed: number;
  weight: number;
  adsTime: number;
  equipTime: number;
  aimFov: number;
  falloffStart: number;
  falloffEnd: number;
  minDamageScale: number;
  movementSpread: number;
  headMultiplier: number;
  recoilRecovery: number;
};

export const WEAPON_ORDER: WeaponId[] = [
  'ranger',
  'specter',
  'sentinel',
  'breaker',
];

export const WEAPONS: Record<WeaponId, WeaponProfile> = {
  ranger: {
    id: 'ranger',
    name: 'MR-17 RANGER',
    shortName: 'RANGER',
    role: 'ASSAULT',
    magSize: 30,
    reserve: 120,
    fireInterval: 0.105,
    reloadTime: 2.05,
    damage: 34,
    pellets: 1,
    hipSpread: 0.006,
    aimSpread: 0.0018,
    recoil: 1,
    range: 120,
    automatic: true,
    moveSpeed: 1,
    weight: 3.2,
    adsTime: 0.24,
    equipTime: 0.36,
    aimFov: 47,
    falloffStart: 22,
    falloffEnd: 65,
    minDamageScale: 0.68,
    movementSpread: 0.85,
    headMultiplier: 3.5,
    recoilRecovery: 9,
  },
  specter: {
    id: 'specter',
    name: 'VX-9 SPECTER',
    shortName: 'SPECTER',
    role: 'SMG',
    magSize: 36,
    reserve: 144,
    fireInterval: 0.078,
    reloadTime: 1.72,
    damage: 23,
    pellets: 1,
    hipSpread: 0.0085,
    aimSpread: 0.003,
    recoil: 0.72,
    range: 85,
    automatic: true,
    moveSpeed: 1.08,
    weight: 2.1,
    adsTime: 0.16,
    equipTime: 0.24,
    aimFov: 53,
    falloffStart: 12,
    falloffEnd: 38,
    minDamageScale: 0.42,
    movementSpread: 0.45,
    headMultiplier: 3,
    recoilRecovery: 12,
  },
  sentinel: {
    id: 'sentinel',
    name: 'SR-50 SENTINEL',
    shortName: 'SENTINEL',
    role: 'HEAVY SNIPER',
    magSize: 5,
    reserve: 25,
    fireInterval: 1.25,
    reloadTime: 3.8,
    damage: 115,
    pellets: 1,
    hipSpread: 0.035,
    aimSpread: 0,
    recoil: 2.15,
    range: 220,
    automatic: false,
    moveSpeed: 0.78,
    weight: 6.8,
    adsTime: 0.52,
    equipTime: 0.78,
    aimFov: 15,
    falloffStart: 90,
    falloffEnd: 190,
    minDamageScale: 0.9,
    movementSpread: 3.2,
    headMultiplier: 2.1,
    recoilRecovery: 5.5,
  },
  breaker: {
    id: 'breaker',
    name: 'BK-12 BREAKER',
    shortName: 'BREAKER',
    role: 'CLOSE RANGE',
    magSize: 8,
    reserve: 40,
    fireInterval: 0.72,
    reloadTime: 2.5,
    damage: 16,
    pellets: 7,
    hipSpread: 0.085,
    aimSpread: 0.06,
    recoil: 1.65,
    range: 48,
    automatic: false,
    moveSpeed: 0.92,
    weight: 3.8,
    adsTime: 0.3,
    equipTime: 0.46,
    aimFov: 55,
    falloffStart: 7,
    falloffEnd: 26,
    minDamageScale: 0.18,
    movementSpread: 1.0,
    headMultiplier: 1.5,
    recoilRecovery: 7,
  },
};

export function freshAmmo() {
  return Object.fromEntries(
    WEAPON_ORDER.map((id) => [
      id,
      { ammo: WEAPONS[id].magSize, reserve: WEAPONS[id].reserve },
    ]),
  ) as Record<WeaponId, { ammo: number; reserve: number }>;
}

// Full damage inside the effective range; smooth falloff preserves each weapon role.
export function damageAtDistance(profile: WeaponProfile, distance: number) {
  if (distance > profile.range) return 0;
  const t = Math.max(0, Math.min(1, (distance - profile.falloffStart) / (profile.falloffEnd - profile.falloffStart)));
  return profile.damage * (1 - t * (1 - profile.minDamageScale));
}

export const BODY_MULTIPLIERS: Record<Exclude<HitZone, 'head'>, number> = {
  chest: 1, stomach: 1.15, arm: 0.9, leg: 0.75, foot: 0.65,
};
export function damageForHit(profile: WeaponProfile, distance: number, zone: HitZone) {
  return damageAtDistance(profile, distance) * (zone === 'head' ? profile.headMultiplier : BODY_MULTIPLIERS[zone]);
}
