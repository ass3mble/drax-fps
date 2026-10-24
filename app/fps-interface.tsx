'use client';

import {
  ArrowRight,
  Crosshair,
  Languages,
  Maximize,
  Minimize,
  RotateCcw,
  Settings2,
  Shield,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Snapshot } from './game/engine';
import type { GraphicsQuality } from './game/quality';
import { WEAPONS, WEAPON_ORDER, type WeaponId } from './game/weapons';
import {
  LOCKGATE_LAYOUT,
  MAPS,
  MAP_RADAR_RECTS,
  PLAYABLE_MAP_IDS,
  worldSizeToRadar,
  worldToRadar,
  type MapId,
} from './game/maps';
import {
  loadoutText,
  localizeNotice,
  localizeObjective,
  t,
  type Language,
} from './game/i18n';
import type { MultiplayerSnapshot, NetworkRoomSummary } from './multiplayer/client';

export type FpsInterfaceProps = {
  state: Snapshot;
  mapId: MapId;
  ready: boolean;
  error: string;
  language: Language;
  settings: boolean;
  muted: boolean;
  sensitivity: number;
  quality: GraphicsQuality;
  cinematic: boolean;
  fullscreen: boolean;
  hudScale: number;
  hudOpacity: number;
  minimalHud: boolean;
  weaponPeek: boolean;
  multiplayer: MultiplayerSnapshot;
  nickname: string;
  roomName: string;
  joinCode: string;
  rooms: NetworkRoomSummary[];
  onNickname: (value: string) => void;
  onRoomName: (value: string) => void;
  onJoinCode: (value: string) => void;
  onHostRoom: () => void;
  onJoinRoom: () => void;
  onJoinRoomCode: (code: string) => void;
  onLeaveRoom: () => void;
  onStart: () => void;
  onMap: (id: MapId) => void;
  onWeapon: (id: WeaponId) => void;
  onSettings: (value: boolean) => void;
  onMuted: (value: boolean) => void;
  onSensitivity: (value: number) => void;
  onQuality: (value: GraphicsQuality) => void;
  onCinematic: (value: boolean) => void;
  onFullscreen: () => void;
  onLanguage: (value: Language) => void;
  onHudScale: (value: number) => void;
  onHudOpacity: (value: number) => void;
  onMinimalHud: (value: boolean) => void;
  onRestart: () => void;
};

const formatClock = (seconds: number) => {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

const zoneLabels = (language: Language) => language === 'vi'
  ? { head: 'ĐẦU', chest: 'NGỰC', stomach: 'BỤNG', arm: 'TAY', leg: 'CHÂN', foot: 'BÀN CHÂN' }
  : { head: 'HEAD', chest: 'CHEST', stomach: 'STOMACH', arm: 'ARM', leg: 'LEG', foot: 'FOOT' };

export function FpsInterface(props: FpsInterfaceProps) {
  const { state, settings } = props;
  const active = state.mode === 'playing';

  return <div className="drax-ui">
    {active && <CombatHud {...props} />}
    {(state.scoreboardOpen || state.mode === 'complete') && <ScoreboardScreen {...props} />}
    {!active && state.mode !== 'complete' && <div className="drax-screen-shade" />}
    {!active && state.mode === 'menu' && !settings && <DeploymentScreen {...props} />}
    {state.mode === 'paused' && !settings && <PauseScreen {...props} />}
    {settings && <SettingsScreen {...props} />}
  </div>;
}

function MatchBar({ state, language }: Pick<FpsInterfaceProps, 'state' | 'language'>) {
  const plant = state.gameMode === 'plant-defuse';
  const phase = state.roundPhase === 'bomb-planted'
    ? (language === 'vi' ? 'THIẾT BỊ ĐÃ ĐẶT' : 'DEVICE PLANTED')
    : state.roundPhase === 'prep'
      ? (language === 'vi' ? 'CHUẨN BỊ' : 'PREP')
      : plant
        ? (language === 'vi' ? 'ĐANG ĐẤU' : 'LIVE')
        : (language === 'vi' ? 'ĐỐI KHÁNG' : 'TEAM DEATHMATCH');
  const clock = plant
    ? state.roundPhase === 'prep'
      ? `R${state.roundNumber}`
      : formatClock(state.roundPhase === 'bomb-planted' ? state.bombTimeRemaining : state.roundTimeRemaining)
    : `${state.kills}/${state.deaths}`;

  return <div className="drax-matchbar">
    <div className="drax-team drax-team-viper"><span>VIPER</span><b>{state.viperScore}</b></div>
    <div className="drax-match-center"><small>{phase}</small><strong>{clock}</strong></div>
    <div className="drax-team drax-team-raven"><b>{state.ravenScore}</b><span>RAVEN</span></div>
  </div>;
}

function Radar({ state, mapId, language }: Pick<FpsInterfaceProps, 'state' | 'mapId' | 'language'>) {
  const radarPoint = (x: number, z: number) => worldToRadar(x, z);
  const radarSize = (w: number, d: number) => worldSizeToRadar(w, d);
  const radarX = (x: number) => radarPoint(x, 0).x;
  const radarY = (z: number) => radarPoint(0, z).y;

  return <div className="drax-radar">
    <div className="drax-radar-head"><span>{MAPS[mapId].name}</span><b>N ↑</b></div>
    <svg viewBox="0 0 160 180" aria-label={t(language, 'arenaRadar')}>
      <rect x="6" y="5" width="148" height="170" className="drax-radar-field" />
      <path d="M28 22h104M28 90h104M28 158h104M52 16v148M80 16v148M108 16v148" className="drax-radar-grid" />
      {MAP_RADAR_RECTS[mapId].map((c, i) => {
        const origin = radarPoint(c.x - c.w / 2, c.z - c.d / 2);
        const size = radarSize(c.w, c.d);
        return <rect key={i} x={origin.x} y={origin.y} width={size.w} height={size.h} className="drax-radar-cover" />;
      })}
      {mapId === 'lockgate' && LOCKGATE_LAYOUT.callouts.map((callout) => {
        const p = radarPoint(callout.x, callout.z);
        return <text key={callout.id} x={p.x} y={p.y} textAnchor="middle" className="drax-radar-label">{callout[language]}</text>;
      })}
      {state.teammates.map((p, i) => <circle key={`t-${i}`} cx={radarX(p.x)} cy={radarY(p.z)} r="2.6" className="drax-dot-viper" />)}
      {state.enemies.map((p, i) => <circle key={`e-${i}`} cx={radarX(p.x)} cy={radarY(p.z)} r="2.5" className="drax-dot-raven" />)}
      <g transform={`translate(${radarX(state.player.x)} ${radarY(state.player.z)}) rotate(${state.heading})`}>
        <path d="M0 -7L4.5 5L0 3L-4.5 5Z" className="drax-radar-player" />
      </g>
    </svg>
  </div>;
}

function CombatHud(props: FpsInterfaceProps) {
  const { state, mapId, language, weaponPeek, minimalHud, multiplayer } = props;
  const hitLabels = zoneLabels(language);
  const plant = state.gameMode === 'plant-defuse';
  const side = state.playerSide === 'attackers'
    ? (language === 'vi' ? 'TẤN CÔNG' : 'ATTACK')
    : (language === 'vi' ? 'PHÒNG THỦ' : 'DEFEND');
  const objective = plant
    ? `${side} · ${language === 'vi' ? 'HIỆP' : 'ROUND'} ${state.roundNumber}`
    : localizeObjective(state.objective, language);

  return <div className={`drax-hud ${minimalHud ? 'drax-hud-minimal' : ''}`}>
    <div className="drax-damage" style={{ opacity: Math.min(.64, state.damage * .5 + (state.health < 35 ? .14 : 0)) }} />
    <MatchBar state={state} language={language} />
    {!minimalHud && <Radar state={state} mapId={mapId} language={language} />}
    {!minimalHud && <div className="drax-objective-strip"><Crosshair size={12} /><span>{objective}</span>{plant && <b>{state.aliveAttackers} : {state.aliveDefenders}</b>}</div>}
    {!minimalHud && <div className="drax-heading">{String(Math.round(state.heading)).padStart(3, '0')}°</div>}
    {!state.aiming && <div className={`drax-reticle drax-reticle-hip ${state.hit ? `drax-hit-${state.hitKind}` : ''}`} aria-hidden="true"><i /><i /><i /><i /><b /></div>}
    {state.aiming && state.weapon === 'sentinel' && <div className="drax-scope" aria-hidden="true"><i /><i /><span /></div>}

    {state.hitReadout > 0 && <div className={`drax-hit-readout drax-hit-${state.hitKind}`}>{hitLabels[state.hitZone]} <b>−{state.hitDamage}</b></div>}
    {state.notice && <div className="drax-notice">{localizeNotice(state.notice, language)}</div>}
    {state.killFx > 0 && <div className="drax-kill"><span>{language === 'vi' ? 'HẠ MỤC TIÊU' : 'ELIMINATION'}</span><b>{state.lastVictim}</b>{state.killStreak > 1 && <small>×{state.killStreak}</small>}</div>}

    <div className="drax-vitals">
      <div className="drax-health-icon"><Shield size={15} /></div>
      <strong>{Math.ceil(state.health)}</strong>
      <div className="drax-health-meter"><i style={{ width: `${state.health}%` }} /></div>
      <span>{state.crouching ? (language === 'vi' ? 'NGỒI' : 'CROUCHED') : 'VIPER 01'}</span>
    </div>

    <div className="drax-ammo">
      <div className="drax-weapon-name"><span>{state.weaponName}</span><small>{state.weaponRole}</small></div>
      <div className="drax-rounds"><strong className={state.ammo <= Math.max(3, WEAPONS[state.weapon].magSize * .22) ? 'drax-low' : ''}>{String(state.ammo).padStart(2, '0')}</strong><span>/ {String(state.reserve).padStart(3, '0')}</span></div>
      <div className="drax-equipment">◇ {state.grenades}</div>
    </div>

    <div className="drax-perf"><i className={state.fps < 50 ? 'drax-perf-bad' : ''} />{state.fps} FPS{multiplayer.status === 'room' && <span> · {multiplayer.roomCode} · {multiplayer.ping ?? '…'} ms</span>}</div>

    <div className={`drax-weapon-rail ${weaponPeek ? 'drax-weapon-rail-show' : ''}`}>
      {WEAPON_ORDER.map((id, index) => <div key={id} className={state.weapon === id ? 'drax-current' : ''}><kbd>{index + 1}</kbd><span>{WEAPONS[id].shortName}</span></div>)}
    </div>

    {plant && state.interactionType && <div className="drax-interaction">
      <div><kbd>F</kbd><span>{state.interactionType === 'plant' ? (language === 'vi' ? 'ĐẶT THIẾT BỊ' : 'PLANT DEVICE') : state.interactionType === 'defuse' ? (language === 'vi' ? 'GỠ THIẾT BỊ' : 'DEFUSE DEVICE') : (language === 'vi' ? 'NHẶT THIẾT BỊ' : 'RECOVER DEVICE')}</span></div>
      <i><b style={{ width: `${Math.round(state.interactionProgress * 100)}%` }} /></i>
    </div>}

    {state.respawn > 0 && <div className="drax-respawn"><span>{language === 'vi' ? 'HỒI SINH' : 'REDEPLOY'}</span><b>{state.respawn.toFixed(1)}</b></div>}
  </div>;
}

function DeploymentScreen(props: FpsInterfaceProps) {
  const {
    state, mapId, ready, error, language, muted, fullscreen, multiplayer,
    nickname, roomName, joinCode, rooms, onMap, onWeapon, onStart, onMuted, onFullscreen,
    onLanguage, onSettings, onNickname, onRoomName, onJoinCode, onHostRoom, onJoinRoom,
    onJoinRoomCode, onLeaveRoom,
  } = props;
  const map = MAPS[mapId];
  const selected = loadoutText(language, state.weapon);

  return <section className="drax-deploy">
    <header className="drax-deploy-top">
      <div className="drax-brand"><b>D\</b><span>DRAX FPS<small>TACTICAL COMBAT</small></span></div>
      <div className="drax-utility">
        <button onClick={() => onLanguage(language === 'vi' ? 'en' : 'vi')} aria-label={t(language, 'language')}><Languages size={15} />{language === 'vi' ? 'EN' : 'VI'}</button>
        <button onClick={() => onMuted(!muted)} aria-label={muted ? t(language, 'enableSound') : t(language, 'muteSound')}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        <button onClick={() => onSettings(true)} aria-label={t(language, 'settings')}><Settings2 size={16} /></button>
        <button onClick={onFullscreen} aria-label={t(language, 'toggleFullscreen')}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>
      </div>
    </header>

    <div className="drax-deploy-copy">
      <span className="drax-mode-tag">4V4 / {map.supportedModes[0] === 'plant-defuse' ? 'PLANT · DEFUSE' : 'TEAM DEATHMATCH'}</span>
      <h1>{map.title[0]}<br /><em>{map.title[1]}</em></h1>
      <p>{map.name}<span>•</span>{selected.role}</p>
      <div className="drax-online">
        <div className="drax-online-head">
          <span><i className={`drax-online-dot drax-online-${multiplayer.status}`} />{language === 'vi' ? 'TRỰC TUYẾN' : 'ONLINE'}</span>
          <small>{multiplayer.status === 'room'
            ? `${multiplayer.roomName || 'DRAX ROOM'} · ${multiplayer.roomCode} · ${multiplayer.players.length}/8`
            : multiplayer.status === 'connecting'
              ? (language === 'vi' ? 'ĐANG KẾT NỐI...' : 'CONNECTING...')
              : (language === 'vi' ? 'PHÒNG CÔNG KHAI' : 'PUBLIC ROOMS')}</small>
        </div>
        <div className="drax-online-controls">
          <input className="drax-nickname-input" value={nickname} onChange={(event) => onNickname(event.target.value)} placeholder={language === 'vi' ? 'TÊN NGƯỜI CHƠI' : 'NICKNAME'} maxLength={18} disabled={multiplayer.status === 'room'} />
          {multiplayer.status === 'room' ? <>
            <strong className="drax-current-room"><span>{multiplayer.roomName || 'DRAX ROOM'}</span><small>{multiplayer.roomCode}</small></strong>
            <button onClick={onLeaveRoom}>{language === 'vi' ? 'RỜI PHÒNG' : 'LEAVE'}</button>
          </> : <>
            <input className="drax-room-name-input" value={roomName} onChange={(event) => onRoomName(event.target.value)} placeholder={language === 'vi' ? 'TÊN PHÒNG' : 'ROOM NAME'} maxLength={28} />
            <button onClick={onHostRoom} disabled={multiplayer.status === 'connecting'}>{language === 'vi' ? 'TẠO PHÒNG' : 'CREATE'}</button>
          </>}
        </div>
        {multiplayer.status !== 'room' && <>
          <div className="drax-room-browser">
            <div className="drax-room-browser-head"><span>{language === 'vi' ? 'PHÒNG ĐANG MỞ' : 'OPEN ROOMS'}</span><small>{rooms.length}</small></div>
            <div className="drax-room-list">
              {rooms.length > 0 ? rooms.map((room) => <button key={room.code} className="drax-room-card" onClick={() => onJoinRoomCode(room.code)} disabled={multiplayer.status === 'connecting'}>
                <span><b>{room.name}</b><small>{MAPS[room.mapId].name} · {room.code}</small></span>
                <strong>{room.players}/{room.maxPlayers}</strong>
                <i>{language === 'vi' ? 'VÀO' : 'JOIN'}</i>
              </button>) : <div className="drax-room-empty">{language === 'vi' ? 'Chưa có phòng nào. Hãy tạo phòng đầu tiên.' : 'No open rooms. Create the first one.'}</div>}
            </div>
          </div>
          <div className="drax-room-code-join">
            <input className="drax-room-input" value={joinCode} onChange={(event) => onJoinCode(event.target.value)} placeholder={language === 'vi' ? 'MÃ PHÒNG' : 'ROOM CODE'} maxLength={6} />
            <button onClick={onJoinRoom} disabled={multiplayer.status === 'connecting' || joinCode.length !== 6}>{language === 'vi' ? 'VÀO BẰNG MÃ' : 'JOIN CODE'}</button>
          </div>
        </>}
        {multiplayer.status === 'room' && <div className="drax-online-roster">
          {multiplayer.players.map((player) => <span key={player.id} className={`drax-roster-${player.team}`}>{player.nickname}{player.id === multiplayer.hostId ? ' ★' : ''}</span>)}
          <small>{multiplayer.ping == null ? 'PING …' : `${multiplayer.ping} ms`}</small>
        </div>}
        {multiplayer.error && <div className="drax-online-error">{multiplayer.error}</div>}
      </div>
    </div>

    <nav className="drax-map-rail" aria-label={language === 'vi' ? 'Chọn bản đồ' : 'Select map'}>
      <small>{language === 'vi' ? 'BẢN ĐỒ' : 'MAP'}</small>
      {PLAYABLE_MAP_IDS.map((id, index) => <button key={id} className={mapId === id ? 'drax-selected' : ''} onClick={() => onMap(id)} disabled={multiplayer.status === 'room'}><i>0{index + 1}</i><span>{MAPS[id].name}</span></button>)}
    </nav>

    <aside className="drax-loadout-panel">
      <div className="drax-loadout-head"><span>{language === 'vi' ? 'TRANG BỊ' : 'LOADOUT'}</span><small>{language === 'vi' ? 'CHỌN VŨ KHÍ CHÍNH' : 'SELECT PRIMARY'}</small></div>
      <div className="drax-loadout-list">
        {WEAPON_ORDER.map((id, index) => {
          const weapon = WEAPONS[id];
          const copy = loadoutText(language, id);
          return <button key={id} className={state.weapon === id ? 'drax-selected' : ''} onClick={() => onWeapon(id)}>
            <kbd>{index + 1}</kbd>
            <span><b>{weapon.shortName}</b><small>{copy.role}</small></span>
            <i><strong>{weapon.damage}</strong><small>DMG</small></i>
            <i><strong>{Math.round(60 / weapon.fireInterval)}</strong><small>RPM</small></i>
          </button>;
        })}
      </div>
      <div className="drax-selected-weapon"><span>{state.weaponName}</span><small>{language === 'vi' ? 'NGẮM' : 'ADS'} {Math.round(WEAPONS[state.weapon].adsTime * 1000)} ms · {language === 'vi' ? 'NẠP' : 'RELOAD'} {WEAPONS[state.weapon].reloadTime}s</small></div>
    </aside>

    <button className="drax-deploy-cta" onClick={onStart} disabled={!ready || !!error}><span>{ready ? (language === 'vi' ? 'TRIỂN KHAI' : 'DEPLOY') : (language === 'vi' ? 'ĐANG KHỞI TẠO' : 'INITIALIZING')}</span><ArrowRight size={22} /></button>
    {error && <div className="drax-error">{error}</div>}

    <footer className="drax-deploy-footer"><span><kbd>WASD</kbd>{language === 'vi' ? 'DI CHUYỂN' : 'MOVE'}</span><span><kbd>RMB</kbd>{language === 'vi' ? 'NGẮM' : 'ADS'}</span><span><kbd>Q / E</kbd>{language === 'vi' ? 'NGHIÊNG' : 'LEAN'}</span><span><kbd>TAB</kbd>{language === 'vi' ? 'BẢNG ĐIỂM' : 'SCORE'}</span></footer>
  </section>;
}

function PauseScreen(props: FpsInterfaceProps) {
  const { state, mapId, language, onStart, onSettings, onRestart } = props;
  return <section className="drax-pause">
    <span>{language === 'vi' ? 'TRẬN ĐẤU TẠM DỪNG' : 'MATCH PAUSED'}</span>
    <h2>{MAPS[mapId].name}</h2>
    <small>{state.weaponName} · {state.kills}/{state.deaths}</small>
    <nav>
      <button className="drax-primary" onClick={onStart}><ArrowRight size={18} />{language === 'vi' ? 'TIẾP TỤC' : 'RESUME'}</button>
      <button onClick={() => onSettings(true)}><Settings2 size={17} />{language === 'vi' ? 'CÀI ĐẶT' : 'SETTINGS'}</button>
      <button onClick={onRestart}><RotateCcw size={17} />{language === 'vi' ? 'CHƠI LẠI' : 'RESTART'}</button>
    </nav>
    <p><kbd>ESC</kbd>{language === 'vi' ? 'tiếp tục' : 'resume'}</p>
  </section>;
}

function SettingsScreen(props: FpsInterfaceProps) {
  const { language, sensitivity, hudScale, hudOpacity, minimalHud, muted, quality, cinematic, onSettings, onSensitivity, onHudScale, onHudOpacity, onMinimalHud, onMuted, onQuality, onCinematic, onLanguage } = props;
  return <section className="drax-settings">
    <header><div><span>DRAX FPS / CONFIG</span><h2>{language === 'vi' ? 'CÀI ĐẶT' : 'SETTINGS'}</h2></div><button onClick={() => onSettings(false)} aria-label="Close"><X size={20} /></button></header>
    <div className="drax-settings-body">
      <div className="drax-setting-group">
        <h3>{language === 'vi' ? 'ĐIỀU KHIỂN' : 'CONTROLS'}</h3>
        <SettingSlider label={language === 'vi' ? 'Độ nhạy chuột' : 'Look sensitivity'} value={sensitivity} display={sensitivity.toFixed(1)} min={.3} max={2.5} step={.1} onChange={onSensitivity} />
      </div>
      <div className="drax-setting-group">
        <h3>HUD</h3>
        <SettingSlider label={language === 'vi' ? 'Kích thước' : 'Scale'} value={hudScale} display={`${Math.round(hudScale * 100)}%`} min={.8} max={1.1} step={.05} onChange={onHudScale} />
        <SettingSlider label={language === 'vi' ? 'Độ hiển thị' : 'Opacity'} value={hudOpacity} display={`${Math.round(hudOpacity * 100)}%`} min={.65} max={1} step={.05} onChange={onHudOpacity} />
        <SettingToggle label={language === 'vi' ? 'HUD tối giản' : 'Minimal HUD'} hint={language === 'vi' ? 'Chỉ giữ dữ liệu chiến đấu thiết yếu' : 'Keep only essential combat data'} checked={minimalHud} onChange={onMinimalHud} />
      </div>
      <div className="drax-setting-group">
        <h3>{language === 'vi' ? 'HỆ THỐNG' : 'SYSTEM'}</h3>
        <div className="drax-setting-row"><label>{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</label><select value={language} onChange={e => onLanguage(e.target.value as Language)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
        <div className="drax-setting-row"><label>{language === 'vi' ? 'Chất lượng đồ họa' : 'Graphics quality'}</label><select value={quality} onChange={e => onQuality(e.target.value as GraphicsQuality)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select></div>
        <SettingToggle label={language === 'vi' ? 'Âm thanh' : 'Audio'} checked={!muted} onChange={v => onMuted(!v)} />
        <SettingToggle label={language === 'vi' ? 'Hiệu ứng điện ảnh' : 'Cinematic effects'} hint={language === 'vi' ? 'Bloom và xử lý hậu kỳ' : 'Bloom and post-processing'} checked={cinematic} onChange={onCinematic} />
      </div>
    </div>
    <button className="drax-settings-done" onClick={() => onSettings(false)}>{language === 'vi' ? 'ÁP DỤNG & QUAY LẠI' : 'APPLY & RETURN'}<ArrowRight size={18} /></button>
  </section>;
}

function SettingSlider({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <div className="drax-setting-slider"><div><label>{label}</label><b>{display}</b></div><Slider min={min} max={max} step={step} value={[value]} onValueChange={v => onChange(Array.isArray(v) ? v[0] : v)} /></div>;
}

function SettingToggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="drax-setting-row"><label>{label}{hint && <small>{hint}</small>}</label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function ScoreboardScreen(props: FpsInterfaceProps) {
  const { state, mapId, language, onStart } = props;
  const viper = state.scoreboard.filter(r => r.team === 'viper');
  const raven = state.scoreboard.filter(r => r.team === 'raven');
  return <div className="drax-scoreboard-backdrop"><section className="drax-scoreboard">
    <header><div><span>{MAPS[mapId].name}</span><h2>{state.gameMode === 'plant-defuse' ? 'PLANT / DEFUSE' : 'TEAM DEATHMATCH'}</h2></div><div><b>{state.viperScore}</b><i>:</i><b>{state.ravenScore}</b></div></header>
    <div className="drax-score-tables"><ScoreTeam name="VIPER" rows={viper} plant={state.gameMode === 'plant-defuse'} /><ScoreTeam name="RAVEN" rows={raven} plant={state.gameMode === 'plant-defuse'} /></div>
    {state.mode === 'complete' && <button className="drax-score-next" onClick={onStart}>{language === 'vi' ? 'TRẬN MỚI' : 'NEW MATCH'}<ArrowRight size={18} /></button>}
  </section></div>;
}

function ScoreTeam({ name, rows, plant }: { name: string; rows: Snapshot['scoreboard']; plant: boolean }) {
  return <div className={`drax-score-team drax-score-${name.toLowerCase()}`}>
    <div className="drax-score-team-head"><b>{name}</b><span>{plant ? 'K  D  P  DF' : 'K  D'}</span></div>
    {rows.map(row => <div className={`drax-score-row ${row.player ? 'drax-player-row' : ''}`} key={row.id}><i className={row.alive ? 'drax-alive' : ''} /><strong>{row.name}</strong><span>{row.kills}</span><span>{row.deaths}</span>{plant && <><span>{row.plants}</span><span>{row.defuses}</span></>}</div>)}
  </div>;
}
