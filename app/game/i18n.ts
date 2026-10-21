import type { WeaponId } from './weapons';

export type Language = 'vi' | 'en';

const vi = {
  arenaProtocol: 'GIAO THỨC ĐẤU TRƯỜNG',
  teamDeathmatch: 'ĐỐI KHÁNG ĐỒNG ĐỘI',
  enableSound: 'Bật âm thanh',
  muteSound: 'Tắt âm thanh',
  displaySettings: 'Cài đặt hiển thị',
  toggleFullscreen: 'Bật / tắt toàn màn hình',
  arenaLabel: 'Đấu trường đối kháng 3D',
  matchObjective: 'MỤC TIÊU TRẬN ĐẤU',
  kd: 'HẠ/GỤC',
  firstTo: 'đội đầu tiên đạt',
  reloading: 'ĐANG NẠP LẠI',
  redeploy: 'HỒI SINH',
  safeSpawn: 'Đang chọn vị trí hồi sinh an toàn',
  crouched: 'ĐANG NGỒI',
  lowHealth: 'MÁU THẤP',
  combatReady: 'SẴN SÀNG CHIẾN ĐẤU',
  arenaRadar: 'Radar đấu trường',
  arena01: 'ĐẤU TRƯỜNG 01',
  crouch: 'NGỒI',
  pulseDevice: 'THIẾT BỊ XUNG',
  score: 'ĐIỂM',
  loadoutQuick: 'Chọn nhanh trang bị',
  holdTab: 'Giữ',
  duringMatch: 'trong trận',
  eliminations: 'hạ gục',
  deaths: 'bị hạ',
  matchComplete: 'TRẬN ĐẤU KẾT THÚC',
  matchPaused: 'TRẬN ĐẤU TẠM DỪNG',
  mode4v4: '4V4 · ĐỐI KHÁNG ĐỒNG ĐỘI',
  wins: 'CHIẾN THẮNG.',
  finalScore: 'Tỷ số chung cuộc',
  automatic: 'TỰ ĐỘNG',
  semiAuto: 'BÁN TỰ ĐỘNG',
  capacity: 'SỨC CHỨA',
  resumeMatch: 'TIẾP TỤC TRẬN',
  newMatch: 'TRẬN MỚI',
  enterArena: 'VÀO ĐẤU TRƯỜNG',
  initializing: 'ĐANG KHỞI TẠO',
  restartMatch: 'CHƠI LẠI TỪ ĐẦU',
  graphicsCouldNotStart: 'Không thể khởi động đồ họa.',
  matchRules: 'LUẬT TRẬN',
  kills25: '25 ĐIỂM',
  respawn3: 'HỒI SINH 3 GIÂY',
  ready: 'SẴN SÀNG',
  operatorPreferences: 'TÙY CHỈNH NGƯỜI CHƠI',
  settings: 'CÀI ĐẶT',
  closeSettings: 'Đóng cài đặt',
  lookSensitivity: 'Độ nhạy chuột',
  graphicsQuality: 'Chất lượng đồ họa',
  graphicsHelp: 'Độ phân giải, bóng đổ và chi tiết cảnh',
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  ultra: 'Cực cao',
  audioEnabled: 'Bật âm thanh',
  cinematicEffects: 'Hiệu ứng điện ảnh',
  cinematicHelp: 'Bloom, hạt phim và xử lý hình ảnh',
  language: 'Ngôn ngữ',
  vietnamese: 'Tiếng Việt',
  english: 'English',
  applyReturn: 'ÁP DỤNG & QUAY LẠI',
  move: 'DI CHUYỂN',
  lookFire: 'NHÌN / BẮN',
  lean: 'NGHIÊNG NGƯỜI',
  loadout: 'TRANG BỊ',
  scoreboard: 'BẢNG ĐIỂM',
  objective25: 'Đội đầu tiên đạt 25 điểm',
} as const;

const en: Record<keyof typeof vi, string> = {
  arenaProtocol: 'ARENA PROTOCOL',
  teamDeathmatch: 'TEAM DEATHMATCH',
  enableSound: 'Enable sound',
  muteSound: 'Mute sound',
  displaySettings: 'Display settings',
  toggleFullscreen: 'Toggle full screen',
  arenaLabel: 'Three-dimensional competitive arena',
  matchObjective: 'MATCH OBJECTIVE',
  kd: 'K/D',
  firstTo: 'first team to',
  reloading: 'RELOADING',
  redeploy: 'REDEPLOY',
  safeSpawn: 'Safe spawn selection active',
  crouched: 'CROUCHED',
  lowHealth: 'LOW HEALTH',
  combatReady: 'COMBAT READY',
  arenaRadar: 'Arena radar',
  arena01: 'ARENA 01',
  crouch: 'CROUCH',
  pulseDevice: 'PULSE DEVICE',
  score: 'SCORE',
  loadoutQuick: 'Loadout quick select',
  holdTab: 'Hold',
  duringMatch: 'during the match',
  eliminations: 'eliminations',
  deaths: 'deaths',
  matchComplete: 'MATCH COMPLETE',
  matchPaused: 'MATCH PAUSED',
  mode4v4: '4V4 · TEAM DEATHMATCH',
  wins: 'WINS.',
  finalScore: 'Final score',
  automatic: 'AUTOMATIC',
  semiAuto: 'SEMI-AUTO',
  capacity: 'CAPACITY',
  resumeMatch: 'RESUME MATCH',
  newMatch: 'NEW MATCH',
  enterArena: 'ENTER ARENA',
  initializing: 'INITIALIZING',
  restartMatch: 'RESTART MATCH',
  graphicsCouldNotStart: 'Graphics could not start.',
  matchRules: 'MATCH RULESET',
  kills25: '25 POINTS',
  respawn3: '3 SEC RESPAWN',
  ready: 'READY',
  operatorPreferences: 'OPERATOR PREFERENCES',
  settings: 'SETTINGS',
  closeSettings: 'Close settings',
  lookSensitivity: 'Look sensitivity',
  graphicsQuality: 'Graphics quality',
  graphicsHelp: 'Resolution, shadows and scene detail',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  ultra: 'Ultra',
  audioEnabled: 'Audio enabled',
  cinematicEffects: 'Cinematic effects',
  cinematicHelp: 'Bloom, film grain and image treatment',
  language: 'Language',
  vietnamese: 'Tiếng Việt',
  english: 'English',
  applyReturn: 'APPLY & RETURN',
  move: 'MOVE',
  lookFire: 'LOOK / FIRE',
  lean: 'LEAN',
  loadout: 'LOADOUT',
  scoreboard: 'SCOREBOARD',
  objective25: 'First team to 25 points',
};

export type TextKey = keyof typeof vi;

export function t(language: Language, key: TextKey) {
  return (language === 'vi' ? vi : en)[key];
}

const loadoutCopy: Record<Language, Record<WeaponId, { role: string; description: string }>> = {
  vi: {
    ranger: { role: 'CÂN BẰNG', description: 'Tầm trung · ổn định, đa dụng' },
    specter: { role: 'CƠ ĐỘNG', description: 'Nhẹ · bắn nhanh, yếu khi xa' },
    sentinel: { role: 'BẮN TỈA NẶNG', description: 'Sát thương cực lớn · bolt chậm, thay đạn lâu' },
    breaker: { role: 'CẬN CHIẾN', description: '7 viên chùm · mạnh sát gần' },
  },
  en: {
    ranger: { role: 'BALANCED', description: 'Mid-range · stable, versatile' },
    specter: { role: 'MOBILE', description: 'Light · rapid fire, weak at range' },
    sentinel: { role: 'HEAVY SNIPER', description: 'Huge single-shot power · slow bolt, long reload' },
    breaker: { role: 'CLOSE', description: '7 pellets · devastating up close' },
  },
};

export function loadoutText(language: Language, id: WeaponId) {
  return loadoutCopy[language][id];
}

export function localizeObjective(value: string, language: Language) {
  if (language === 'en') return value;
  if (/^First team to \d+ eliminations$/i.test(value)) {
    const score = value.match(/\d+/)?.[0] ?? '25';
    return `Đội đầu tiên đạt ${score} điểm`;
  }
  return value;
}

export function localizeNotice(value: string, language: Language) {
  if (!value || language === 'en') return value;
  if (value === 'PULSE GRENADE DEPLOYED') return 'ĐÃ TRIỂN KHAI THIẾT BỊ XUNG';
  if (value === 'REDEPLOYED') return 'ĐÃ TRỞ LẠI TRẬN';
  if (value === 'VIPER TEAM WINS') return 'ĐỘI VIPER CHIẾN THẮNG';
  if (value === 'RAVEN TEAM WINS') return 'ĐỘI RAVEN CHIẾN THẮNG';
  if (value === 'FREE CURSOR LOOK · RMB TO AIM') return 'CHẾ ĐỘ CHUỘT TỰ DO · CHUỘT PHẢI ĐỂ NGẮM';
  if (/^RESPAWNING /i.test(value)) return value.replace(/^RESPAWNING /i, 'HỒI SINH ');
  if (/ ELIMINATED$/i.test(value)) return `ĐÃ HẠ ${value.replace(/ ELIMINATED$/i, '')}`;
  if (/ SCORED$/i.test(value)) return `${value.replace(/ SCORED$/i, '')} GHI ĐIỂM`;
  if (/ SELECTED$/i.test(value)) return `ĐÃ CHỌN ${value.replace(/ SELECTED$/i, '')}`;
  const eliminated = value.match(/^ELIMINATED BY (.+) · RESPAWNING$/i);
  if (eliminated) return `BỊ ${eliminated[1]} HẠ · ĐANG HỒI SINH`;
  return value;
}
