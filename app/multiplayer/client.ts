import type { MapId } from '../game/maps';
import type { WeaponId } from '../game/weapons';

export type NetworkTeam = 'viper' | 'raven';

export type NetworkPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  crouching: boolean;
  aiming: boolean;
  firing: boolean;
  weapon: WeaponId;
};

export type NetworkPlayer = {
  id: string;
  nickname: string;
  team: NetworkTeam;
  active: boolean;
  pose: NetworkPose | null;
  health: number;
  kills: number;
  deaths: number;
  alive: boolean;
  respawn: number;
};

export type NetworkShot = {
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  seq: number;
};

export type NetworkShotResult = {
  seq: number;
  hit: boolean;
  damage: number;
  zone: 'head' | 'chest';
  kill: boolean;
  victimId: string;
  victim: string;
  tracerEnd: { x: number; y: number; z: number };
};

export type MultiplayerConnectionStatus = 'offline' | 'connecting' | 'online' | 'room';

export type NetworkRoomSummary = {
  code: string;
  name: string;
  mapId: MapId;
  players: number;
  maxPlayers: number;
  createdAt: number;
};

export type MultiplayerSnapshot = {
  status: MultiplayerConnectionStatus;
  playerId: string;
  nickname: string;
  roomCode: string;
  roomName: string;
  roomMap: MapId | null;
  hostId: string;
  players: NetworkPlayer[];
  viperScore: number;
  ravenScore: number;
  scoreLimit: number;
  shotResult: NetworkShotResult | null;
  shotResultSerial: number;
  ping: number | null;
  error: string;
};

const EMPTY: MultiplayerSnapshot = {
  status: 'offline',
  playerId: '',
  nickname: '',
  roomCode: '',
  roomName: '',
  roomMap: null,
  hostId: '',
  players: [],
  viperScore: 0,
  ravenScore: 0,
  scoreLimit: 25,
  shotResult: null,
  shotResultSerial: 0,
  ping: null,
  error: '',
};

const DEVICE_KEY = 'drax-fps-device-id';
const PROFILE_KEY = 'drax-fps-nickname';

export const getDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_KEY)?.trim();
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
};

export const getSavedNickname = () =>
  localStorage.getItem(PROFILE_KEY)?.trim().slice(0, 18) || '';

export const saveNickname = (nickname: string) => {
  const value = nickname.trim().replace(/\s+/g, ' ').slice(0, 18);
  if (value) localStorage.setItem(PROFILE_KEY, value);
  return value;
};

const websocketUrl = () => {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (import.meta.env.DEV) return `${scheme}//${location.hostname}:8787/ws`;
  return `${scheme}//${location.host}/ws`;
};

type ServerMessage =
  | { type: 'hello_ok'; playerId: string; nickname: string }
  | { type: 'room_joined'; roomCode: string; roomName: string; mapId: MapId; hostId: string }
  | { type: 'room_state'; roomCode: string; roomName: string; mapId: MapId; hostId: string; players: NetworkPlayer[]; serverTime: number; viperScore: number; ravenScore: number; scoreLimit: number }
  | ({ type: 'shot_result' } & NetworkShotResult)
  | { type: 'room_left' }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'error'; message: string };

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private snapshot: MultiplayerSnapshot = { ...EMPTY };
  private onSnapshot: (snapshot: MultiplayerSnapshot) => void;
  private pendingOpen: Promise<void> | null = null;
  private pingTimer = 0;
  private reconnectTimer = 0;
  private reconnectAttempt = 0;
  private desiredRoomCode = '';
  private resumeAfterHello = false;
  private lastNickname = '';
  private destroyed = false;

  constructor(onSnapshot: (snapshot: MultiplayerSnapshot) => void) {
    this.onSnapshot = onSnapshot;
  }

  get state() {
    return this.snapshot;
  }

  private publish(patch: Partial<MultiplayerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.onSnapshot(this.snapshot);
  }

  async connect(nickname: string, resume = false) {
    const cleanName = saveNickname(nickname);
    if (!cleanName) throw new Error('Hãy nhập nickname trước.');
    this.lastNickname = cleanName;
    if (resume) this.resumeAfterHello = Boolean(this.desiredRoomCode);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'profile', nickname: cleanName });
      this.publish({ nickname: cleanName, error: '' });
      return;
    }
    if (this.pendingOpen) return this.pendingOpen;

    this.destroyed = false;
    this.publish({ status: this.snapshot.roomCode ? 'room' : 'connecting', nickname: cleanName, error: resume ? 'Đang kết nối lại tới host…' : '' });
    this.pendingOpen = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(websocketUrl());
      this.ws = ws;
      const timeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error('Không kết nối được DRAX self-host server.'));
        }
      }, 4500);

      ws.addEventListener('open', () => {
        window.clearTimeout(timeout);
        if (this.ws !== ws) return;
        this.send({ type: 'hello', version: 1, deviceId: getDeviceId(), nickname: cleanName });
        this.startPing();
        resolve();
      });
      ws.addEventListener('message', (event) => {
        if (this.ws === ws) this.handleMessage(event.data);
      });
      ws.addEventListener('error', () => {
        if (ws.readyState !== WebSocket.OPEN)
          reject(new Error('WebSocket server chưa sẵn sàng.'));
      });
      ws.addEventListener('close', () => {
        window.clearTimeout(timeout);
        if (this.ws !== ws) return;
        this.stopPing();
        this.ws = null;
        this.pendingOpen = null;
        if (this.destroyed) return;
        const roomCode = this.snapshot.roomCode || this.desiredRoomCode;
        if (roomCode) this.desiredRoomCode = roomCode;
        this.resumeAfterHello = Boolean(this.desiredRoomCode);
        this.publish({
          status: roomCode ? 'room' : 'connecting',
          ping: null,
          error: 'Mất kết nối tới host. Đang thử kết nối lại…',
        });
        this.scheduleReconnect();
      });
    }).finally(() => {
      this.pendingOpen = null;
    });
    return this.pendingOpen;
  }

  async createRoom(nickname: string, roomName: string, mapId: MapId) {
    this.desiredRoomCode = '';
    this.resumeAfterHello = false;
    await this.connect(nickname);
    this.send({ type: 'create_room', roomName: roomName.trim().replace(/\s+/g, ' ').slice(0, 28), mapId });
  }

  async joinRoom(nickname: string, roomCode: string) {
    const code = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!code) throw new Error('Nhập mã phòng trước.');
    this.desiredRoomCode = code;
    this.resumeAfterHello = false;
    await this.connect(nickname);
    this.send({ type: 'join_room', roomCode: code });
  }

  leaveRoom() {
    this.desiredRoomCode = '';
    this.resumeAfterHello = false;
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ type: 'leave_room' });
    this.publish({ status: this.ws?.readyState === WebSocket.OPEN ? 'online' : 'offline', roomCode: '', roomName: '', roomMap: null, hostId: '', players: [], viperScore: 0, ravenScore: 0, shotResult: null, error: '' });
  }

  sendPose(pose: NetworkPose) {
    if (this.snapshot.status !== 'room') return;
    this.send({ type: 'pose', pose });
  }

  sendShot(shot: NetworkShot) {
    if (this.snapshot.status !== 'room') return;
    this.send({
      type: 'shot',
      origin: shot.origin,
      direction: shot.direction,
      seq: shot.seq,
    });
  }

  disconnect() {
    this.destroyed = true;
    this.stopPing();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = 0;
    this.reconnectAttempt = 0;
    this.desiredRoomCode = '';
    this.resumeAfterHello = false;
    this.ws?.close(1000, 'client shutdown');
    this.ws = null;
    this.pendingOpen = null;
    this.snapshot = { ...EMPTY, nickname: this.snapshot.nickname };
  }

  private handleMessage(raw: unknown) {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(raw)) as ServerMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

    switch (msg.type) {
      case 'hello_ok': {
        this.reconnectAttempt = 0;
        this.publish({ status: this.snapshot.roomCode ? 'room' : 'online', playerId: msg.playerId, nickname: msg.nickname, error: '' });
        if (this.resumeAfterHello && this.desiredRoomCode) {
          const roomCode = this.desiredRoomCode;
          this.resumeAfterHello = false;
          this.send({ type: 'join_room', roomCode });
        }
        break;
      }
      case 'room_joined':
        this.desiredRoomCode = msg.roomCode;
        this.resumeAfterHello = false;
        this.reconnectAttempt = 0;
        this.publish({ status: 'room', roomCode: msg.roomCode, roomName: String(msg.roomName || ''), roomMap: msg.mapId, hostId: msg.hostId, error: '' });
        break;
      case 'room_state':
        this.desiredRoomCode = msg.roomCode;
        this.publish({
          status: 'room',
          roomCode: msg.roomCode,
          roomName: String(msg.roomName || ''),
          roomMap: msg.mapId,
          hostId: msg.hostId,
          players: Array.isArray(msg.players) ? msg.players : [],
          viperScore: Number.isFinite(msg.viperScore) ? msg.viperScore : 0,
          ravenScore: Number.isFinite(msg.ravenScore) ? msg.ravenScore : 0,
          scoreLimit: Number.isFinite(msg.scoreLimit) ? msg.scoreLimit : 25,
          error: '',
        });
        break;
      case 'shot_result':
        this.publish({
          shotResult: {
            seq: Number.isFinite(msg.seq) ? msg.seq : 0,
            hit: Boolean(msg.hit),
            damage: Number.isFinite(msg.damage) ? msg.damage : 0,
            zone: msg.zone === 'head' ? 'head' : 'chest',
            kill: Boolean(msg.kill),
            victimId: String(msg.victimId || ''),
            victim: String(msg.victim || ''),
            tracerEnd: {
              x: Number(msg.tracerEnd?.x) || 0,
              y: Number(msg.tracerEnd?.y) || 0,
              z: Number(msg.tracerEnd?.z) || 0,
            },
          },
          shotResultSerial: this.snapshot.shotResultSerial + 1,
        });
        break;
      case 'room_left':
        this.desiredRoomCode = '';
        this.resumeAfterHello = false;
        this.publish({ status: 'online', roomCode: '', roomName: '', roomMap: null, hostId: '', players: [], viperScore: 0, ravenScore: 0, shotResult: null, error: '' });
        break;
      case 'pong':
        this.publish({ ping: Math.max(0, Math.round(performance.now() - msg.clientTime)) });
        break;
      case 'error': {
        const message = msg.message || 'Lỗi multiplayer.';
        if (this.desiredRoomCode && /không tìm thấy phòng/i.test(message)) {
          this.desiredRoomCode = '';
          this.resumeAfterHello = false;
          this.publish({ status: 'online', roomCode: '', roomName: '', roomMap: null, hostId: '', players: [], viperScore: 0, ravenScore: 0, error: message });
        } else {
          this.publish({ error: message });
        }
        break;
      }
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer || this.pendingOpen) return;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    const delay = Math.min(4000, 400 * 2 ** Math.min(this.reconnectAttempt, 4));
    this.reconnectAttempt++;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = 0;
      if (this.destroyed || !this.lastNickname) return;
      void this.connect(this.lastNickname, true).catch(() => {
        if (!this.destroyed) this.scheduleReconnect();
      });
    }, delay);
  }

  private send(payload: object) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN)
        this.send({ type: 'ping', clientTime: performance.now() });
    }, 2000);
  }

  private stopPing() {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = 0;
  }
}
