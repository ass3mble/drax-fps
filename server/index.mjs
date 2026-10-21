import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const host = process.env.DRAX_HOST || '0.0.0.0';
const port = Number(process.env.DRAX_PORT || 8787);
const MAX_PLAYERS = 8;
const ROOM_CODE_LENGTH = 6;
const VALID_MAPS = new Set(['iron-divide', 'sun-relay', 'lockgate']);
const VALID_WEAPONS = new Set(['ranger', 'specter', 'sentinel', 'breaker']);
const SCORE_LIMIT = 25;
const RESPAWN_MS = 3000;
const RECONNECT_GRACE_MS = 30_000;
const MAP_COLLIDERS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'server/map-colliders.json'), 'utf8'));
  } catch {
    return {};
  }
})();
const WEAPONS = {
  ranger: { damage: 34, pellets: 1, fireInterval: 0.105, range: 120, falloffStart: 22, falloffEnd: 65, minDamageScale: 0.68, headMultiplier: 3.5, hipSpread: 0.006, aimSpread: 0.0018, movementSpread: 0.85, adsTime: 0.24 },
  specter: { damage: 23, pellets: 1, fireInterval: 0.078, range: 85, falloffStart: 12, falloffEnd: 38, minDamageScale: 0.42, headMultiplier: 3, hipSpread: 0.0085, aimSpread: 0.003, movementSpread: 0.45, adsTime: 0.16 },
  sentinel: { damage: 115, pellets: 1, fireInterval: 1.25, range: 220, falloffStart: 90, falloffEnd: 190, minDamageScale: 0.9, headMultiplier: 2.1, hipSpread: 0.035, aimSpread: 0, movementSpread: 3.2, adsTime: 0.52 },
  breaker: { damage: 16, pellets: 7, fireInterval: 0.72, range: 48, falloffStart: 7, falloffEnd: 26, minDamageScale: 0.18, headMultiplier: 1.5, hipSpread: 0.085, aimSpread: 0.06, movementSpread: 1, adsTime: 0.3 },
};
const rooms = new Map();
const sockets = new Set();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
};

const cleanNickname = (value) => Array.from(String(value || ''))
  .filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 32 && code !== 127;
  })
  .join('')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 18);

const cleanRoomName = (value, fallback = 'DRAX ROOM') => {
  const name = Array.from(String(value || ''))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
  return name || fallback.slice(0, 28);
};

const cleanDeviceId = (value) => String(value || '')
  .replace(/[^a-zA-Z0-9_-]/g, '')
  .slice(0, 80);

const send = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};

const error = (ws, message) => send(ws, { type: 'error', message });

const makeRoomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++)
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error('Unable to allocate room code.');
};

const pickTeam = (room) => {
  let viper = 0;
  let raven = 0;
  for (const player of room.players.values()) {
    if (player.team === 'viper') viper++;
    else raven++;
  }
  return viper <= raven ? 'viper' : 'raven';
};

const leaveRoom = (ws, notify = true) => {
  const session = ws.session;
  if (!session?.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = '';
  if (!room) return;

  room.players.delete(session.playerId);
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else if (room.hostId === session.playerId) {
    const connectedHost = [...room.players.values()].find((player) => player.ws?.readyState === WebSocket.OPEN);
    room.hostId = connectedHost?.id || room.players.keys().next().value;
  }
  if (notify) send(ws, { type: 'room_left' });
  if (rooms.has(room.code)) broadcastRoomState(room);
};

const detachRoom = (ws) => {
  const session = ws.session;
  if (!session?.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = '';
  if (!room) return;
  const player = room.players.get(session.playerId);
  if (!player || player.ws !== ws) return;
  player.ws = null;
  player.disconnectedAt = Date.now();
  player.pose = null;
  player.lastPoseAt = 0;
  player.aimStartedAt = 0;
  broadcastRoomState(room);
};

const cleanupDisconnectedPlayers = (now = Date.now()) => {
  for (const room of rooms.values()) {
    let changed = false;
    for (const [playerId, player] of room.players) {
      if (player.ws || !player.disconnectedAt || now - player.disconnectedAt < RECONNECT_GRACE_MS) continue;
      room.players.delete(playerId);
      changed = true;
    }
    if (room.players.size === 0) {
      rooms.delete(room.code);
      continue;
    }
    if (!room.players.has(room.hostId)) {
      const connectedHost = [...room.players.values()].find((player) => player.ws?.readyState === WebSocket.OPEN);
      room.hostId = connectedHost?.id || room.players.keys().next().value;
      changed = true;
    }
    if (changed) broadcastRoomState(room);
  }
};

const updateRespawns = (room, now = Date.now()) => {
  for (const player of room.players.values()) {
    if (player.respawnUntil > 0 && now >= player.respawnUntil) {
      player.respawnUntil = 0;
      player.health = 100;
      player.pose = null;
      player.lastPoseAt = 0;
      player.aimStartedAt = 0;
    }
  }
};

const damageAtDistance = (weapon, distance) => {
  if (distance > weapon.range) return 0;
  const span = Math.max(0.001, weapon.falloffEnd - weapon.falloffStart);
  const t = Math.max(0, Math.min(1, (distance - weapon.falloffStart) / span));
  return weapon.damage * (1 - t * (1 - weapon.minDamageScale));
};

const normalizeDirection = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x), y = Number(raw.y), z = Number(raw.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  const length = Math.hypot(x, y, z);
  if (length < 0.8 || length > 1.2) return null;
  return { x: x / length, y: y / length, z: z / length };
};

const raySphereDistance = (origin, direction, center, radius, maxDistance) => {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const near = -b - root;
  const far = -b + root;
  const distance = near >= 0 ? near : far >= 0 ? far : null;
  return distance !== null && distance <= maxDistance ? distance : null;
};

const blockerDistance = (mapId, origin, direction, maxDistance) => {
  const colliders = MAP_COLLIDERS[mapId] || [];
  let nearest = maxDistance;
  for (const collider of colliders) {
    let enter = 0;
    let exit = nearest;

    for (const [originValue, directionValue, min, max] of [
      [origin.x, direction.x, collider.minX, collider.maxX],
      [origin.y, direction.y, 0, collider.maxY ?? 2.8],
      [origin.z, direction.z, collider.minZ, collider.maxZ],
    ]) {
      if (Math.abs(directionValue) < 1e-8) {
        if (originValue < min || originValue > max) {
          enter = Infinity;
          break;
        }
        continue;
      }
      let a = (min - originValue) / directionValue;
      let b = (max - originValue) / directionValue;
      if (a > b) {
        const swap = a;
        a = b;
        b = swap;
      }
      enter = Math.max(enter, a);
      exit = Math.min(exit, b);
      if (enter > exit) break;
    }

    if (enter >= 0 && enter <= exit && enter < nearest) nearest = enter;
  }
  return nearest;
};

const basisFor = (direction) => {
  const upSeed = Math.abs(direction.y) > 0.94 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const rx = direction.y * upSeed.z - direction.z * upSeed.y;
  const ry = direction.z * upSeed.x - direction.x * upSeed.z;
  const rz = direction.x * upSeed.y - direction.y * upSeed.x;
  const rLength = Math.max(0.0001, Math.hypot(rx, ry, rz));
  const right = { x: rx / rLength, y: ry / rLength, z: rz / rLength };
  const up = {
    x: right.y * direction.z - right.z * direction.y,
    y: right.z * direction.x - right.x * direction.z,
    z: right.x * direction.y - right.y * direction.x,
  };
  return { right, up };
};

const makeShotRng = (seed) => {
  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const spreadDirection = (direction, spread, rng = Math.random) => {
  if (spread <= 0) return direction;
  const { right, up } = basisFor(direction);
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng()) * spread * 0.5;
  const x = direction.x + right.x * Math.cos(angle) * radius + up.x * Math.sin(angle) * radius;
  const y = direction.y + right.y * Math.cos(angle) * radius + up.y * Math.sin(angle) * radius;
  const z = direction.z + right.z * Math.cos(angle) * radius + up.z * Math.sin(angle) * radius;
  const length = Math.max(0.0001, Math.hypot(x, y, z));
  return { x: x / length, y: y / length, z: z / length };
};

const handleShot = (ws, room, shooter, msg) => {
  const now = Date.now();
  updateRespawns(room, now);
  if (!shooter.pose || shooter.health <= 0 || shooter.respawnUntil > now) return;
  const weaponId = shooter.pose.weapon;
  const weapon = WEAPONS[weaponId];
  if (!weapon) return;
  const minIntervalMs = weapon.fireInterval * 1000 * 0.88;
  if (shooter.lastShotAt && now - shooter.lastShotAt < minIntervalMs) return;
  const shotSeq = Number(msg.seq);
  if (!Number.isSafeInteger(shotSeq) || shotSeq <= 0 || shotSeq <= shooter.lastShotSeq)
    return;

  const direction = normalizeDirection(msg.direction);
  if (!direction) return;
  const origin = {
    x: Number(msg.origin?.x),
    y: Number(msg.origin?.y),
    z: Number(msg.origin?.z),
  };
  if (![origin.x, origin.y, origin.z].every(Number.isFinite)) return;
  const expectedEyeY = shooter.pose.y + (shooter.pose.crouching ? 1.05 : 1.7);
  if (Math.hypot(origin.x - shooter.pose.x, origin.z - shooter.pose.z) > 0.9 || Math.abs(origin.y - expectedEyeY) > 0.85) return;

  shooter.lastShotAt = now;
  shooter.lastShotSeq = shotSeq;
  shooter.acceptedShots++;
  let totalDamage = 0;
  let strongestDamage = 0;
  let strongestZone = 'chest';
  let victim = null;

  const aimSeconds =
    shooter.pose.aiming && shooter.aimStartedAt
      ? Math.max(0, (now - shooter.aimStartedAt) / 1000)
      : 0;
  const aimProgress = shooter.pose.aiming
    ? Math.min(1, 1 - Math.exp((-3 * aimSeconds) / Math.max(0.01, weapon.adsTime)))
    : 0;
  let spread = weapon.hipSpread + (weapon.aimSpread - weapon.hipSpread) * aimProgress;
  spread += Math.min(1, shooter.pose.speed || 0) * weapon.hipSpread * weapon.movementSpread;
  if (shooter.pose.y > 0.08) spread *= 2.5;
  if (shooter.pose.crouching) spread *= 0.72;
  const seed =
    (shooter.spreadSalt ^ Math.imul(shooter.acceptedShots, 0x9e3779b1)) >>> 0;
  const shotRng = makeShotRng(seed);
  let tracerEnd = {
    x: origin.x + direction.x * weapon.range * 0.72,
    y: origin.y + direction.y * weapon.range * 0.72,
    z: origin.z + direction.z * weapon.range * 0.72,
  };
  for (let pellet = 0; pellet < weapon.pellets; pellet++) {
    const pelletDirection = spreadDirection(direction, spread, shotRng);
    const coverDistance = blockerDistance(room.mapId, origin, pelletDirection, weapon.range);
    let best = null;
    for (const target of room.players.values()) {
      if (target.id === shooter.id || target.team === shooter.team || !target.pose || target.health <= 0 || target.respawnUntil > now) continue;
      const crouch = target.pose.crouching;
      const headCenter = { x: target.pose.x, y: target.pose.y + (crouch ? 1.0 : 1.58), z: target.pose.z };
      const bodyCenter = { x: target.pose.x, y: target.pose.y + (crouch ? 0.62 : 0.98), z: target.pose.z };
      const headDistance = raySphereDistance(origin, pelletDirection, headCenter, 0.24, weapon.range);
      const bodyDistance = raySphereDistance(origin, pelletDirection, bodyCenter, crouch ? 0.44 : 0.48, weapon.range);
      let distance = null;
      let zone = 'chest';
      if (headDistance !== null && (bodyDistance === null || headDistance <= bodyDistance)) {
        distance = headDistance;
        zone = 'head';
      } else if (bodyDistance !== null) {
        distance = bodyDistance;
      }
      if (
        distance === null ||
        distance >= coverDistance - 0.015 ||
        (best && distance >= best.distance)
      )
        continue;
      best = { target, distance, zone };
    }
    if (pellet === 0) {
      const traceDistance = best
        ? best.distance
        : coverDistance < weapon.range
          ? coverDistance
          : weapon.range * 0.72;
      tracerEnd = {
        x: origin.x + pelletDirection.x * traceDistance,
        y: origin.y + pelletDirection.y * traceDistance,
        z: origin.z + pelletDirection.z * traceDistance,
      };
    }
    if (!best) continue;
    const baseDamage = damageAtDistance(weapon, best.distance);
    const damage = baseDamage * (best.zone === 'head' ? weapon.headMultiplier : 1);
    const applied = Math.min(best.target.health, damage);
    best.target.health = Math.max(0, best.target.health - damage);
    totalDamage += applied;
    if (damage > strongestDamage) {
      strongestDamage = damage;
      strongestZone = best.zone;
      victim = best.target;
    }
  }

  if (!victim || totalDamage <= 0) {
    send(ws, {
      type: 'shot_result',
      seq: shotSeq,
      tracerEnd,
      hit: false,
      damage: 0,
      zone: 'chest',
      kill: false,
      victimId: '',
      victim: '',
    });
    return;
  }

  const kill = victim.health <= 0;
  if (kill) {
    victim.deaths++;
    victim.respawnUntil = now + RESPAWN_MS;
    shooter.kills++;
    if (shooter.team === 'viper') room.viperScore++;
    else room.ravenScore++;
  }
  send(ws, {
    type: 'shot_result',
    seq: shotSeq,
    tracerEnd,
    hit: true,
    damage: Math.round(totalDamage),
    zone: strongestZone,
    kill,
    victimId: victim.id,
    victim: victim.nickname,
  });
  broadcastRoomState(room);
};

const serializePlayers = (room) => {
  const now = Date.now();
  updateRespawns(room, now);
  return [...room.players.values()].map((player) => ({
    id: player.id,
    nickname: player.nickname,
    team: player.team,
    active: player.ws?.readyState === WebSocket.OPEN && Boolean(player.pose) && now - player.lastPoseAt < 1250 && player.health > 0,
    pose: player.pose,
    health: Math.max(0, Math.round(player.health)),
    kills: player.kills,
    deaths: player.deaths,
    alive: player.health > 0 && player.respawnUntil <= now,
    respawn: player.respawnUntil > now ? (player.respawnUntil - now) / 1000 : 0,
  }));
};

const broadcastRoomState = (room) => {
  const payload = JSON.stringify({
    type: 'room_state',
    roomCode: room.code,
    roomName: room.name,
    mapId: room.mapId,
    hostId: room.hostId,
    serverTime: Date.now(),
    viperScore: room.viperScore,
    ravenScore: room.ravenScore,
    scoreLimit: SCORE_LIMIT,
    players: serializePlayers(room),
  });
  for (const player of room.players.values()) {
    if (player.ws?.readyState === WebSocket.OPEN) player.ws.send(payload);
  }
};

const joinRoom = (ws, room) => {
  const session = ws.session;
  if (!session?.playerId) return error(ws, 'Handshake chưa hoàn tất.');
  const existing = room.players.get(session.playerId);
  if (room.players.size >= MAX_PLAYERS && !existing)
    return error(ws, 'Phòng đã đủ 8 người.');

  if (session.roomCode && session.roomCode !== room.code) leaveRoom(ws, false);
  if (session.roomCode === room.code && existing?.ws === ws) {
    send(ws, { type: 'room_joined', roomCode: room.code, roomName: room.name, mapId: room.mapId, hostId: room.hostId });
    broadcastRoomState(room);
    return;
  }

  session.roomCode = room.code;
  if (existing?.ws && existing.ws !== ws && existing.ws.readyState === WebSocket.OPEN) {
    existing.ws.session.roomCode = '';
    existing.ws.close(4001, 'session resumed elsewhere');
  }

  const player = existing || {
    id: session.playerId,
    nickname: session.nickname,
    team: pickTeam(room),
    ws,
    pose: null,
    lastPoseAt: 0,
    health: 100,
    kills: 0,
    deaths: 0,
    respawnUntil: 0,
    lastShotAt: 0,
    lastShotSeq: 0,
    acceptedShots: 0,
    spreadSalt: (Math.random() * 0x100000000) >>> 0,
    aimStartedAt: 0,
    disconnectedAt: 0,
  };
  player.nickname = session.nickname;
  player.ws = ws;
  player.lastShotSeq = 0;
  player.disconnectedAt = 0;
  room.players.set(player.id, player);
  send(ws, { type: 'room_joined', roomCode: room.code, roomName: room.name, mapId: room.mapId, hostId: room.hostId });
  broadcastRoomState(room);
};

const normalizePose = (raw, current, dtSeconds) => {
  if (!raw || typeof raw !== 'object') return null;
  const n = (value) => Number(value);
  const x = n(raw.x), y = n(raw.y), z = n(raw.z), yaw = n(raw.yaw), pitch = n(raw.pitch);
  if (![x, y, z, yaw, pitch].every(Number.isFinite)) return null;
  if (Math.abs(x) > 90 || Math.abs(z) > 90 || y < -1 || y > 12) return null;
  if (Math.abs(pitch) > Math.PI / 2 + 0.2 || Math.abs(yaw) > Math.PI * 8) return null;
  let speed = 0;
  if (current && dtSeconds > 0 && dtSeconds < 1.5) {
    const distance = Math.hypot(x - current.x, z - current.z);
    const maxDistance = 14 * dtSeconds + 2.6;
    if (distance > maxDistance) return null;
    speed = Math.min(1, distance / Math.max(0.001, dtSeconds) / 4.5);
  }
  const weapon = VALID_WEAPONS.has(raw.weapon) ? raw.weapon : 'ranger';
  return {
    x,
    y,
    z,
    yaw,
    pitch,
    crouching: Boolean(raw.crouching),
    aiming: Boolean(raw.aiming),
    firing: Boolean(raw.firing),
    weapon,
    speed,
  };
};

const handleMessage = (ws, raw) => {
  if (typeof raw !== 'string' && !Buffer.isBuffer(raw)) return;
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (text.length > 16_384) return ws.close(1009, 'message too large');

  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    return error(ws, 'Message JSON không hợp lệ.');
  }
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

  if (msg.type === 'hello') {
    if (ws.session?.playerId) return;
    if (msg.version !== 1) return error(ws, 'Protocol version không tương thích.');
    const deviceId = cleanDeviceId(msg.deviceId);
    const nickname = cleanNickname(msg.nickname);
    if (deviceId.length < 8) return error(ws, 'Device ID không hợp lệ.');
    if (!nickname) return error(ws, 'Nickname không hợp lệ.');
    ws.session = { playerId: deviceId, nickname, roomCode: '', lastPoseAt: 0 };
    return send(ws, { type: 'hello_ok', playerId: deviceId, nickname });
  }

  const session = ws.session;
  if (!session?.playerId) return error(ws, 'Hãy handshake trước.');

  if (msg.type === 'profile') {
    const nickname = cleanNickname(msg.nickname);
    if (!nickname) return error(ws, 'Nickname không hợp lệ.');
    session.nickname = nickname;
    if (session.roomCode) {
      const room = rooms.get(session.roomCode);
      const player = room?.players.get(session.playerId);
      if (player) player.nickname = nickname;
    }
    return send(ws, { type: 'hello_ok', playerId: session.playerId, nickname });
  }

  if (msg.type === 'create_room') {
    const mapId = VALID_MAPS.has(msg.mapId) ? msg.mapId : 'iron-divide';
    const code = makeRoomCode();
    const name = cleanRoomName(msg.roomName, `${session.nickname}'s room`);
    const room = { code, name, mapId, hostId: session.playerId, players: new Map(), createdAt: Date.now(), viperScore: 0, ravenScore: 0 };
    rooms.set(code, room);
    return joinRoom(ws, room);
  }

  if (msg.type === 'join_room') {
    const code = String(msg.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
    const room = rooms.get(code);
    if (!room) return error(ws, 'Không tìm thấy phòng này.');
    return joinRoom(ws, room);
  }

  if (msg.type === 'leave_room') return leaveRoom(ws, true);

  if (msg.type === 'pose') {
    if (!session.roomCode) return;
    const room = rooms.get(session.roomCode);
    const player = room?.players.get(session.playerId);
    if (!room || !player || player.ws !== ws) return;
    const now = Date.now();
    updateRespawns(room, now);
    if (player.health <= 0 || player.respawnUntil > now) return;
    const dt = player.lastPoseAt ? (now - player.lastPoseAt) / 1000 : 0;
    if (player.lastPoseAt && now - player.lastPoseAt < 20) return;
    const pose = normalizePose(msg.pose, player.pose, dt);
    if (!pose) return;
    const continuingAim =
      Boolean(player.pose?.aiming) &&
      player.pose?.weapon === pose.weapon &&
      pose.aiming;
    if (pose.aiming) {
      if (!continuingAim) player.aimStartedAt = now;
    } else {
      player.aimStartedAt = 0;
    }
    player.pose = pose;
    player.lastPoseAt = now;
    return;
  }

  if (msg.type === 'shot') {
    if (!session.roomCode) return;
    const room = rooms.get(session.roomCode);
    const player = room?.players.get(session.playerId);
    if (!room || !player || player.ws !== ws) return;
    return handleShot(ws, room, player, msg);
  }

  if (msg.type === 'ping') {
    const clientTime = Number(msg.clientTime);
    return send(ws, { type: 'pong', clientTime: Number.isFinite(clientTime) ? clientTime : 0, serverTime: Date.now() });
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, sockets: sockets.size, uptime: Math.round(process.uptime()) }));
    return;
  }

  if (url.pathname === '/rooms') {
    const publicRooms = [...rooms.values()]
      .filter((room) => room.players.size < MAX_PLAYERS)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((room) => ({
        code: room.code,
        name: room.name,
        mapId: room.mapId,
        players: room.players.size,
        maxPlayers: MAX_PLAYERS,
        createdAt: room.createdAt,
      }));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ rooms: publicRooms }));
    return;
  }

  if (!fs.existsSync(dist)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('DRAX FPS build not found. Run `npm run build` first.');
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const requested = path.resolve(dist, `.${pathname}`);
  const safePath = requested.startsWith(dist) ? requested : path.join(dist, 'index.html');
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile() ? safePath : path.join(dist, 'index.html');
  try {
    const body = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': mime[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 16_384 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  sockets.add(ws);
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => {
    detachRoom(ws);
    sockets.delete(ws);
  });
  ws.on('error', () => {});
});

const snapshotTimer = setInterval(() => {
  for (const room of rooms.values()) broadcastRoomState(room);
}, 50);

const cleanupTimer = setInterval(() => cleanupDisconnectedPlayers(), 1000);

const heartbeatTimer = setInterval(() => {
  for (const ws of sockets) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 15_000);

server.listen(port, host, () => {
  console.log(`\nDRAX FPS self-host server running on port ${port}`);
  console.log(`Local: http://127.0.0.1:${port}`);
  for (const values of Object.values(os.networkInterfaces())) {
    for (const info of values || []) {
      if (info.family === 'IPv4' && !info.internal)
        console.log(`LAN:   http://${info.address}:${port}`);
    }
  }
  console.log('Friends on the same LAN can open the LAN address above.\n');
});

const shutdown = () => {
  clearInterval(snapshotTimer);
  clearInterval(cleanupTimer);
  clearInterval(heartbeatTimer);
  for (const ws of sockets) ws.close(1001, 'server shutdown');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
