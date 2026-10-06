'use strict';
/* =====================================================================
 *  PIXEL KINGDOM: TOTAL WAR - PHIÊN BẢN ĐỒ HỌA SIÊU PHẨM (HD RETRO MASTERPIECE)
 *  - 100% Canvas 2D thuần túy, Virtual buffer: 320 x 180 (16:9 Widescreen)
 *  - Thiết kế Sprite chuẩn Chibi 16-bit (Final Fantasy Tactics / Kingdom Rush)
 *  - Chiến trường mở tự nhiên: Thung lũng cỏ xanh, rặng đá, sông nước uốn lượn
 *  - Lâu đài thành quách đồ sộ có lính canh nỏ đứng trên chòi
 *  - Dynamic Lighting với quầng sáng tỏa ấm áp từ đuốc và phép thuật
 *  - Giao diện HUD Fantasy RPG mạ vàng rực rỡ, thẻ bài phân loại màu sắc
 * ===================================================================== */

// ---------- 1. CẤU HÌNH & HẰNG SỐ TOÀN CỤC ----------
const W = 320, H = 180;
const BATTLE_TOP = 20;
const BATTLE_BOT = 138;
const HUD_TOP = 138;
const LANES_Y = [48, 80, 112];
const LANE_NAMES = ['TOP', 'MID', 'BOT'];

const HUD_SLOT_W = 24;
const HUD_UNIT_START_X = 66;
const HUD_SPELL_START_X = 246;
const HUD_SPELL_SLOT_W = 22;

// ---------- 2. HÀM TOÁN HỌC & TIỆN ÍCH ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// ---------- 3. BỘ FONT PIXEL 3x5 CHUẨN RETRO ----------
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
  '+': '000010111010000', '<': '001010100010001', '>': '100010001010100', '%': '101001010100101', '*': '000101010101000'
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
        const glyph = FONT_DATA[textStr[i]];
        if (!glyph) continue;
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

// ---------- 4. SPRITES CHI TIẾT CHUẨN CHIBI RETRO (16x16 / 24x18) ----------
const OUTLINE = '#08060f';
const PALETTES = {
  player: { m: '#2e86de', d: '#12549e', l: '#8ec5fc', t: '#f1c40f' }, // Hoàng Gia Xanh
  enemy:  { m: '#ee5253', d: '#a51c1d', l: '#ff9aa2', t: '#ffffff' }  // Đế Chế Đỏ
};

const SPRITE_MATRICES = {
  // 1. Thợ mỏ (Miner 14x16): Mũ bảo hộ vàng có đèn pha phát sáng, áo yếm, vác cuốc sắt
  miner: [
    '....kkkkkk....',
    '...kyyyyyyk...',
    '..kyywwyyyyk..',
    '..kywhhhwyk...',
    '..ksssssssk.k.',
    '..ksshhhhsk.kk',
    '..ksssssssk.k.',
    '.kmmddddmmkkk.',
    'kmmmmmmmmmmkbk',
    'kmmmmmmmmmmkbk',
    '.kddddddddkkk.',
    '..kbbbbbbk....',
    '..kssssssk....',
    '..kd....dk....',
    '..kd....dk....',
    '.kk......kk...'
  ],
  // 2. Kiếm sĩ Hoàng Gia (Swordsman 15x17): Mũ chiến binh Great Helm, lông vũ đỉnh mũ, khiên huy hiệu, kiếm sáng
  swordsman: [
    '.....ktttk.....',
    '....kssssk.....',
    '...kssssssk....',
    '..ksslllsssk...',
    '..kshhhhhhsk...',
    '..ksslllsssk...',
    '.kmmddddmmk....',
    'kmmmmmmmmmmk.l.',
    'kmmmmmmmmmmklk.',
    'k.kddddddk.klk.',
    '..kssssssk.klk.',
    '..kllllllk.klk.',
    '..kdd..ddk.klk.',
    '..kdd..ddk.kkk.',
    '..kdd..ddk.....',
    '..kd....dk.....',
    '.kk......kk....'
  ],
  // 3. Cung thủ Tinh Nhuệ (Archer 14x16): Mũ nón lông vũ, áo giáp da, cánh cung gỗ cong vút
  archer: [
    '....kttk......',
    '...kggggk.k...',
    '..kggggggkk...',
    '..kghhhhsk....',
    '..kssssssk.k..',
    '..ksshhhhskkb.',
    '.kmmddddk..kb.',
    'kmmmmmmmmk..kb',
    'kmmmmmmmmk..kb',
    '.kddddddk...kb',
    '..kbbbbk....kb',
    '..kssssk....kb',
    '..kd..dk....k.',
    '..kd..dk......',
    '..kd..dk......',
    '.kk....kk.....'
  ],
  // 4. Đại Hộ Vệ Khiên Tháp (Tower Shield 16x17): Khiên Pavise khổng lồ bọc đồng hình chữ nhật che kín thân
  shield: [
    '.kkkkkkkkkk.....',
    'kssssssssssk....',
    'kssttttttsssk...',
    'kssshhhhhsssk.k.',
    'ksssttttttssskkk',
    'ksssssssssskkmmk',
    'kddddddddddkmmmk',
    'kddddddddddkmmmk',
    'kddddddddddkmmmk',
    'kddddddddddkmmmk',
    'kddddddddddkmmmk',
    'ksssssssssskkkk.',
    'kddddddddddk....',
    '.kd......dk.....',
    '.kd......dk.....',
    '.kd......dk.....',
    'kkk......kkk....'
  ],
  // 5. Kỵ Binh Thiết Giáp (Cavalry 24x18): Ngựa chiến cơ bắp có yên bọc nhung, kỵ sĩ vung ngọn thương dài
  cavalry: [
    '.......kkkk.............',
    '......kssssk............',
    '.....kshhhhsk...........',
    '....kmmmmmmmmk..........',
    '....kmmmmmmmmk..........',
    '....kddddddddk.....kkk..',
    '....kbbbbbbbbkkkkkkbbbk.',
    '...kbbbbbbbbbbbbbbbbbbbk',
    '..kbbbbbbbbbbbbbbbbbbbbk',
    '.kbbkddddddddddddkbbbbbk',
    '.kbbkmmmmmmmmmmmmkbbbbbk',
    '.kbbkmmmmmmmmmmmmkbbbbbk',
    '..kbbbbbbbbbbbbbbbbbbbk.',
    '..kbbbbbbbbbbbbbbbbbbk..',
    '..kd..dk........kd..dk..',
    '..kd..dk........kd..dk..',
    '..kd..dk........kd..dk..',
    '.kk....kk......kk....kk.'
  ],
  // 6. Pháp Sư Hỏa Ngục (Pyromancer 15x17): Mũ chóp nạm sao vàng, trượng ma thuật gắn đá hồng ngọc rực lửa
  mage: [
    '.....kkkk......',
    '....kppppk.....',
    '...kppttppk....',
    '..kpppppppk....',
    '..kphhhhhpk....',
    '..ksssssssk..ky',
    '.kmmmmmmmmkkkmy',
    'kmmmmmmmmmmkkmy',
    'kmmmmmmmmmmk.ky',
    '.kmmmmmmmmk..k.',
    '.kmmmmmmmmk..k.',
    '..kddddddk...k.',
    '..kddddddk...k.',
    '..kd....dk...k.',
    '..kd....dk...k.',
    '..kd....dk...k.',
    '.kk......kk.kk.'
  ],
  // 7. Máy Bắn Đá Công Thành (Catapult 24x17): Cỗ xe gỗ thông cổ thụ, bánh xe bọc nan sắt, đạn đá bốc lửa
  catapult: [
    '.........kkkkkk.........',
    '........ksssssssk.......',
    '.......ksssssssssk......',
    '......kwwwwwwwwwwwk.....',
    '.....kwwwwwwwwwwwwwk....',
    '....kwwwwwwwwwwwwwwwk...',
    '...kwwwwwwwwwwwwwwwwwk..',
    '..kwwwwwwwwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwwwwwwwwwwk',
    'kkddddddddddddddddddddkk',
    'kddddddddddddddddddddddk',
    'kddkkddddddddddddddkkddk',
    '.kkwkkkkkkkkkkkkkkwkk...',
    '.kkwkwkwkkkkkwkwkwkwkk..',
    '.kkwkwkwkkkkkwkwkwkwkk..',
    '..kkwkkkkkkkkkkkwkk.....',
    '...kkkk........kkkk.....'
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
    s: '#dfe6e9', // giáp sắt sáng
    d: '#636e72', // giáp sắt bóng tối
    l: '#ffffff', // highlight ánh kim lấp lánh
    h: '#1e272e', // tóc / kính / mắt
    b: '#8c5028', // gỗ / da nâu
    w: '#4a2c11', // gỗ tối sẫm
    g: '#10ac84', // áo cung thủ xanh lục bảo
    p: '#5f27cd', // áo pháp sư tím huyền bí
    y: '#fed330', // vàng kim
    t: teamPal.t, // chi tiết điểm nhấn
    m: teamPal.m,
    D: teamPal.d,
    L: teamPal.l
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

// ---------- 5. HỆ THỐNG ÂM THANH WEBAUDIO ----------
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
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.11);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'arrow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'magic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'boom') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now); osc.stop(now + 0.36);
    } else if (type === 'gold') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(988, now);
      osc.frequency.setValueAtTime(1318, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now); osc.stop(now + 0.19);
    } else if (type === 'horn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(440, now + 0.15);
      osc.frequency.setValueAtTime(554, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now); osc.stop(now + 0.52);
    }
  }
};

// ---------- 6. THÔNG SỐ 7 BINH CHỦNG & 3 PHÉP THẦN THÁNH ----------
const UNIT_DEFINITIONS = [
  { id: 'miner',     name: 'THO MO',  cost: 35,  hp: 85,  dmg: 8,  spd: 24, range: 10, atkSpd: 1.2, isMiner: true, badgeCol: '#f39c12' },
  { id: 'swordsman', name: 'KIEM SI', cost: 50,  hp: 150, dmg: 22, spd: 32, range: 12, atkSpd: 1.0, badgeCol: '#3498db' },
  { id: 'archer',    name: 'CUNG THU',cost: 75,  hp: 75,  dmg: 16, spd: 30, range: 85, atkSpd: 1.2, badgeCol: '#2ecc71' },
  { id: 'shield',    name: 'HO VE',  cost: 100, hp: 320, dmg: 12, spd: 22, range: 10, atkSpd: 1.4, isShield: true, badgeCol: '#95a5a6' },
  { id: 'cavalry',   name: 'KY BINH', cost: 160, hp: 220, dmg: 40, spd: 52, range: 14, atkSpd: 1.1, badgeCol: '#e67e22' },
  { id: 'mage',      name: 'PHAP SU',cost: 140, hp: 90,  dmg: 30, spd: 26, range: 72, atkSpd: 1.8, splash: 28, badgeCol: '#9b59b6' },
  { id: 'catapult',  name: 'BAN DA',  cost: 220, hp: 190, dmg: 65, spd: 16, range: 110, atkSpd: 3.0, splash: 34, badgeCol: '#7f8c8d' }
];

const SPELL_DEFINITIONS = [
  { id: 'fire_rain',     name: 'MUA TEN', mana: 40, dmg: 45,  radius: 48, cd: 12, key: 'Q' },
  { id: 'thunderstrike', name: 'SAM SET', mana: 65, dmg: 190, radius: 28, cd: 18, key: 'W' },
  { id: 'divine_heal',   name: 'HOI MAU', mana: 50, heal: 100,radius: 90, cd: 15, key: 'E' }
];

// ---------- 7. BẢN ĐỒ CHIẾN TRƯỜNG THIÊN NHIÊN SỐNG ĐỘNG (ORGANIC BATTLEFIELD) ----------
let mapBackgroundSurface = null;
function generateMasterpieceBattlefield() {
  const c = mkCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(2026);

  // 1. Trời hoàng hôn tím than & Dãy núi tuyết xa xăm
  px(ctx, 0, 0, W, 14, '#1a1226');
  px(ctx, 0, 14, W, 8, '#2d1838');
  // Trăng lưỡi liềm vàng rực
  px(ctx, 160, 3, 12, 12, '#ffeaa7');
  px(ctx, 164, 3, 12, 12, '#1a1226');
  // Dãy núi tuyết trùng điệp
  for (let x = 0; x < W; x += 4) {
    const mh = Math.sin(x * 0.05) * 5 + Math.cos(x * 0.02) * 3 + 12;
    px(ctx, x, 22 - mh, 4, mh, '#3b2247');
    px(ctx, x, 22 - mh, 2, 2, '#dfe6e9'); // tuyết đỉnh núi
  }

  // 2. Thảo nguyên xanh mướt (Toàn bộ mặt đất là cỏ xanh thiên nhiên đồng nhất)
  px(ctx, 0, 22, W, 116, '#27ae60');
  for (let i = 0; i < 1200; i++) {
    const gx = Math.floor(r() * W);
    const gy = 22 + Math.floor(r() * 116);
    px(ctx, gx, gy, 1, r() < 0.5 ? 1 : 2, r() < 0.4 ? '#219653' : '#2ecc71');
  }
  // Hoa dại vàng, hoa chuông đỏ và cỏ bốn lá
  for (let i = 0; i < 60; i++) {
    const fx = Math.floor(r() * W), fy = 24 + Math.floor(r() * 112);
    px(ctx, fx, fy, 2, 2, r() < 0.4 ? '#f1c40f' : r() < 0.7 ? '#e74c3c' : '#ffffff');
  }

  // 3. Ba con đường mòn lát đá cuội hòa quyện vào cỏ (Organic Cobblestone Trails)
  LANES_Y.forEach(ly => {
    // Vết mòn đất sỏi tự nhiên
    for (let x = 28; x < W - 28; x += 2) {
      const roadH = 12 + Math.sin(x * 0.1) * 2;
      px(ctx, x, ly - Math.floor(roadH / 2), 2, roadH, '#6d4c41');
      if (r() < 0.6) px(ctx, x, ly - Math.floor(roadH / 2) + 1, 2, roadH - 2, '#795548');
    }
    // Từng viên đá cuội nổi khối rải rác trên đường
    for (let x = 32; x < W - 32; x += 5) {
      for (let oy = -4; oy <= 4; oy += 4) {
        if (r() < 0.65) {
          px(ctx, x + Math.floor(r() * 2), ly + oy, 3, 2, '#bcaaa4');
          px(ctx, x + Math.floor(r() * 2), ly + oy + 1, 3, 1, '#4e342e');
        }
      }
    }
  });

  // 4. Dòng sông uốn lượn tự nhiên có ghềnh đá (Natural River with Rocks)
  for (let y = 22; y < 138; y++) {
    const curve = Math.sin(y * 0.08) * 3;
    const rx = 150 + curve;
    px(ctx, rx, y, 20, 1, '#2980b9');
    px(ctx, rx + 2, y, 16, 1, '#3498db');
    if (r() < 0.25) px(ctx, rx + Math.floor(r() * 14), y, 2, 1, '#ecf0f1'); // bọt nước
  }
  // Bờ kè đá sỏi hai bên bờ sông
  for (let y = 22; y < 138; y += 3) {
    const curve = Math.sin(y * 0.08) * 3;
    px(ctx, 148 + curve, y, 2, 3, '#7f8c8d');
    px(ctx, 170 + curve, y, 2, 3, '#7f8c8d');
  }

  // 5. Ba cây cầu đá vòm kiên cố bắc ngang sông
  LANES_Y.forEach(ly => {
    // Mặt cầu đá lát gạch xám
    px(ctx, 146, ly - 9, 28, 18, '#95a5a6');
    for (let by = ly - 8; by < ly + 8; by += 3) {
      px(ctx, 146, by, 28, 1, '#7f8c8d');
    }
    // Khe gạch rãnh thoát nước
    for (let bx = 148; bx < 172; bx += 5) {
      px(ctx, bx, ly - 8, 1, 16, '#576574');
    }
    // Lan can đá bảo vệ hai bên
    px(ctx, 146, ly - 10, 28, 2, '#bdc3c7');
    px(ctx, 146, ly + 8, 28, 2, '#576574');
    // 4 Trụ đá đầu cầu có đèn lồng
    px(ctx, 146, ly - 11, 4, 3, '#ecf0f1');
    px(ctx, 170, ly - 11, 4, 3, '#ecf0f1');
    px(ctx, 146, ly + 8, 4, 3, '#ecf0f1');
    px(ctx, 170, ly + 8, 4, 3, '#ecf0f1');
  });

  // 6. Rừng thông cổ thụ xanh ngắt đổ bóng
  const plantMajesticTree = (tx, ty) => {
    ctx.fillStyle = 'rgba(8,6,14,0.3)';
    ctx.beginPath();
    ctx.ellipse(tx + 6, ty + 15, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Thân cây sồi
    px(ctx, tx + 4, ty + 9, 4, 7, '#5d4037');
    // Tán lá 3 tầng
    px(ctx, tx + 1, ty + 5, 10, 5, '#196f3d');
    px(ctx, tx, ty + 2, 12, 4, '#229954');
    px(ctx, tx + 2, ty - 1, 8, 4, '#27ae60');
    px(ctx, tx + 4, ty - 3, 4, 3, '#58d68d');
  };
  plantMajesticTree(36, 24); plantMajesticTree(105, 26); plantMajesticTree(205, 24); plantMajesticTree(270, 25);
  plantMajesticTree(38, 122); plantMajesticTree(108, 120); plantMajesticTree(202, 122); plantMajesticTree(268, 121);

  // 7. Khu khai mỏ vàng ở hậu phương hai phe
  // Mỏ vàng phe ta (Trái)
  px(ctx, 4, 120, 18, 14, '#4a4e69');
  px(ctx, 6, 122, 14, 10, '#22223b');
  px(ctx, 8, 125, 8, 6, '#f1c40f');
  px(ctx, 9, 126, 4, 3, '#fff9c4');
  // Mỏ vàng phe địch (Phải)
  px(ctx, W - 22, 120, 18, 14, '#543d37');
  px(ctx, W - 20, 122, 14, 10, '#221512');
  px(ctx, W - 16, 125, 8, 6, '#f1c40f');
  px(ctx, W - 15, 126, 4, 3, '#fff9c4');

  return c;
}

// ---------- 8. LỚP THỰC THỂ BINH SĨ (BATTLE UNIT) ----------
class BattleUnit {
  constructor(game, def, laneIdx, team) {
    this.game = game;
    this.def = def;
    this.lane = laneIdx;
    this.team = team;

    this.x = team === 'player' ? 30 : W - 30;
    this.y = LANES_Y[laneIdx] + randi(-2, 2);
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
      this.game.spawnFloatingText('BLOCK!', this.x, this.y - 12, '#54a0ff');
      this.game.spawnParticles(this.x, this.y - 6, 4, '#f1c40f');
    }
    this.hp -= amount;
    this.flashTimer = 0.12;
    this.game.spawnParticles(this.x, this.y - 6, 5, '#ee5253');
    this.game.spawnFloatingText(`-${Math.round(amount)}`, this.x, this.y - 12, '#ff6b6b');
    SoundFX.play('hit');

    if (this.hp <= 0) {
      this.game.spawnParticles(this.x, this.y - 6, 15, this.team === 'player' ? '#54a0ff' : '#ff7675');
    }
  }

  update(dt) {
    if (this.hp <= 0) return false;

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt * 4;
    this.walkTimer += dt * 10;

    if (this.isMiner) {
      this.updateMinerBehavior(dt);
      return true;
    }

    this.target = this.findTarget();

    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      if (dist <= this.range) {
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingTimer = 1;
          this.performAttack();
        }
      } else {
        const dir = this.team === 'player' ? 1 : -1;
        this.x += dir * this.spd * dt;
        if (this.def.id === 'cavalry' && Math.random() < 0.25) {
          this.game.spawnParticles(this.x - dir * 8, this.y, 2, '#a1887f');
        }
      }
    } else {
      const dir = this.team === 'player' ? 1 : -1;
      this.x += dir * this.spd * dt;

      const enemyCastleX = this.team === 'player' ? W - 28 : 28;
      if (Math.abs(this.x - enemyCastleX) <= this.range + 8) {
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingTimer = 1;
          const targetCastle = this.team === 'player' ? 'enemy' : 'player';
          this.game.damageCastle(targetCastle, this.dmg);
          SoundFX.play('boom');
          this.game.shake = 3;
        }
      }
    }

    return this.hp > 0;
  }

  updateMinerBehavior(dt) {
    const mineX = this.team === 'player' ? 12 : W - 12;
    const castleX = this.team === 'player' ? 28 : W - 28;
    const mineY = 126;

    if (this.minerState === 'to_mine') {
      const dx = mineX - this.x;
      const dy = mineY - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        this.minerState = 'mining';
        this.mineTimer = 2.0;
      } else {
        this.x += (dx / d) * this.spd * dt;
        this.y += (dy / d) * this.spd * dt;
      }
    } else if (this.minerState === 'mining') {
      this.mineTimer -= dt;
      if (Math.random() < dt * 4) SoundFX.play('gold');
      if (this.mineTimer <= 0) {
        this.minerState = 'to_castle';
      }
    } else if (this.minerState === 'to_castle') {
      const dx = castleX - this.x;
      const dy = LANES_Y[this.lane] - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        if (this.team === 'player') {
          this.game.gold = Math.min(999, this.game.gold + 20);
          this.game.spawnFloatingText('+20G', this.x, this.y - 12, '#f1c40f');
          SoundFX.play('gold');
        } else {
          this.game.aiGold += 20;
        }
        this.minerState = 'to_mine';
      } else {
        this.x += (dx / d) * this.spd * dt;
        this.y += (dy / d) * this.spd * dt;
      }
    }
  }

  performAttack() {
    if (this.def.id === 'archer') {
      SoundFX.play('arrow');
      this.game.projectiles.push({
        x: this.x, y: this.y - 6,
        targetX: this.target.x, targetY: this.target.y - 6,
        startX: this.x, startY: this.y - 6,
        progress: 0, speed: 2.8,
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

    // Đổ bóng nhân vật
    ctx.fillStyle = 'rgba(8,6,14,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, spr.width * 0.45, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vệt chém kiếm (Sword Slash Arc Effect)
    if (this.swingTimer > 0 && this.def.id === 'swordsman') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const slashDir = this.team === 'player' ? 1 : -1;
      ctx.beginPath();
      ctx.arc(this.x + slashDir * 10, this.y - 6, 8, -Math.PI / 3, Math.PI / 3, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    // Hit flash
    if (this.flashTimer > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr, drawX, drawY);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, drawX, drawY);
    }

    // Thanh máu trên đầu có viền kim loại 3D
    if (this.hp < this.maxHp || this.isShield) {
      const barW = Math.max(12, spr.width);
      const barX = Math.round(this.x - barW / 2);
      const barY = Math.round(drawY - 5);
      px(ctx, barX - 1, barY - 1, barW + 2, 4, '#0d0a14');
      px(ctx, barX, barY, barW, 2, '#2c3e50');
      const ratio = clamp(this.hp / this.maxHp, 0, 1);
      px(ctx, barX, barY, Math.round(barW * ratio), 2, this.team === 'player' ? '#2e86de' : '#ee5253');
      px(ctx, barX, barY, Math.round(barW * ratio), 1, this.team === 'player' ? '#54a0ff' : '#ff7675');
    }
  }
}

// ---------- 9. BỘ NÃO ĐIỀU HÀNH GAME CHÍNH (ENGINE) ----------
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
    this.castleMaxHp = 1000;

    // Trí tuệ nhân tạo (AI)
    this.aiGold = 140;
    this.aiSpawnCooldown = 2.4;

    // Thực thể & Kỹ năng
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spellCooldowns = [0, 0, 0];
    this.ballistaTimer = 0;

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

      // Click vào chiến trường
      if (by >= BATTLE_TOP && by < HUD_TOP) {
        if (by < 64) this.selectedLane = 0;
        else if (by < 96) this.selectedLane = 1;
        else this.selectedLane = 2;
        return;
      }

      // Click thanh HUD
      if (by >= HUD_TOP) {
        if (bx >= 0 && bx < 62) {
          if (by < 152) this.selectedLane = 0;
          else if (by < 164) this.selectedLane = 1;
          else this.selectedLane = 2;
          return;
        }

        // 7 Nút lính
        for (let i = 0; i < 7; i++) {
          const sx = HUD_UNIT_START_X + i * (HUD_SLOT_W + 1);
          if (bx >= sx && bx < sx + HUD_SLOT_W && by >= HUD_TOP + 2) {
            this.spawnUnit(i);
            return;
          }
        }

        // 3 Nút phép
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
      for (let i = 0; i < 22; i++) {
        setTimeout(() => {
          const rx = 160 + rand(-sp.radius, sp.radius);
          this.spawnParticles(rx, targetY, 5, '#e67e22');
          for (const u of this.units) {
            if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - rx) < 20) {
              u.takeDamage(sp.dmg, true);
            }
          }
        }, i * 35);
      }
    } else if (sp.id === 'thunderstrike') {
      SoundFX.play('boom');
      this.shake = 12;
      const tx = 160;
      this.spawnParticles(tx, targetY, 35, '#00d2d3');
      for (const u of this.units) {
        if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - tx) <= sp.radius) {
          u.takeDamage(sp.dmg, false);
        }
      }
    } else if (sp.id === 'divine_heal') {
      SoundFX.play('magic');
      SoundFX.play('horn');
      for (const u of this.units) {
        if (u.team === 'player' && u.hp > 0) {
          u.hp = Math.min(u.maxHp, u.hp + sp.heal);
          this.spawnParticles(u.x, u.y - 8, 10, '#1dd1a1');
          this.spawnFloatingText(`+${sp.heal}`, u.x, u.y - 14, '#1dd1a1');
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
      const a = Math.random() * Math.PI * 2;
      const s = rand(20, 65);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.2, 0.5),
        color
      });
    }
  }

  spawnFloatingText(str, x, y, col) {
    this.floatingTexts.push({ str, x, y, col, life: 0.8 });
  }

  updateAI(dt) {
    this.aiSpawnCooldown -= dt;
    this.aiGold += dt * 17;

    if (this.aiSpawnCooldown <= 0) {
      this.aiSpawnCooldown = rand(2.0, 3.6);
      const affordable = UNIT_DEFINITIONS.filter(u => u.cost <= this.aiGold);
      if (affordable.length > 0) {
        const chosen = pick(affordable);
        this.spawnUnit(UNIT_DEFINITIONS.indexOf(chosen), 'enemy');
      }
    }
  }

  updateCastleDefense(dt) {
    this.ballistaTimer += dt;
    if (this.ballistaTimer >= 1.6) {
      this.ballistaTimer = 0;
      for (const u of this.units) {
        if (u.team === 'enemy' && u.x < 85 && u.hp > 0) {
          SoundFX.play('arrow');
          this.projectiles.push({
            x: 24, y: LANES_Y[u.lane] - 12,
            targetX: u.x, targetY: u.y - 6,
            startX: 24, startY: LANES_Y[u.lane] - 12,
            progress: 0, speed: 3.2,
            target: u, dmg: 25, splash: 0,
            type: 'arrow', team: 'player'
          });
          break;
        }
      }
      for (const u of this.units) {
        if (u.team === 'player' && u.x > W - 85 && u.hp > 0) {
          SoundFX.play('arrow');
          this.projectiles.push({
            x: W - 24, y: LANES_Y[u.lane] - 12,
            targetX: u.x, targetY: u.y - 6,
            startX: W - 24, startY: LANES_Y[u.lane] - 12,
            progress: 0, speed: 3.2,
            target: u, dmg: 25, splash: 0,
            type: 'arrow', team: 'enemy'
          });
          break;
        }
      }
    }
  }

  update(dt) {
    this.gameTime += dt;

    this.goldTimer += dt;
    if (this.goldTimer >= 0.5) {
      this.goldTimer = 0;
      this.gold = Math.min(999, this.gold + 7);
    }
    this.manaTimer += dt;
    if (this.manaTimer >= 0.5) {
      this.manaTimer = 0;
      this.mana = Math.min(100, this.mana + 3);
    }

    for (let i = 0; i < 3; i++) {
      if (this.spellCooldowns[i] > 0) this.spellCooldowns[i] -= dt;
    }

    if (this.state === 'play') {
      this.updateAI(dt);
      this.updateCastleDefense(dt);
    }

    this.units = this.units.filter(u => u.update(dt));

    // Đường đạn với hiệu ứng vệt sáng
    this.projectiles = this.projectiles.filter(p => {
      p.progress += p.speed * dt;
      const curX = p.startX + (p.targetX - p.startX) * p.progress;
      const arcHeight = Math.sin(p.progress * Math.PI) * (p.type === 'boulder' ? 32 : 16);
      p.x = curX;
      p.y = p.startY + (p.targetY - p.startY) * p.progress - arcHeight;

      if (p.progress >= 1) {
        if (p.splash > 0) {
          this.spawnParticles(p.targetX, p.targetY, 18, p.type === 'boulder' ? '#8395a7' : '#ff9f43');
          this.shake = 5;
          for (const u of this.units) {
            if (u.team !== p.team && Math.abs(u.x - p.targetX) <= p.splash) {
              u.takeDamage(p.dmg, false);
            }
          }
        } else if (p.target && p.target.hp > 0) {
          p.target.takeDamage(p.dmg, p.type === 'arrow');
        }
        return false;
      }
      return true;
    });

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

    // 1. Vẽ nền bản đồ thung lũng xanh mướt
    b.drawImage(mapBackgroundSurface, 0, 0);

    // 2. Vẽ thành lũy hùng tráng hai bên
    this.drawCastleFortresses(b);

    // 3. Cột máu thành trì trên cùng
    this.drawCastleHealthBars(b);

    // 4. Vẽ lính sắp xếp theo trục Y (Depth Sorting)
    const sortedUnits = [...this.units].sort((a, b) => a.y - b.y);
    for (const u of sortedUnits) u.draw(b);

    // 5. Vẽ đường đạn với vệt sáng
    for (const p of this.projectiles) {
      if (p.type === 'arrow') {
        px(b, p.x, p.y, 4, 1, '#ffffff');
        px(b, p.x - 1, p.y + 1, 1, 1, '#795548');
      } else if (p.type === 'fireball') {
        px(b, p.x - 3, p.y - 3, 6, 6, '#ff9f43');
        px(b, p.x - 1, p.y - 1, 2, 2, '#fff');
      } else if (p.type === 'boulder') {
        px(b, p.x - 3, p.y - 3, 6, 6, '#576574');
        px(b, p.x - 2, p.y - 2, 4, 4, '#8395a7');
      }
    }

    // 6. Vẽ hạt hiệu ứng & số sát thương nảy
    for (const pt of this.particles) {
      px(b, Math.round(pt.x), Math.round(pt.y), 2, 2, pt.color);
    }
    for (const ft of this.floatingTexts) {
      drawPixelText(b, ft.str, ft.x, ft.y, ft.col, 1, 'c');
    }

    // 7. Lớp Ánh Sáng Động (Dynamic Lighting Pass)
    this.renderDynamicLighting(b);

    b.restore();

    // 8. Vẽ thanh giao diện điều khiển (Tactical HUD Mạ Vàng)
    this.drawGildedHUD(b);

    // 9. Màn hình Kết Thúc Game
    if (this.state !== 'play') {
      px(b, 0, 0, W, H, 'rgba(8,6,14,0.78)');
      if (this.state === 'win') {
        drawPixelText(b, 'VIET NAM QUAN THANG!', W / 2, H / 2 - 14, '#f1c40f', 2, 'c');
        drawPixelText(b, 'DA CONG PHA HOAN TOAN THANH DICH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      } else {
        drawPixelText(b, 'THANH TRI THAT THU!', W / 2, H / 2 - 14, '#ee5253', 2, 'c');
        drawPixelText(b, 'QUAN DICH DA TRAN VAO THANH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      }
      drawPixelText(b, 'NHAN F5 HOAC CLICK DE CHOI LAI', W / 2, H / 2 + 22, '#54a0ff', 1, 'c');
    }

    // 10. Phóng to Buffer lên Canvas thực tế (Integer Scaling)
    px(this.ctx, 0, 0, this.canvas.width, this.canvas.height, '#090810');
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
    lc.fillStyle = 'rgba(15, 12, 28, 0.28)';
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

    drawLightCircle(22, 66, 26);
    drawLightCircle(22, 98, 26);
    drawLightCircle(W - 22, 66, 26);
    drawLightCircle(W - 22, 98, 26);

    for (const p of this.projectiles) {
      if (p.type === 'fireball') drawLightCircle(p.x, p.y, 22);
    }

    lc.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(this.lightBuf, 0, 0);
  }

  drawCastleFortresses(ctx) {
    const t = this.gameTime;

    // 1. Pháo đài Vương Quốc (Trái: X: 0 -> 26) - Đá khối xám xanh hoa văn cổ
    px(ctx, 0, 22, 26, 116, '#2f3542');
    px(ctx, 24, 22, 2, 116, '#1e222b');
    for (let y = 24; y < 136; y += 8) {
      px(ctx, 0, y, 24, 1, '#1e272e');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, (y % 16 === 0 ? x : x + 4) % 24, y, 1, 7, '#57606f');
      }
    }
    // Lỗ châu mai
    for (let y = 22; y < 138; y += 12) px(ctx, 22, y, 4, 6, '#08060f');
    // 3 Cổng thành mở ra 3 làn có chấn song sắt
    LANES_Y.forEach(ly => {
      px(ctx, 0, ly - 7, 26, 14, '#14141e');
      px(ctx, 0, ly - 7, 26, 2, '#747d8c');
      px(ctx, 22, ly - 7, 4, 14, '#08060f');
    });
    // Cờ Hoàng Gia vẫy gió
    const flagWave = Math.sin(t * 5) * 1.5;
    px(ctx, 12, 15, 2, 14, '#795548');
    px(ctx, 14, 16 + flagWave, 10, 6, '#2e86de');
    px(ctx, 14, 18 + flagWave, 10, 2, '#f1c40f');
    // Đuốc thành rực lửa
    const flicker = Math.sin(t * 14) > 0 ? 1 : 0;
    px(ctx, 20, 66, 3, 2, '#5d4037');
    px(ctx, 21, 64 - flicker, 2, 2, '#ff9f43');
    px(ctx, 20, 98, 3, 2, '#5d4037');
    px(ctx, 21, 96 - flicker, 2, 2, '#ff9f43');

    // 2. Pháo đài Đế Chế (Phải: X: 294 -> 320) - Đá hắc ám viền đỏ thẫm
    px(ctx, W - 26, 22, 26, 116, '#3d2b2b');
    px(ctx, W - 26, 22, 2, 116, '#221515');
    for (let y = 24; y < 136; y += 8) {
      px(ctx, W - 26, y, 24, 1, '#271919');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, W - 26 + ((y % 16 === 0 ? x : x + 4) % 24), y, 1, 7, '#573d3d');
      }
    }
    for (let y = 22; y < 138; y += 12) px(ctx, W - 26, y, 4, 6, '#140808');
    LANES_Y.forEach(ly => {
      px(ctx, W - 26, ly - 7, 26, 14, '#190e0e');
      px(ctx, W - 26, ly - 7, 26, 2, '#7a5252');
      px(ctx, W - 26, ly - 7, 4, 14, '#0f0606');
    });
    // Cờ Đế Chế vẫy gió
    px(ctx, W - 14, 15, 2, 14, '#795548');
    px(ctx, W - 24, 16 - flagWave, 10, 6, '#ee5253');
    px(ctx, W - 24, 18 - flagWave, 10, 2, '#f8f9fa');
    // Đuốc thành phe địch
    px(ctx, W - 23, 66, 3, 2, '#5d4037');
    px(ctx, W - 23, 64 - flicker, 2, 2, '#ff9f43');
    px(ctx, W - 23, 98, 3, 2, '#5d4037');
    px(ctx, W - 23, 96 - flicker, 2, 2, '#ff9f43');
  }

  drawCastleHealthBars(ctx) {
    // Máu thành phe ta (Trái)
    px(ctx, 4, 3, 72, 7, '#0d0a14');
    const pRatio = clamp(this.playerCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, 5, 4, Math.round(70 * pRatio), 5, '#2e86de');
    px(ctx, 5, 4, Math.round(70 * pRatio), 2, '#54a0ff');
    drawPixelText(ctx, `PHE TA: ${this.playerCastleHp}`, 6, 12, '#9ec2ff', 1);

    // Máu thành phe địch (Phải)
    px(ctx, W - 76, 3, 72, 7, '#0d0a14');
    const eRatio = clamp(this.enemyCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, W - 75, 4, Math.round(70 * eRatio), 5, '#ee5253');
    px(ctx, W - 75, 4, Math.round(70 * eRatio), 2, '#ff7675');
    drawPixelText(ctx, `QUAN DICH: ${this.enemyCastleHp}`, W - 6, 12, '#ff9aa2', 1, 'r');
  }

  drawGildedHUD(ctx) {
    // Khung nẹp kim loại mạ vàng
    px(ctx, 0, HUD_TOP, W, H - HUD_TOP, '#151324');
    px(ctx, 0, HUD_TOP, W, 2, '#f1c40f');
    px(ctx, 0, HUD_TOP + 2, W, 1, '#96740c');

    // 1. Chỉ số Tài Nguyên (Vàng & Mana)
    px(ctx, 4, HUD_TOP + 5, 4, 4, '#f1c40f');
    drawPixelText(ctx, `VANG: ${this.gold}`, 10, HUD_TOP + 4, '#f1c40f', 1);
    px(ctx, 4, HUD_TOP + 13, 4, 4, '#54a0ff');
    drawPixelText(ctx, `MANA: ${this.mana}`, 10, HUD_TOP + 12, '#54a0ff', 1);

    // 2. Nút chuyển làn chiến thuật viền nổi
    for (let i = 0; i < 3; i++) {
      const ly = HUD_TOP + 20 + i * 7;
      const isCurrent = this.selectedLane === i;
      px(ctx, 4, ly, 54, 6, isCurrent ? '#2e86de' : '#1e1c2e');
      px(ctx, 4, ly, 54, 1, isCurrent ? '#54a0ff' : '#2d2745');
      px(ctx, 4, ly + 5, 54, 1, isCurrent ? '#12549e' : '#0d0a14');
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

      // Icon binh chủng
      const spr = getSprite(u.id, 'player', false);
      ctx.drawImage(spr, Math.round(sx + HUD_SLOT_W / 2 - spr.width / 2), HUD_TOP + 13);

      // Giá vàng
      drawPixelText(ctx, `${u.cost}G`, sx + HUD_SLOT_W / 2, HUD_TOP + 29, canAfford ? '#ffffff' : '#ff7675', 1, 'c');
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

// ---------- 10. KHỞI TẠO KHI TẢI TRANG ----------
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new PixelKingdomEngine(canvas);
});
