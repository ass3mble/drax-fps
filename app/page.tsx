'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Game, Snapshot } from './game/engine';
import type { GraphicsQuality } from './game/quality';
import { WEAPONS, type WeaponId } from './game/weapons';
import { PLAYABLE_MAP_IDS, type MapId } from './game/maps';
import { t, type Language } from './game/i18n';
import { FpsInterface } from './fps-interface';
import {
  MultiplayerClient,
  getSavedNickname,
  type MultiplayerSnapshot,
  type NetworkRoomSummary,
} from './multiplayer/client';

const initial: Snapshot = {
  mode: 'menu',
  health: 100,
  ammo: WEAPONS.ranger.magSize,
  reserve: WEAPONS.ranger.reserve,
  kills: 0,
  deaths: 0,
  total: 25,
  time: 0,
  heading: 0,
  hit: 0,
  hitKind: 'body',
  hitZone: 'chest',
  hitDamage: 0,
  hitReadout: 0,
  shotId: 0,
  damage: 0,
  reloading: false,
  reloadProgress: 0,
  reloadPhase: 'idle',
  killFx: 0,
  killStreak: 0,
  lastVictim: '',
  deathFx: 0,
  killer: '',
  objective: 'First team to 25 eliminations',
  fps: 60,
  enemies: [],
  teammates: [],
  player: { x: 0, z: 29 },
  aiming: false,
  extraction: 0,
  notice: '',
  team: 'viper',
  viperScore: 0,
  ravenScore: 0,
  scoreLimit: 25,
  respawn: 0,
  crouching: false,
  grenades: 2,
  weapon: 'ranger',
  weaponName: WEAPONS.ranger.name,
  weaponRole: WEAPONS.ranger.role,
  scoreboardOpen: false,
  scoreboard: [],
  winner: null,
  gameMode: 'team-deathmatch',
  roundPhase: null,
  roundNumber: 1,
  half: 1,
  overtimeSet: 0,
  playerSide: 'attackers',
  roundTimeRemaining: 0,
  bombTimeRemaining: 0,
  bombState: null,
  bombSite: null,
  bombPosition: null,
  aliveAttackers: 4,
  aliveDefenders: 4,
  roundWinner: null,
  roundWinnerReason: null,
  interactionType: null,
  interactionProgress: 0,
  playerPlants: 0,
  playerDefuses: 0,
  matchDraw: false,
};

const initialMultiplayer: MultiplayerSnapshot = {
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

const storedNumber = (key: string, fallback: number, min: number, max: number) => {
  const stored = localStorage.getItem(key);
  if (stored === null || stored.trim() === '') return fallback;
  const value = Number(stored);
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
};

export default function Home() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Game | null>(null);
  const multiplayerRef = useRef<MultiplayerClient | null>(null);
  const [state, setState] = useState(initial);
  const [multiplayer, setMultiplayer] = useState<MultiplayerSnapshot>(initialMultiplayer);
  const [nickname, setNickname] = useState(() => getSavedNickname() || `Drax${Math.floor(1000 + Math.random() * 9000)}`);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState<NetworkRoomSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [mapId, setMapId] = useState<MapId>(() => {
    const saved = localStorage.getItem('drax-fps-map') as MapId | null;
    return saved && (PLAYABLE_MAP_IDS as readonly MapId[]).includes(saved) ? saved : 'iron-divide';
  });
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [quality, setQuality] = useState<GraphicsQuality>('high');
  const [cinematic, setCinematic] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('drax-fps-language');
    return saved === 'vi' || saved === 'en' ? saved : 'vi';
  });
  const [hudScale, setHudScale] = useState(() => storedNumber('drax-fps-hud-scale', .92, .8, 1.1));
  const [hudOpacity, setHudOpacity] = useState(() => storedNumber('drax-fps-hud-opacity', .9, .65, 1));
  const [minimalHud, setMinimalHud] = useState(() => localStorage.getItem('drax-fps-hud-minimal') === '1');
  const [weaponPeek, setWeaponPeek] = useState(false);

  useEffect(() => {
    localStorage.setItem('drax-fps-language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('drax-fps-hud-scale', String(hudScale));
    localStorage.setItem('drax-fps-hud-opacity', String(hudOpacity));
    localStorage.setItem('drax-fps-hud-minimal', minimalHud ? '1' : '0');
  }, [hudScale, hudOpacity, minimalHud]);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setWeaponPeek(state.mode === 'playing'), 0);
    if (state.mode !== 'playing') return () => window.clearTimeout(showTimer);
    const hideTimer = window.setTimeout(() => setWeaponPeek(false), 1150);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [state.weapon, state.mode]);

  useEffect(() => {
    const client = new MultiplayerClient(setMultiplayer);
    multiplayerRef.current = client;
    const poseTimer = window.setInterval(() => {
      const game = engine.current;
      if (game && game.state.mode === 'playing' && client.state.status === 'room')
        client.sendPose(game.getNetworkPose());
    }, 50);
    return () => {
      window.clearInterval(poseTimer);
      client.disconnect();
      multiplayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const refreshRooms = async () => {
      try {
        const response = await fetch('/rooms', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { rooms?: NetworkRoomSummary[] };
        if (!disposed) setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      } catch {
        if (!disposed) setRooms([]);
      }
    };
    void refreshRooms();
    if (multiplayer.status === 'room') return () => { disposed = true; };
    const timer = window.setInterval(() => void refreshRooms(), 1800);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [multiplayer.status]);

  useEffect(() => {
    engine.current?.syncNetworkPlayers(
      multiplayer.status === 'room' ? multiplayer.players : [],
      multiplayer.playerId,
      {
        viperScore: multiplayer.viperScore,
        ravenScore: multiplayer.ravenScore,
        scoreLimit: multiplayer.scoreLimit,
      },
    );
  }, [
    multiplayer.status,
    multiplayer.players,
    multiplayer.playerId,
    multiplayer.viperScore,
    multiplayer.ravenScore,
    multiplayer.scoreLimit,
  ]);

  useEffect(() => {
    if (!multiplayer.shotResult || multiplayer.shotResultSerial <= 0) return;
    engine.current?.applyNetworkShotResult(multiplayer.shotResult);
  }, [multiplayer.shotResult, multiplayer.shotResultSerial]);

  useEffect(() => {
    if (
      multiplayer.status !== 'room' ||
      !multiplayer.roomMap ||
      multiplayer.roomMap === mapId
    ) return;
    const roomMap = multiplayer.roomMap;
    const timer = window.setTimeout(() => {
      setReady(false);
      setError('');
      setMapId(roomMap);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [multiplayer.status, multiplayer.roomMap, mapId]);

  useEffect(() => {
    let disposed = false;
    localStorage.setItem('drax-fps-map', mapId);
    void import('./game/engine').then(({ Game }) => {
      if (disposed || !host.current) return;
      try {
        const next = new Game(host.current, setState, mapId);
        next.setNetworkShotHandler((shot) => multiplayerRef.current?.sendShot(shot));
        engine.current = next;
        const room = multiplayerRef.current?.state;
        if (room?.status === 'room') {
          next.syncNetworkPlayers(room.players, room.playerId, {
            viperScore: room.viperScore,
            ravenScore: room.ravenScore,
            scoreLimit: room.scoreLimit,
          });
        }
        setReady(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to initialize graphics.');
      }
    });
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [mapId]);

  useEffect(() => {
    engine.current?.configure({ muted, sensitivity, cinematic, quality });
  }, [muted, sensitivity, cinematic, quality, ready]);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const chooseMap = (id: MapId) => {
    if (multiplayer.status === 'room' || id === mapId) return;
    setReady(false);
    setError('');
    setMapId(id);
  };
  const start = () => {
    setSettings(false);
    engine.current?.start();
  };
  const restart = () => {
    setSettings(false);
    engine.current?.restart();
  };
  const selectWeapon = (id: WeaponId) => engine.current?.selectWeapon(id);
  const toggleFull = () => document.fullscreenElement
    ? void document.exitFullscreen()
    : void document.documentElement.requestFullscreen().catch(() => {});
  const multiplayerFailure = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : 'Lỗi multiplayer.';
    setMultiplayer((current) => ({ ...current, error: message }));
  };
  const hostRoom = () => {
    const client = multiplayerRef.current;
    if (!client) return;
    void client.createRoom(nickname, roomName, mapId).catch(multiplayerFailure);
  };
  const joinRoomCode = (code: string) => {
    const client = multiplayerRef.current;
    if (!client) return;
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinCode(cleanCode);
    void client.joinRoom(nickname, cleanCode).catch(multiplayerFailure);
  };
  const joinRoom = () => joinRoomCode(joinCode);
  const leaveRoom = () => {
    multiplayerRef.current?.leaveRoom();
    engine.current?.syncNetworkPlayers([], '');
  };

  const hudStyle = {
    '--hud-scale': hudScale,
    '--hud-opacity': hudOpacity,
  } as CSSProperties;

  return <main
    className={`drax-root ${state.mode === 'playing' ? 'drax-playing' : ''} ${state.aiming ? 'drax-aiming' : ''} ${state.respawn > 0 ? 'drax-dead' : ''}`}
    style={hudStyle}
  >
    <div ref={host} className="scene drax-scene" aria-label={t(language, 'arenaLabel')} />
    <FpsInterface
      state={state}
      mapId={mapId}
      ready={ready}
      error={error}
      language={language}
      settings={settings}
      muted={muted}
      sensitivity={sensitivity}
      quality={quality}
      cinematic={cinematic}
      fullscreen={fullscreen}
      hudScale={hudScale}
      hudOpacity={hudOpacity}
      minimalHud={minimalHud}
      weaponPeek={weaponPeek}
      multiplayer={multiplayer}
      nickname={nickname}
      roomName={roomName}
      joinCode={joinCode}
      rooms={rooms}
      onNickname={setNickname}
      onRoomName={(value) => setRoomName(value.replace(/\s+/g, ' ').slice(0, 28))}
      onJoinCode={(value) => setJoinCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
      onHostRoom={hostRoom}
      onJoinRoom={joinRoom}
      onJoinRoomCode={joinRoomCode}
      onLeaveRoom={leaveRoom}
      onStart={start}
      onMap={chooseMap}
      onWeapon={selectWeapon}
      onSettings={setSettings}
      onMuted={setMuted}
      onSensitivity={setSensitivity}
      onQuality={setQuality}
      onCinematic={setCinematic}
      onFullscreen={toggleFull}
      onLanguage={setLanguage}
      onHudScale={setHudScale}
      onHudOpacity={setHudOpacity}
      onMinimalHud={setMinimalHud}
      onRestart={restart}
    />
  </main>;
}
