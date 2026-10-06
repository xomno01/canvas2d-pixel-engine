'use strict';
/* =====================================================================
 *  PIXEL KINGDOM: TOTAL WAR - PHIÊN BẢN ĐỒ HỌA TUYỆT PHẨM (16-BIT RETRO MASTERPIECE)
 *  - 100% Thuần Canvas 2D, Virtual Framebuffer: 320 x 180 (Chuẩn Retro 16:9)
 *  - Đồ họa Pixel Art đỉnh cao lấy cảm hứng từ Final Fantasy Tactics & Kingdom Rush
 *  - Bản đồ Thảo nguyên Hoàng Gia: Dãy núi tuyết hoàng hôn, sông ngọc uốn lượn, cầu gỗ vòm,
 *    đường mòn đá cuội tự nhiên, rừng cây sồi đổ bóng, cánh đồng lúa mạch vàng óng.
 *  - Thành trì hùng tráng hai phe: Pháo đài Sư Tử Xanh & Pháo đài Rồng Lửa với cổng vòm cuốn,
 *    tháp canh chòi nóc ngói, cung thủ trực chiến, đuốc lửa rực cháy.
 *  - 7 Binh chủng vẽ tay 16-bit Chibi chi tiết cao: Giáp phản quang, khiên gia huy,
 *    cung tên căng dây, kỵ mã cơ bắp, máy bắn đá có bánh răng, thợ mỏ mũ đèn pha.
 *  - Hệ thống đổ bóng mặt đất (Cast Shadows) + Ánh sáng động ban đêm (Dynamic Lighting)
 *  - Giao diện điều khiển Fantasy mạ vàng nguyên khối (Gilded Tactical Command HUD)
 * ===================================================================== */

// ---------- 1. THIẾT LẬP KÍCH THƯỚC & TOẠ ĐỘ CHIẾN TRƯỜNG ----------
const W = 320, H = 180;
const BATTLE_TOP = 24;
const BATTLE_BOT = 138;
const HUD_TOP = 138;
const LANES_Y = [50, 82, 114];
const LANE_NAMES = ['TOP LANE', 'MID LANE', 'BOT LANE'];

const HUD_SLOT_W = 24;
const HUD_UNIT_START_X = 64;
const HUD_SPELL_START_X = 244;
const HUD_SPELL_SLOT_W = 23;

// ---------- 2. HÀM TOÁN HỌC & TIỆN ÍCH HỖ TRỢ ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// ---------- 3. BỘ FONT PIXEL CHUẨN ĐỒ HỌA RETRO (3x5 MATRIX) ----------
const FONT_DATA = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101101', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '-': '000000111000000', '/': '001001010100100',
  '+': '000010111010000', '<': '001010100010001', '>': '100010001010100', '%': '101001010100101', '*': '000101010101000',
  '[': '110100100100110', ']': '011001001001011', '(': '010100100100010', ')': '010001001001010', ' ': '000000000000000'
};

const fontCanvasCache = new Map();
function drawPixelText(ctx, textStr, x, y, col = '#ffffff', sc = 1, align = 'l', shadow = '#0c0a14') {
  textStr = String(textStr).toUpperCase();
  const cacheKey = `${textStr}|${col}|${sc}|${shadow}`;
  let cvs = fontCanvasCache.get(cacheKey);
  if (!cvs) {
    const w = Math.max(1, textStr.length * 4 * sc), h = 6 * sc;
    cvs = mkCanvas(w, h);
    const cctx = cvs.getContext('2d');
    const renderPass = (ox, oy, c) => {
      for (let i = 0; i < textStr.length; i++) {
        const glyph = FONT_DATA[textStr[i]] || FONT_DATA[' '];
        for (let b = 0; b < 15; b++) {
          if (glyph[b] === '1') px(cctx, ox + (i * 4 + (b % 3)) * sc, oy + Math.floor(b / 3) * sc, sc, sc, c);
        }
      }
    };
    if (shadow) renderPass(sc, sc, shadow);
    renderPass(0, 0, col);
    fontCanvasCache.set(cacheKey, cvs);
  }
  const drawX = align === 'c' ? x - Math.floor(cvs.width / 2) : align === 'r' ? x - cvs.width : x;
  ctx.drawImage(cvs, Math.round(drawX), Math.round(y));
}

// ---------- 4. HỆ THỐNG SPRITE 16-BIT CHIBI ĐỈNH CAO (ĐA DẠNG & SỐNG ĐỘNG) ----------
const OUTLINE = '#0d0a17';
const PALETTES = {
  player: {
    m: '#2e86de', // Lam Hoàng Gia chủ đạo
    d: '#12549e', // Đổ bóng xanh thẫm
    l: '#70a1ff', // Highlight ngọc lam
    t: '#f1c40f'  // Lông vũ / Viền vàng kim
  },
  enemy: {
    m: '#ee5253', // Huyết Hồng Đế Chế
    d: '#961718', // Đổ bóng huyết thẫm
    l: '#ff7675', // Highlight đỏ san hô
    t: '#ffffff'  // Lông vũ tuyết trắng
  }
};

const SPRITE_MATRICES = {
  // 1. Thợ mỏ (Miner 16x18): Mũ sắt đèn pha chiếu sáng, râu quai nón, cuốc sắt, túi vàng
  miner: [
    '.....kkkkkk.....',
    '....ksssggsk....',
    '...kssssyyggk...',
    '..ksssssyyllgk..',
    '..kffffffffggk..',
    '..kffffffffffk.k',
    '..kfFhFhhFfffkbk',
    '..kffffffffffkbk',
    '..kbbBBBBbbkkkbk',
    '.kmddDDDDddkkbk.',
    '.kmmDDDDDDmmkbk.',
    '.kmmddddddmmkbk.',
    '..kBBBBBBBBkkbk.',
    '..kBBkggkBBk.kk.',
    '..kb.kggk.bk....',
    '..kb..kk..bk....',
    '..kd......dk....',
    '.kkk......kkk...'
  ],

  // 2. Kiếm sĩ Hoàng Gia (Royal Swordsman 18x18): Great Helm có khe mắt, lông vũ đỉnh mũ, áo giáp ngực, khiên huy hiệu, thanh gươm sáng loáng
  swordsman: [
    '......ktttk.......',
    '.....ktttttkk.....',
    '....ksssssssk.....',
    '...ksslllllsssk...',
    '..ksshhkhhkhsssk..',
    '..ksssssssssssk.l.',
    '..kssllssllsssk.l.',
    '.kmddDDDDDDddkkllk',
    '.kmmDDmggmDDmmkllk',
    'kmmkDDmggmDDkmmkGk',
    'kmmkDDDDDDDDkmmkGk',
    'kGkksssssssskkGkbk',
    'k..kssddddsskkkkbk',
    '...kss....ssk...bk',
    '...ksd....sdk.....',
    '...ksd....sdk.....',
    '...kdd....ddk.....',
    '..kkkk....kkkk....'
  ],

  // 3. Cung thủ Tinh Nhuệ (Ranger Archer 16x18): Mũ thợ săn gắn lông chim, mắt ngắm bắn, áo da gile, cánh cung gỗ cong vút
  archer: [
    '.....ktk........',
    '....kttkk.......',
    '...keeEekk..k...',
    '..keeEEEEek.bk..',
    '..kefffffeek.bk.',
    '..kfFhFhhffk.bk.',
    '..kffffffefk.bk.',
    '.kmEEeeeeEEmk.bk',
    '.kmmEEEEEEmmk.bk',
    '.kmmEEggEEmmk.lk',
    '.kddBBggBBddkkkk',
    '..kddBBBBddk..bk',
    '..kbb....bbk..bk',
    '..kbb....bbk..bk',
    '..kbb....bbk...k',
    '..kb......bk....',
    '..kB......Bk....',
    '.kkk......kkk...'
  ],

  // 4. Đại Hộ Vệ Khiên Tháp (Shield 18x20): Giáp sắt, khiên tháp Pavise vòm cong mạ vàng huy hiệu
  shield: [
    '.......ksssk......',
    '......ksssssk.....',
    '.....ksshhkhk.....',
    '....kmssssssmk.k..',
    '...kmmddDDddmk.kk.',
    '..kGkkkkkkkkkk.ksk',
    '.kGksssssssskGksdk',
    'kGksmmmmmDmmkskGsk',
    'kGksmggmggDmkskGsk',
    'kGksmggmggDmksk.kk',
    'kGksmggmggDmksk...',
    'kGksmggmggDmksk...',
    'kGksmmmmmDmmksk...',
    'kGksddDDDDddksk...',
    '.kGkddDDDDddkGk...',
    '..kGkkkkkkkkkGk...',
    '...ksd....sdk.....',
    '...ksd....sdk.....',
    '...kdd....ddk.....',
    '..kkkk....kkkk....'
  ],

  // 5. Kỵ Binh Thiết Giáp (Cavalry 28x20): Ngựa chiến cơ bắp có yên cương bọc nhung, kỵ sĩ cầm thương dài
  cavalry: [
    '..........ktk...............',
    '.........kttkk..............',
    '........ksssssk.............',
    '.......ksshhkhsk............',
    '......kmmddDDmmk....kkk.....',
    '.....kmmmDDDDmmmk..ksssk....',
    '....kGkksssssskkGkksssssk...',
    '...kbbkDDDDDDDDkbbksskkk....',
    '..kbbkDDmggmDDDDkbbksssk....',
    '.kbbbbDDDDDDDDDDbbbbkssk....',
    '.kbbkddDDDDDDddkbbbbk.kk....',
    '.kbbbbbbbbbbbbbbbbk.ksk.lll.',
    '..kbbkddddddkbbbbk..ksklllll',
    '..kbbk......kbbbk...kGklllll',
    '..kb.k......k.bbk...kGk.....',
    '..kd.k......k..dk...kGk.....',
    '..kd.k......k..dk...kbk.....',
    '..kd.k......k..dk....k......',
    '..kd.k......k..dk...........',
    '.kkk.k.....kkk.kk...........'
  ],

  // 6. Pháp Sư Hỏa Ngục (Mage 16x20): Mũ chóp nhọn, vương trượng ngọc lửa rực sáng
  mage: [
    '......kk........',
    '.....kppk.......',
    '....kppggk......',
    '...kppppppk.....',
    '..kppptttppk....',
    '..kppppppppk.kyy',
    '.kppffffeepkyryl',
    '.kpfFhFhhffkyryl',
    '.kfffffffffk.kyy',
    '.kmppPPPPppmk.bk',
    'kmmmPPPPPPmmkbk.',
    'kmmmPPggPPmmkbk.',
    '.kmPPPPPPPPmk.bk',
    '..kPPPPPPPPk..bk',
    '..kpp....ppk..bk',
    '..kpp....ppk..bk',
    '..kpp....ppk..bk',
    '..kdd....ddk..bk',
    '..kdd....ddk..bk',
    '.kkkk....kkkk.kk'
  ],

  // 7. Máy Bắn Đá Công Thành (Catapult 28x20): Cỗ xe gỗ 2 bánh lớn, cần phóng và đá bốc lửa
  catapult: [
    '.............kkkkkk.........',
    '............kssyyysk........',
    '...........kssyyryysk.......',
    '..........kssyyyyryysk......',
    '.........ksssyyyryyyssk.....',
    '........kbbbbbbbbbbbbbk.....',
    '.......kbbk.........kbk.....',
    '......kbbk...........kbk....',
    '.....kbbk...kkkkk.....kbk...',
    '....kbbk...kbbbbbk.....kbk..',
    '...kbbk...kbk...kbk.....kbk.',
    '..kbbkkkkkkkkkkkkkkkkkkkkbbk',
    '.kbbkddddddddddddddddddddbbk',
    'kkddkkddddddddddddddddddkkdd',
    'kdksskkddddddddddddddkksskdk',
    'kdkslskkddddddddddddkkslskdk',
    'kdkslskkddddddddddddkkslskdk',
    'kdksskkddddddddddddddkksskdk',
    '.kddkkddddddddddddddddkkddk.',
    '..kkk..................kkk..'
  ]
};

const spriteBakedCache = new Map();
function getSprite(name, team = 'player', flipped = false) {
  const cacheKey = `${name}|${team}|${flipped ? 1 : 0}`;
  let cvs = spriteBakedCache.get(cacheKey);
  if (cvs) return cvs;

  const matrix = SPRITE_MATRICES[name];
  if (!matrix) return mkCanvas(1, 1);
  const h = matrix.length, w = matrix[0].length;
  cvs = mkCanvas(w, h);
  const ctx = cvs.getContext('2d');

  const teamPal = PALETTES[team] || PALETTES.player;
  const colMap = {
    k: OUTLINE,
    s: '#dfe4ea', // Thép sáng
    d: '#57606f', // Thép tối
    l: '#ffffff', // Highlight ánh kim chói
    f: '#ffda79', // Da sáng
    F: '#cc8e35', // Da tối
    h: '#4a2810', // Mắt / tóc
    g: '#f1c40f', // Vàng hoàng gia
    G: '#b7860b', // Đồng thau
    b: '#8c5028', // Gỗ / da nâu ấm
    B: '#4a2810', // Gỗ tối
    m: teamPal.m,
    D: teamPal.d,
    L: teamPal.l,
    t: teamPal.t,
    p: '#9b59b6', // Áo pháp sư tím
    P: '#5f27cd', // Tím thẫm huyền bí
    y: '#fed330', // Lửa vàng
    r: '#ff4757', // Lửa đỏ hồng ngọc
    w: '#f1f2f6', // Trắng bạc
    e: '#2ed573', // Xanh cung thủ
    E: '#10ac84'  // Xanh lục tối
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = matrix[y][x];
      if (ch === '.') continue;
      const col = colMap[ch] || '#ffffff';
      const drawX = flipped ? (w - 1 - x) : x;
      px(ctx, drawX, y, 1, 1, col);
    }
  }

  spriteBakedCache.set(cacheKey, cvs);
  return cvs;
}

// ---------- 5. HỆ THỐNG ÂM THANH TỔNG HỢP WEBAUDIO (SFX) ----------
const SoundFX = {
  ctx: null, muted: false,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  play(type) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);

    if (type === 'spawn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now); osc.stop(now + 0.13);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'arrow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'magic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(1040, now + 0.24);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.26);
    } else if (type === 'boom') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.38);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
      osc.start(now); osc.stop(now + 0.39);
    } else if (type === 'gold') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(988, now);
      osc.frequency.setValueAtTime(1318, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now); osc.stop(now + 0.19);
    } else if (type === 'horn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(440, now + 0.15);
      osc.frequency.setValueAtTime(554, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.52);
      osc.start(now); osc.stop(now + 0.54);
    }
  }
};

// ---------- 6. THÔNG SỐ 7 BINH CHỦNG & 3 PHÉP THẦN THÁNH ----------
const UNIT_DEFINITIONS = [
  { id: 'miner',     name: 'THO MO',  cost: 35,  hp: 90,  dmg: 8,  spd: 24, range: 10, atkSpd: 1.2, isMiner: true, badgeCol: '#f39c12' },
  { id: 'swordsman', name: 'KIEM SI', cost: 50,  hp: 160, dmg: 24, spd: 32, range: 12, atkSpd: 1.0, badgeCol: '#3498db' },
  { id: 'archer',    name: 'CUNG THU',cost: 75,  hp: 80,  dmg: 18, spd: 30, range: 90, atkSpd: 1.1, badgeCol: '#2ecc71' },
  { id: 'shield',    name: 'HO VE',  cost: 100, hp: 350, dmg: 14, spd: 22, range: 10, atkSpd: 1.4, isShield: true, badgeCol: '#95a5a6' },
  { id: 'cavalry',   name: 'KY BINH', cost: 160, hp: 240, dmg: 45, spd: 54, range: 16, atkSpd: 1.1, badgeCol: '#e67e22' },
  { id: 'mage',      name: 'PHAP SU',cost: 140, hp: 95,  dmg: 32, spd: 26, range: 75, atkSpd: 1.7, splash: 30, badgeCol: '#9b59b6' },
  { id: 'catapult',  name: 'BAN DA',  cost: 220, hp: 200, dmg: 70, spd: 16, range: 115, atkSpd: 2.8, splash: 36, badgeCol: '#7f8c8d' }
];

const SPELL_DEFINITIONS = [
  { id: 'fire_rain',     name: 'MUA TEN', mana: 40, dmg: 50,  radius: 52, cd: 12, key: 'Q' },
  { id: 'thunderstrike', name: 'SAM SET', mana: 65, dmg: 210, radius: 30, cd: 18, key: 'W' },
  { id: 'divine_heal',   name: 'HOI MAU', mana: 50, heal: 120,radius: 95, cd: 15, key: 'E' }
];

// ---------- 7. BẢN ĐỒ CHIẾN TRƯỜNG THIÊN NHIÊN SỐNG ĐỘNG (ORGANIC BATTLEFIELD) ----------
let mapBackgroundSurface = null;
function generateMasterpieceBattlefield() {
  const c = mkCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(2026);

  // 1. Bầu trời hoàng hôn & Dãy núi tuyết tím mộng ảo
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 24);
  skyGrad.addColorStop(0, '#0d0918');
  skyGrad.addColorStop(0.5, '#1b1228');
  skyGrad.addColorStop(0.8, '#321634');
  skyGrad.addColorStop(1, '#4a2230');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 24);

  // Trăng lưỡi liềm vàng rực
  px(ctx, 158, 4, 9, 9, '#ffeaa7');
  px(ctx, 161, 4, 9, 9, '#1a1028');
  px(ctx, 157, 5, 2, 7, '#fff9db');

  // Các ngôi sao lấp lánh
  for (let i = 0; i < 30; i++) {
    px(ctx, Math.floor(r() * W), Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#dfe6e9' : '#ffeaa7');
  }

  // Dãy núi tuyết xa xăm
  for (let x = 0; x < W; x += 3) {
    const mh1 = Math.sin(x * 0.04) * 6 + Math.cos(x * 0.02) * 4 + 14;
    px(ctx, x, 24 - mh1, 3, mh1, '#251633');
    px(ctx, x, 24 - mh1, 2, 2, '#dcdde1'); // Tuyết đỉnh núi
  }
  for (let x = 0; x < W; x += 4) {
    const mh2 = Math.sin(x * 0.06 + 2) * 4 + 10;
    px(ctx, x, 24 - mh2, 4, mh2, '#1a2729');
  }

  // 2. Thảo nguyên xanh mướt (Toàn bộ mặt đất là cỏ xanh thiên nhiên đồng nhất)
  px(ctx, 0, 24, W, 114, '#2d8a4e');
  for (let i = 0; i < 2000; i++) {
    const gx = Math.floor(r() * W);
    const gy = 24 + Math.floor(r() * 114);
    const gCol = r() < 0.35 ? '#247542' : r() < 0.7 ? '#349b58' : '#1e6338';
    px(ctx, gx, gy, 1, r() < 0.5 ? 1 : 2, gCol);
  }

  // Khóm hoa dại rực rỡ và cỏ ba lá
  for (let i = 0; i < 110; i++) {
    const fx = Math.floor(r() * W);
    const fy = 26 + Math.floor(r() * 110);
    const col = r() < 0.4 ? '#f1c40f' : r() < 0.7 ? '#ff4757' : r() < 0.85 ? '#ffffff' : '#a29bfe';
    px(ctx, fx, fy, 2, 2, col);
    px(ctx, fx, fy + 2, 1, 1, '#1e6338');
  }

  // Cánh đồng lúa mạch vàng óng (Wheat Field) giữa làn Trên và làn Giữa
  for (let wy = 62; wy < 74; wy += 2) {
    for (let wx = 65; wx < 105; wx += 3) {
      if (r() < 0.8) {
        px(ctx, wx, wy, 2, 3, '#f1c40f');
        px(ctx, wx + 1, wy - 1, 1, 1, '#f39c12');
      }
    }
  }

  // 3. Ba con đường mòn đá cuội tự nhiên (Organic Dirt Trails - KHÔNG bị đóng khối thô)
  LANES_Y.forEach(ly => {
    // Vết mòn đất mềm (chỉ dày 6-8px, mép lượn sóng tự nhiên)
    for (let x = 24; x < W - 24; x += 2) {
      const roadH = 6 + Math.sin(x * 0.1) * 2;
      const topY = ly - Math.floor(roadH / 2);
      px(ctx, x, topY, 2, roadH, '#6d4c41');
      if (r() < 0.6) px(ctx, x, topY + 1, 2, roadH - 2, '#795548');
    }
    // Từng viên đá cuội nổi khối 3D rải rác tự nhiên
    for (let x = 28; x < W - 28; x += 5) {
      if (r() < 0.55) {
        const oy = Math.floor(r() * 5) - 2;
        px(ctx, x, ly + oy, 3, 2, '#bcaaa4');
        px(ctx, x, ly + oy, 3, 1, '#efebe9');
        px(ctx, x, ly + oy + 2, 3, 1, '#4e342e');
      }
    }
  });

  // 4. Dòng sông ngọc uốn lượn tự nhiên có ghềnh đá (Natural Winding River)
  for (let y = 24; y < 138; y++) {
    const curve = Math.sin(y * 0.07) * 5;
    const rx = 152 + curve;
    // Bờ cát vàng
    px(ctx, rx - 2, y, 22, 1, '#d4a373');
    // Nước nông ven bờ ngọc lam
    px(ctx, rx, y, 18, 1, '#00cec9');
    // Dòng nước sâu xanh thẫm
    px(ctx, rx + 3, y, 12, 1, '#0984e3');
    px(ctx, rx + 6, y, 6, 1, '#0c2461');
    // Bọt sóng trắng lăn tăn
    if (r() < 0.25) px(ctx, rx + Math.floor(r() * 12), y, 2, 1, '#ffffff');
  }

  // Hoa sen và khóm sậy ven sông
  [36, 68, 100, 128].forEach(sy => {
    const curve = Math.sin(sy * 0.07) * 5;
    px(ctx, 149 + curve, sy, 2, 4, '#1b5e20');
    px(ctx, 171 + curve, sy, 2, 4, '#1b5e20');
    if (sy === 68 || sy === 128) {
      px(ctx, 159 + curve, sy, 4, 3, '#2e7d32');
      px(ctx, 161 + curve, sy, 2, 2, '#ff9ff3'); // Bông hoa sen hồng
    }
  });

  // 5. Ba cây cầu vòm gỗ bắc ngang sông mộc mạc cổ kính (Rustic Wooden Plank Bridges)
  LANES_Y.forEach(ly => {
    const curve = Math.sin(ly * 0.07) * 5;
    const bx = Math.round(152 + curve - 12);
    // Bóng đổ của cầu xuống dòng sông
    ctx.fillStyle = 'rgba(10, 20, 40, 0.45)';
    ctx.fillRect(bx, ly + 6, 24, 3);
    // Dầm gỗ đỡ cầu
    px(ctx, bx, ly - 6, 24, 12, '#5d4037');
    // Từng thanh ván gỗ lát cầu
    for (let pxX = bx; pxX < bx + 24; pxX += 3) {
      px(ctx, pxX, ly - 5, 2, 10, '#8d6e63');
      px(ctx, pxX, ly - 5, 2, 1, '#a1887f'); // Gờ sáng
      px(ctx, pxX, ly + 4, 2, 1, '#3e2723'); // Gờ tối
    }
    // Lan can gỗ bảo vệ hai bên
    px(ctx, bx - 1, ly - 7, 26, 2, '#4e342e');
    px(ctx, bx - 1, ly + 6, 26, 2, '#3e2723');
    // 4 Cột trụ đầu cầu
    px(ctx, bx - 1, ly - 8, 3, 3, '#8d6e63');
    px(ctx, bx + 22, ly - 8, 3, 3, '#8d6e63');
    px(ctx, bx - 1, ly + 6, 3, 3, '#8d6e63');
    px(ctx, bx + 22, ly + 6, 3, 3, '#8d6e63');
    // Đèn lồng vàng ấm trên 2 cột cầu phía trên
    px(ctx, bx, ly - 7, 1, 1, '#f1c40f');
    px(ctx, bx + 23, ly - 7, 1, 1, '#f1c40f');
  });

  // 6. Rừng sồi cổ thụ tán lá đa tầng đổ bóng chân thực (GBA/SNES Round Foliage)
  const plantMajesticOak = (tx, ty) => {
    ctx.fillStyle = 'rgba(8, 20, 14, 0.38)';
    ctx.beginPath();
    ctx.ellipse(tx + 8, ty + 18, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây sồi có rãnh vỏ và rễ cây xòe ra
    px(ctx, tx + 6, ty + 9, 4, 9, '#4e342e');
    px(ctx, tx + 7, ty + 10, 2, 7, '#6d4c41');
    px(ctx, tx + 5, ty + 16, 6, 2, '#3e2723');

    // Tán lá tròn 3 tầng như game Chrono Trigger / Secret of Mana
    const drawLeafCluster = (cx, cy, r, baseCol, lightCol, hilightCol) => {
      ctx.fillStyle = '#145a32';
      ctx.beginPath(); ctx.arc(cx, cy + 1, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = baseCol;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lightCol;
      ctx.beginPath(); ctx.arc(cx - 1, cy - 1, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hilightCol;
      ctx.beginPath(); ctx.arc(cx - 2, cy - 2, r * 0.35, 0, Math.PI * 2); ctx.fill();
    };

    drawLeafCluster(tx + 4, ty + 8, 6, '#1e824c', '#27ae60', '#58d68d');  // Lobe trái
    drawLeafCluster(tx + 12, ty + 8, 6, '#1e824c', '#27ae60', '#58d68d'); // Lobe phải
    drawLeafCluster(tx + 8, ty + 3, 7, '#27ae60', '#2ecc71', '#a8e6cf');  // Đỉnh vòm lá
  };

  plantMajesticOak(38, 25);
  plantMajesticOak(115, 26);
  plantMajesticOak(195, 25);
  plantMajesticOak(265, 26);
  plantMajesticOak(40, 120);
  plantMajesticOak(112, 118);
  plantMajesticOak(198, 120);
  plantMajesticOak(265, 119);

  // 7. Đền thờ cổ kính (Ancient Stone Shrine) & Tảng đá phủ rêu
  px(ctx, 215, 65, 8, 8, '#7f8c8d');
  px(ctx, 216, 64, 6, 2, '#bdc3c7');
  px(ctx, 218, 67, 2, 2, '#3498db'); // Ngọc xanh linh hồn phát sáng
  px(ctx, 215, 71, 8, 2, '#27ae60'); // Rêu phong bám chân đền

  // 8. Cổng thành pháo đài hai phe (Castle Gatehouses)
  // Phe ta (Trái: X: 0 -> 20)
  LANES_Y.forEach(ly => {
    px(ctx, 0, ly - 8, 20, 16, '#38485c');
    px(ctx, 0, ly - 8, 20, 2, '#516780');
    px(ctx, 0, ly - 6, 16, 12, '#0d0a14');
    for (let gx = 3; gx < 16; gx += 3) {
      px(ctx, gx, ly - 5, 1, 10, '#718093');
    }
    px(ctx, 17, ly - 3, 2, 2, '#5d4037');
    px(ctx, 17, ly - 5, 2, 2, '#ff9f43');
  });
  px(ctx, 0, 24, 10, 114, '#2f3542');
  px(ctx, 0, 14, 16, 14, '#2e86de');
  px(ctx, 0, 14, 16, 2, '#70a1ff');
  px(ctx, 7, 10, 2, 4, '#f1c40f'); // Đỉnh chóp mạ vàng

  // Phe địch (Phải: X: 300 -> 320)
  LANES_Y.forEach(ly => {
    px(ctx, W - 20, ly - 8, 20, 16, '#3e2428');
    px(ctx, W - 20, ly - 8, 20, 2, '#5e383f');
    px(ctx, W - 16, ly - 6, 16, 12, '#140608');
    for (let gx = W - 15; gx < W - 2; gx += 3) {
      px(ctx, gx, ly - 5, 1, 10, '#854d55');
    }
    px(ctx, W - 19, ly - 3, 2, 2, '#5d4037');
    px(ctx, W - 19, ly - 5, 2, 2, '#ff4757');
  });
  px(ctx, W - 10, 24, 10, 114, '#281518');
  px(ctx, W - 16, 14, 16, 14, '#ee5253');
  px(ctx, W - 16, 14, 16, 2, '#ff7675');
  px(ctx, W - 9, 10, 2, 4, '#f8f9fa');

  // 9. Khu khai thác Mỏ Vàng hậu phương
  px(ctx, 2, 120, 16, 14, '#2d3436');
  px(ctx, 4, 122, 12, 10, '#0d0a14');
  px(ctx, 6, 124, 8, 6, '#f1c40f');

  px(ctx, W - 18, 120, 16, 14, '#3e2723');
  px(ctx, W - 16, 122, 12, 10, '#1a0d0a');
  px(ctx, W - 14, 124, 8, 6, '#f1c40f');

  return c;
}

// ---------- 8. LỚP THỰC THỂ BINH SĨ CHI TIẾT (BATTLE UNIT CLASS) ----------
class BattleUnit {
  constructor(game, def, laneIdx, team) {
    this.game = game;
    this.def = def;
    this.lane = laneIdx;
    this.team = team;

    this.x = team === 'player' ? 26 : W - 26;
    this.y = LANES_Y[laneIdx] + randi(-1, 1);
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dmg = def.dmg;
    this.spd = def.spd;
    this.range = def.range;
    this.atkSpd = def.atkSpd;
    this.splash = def.splash || 0;
    this.isShield = def.isShield || false;
    this.isMiner = def.isMiner || false;

    this.cooldown = 0;
    this.target = null;
    this.walkTimer = rand(0, 10);
    this.swingTimer = 0;
    this.flashTimer = 0;

    this.minerState = 'to_mine';
    this.mineTimer = 0;
  }

  takeDamage(amount, isRangedArrow = false) {
    if (this.isShield && isRangedArrow) {
      amount *= 0.25;
      this.game.spawnFloatingText('BLOCK!', this.x, this.y - 14, '#54a0ff');
      this.game.spawnParticles(this.x, this.y - 6, 6, '#f1c40f');
    }
    this.hp -= amount;
    this.flashTimer = 0.12;
    this.game.spawnParticles(this.x, this.y - 6, 6, '#ee5253');
    this.game.spawnFloatingText(`-${Math.round(amount)}`, this.x, this.y - 12, '#ff6b6b');
    SoundFX.play('hit');

    if (this.hp <= 0) {
      this.game.spawnParticles(this.x, this.y - 6, 16, this.team === 'player' ? '#54a0ff' : '#ff7675');
    }
  }

  update(dt) {
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt * 4;

    if (this.isMiner) {
      this.updateMinerBehavior(dt);
      return;
    }

    this.target = this.findTarget();

    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      if (dist <= this.range) {
        if (this.cooldown <= 0) {
          this.performAttack();
        }
      } else {
        const dir = this.team === 'player' ? 1 : -1;
        this.x += dir * this.spd * dt;
        this.walkTimer += dt * 8;
      }
    } else {
      const dir = this.team === 'player' ? 1 : -1;
      this.x += dir * this.spd * dt;
      this.walkTimer += dt * 8;

      const enemyCastleX = this.team === 'player' ? W - 26 : 26;
      if (Math.abs(this.x - enemyCastleX) <= this.range + 8) {
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingTimer = 1;
          const targetCastle = this.team === 'player' ? 'enemy' : 'player';
          this.game.damageCastle(targetCastle, this.dmg);
          SoundFX.play('boom');
          this.game.shake = 4;
        }
      }
    }
  }

  updateMinerBehavior(dt) {
    const mineX = this.team === 'player' ? 12 : W - 12;
    const castleX = this.team === 'player' ? 26 : W - 26;
    const mineY = 126;

    if (this.minerState === 'to_mine') {
      const dx = mineX - this.x;
      const dy = mineY - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        this.minerState = 'mining';
        this.mineTimer = 2.4;
      } else {
        this.x += (dx / d) * this.spd * dt;
        this.y += (dy / d) * this.spd * dt;
        this.walkTimer += dt * 8;
      }
    } else if (this.minerState === 'mining') {
      this.mineTimer -= dt;
      this.swingTimer = 1;
      if (Math.random() < dt * 4) SoundFX.play('gold');
      if (this.mineTimer <= 0) {
        this.minerState = 'to_castle';
      }
    } else if (this.minerState === 'to_castle') {
      const dx = castleX - this.x;
      const dy = LANES_Y[this.lane] - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        this.minerState = 'to_mine';
        if (this.team === 'player') {
          this.game.gold += 45;
          this.game.spawnFloatingText('+45G', this.x, this.y - 12, '#f1c40f');
        } else {
          this.game.aiGold += 45;
        }
        SoundFX.play('gold');
      } else {
        this.x += (dx / d) * this.spd * dt;
        this.y += (dy / d) * this.spd * dt;
        this.walkTimer += dt * 8;
      }
    }
  }

  performAttack() {
    this.cooldown = this.atkSpd;
    this.swingTimer = 1;

    if (this.def.id === 'archer') {
      SoundFX.play('arrow');
      this.game.projectiles.push({
        x: this.x, y: this.y - 8,
        targetX: this.target.x, targetY: this.target.y - 6,
        startX: this.x, startY: this.y - 8,
        progress: 0, speed: 3.2,
        target: this.target, dmg: this.dmg, splash: 0,
        type: 'arrow', team: this.team
      });
    } else if (this.def.id === 'mage') {
      SoundFX.play('magic');
      this.game.projectiles.push({
        x: this.x, y: this.y - 8,
        targetX: this.target.x, targetY: this.target.y - 6,
        startX: this.x, startY: this.y - 8,
        progress: 0, speed: 1.8,
        target: this.target, dmg: this.dmg, splash: this.splash,
        type: 'fireball', team: this.team
      });
    } else if (this.def.id === 'catapult') {
      SoundFX.play('boom');
      this.game.projectiles.push({
        x: this.x, y: this.y - 10,
        targetX: this.target.x, targetY: this.target.y - 4,
        startX: this.x, startY: this.y - 10,
        progress: 0, speed: 1.2,
        target: this.target, dmg: this.dmg, splash: this.splash,
        type: 'boulder', team: this.team
      });
    } else {
      if (this.target && this.target.hp > 0) {
        this.target.takeDamage(this.dmg, false);
      }
    }
  }

  findTarget() {
    let closest = null;
    let minDist = Infinity;
    for (const u of this.game.units) {
      if (u.team !== this.team && u.lane === this.lane && u.hp > 0) {
        const isForward = this.team === 'player' ? (u.x >= this.x - 4) : (u.x <= this.x + 4);
        if (isForward) {
          const d = Math.abs(u.x - this.x);
          if (d < minDist) { minDist = d; closest = u; }
        }
      }
    }
    return closest;
  }

  draw(ctx) {
    const isFlipped = this.team === 'enemy';
    const spr = getSprite(this.def.id, this.team, isFlipped);
    const bob = Math.sin(this.walkTimer) * 1.5;
    const swing = this.swingTimer > 0 ? (this.team === 'player' ? 3 : -3) : 0;

    const drawX = Math.round(this.x - spr.width / 2 + swing);
    const drawY = Math.round(this.y - spr.height + bob);

    // 1. Đổ bóng nhân vật xuống mặt đất (Soft Cast Shadow Oval)
    ctx.fillStyle = 'rgba(8, 6, 18, 0.38)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, spr.width * 0.42, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vệt chém kiếm hình vòng cung ánh sáng (Sword Slash Arc VFX)
    if (this.swingTimer > 0 && this.def.id === 'swordsman') {
      const slashDir = this.team === 'player' ? 1 : -1;
      ctx.beginPath();
      ctx.arc(this.x + slashDir * 10, this.y - 8, 9, -Math.PI / 3, Math.PI / 3, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x + slashDir * 10, this.y - 8, 10, -Math.PI / 3, Math.PI / 3, false);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#70a1ff';
      ctx.stroke();
    }

    // 3. Hiệu ứng bị đánh chớp sáng (Hit Flash)
    if (this.flashTimer > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr, drawX, drawY);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, drawX, drawY);
    }

    // 4. Thanh máu trên đầu có viền kim loại 3D
    if (this.hp < this.maxHp || this.isShield) {
      const barW = Math.max(14, spr.width);
      const barX = Math.round(this.x - barW / 2);
      const barY = Math.round(drawY - 6);
      px(ctx, barX - 1, barY - 1, barW + 2, 4, '#0d0a14');
      px(ctx, barX, barY, barW, 2, '#2c3e50');
      const ratio = clamp(this.hp / this.maxHp, 0, 1);
      px(ctx, barX, barY, Math.round(barW * ratio), 2, this.team === 'player' ? '#2e86de' : '#ee5253');
      px(ctx, barX, barY, Math.round(barW * ratio), 1, this.team === 'player' ? '#70a1ff' : '#ff7675');
    }
  }
}

// ---------- 9. BỘ NÃO ĐIỀU HÀNH GAME CHÍNH (RETRO ENGINE) ----------
class PixelKingdomEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buf = mkCanvas(W, H);
    this.bctx = this.buf.getContext('2d', { alpha: false });
    this.bctx.imageSmoothingEnabled = false;

    // Buffer Ánh Sáng Động (Dynamic Light Mask)
    this.lightBuf = mkCanvas(W, H);
    this.lctx = this.lightBuf.getContext('2d');

    // Kinh tế & Mana
    this.gold = 180;
    this.mana = 60;
    this.goldTimer = 0;
    this.manaTimer = 0;
    this.selectedLane = 1;

    // Máu thành trì
    this.playerCastleHp = 1000;
    this.enemyCastleHp = 1000;
    this.playerCastleGhostHp = 1000;
    this.enemyCastleGhostHp = 1000;
    this.castleMaxHp = 1000;

    // Trí tuệ nhân tạo (AI)
    this.aiGold = 150;
    this.aiSpawnCooldown = 2.4;

    // Thực thể & Kỹ năng
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spellCooldowns = [0, 0, 0];
    this.ballistaTimer = 0;

    // Đom đóm bay lượn ban đêm (Fireflies)
    this.fireflies = [];
    for (let i = 0; i < 20; i++) {
      this.fireflies.push({
        x: rand(30, W - 30),
        y: rand(28, HUD_TOP - 4),
        vx: rand(-8, 8),
        vy: rand(-6, 6),
        pulse: rand(0, Math.PI * 2)
      });
    }

    // Trạng thái vận hành
    this.state = 'play';
    this.shake = 0;
    this.gameTime = 0;
    this.lastTime = performance.now();

    // Khởi tạo đồ họa
    mapBackgroundSurface = generateMasterpieceBattlefield();
    this.setupInputs();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    this.cssScale = Math.max(1, Math.floor(Math.min(cssW / W, cssH / H)));
    this.cssOffsetX = Math.floor((cssW - W * this.cssScale) / 2);
    this.cssOffsetY = Math.floor((cssH - H * this.cssScale) / 2);

    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.imageSmoothingEnabled = false;
  }

  setupInputs() {
    window.addEventListener('keydown', e => {
      SoundFX.init();
      const k = e.key.toUpperCase();
      if (k === '1') this.spawnUnit(0);
      else if (k === '2') this.spawnUnit(1);
      else if (k === '3') this.spawnUnit(2);
      else if (k === '4') this.spawnUnit(3);
      else if (k === '5') this.spawnUnit(4);
      else if (k === '6') this.spawnUnit(5);
      else if (k === '7') this.spawnUnit(6);
      else if (k === 'Q') this.castSpell(0);
      else if (k === 'W') this.castSpell(1);
      else if (k === 'E') this.castSpell(2);
      else if (k === ' ' || k === 'TAB') {
        e.preventDefault();
        this.selectedLane = (this.selectedLane + 1) % 3;
      }
    });

    const handlePointerAction = (clientX, clientY) => {
      SoundFX.init();
      const rect = this.canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;

      const bx = Math.floor((cssX - this.cssOffsetX) / this.cssScale);
      const by = Math.floor((cssY - this.cssOffsetY) / this.cssScale);

      if (bx < 0 || bx >= W || by < 0 || by >= H) return;

      // Click vào chiến trường để chọn làn
      if (by >= BATTLE_TOP && by < HUD_TOP) {
        if (by < 66) this.selectedLane = 0;
        else if (by < 98) this.selectedLane = 1;
        else this.selectedLane = 2;
        return;
      }

      // Click thanh HUD
      if (by >= HUD_TOP) {
        if (bx >= 0 && bx < 62) {
          if (by < 152) this.selectedLane = 0;
          else if (by < 165) this.selectedLane = 1;
          else this.selectedLane = 2;
          return;
        }

        // 7 Nút Binh chủng
        for (let i = 0; i < 7; i++) {
          const sx = HUD_UNIT_START_X + i * (HUD_SLOT_W + 1);
          if (bx >= sx && bx < sx + HUD_SLOT_W && by >= HUD_TOP + 2) {
            this.spawnUnit(i);
            return;
          }
        }

        // 3 Nút Phép thuật
        for (let i = 0; i < 3; i++) {
          const sx = HUD_SPELL_START_X + i * (HUD_SPELL_SLOT_W + 2);
          if (bx >= sx && bx < sx + HUD_SPELL_SLOT_W && by >= HUD_TOP + 2) {
            this.castSpell(i);
            return;
          }
        }
      }
    };

    this.canvas.addEventListener('mousedown', e => handlePointerAction(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length > 0) handlePointerAction(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
  }

  spawnUnit(typeIdx, team = 'player') {
    if (this.state !== 'play') return;
    const def = UNIT_DEFINITIONS[typeIdx];
    if (team === 'player') {
      if (this.gold < def.cost) return;
      this.gold -= def.cost;
      this.units.push(new BattleUnit(this, def, this.selectedLane, 'player'));
      SoundFX.play('spawn');
    } else {
      if (this.aiGold < def.cost) return;
      this.aiGold -= def.cost;
      const aiLane = randi(0, 2);
      this.units.push(new BattleUnit(this, def, aiLane, 'enemy'));
    }
  }

  castSpell(spellIdx) {
    if (this.state !== 'play') return;
    const sp = SPELL_DEFINITIONS[spellIdx];
    if (this.mana < sp.mana || this.spellCooldowns[spellIdx] > 0) return;

    this.mana -= sp.mana;
    this.spellCooldowns[spellIdx] = sp.cd;
    const targetY = LANES_Y[this.selectedLane];

    if (sp.id === 'fire_rain') {
      SoundFX.play('arrow');
      this.shake = 6;
      for (let i = 0; i < 24; i++) {
        setTimeout(() => {
          const rx = 160 + rand(-sp.radius, sp.radius);
          this.spawnParticles(rx, targetY, 6, '#e67e22');
          for (const u of this.units) {
            if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - rx) < 22) {
              u.takeDamage(sp.dmg, true);
            }
          }
        }, i * 35);
      }
    } else if (sp.id === 'thunderstrike') {
      SoundFX.play('boom');
      this.shake = 14;
      this.spawnParticles(160, targetY, 30, '#00cec9');
      this.spawnFloatingText('THUNDER!', 160, targetY - 18, '#00cec9');
      for (const u of this.units) {
        if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - 160) < sp.radius) {
          u.takeDamage(sp.dmg, false);
        }
      }
    } else if (sp.id === 'divine_heal') {
      SoundFX.play('magic');
      this.spawnParticles(160, targetY, 25, '#2ecc71');
      this.spawnFloatingText('HEAL!', 160, targetY - 18, '#2ecc71');
      for (const u of this.units) {
        if (u.team === 'player' && u.hp > 0) {
          u.hp = Math.min(u.maxHp, u.hp + sp.heal);
          this.spawnFloatingText(`+${sp.heal}`, u.x, u.y - 12, '#2ecc71');
        }
      }
    }
  }

  damageCastle(team, dmg) {
    if (team === 'player') {
      this.playerCastleHp = Math.max(0, this.playerCastleHp - dmg);
      if (this.playerCastleHp <= 0) {
        this.state = 'lose';
        SoundFX.play('boom');
      }
    } else {
      this.enemyCastleHp = Math.max(0, this.enemyCastleHp - dmg);
      if (this.enemyCastleHp <= 0) {
        this.state = 'win';
        SoundFX.play('horn');
      }
    }
  }

  spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: rand(-30, 30),
        vy: rand(-35, 15),
        color,
        life: rand(0.3, 0.7)
      });
    }
  }

  spawnFloatingText(str, x, y, col) {
    this.floatingTexts.push({
      str, x, y, col,
      life: 0.9
    });
  }

  updateAI(dt) {
    this.aiGold += 12 * dt;
    this.aiSpawnCooldown -= dt;
    if (this.aiSpawnCooldown <= 0) {
      this.aiSpawnCooldown = rand(1.6, 2.8);
      const affordableIdxs = [];
      UNIT_DEFINITIONS.forEach((u, idx) => {
        if (this.aiGold >= u.cost) affordableIdxs.push(idx);
      });
      if (affordableIdxs.length > 0) {
        const chosen = pick(affordableIdxs);
        this.spawnUnit(chosen, 'enemy');
      }
    }
  }

  updateCastleDefense(dt) {
    this.ballistaTimer += dt;
    if (this.ballistaTimer >= 1.5) {
      this.ballistaTimer = 0;
      // Thành ta bắn địch tới gần
      for (const u of this.units) {
        if (u.team === 'enemy' && u.x < 110) {
          this.projectiles.push({
            x: 24, y: LANES_Y[u.lane] - 6,
            targetX: u.x, targetY: u.y - 6,
            startX: 24, startY: LANES_Y[u.lane] - 6,
            progress: 0, speed: 3.5,
            target: u, dmg: 35, splash: 0,
            type: 'arrow', team: 'player'
          });
          SoundFX.play('arrow');
          break;
        }
      }
      // Thành địch bắn quân ta tới gần
      for (const u of this.units) {
        if (u.team === 'player' && u.x > W - 110) {
          this.projectiles.push({
            x: W - 24, y: LANES_Y[u.lane] - 6,
            targetX: u.x, targetY: u.y - 6,
            startX: W - 24, startY: LANES_Y[u.lane] - 6,
            progress: 0, speed: 3.5,
            target: u, dmg: 35, splash: 0,
            type: 'arrow', team: 'enemy'
          });
          SoundFX.play('arrow');
          break;
        }
      }
    }
  }

  update(dt) {
    this.gameTime += dt;

    if (this.state === 'play') {
      this.goldTimer += dt;
      if (this.goldTimer >= 1.0) {
        this.goldTimer = 0;
        this.gold += 5; // Thu nhập cơ bản
      }

      this.manaTimer += dt;
      if (this.manaTimer >= 0.8) {
        this.manaTimer = 0;
        if (this.mana < 100) this.mana += 2;
      }

      for (let i = 0; i < 3; i++) {
        if (this.spellCooldowns[i] > 0) this.spellCooldowns[i] -= dt;
      }

      this.updateAI(dt);
      this.updateCastleDefense(dt);
    }

    // Thanh máu bóng ma bắt kịp máu thực tế (Ghost Health Bars)
    if (this.playerCastleGhostHp > this.playerCastleHp) {
      this.playerCastleGhostHp = Math.max(this.playerCastleHp, this.playerCastleGhostHp - dt * 120);
    }
    if (this.enemyCastleGhostHp > this.enemyCastleHp) {
      this.enemyCastleGhostHp = Math.max(this.enemyCastleHp, this.enemyCastleGhostHp - dt * 120);
    }

    for (const u of this.units) u.update(dt);
    this.units = this.units.filter(u => u.hp > 0);

    // Cập nhật đường đạn
    this.projectiles = this.projectiles.filter(p => {
      p.progress += p.speed * dt;
      p.x = p.startX + (p.targetX - p.startX) * p.progress;
      p.y = p.startY + (p.targetY - p.startY) * p.progress;

      if (p.progress >= 1) {
        if (p.splash > 0) {
          SoundFX.play('boom');
          this.spawnParticles(p.x, p.y, 14, p.type === 'fireball' ? '#ff9f43' : '#7f8c8d');
          for (const u of this.units) {
            if (u.team !== p.team && Math.hypot(u.x - p.x, u.y - p.y) <= p.splash) {
              u.takeDamage(p.dmg, false);
            }
          }
        } else {
          if (p.target && p.target.hp > 0) {
            p.target.takeDamage(p.dmg, p.type === 'arrow');
          }
        }
        return false;
      }
      return true;
    });

    // Cập nhật đom đóm
    for (const ff of this.fireflies) {
      ff.x += ff.vx * dt;
      ff.y += ff.vy * dt;
      ff.pulse += dt * 3;
      if (ff.x < 30 || ff.x > W - 30) ff.vx *= -1;
      if (ff.y < 28 || ff.y > HUD_TOP - 4) ff.vy *= -1;
    }

    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      return pt.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y -= dt * 14;
      ft.life -= dt;
      return ft.life > 0;
    });

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 25);
  }

  draw() {
    const b = this.bctx;

    b.save();
    if (this.shake > 0) {
      b.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // 1. Nền bản đồ thiên nhiên tuyệt đẹp
    b.drawImage(mapBackgroundSurface, 0, 0);

    // 2. Thanh máu pháo đài & Banner gia huy hoàng tộc
    this.drawCastleHealthBars(b);

    // 3. Vẽ lính sắp xếp theo chiều sâu Y (Depth Sorting)
    const sortedUnits = [...this.units].sort((a, b) => a.y - b.y);
    for (const u of sortedUnits) u.draw(b);

    // 4. Vẽ đường đạn bay lượn
    for (const p of this.projectiles) {
      if (p.type === 'arrow') {
        px(b, p.x, p.y, 4, 1, '#ffffff');
        px(b, p.x - 1, p.y + 1, 1, 1, '#795548');
      } else if (p.type === 'fireball') {
        px(b, p.x - 3, p.y - 3, 6, 6, '#ff9f43');
        px(b, p.x - 2, p.y - 2, 4, 4, '#ee5253');
        px(b, p.x - 1, p.y - 1, 2, 2, '#ffffff');
      } else if (p.type === 'boulder') {
        px(b, p.x - 3, p.y - 3, 6, 6, '#576574');
        px(b, p.x - 2, p.y - 2, 4, 4, '#8395a7');
        px(b, p.x - 1, p.y - 1, 2, 2, '#e67e22'); // Đốm lửa cháy
      }
    }

    // 5. Đom đóm bay chớp nháy trong đêm
    for (const ff of this.fireflies) {
      const alpha = (Math.sin(ff.pulse) + 1) * 0.45;
      if (alpha > 0.2) {
        px(b, Math.round(ff.x), Math.round(ff.y), 1, 1, '#ffeaa7');
      }
    }

    // 6. Hiệu ứng hạt nổ & Số sát thương nảy
    for (const pt of this.particles) {
      px(b, Math.round(pt.x), Math.round(pt.y), 2, 2, pt.color);
    }
    for (const ft of this.floatingTexts) {
      drawPixelText(b, ft.str, ft.x, ft.y, ft.col, 1, 'c');
    }

    // 7. Lớp Ánh Sáng Động (Dynamic Lighting Pass)
    this.renderDynamicLighting(b);

    b.restore();

    // 8. Giao diện điều khiển mạ vàng (Gilded Fantasy RPG Command Bar)
    this.drawGildedHUD(b);

    // 9. Màn hình Kết Thúc Trận Đánh
    if (this.state !== 'play') {
      px(b, 0, 0, W, H, 'rgba(8,6,18,0.82)');
      if (this.state === 'win') {
        drawPixelText(b, 'VIET NAM QUAN THANG!', W / 2, H / 2 - 16, '#f1c40f', 2, 'c');
        drawPixelText(b, 'DA CONG PHA HOAN TOAN THANH DICH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      } else {
        drawPixelText(b, 'THANH TRI THAT THU!', W / 2, H / 2 - 16, '#ee5253', 2, 'c');
        drawPixelText(b, 'QUAN DICH DA TRAN VAO THANH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      }
      drawPixelText(b, 'NHAN F5 HOAC CLICK DE CHOI LAI', W / 2, H / 2 + 24, '#54a0ff', 1, 'c');
    }

    // 10. Phóng to Buffer lên màn hình thực tế (Zero-Blur Integer Upscaling)
    px(this.ctx, 0, 0, this.canvas.width, this.canvas.height, '#0a0812');
    this.ctx.drawImage(
      this.buf,
      0, 0, W, H,
      Math.floor(this.cssOffsetX * this.dpr),
      Math.floor(this.cssOffsetY * this.dpr),
      Math.floor(W * this.cssScale * this.dpr),
      Math.floor(H * this.cssScale * this.dpr)
    );

    // Gợi ý xoay ngang nếu cầm dọc điện thoại
    if (window.innerWidth < window.innerHeight) {
      const hintY = Math.max(12 * this.dpr, Math.floor(this.cssOffsetY * this.dpr) - 24 * this.dpr);
      drawPixelText(
        this.ctx,
        'XOAY NGANG MAN HINH DE CHOI TO DEP',
        this.canvas.width / 2,
        hintY,
        '#f1c40f',
        Math.max(1, Math.round(this.dpr)),
        'c'
      );
    }
  }

  renderDynamicLighting(targetCtx) {
    const lc = this.lctx;
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = 'rgba(15, 10, 28, 0.24)';
    lc.fillRect(0, 0, W, BATTLE_BOT);

    lc.globalCompositeOperation = 'destination-out';
    const drawLightCircle = (lx, ly, radius) => {
      const grad = lc.createRadialGradient(lx, ly, 0, lx, ly, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(lx, ly, radius, 0, Math.PI * 2);
      lc.fill();
    };

    // Ánh sáng đuốc thành pháo đài hai bên
    drawLightCircle(18, 48, 26);
    drawLightCircle(18, 80, 26);
    drawLightCircle(18, 112, 26);
    drawLightCircle(W - 18, 48, 26);
    drawLightCircle(W - 18, 80, 26);
    drawLightCircle(W - 18, 112, 26);

    // Ánh đèn lồng 3 cây cầu gỗ
    LANES_Y.forEach(ly => {
      const curve = Math.sin(ly * 0.07) * 5;
      const bx = Math.round(152 + curve - 12);
      drawLightCircle(bx, ly - 7, 16);
      drawLightCircle(bx + 23, ly - 7, 16);
    });

    // Ánh lửa quặng mỏ vàng
    drawLightCircle(10, 126, 24);
    drawLightCircle(W - 10, 126, 24);

    // Ánh sáng của các quả cầu lửa đang bay
    for (const p of this.projectiles) {
      if (p.type === 'fireball' || p.type === 'boulder') drawLightCircle(p.x, p.y, 22);
    }

    lc.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(this.lightBuf, 0, 0);
  }

  drawCastleHealthBars(ctx) {
    // 1. Máu thành phe ta (Trái)
    px(ctx, 4, 3, 78, 8, '#0d0a14');
    px(ctx, 4, 3, 78, 1, '#2f3542');
    const pGhostRatio = clamp(this.playerCastleGhostHp / this.castleMaxHp, 0, 1);
    const pRealRatio = clamp(this.playerCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, 5, 4, Math.round(76 * pGhostRatio), 6, '#ffffff');
    px(ctx, 5, 4, Math.round(76 * pRealRatio), 6, '#2e86de');
    px(ctx, 5, 4, Math.round(76 * pRealRatio), 2, '#70a1ff');
    drawPixelText(ctx, `PHE TA: ${this.playerCastleHp}`, 6, 13, '#9ec2ff', 1);

    // 2. Tấm biển hoàng gia mạ vàng chính giữa: Tên game & Đồng hồ trận đấu
    px(ctx, W / 2 - 42, 1, 84, 13, '#141221');
    px(ctx, W / 2 - 42, 1, 84, 1, '#f1c40f');
    px(ctx, W / 2 - 42, 13, 84, 1, '#96740c');
    px(ctx, W / 2 - 42, 1, 1, 13, '#f1c40f');
    px(ctx, W / 2 + 41, 1, 1, 13, '#f1c40f');
    drawPixelText(ctx, 'PIXEL KINGDOM', W / 2, 3, '#f1c40f', 1, 'c');
    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60);
    const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    drawPixelText(ctx, timeStr, W / 2, 8, '#81ecec', 1, 'c');

    // 3. Máu thành phe địch (Phải)
    px(ctx, W - 82, 3, 78, 8, '#0d0a14');
    px(ctx, W - 82, 3, 78, 1, '#3e2428');
    const eGhostRatio = clamp(this.enemyCastleGhostHp / this.castleMaxHp, 0, 1);
    const eRealRatio = clamp(this.enemyCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, W - 81, 4, Math.round(76 * eGhostRatio), 6, '#ffffff');
    px(ctx, W - 81, 4, Math.round(76 * eRealRatio), 6, '#ee5253');
    px(ctx, W - 81, 4, Math.round(76 * eRealRatio), 2, '#ff7675');
    drawPixelText(ctx, `QUAN DICH: ${this.enemyCastleHp}`, W - 6, 13, '#ff9aa2', 1, 'r');
  }

  drawGildedHUD(ctx) {
    // Khung nẹp đá hoa cương & kim loại mạ vàng nguyên khối
    px(ctx, 0, HUD_TOP, W, H - HUD_TOP, '#141221');
    px(ctx, 0, HUD_TOP, W, 2, '#f1c40f');
    px(ctx, 0, HUD_TOP + 2, W, 1, '#96740c');
    px(ctx, 0, HUD_TOP + 3, W, 1, '#0a0812');

    // 1. Chỉ số Tài Nguyên (Túi Vàng Hoàng Gia & Bình Mana)
    // Icon Đồng Tiền Vàng
    px(ctx, 5, HUD_TOP + 5, 5, 5, '#f1c40f');
    px(ctx, 6, HUD_TOP + 6, 3, 3, '#fed330');
    drawPixelText(ctx, `VANG: ${this.gold}`, 13, HUD_TOP + 5, '#f1c40f', 1);

    // Icon Bình Ma Pháp Ngọc Lam
    px(ctx, 5, HUD_TOP + 13, 5, 5, '#0984e3');
    px(ctx, 6, HUD_TOP + 14, 3, 3, '#70a1ff');
    drawPixelText(ctx, `MANA: ${this.mana}`, 13, HUD_TOP + 13, '#54a0ff', 1);

    // 2. Nút điều chuyển 3 Làn Chiến Thuật viền nổi
    for (let i = 0; i < 3; i++) {
      const ly = HUD_TOP + 20 + i * 7;
      const isCurrent = this.selectedLane === i;
      px(ctx, 4, ly, 56, 6, isCurrent ? '#2e86de' : '#1e1c2e');
      px(ctx, 4, ly, 56, 1, isCurrent ? '#70a1ff' : '#2d2745');
      px(ctx, 4, ly + 5, 56, 1, isCurrent ? '#12549e' : '#0d0a14');
      drawPixelText(ctx, `${i + 1}.${LANE_NAMES[i]}`, 6, ly + 1, isCurrent ? '#ffffff' : '#8884a0', 1);
    }

    // 3. 7 Thẻ chiêu mộ Binh Chủng viền kim loại có màu phân loại
    for (let i = 0; i < 7; i++) {
      const u = UNIT_DEFINITIONS[i];
      const sx = HUD_UNIT_START_X + i * (HUD_SLOT_W + 1);
      const canAfford = this.gold >= u.cost;

      // Nền thẻ bài có màu chủ đạo của binh chủng
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 35, canAfford ? '#1f1b33' : '#141221');
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 2, canAfford ? u.badgeCol : '#3d3752');
      px(ctx, sx, HUD_TOP + 37, HUD_SLOT_W, 1, '#08060f');
      px(ctx, sx, HUD_TOP + 3, 1, 35, canAfford ? '#6b5416' : '#211d33');
      px(ctx, sx + HUD_SLOT_W - 1, HUD_TOP + 3, 1, 35, canAfford ? '#6b5416' : '#211d33');

      // Phím tắt nổi bật
      drawPixelText(ctx, `[${i + 1}]`, sx + 2, HUD_TOP + 6, canAfford ? '#f1c40f' : '#636e72', 1);

      // Icon binh chủng thu nhỏ
      const spr = getSprite(u.id, 'player', false);
      const iconX = Math.round(sx + HUD_SLOT_W / 2 - spr.width / 2);
      ctx.drawImage(spr, iconX, HUD_TOP + 12);

      // Giá vàng
      drawPixelText(ctx, `${u.cost}G`, sx + HUD_SLOT_W / 2, HUD_TOP + 30, canAfford ? '#ffffff' : '#ff7675', 1, 'c');
    }

    // 4. 3 Ô Kỹ năng chỉ huy (Spells)
    for (let i = 0; i < 3; i++) {
      const sp = SPELL_DEFINITIONS[i];
      const sx = HUD_SPELL_START_X + i * (HUD_SPELL_SLOT_W + 2);
      const cd = this.spellCooldowns[i];
      const canCast = this.mana >= sp.mana && cd <= 0;

      px(ctx, sx, HUD_TOP + 3, HUD_SPELL_SLOT_W, 35, canCast ? '#162b47' : '#0f1a2b');
      px(ctx, sx, HUD_TOP + 3, HUD_SPELL_SLOT_W, 2, canCast ? '#0984e3' : '#1e3799');
      px(ctx, sx, HUD_TOP + 37, HUD_SPELL_SLOT_W, 1, '#08060f');

      drawPixelText(ctx, `[${sp.key}]`, sx + 2, HUD_TOP + 6, '#54a0ff', 1);
      drawPixelText(ctx, sp.name.substring(0, 3), sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 16, '#ffffff', 1, 'c');

      if (cd > 0) {
        drawPixelText(ctx, `${Math.ceil(cd)}S`, sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 28, '#ee5253', 1, 'c');
      } else {
        drawPixelText(ctx, `${sp.mana}M`, sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 28, canCast ? '#54a0ff' : '#636e72', 1, 'c');
      }
    }
  }

  loop(time) {
    const dt = clamp((time - this.lastTime) / 1000, 0, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    requestAnimationFrame(t => this.loop(t));
  }
}

// ---------- 10. KHỞI TẠO GAME KHI TẢI TRANG ----------
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new PixelKingdomEngine(canvas);
});
