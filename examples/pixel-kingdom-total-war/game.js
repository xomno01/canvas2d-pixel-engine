'use strict';
/* =====================================================================
 *  PIXEL KINGDOM: TOTAL WAR - ĐẠI CHIẾN VƯƠNG QUỐC PIXEL
 *  Đồ họa thuần Canvas 2D Retro (Kỹ thuật từ Canvas 2D Pixel Engine)
 *  - Virtual Framebuffer: 320 x 180 (Widescreen 16:9)
 *  - 100% Canvas, Zero external dependencies
 *  - 3 Làn chiến thuật, Khai thác mỏ vàng, 7 Binh chủng, 3 Phép thần thánh
 * ===================================================================== */

// ---------- 1. CẤU HÌNH & HẰNG SỐ TOÀN CỤC ----------
const W = 320, H = 180;
const BATTLE_TOP = 22;
const BATTLE_BOT = 142;
const HUD_TOP = 142;
const LANES_Y = [50, 82, 114];
const LANE_NAMES = ['TOP', 'MID', 'BOT'];

const HUD_SLOT_W = 24;
const HUD_UNIT_START_X = 64;
const HUD_SPELL_START_X = 244;
const HUD_SPELL_SLOT_W = 23;

// ---------- 2. HÀM TOÁN HỌC & TIỆN ÍCH ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// ---------- 3. PIXEL FONT 3x5 CHUẨN RETRO ----------
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

// ---------- 4. SPRITES PIXEL ART CHI TIẾT (CHARACTER-MATRIX) ----------
const OUTLINE = '#110c1c';
const PALETTES = {
  player: { m: '#3a76e8', d: '#1e4896', l: '#8ab4ff', t: '#ffd438' }, // Hoàng Gia Xanh
  enemy:  { m: '#e03a3a', d: '#8a1818', l: '#ff8585', t: '#ffffff' }  // Đế Chế Đỏ
};

const SPRITE_MATRICES = {
  // 1. Thợ mỏ (12x14)
  miner: [
    '...kyyyyk...',
    '..kyyyyyyk..',
    '..kywhhwyk..',
    '..kssssssk..',
    '..kmmddmmk.b',
    '.kmmmmmmmmkbb',
    'k.kmmmmmmk.b',
    '..kddddddk..',
    '..kbbbbbbk..',
    '..kssssssk..',
    '..kd....dk..',
    '..kd....dk..',
    '.kk......kk.'
  ],
  // 2. Kiếm sĩ (12x14)
  swordsman: [
    '....kkkk....',
    '...kssssk...',
    '..kssssssk..',
    '..kshsshsk..',
    '..kssssssk..',
    '..kmmddmmk..',
    '.kmmmmmmmmk.',
    'k.kmmmmmmk.k',
    'l..kddddk..l',
    'l..kssssk..l',
    '...kllllk...',
    '...kd..dk...',
    '...kd..dk...',
    '..kk....kk..'
  ],
  // 3. Cung thủ (11x14)
  archer: [
    '...kkkk....',
    '..kggggk...',
    '.kggggggk..',
    '.kghsshhk..',
    '.kggggggk..',
    '..kmmddk...',
    '.kmmmmmmkb.',
    '.kmmmmmmk.b',
    '..kddddk..b',
    '..kssssk.b.',
    '..kllllk...',
    '..kd..dk...',
    '..kd..dk...',
    '.kk....kk..'
  ],
  // 4. Đại hộ vệ khiên sắt (14x14)
  shield: [
    '..kkkkkkk.....',
    '.ksssssssk....',
    '.kshsssshk....',
    '.ksssssssk.kk.',
    'kmmmmmmmmkkmmk',
    'kmmmmmmmmkmmmk',
    'kmmmmmmmmkmmmk',
    'kddddddddkmmmk',
    'kddddddddkmmmk',
    'kddddddddkmmmk',
    '.kd....dk.kkk.',
    '.kd....dk.....',
    '.kd....dk.....',
    'kkk....kkk....'
  ],
  // 5. Kỵ binh thiết giáp (20x16)
  cavalry: [
    '......kkkk..........',
    '.....kssssk.........',
    '....kshssssk........',
    '...kmmmmmmmmk.......',
    '...kmmmmmmmmk.......',
    '...kddddddddk...kkk.',
    '...kbbbbbbbbkkkkbbbk',
    '..kbbbbbbbbbbbbbbbbk',
    '.kbbbbbbbbbbbbbbbbbk',
    '.kbbbbbbbbbbbbbbbbbk',
    '.kbbbbbbbbbbbbbbbbbk',
    '..kbbbbbbbbbbbbbbbk.',
    '..kd..dk....kd..dk..',
    '..kd..dk....kd..dk..',
    '..kd..dk....kd..dk..',
    '.kk....kk..kk....kk.'
  ],
  // 6. Pháp sư hỏa ngục (12x15)
  mage: [
    '....kkk.....',
    '...kpppk....',
    '..kpppppk...',
    '..kphsshpk..',
    '..kssssssk..',
    '.kmmmmmmmmky',
    'kmmmmmmmmmmk',
    'kmmmmmmmmmmk',
    '.kmmmmmmmmk.',
    '.kmmmmmmmmk.',
    '..kddddddk..',
    '..kddddddk..',
    '..kddddddk..',
    '...kd..dk...',
    '..kk....kk..'
  ],
  // 7. Máy bắn đá (18x14)
  catapult: [
    '......kkkkk.......',
    '.....ksssssk......',
    '....ksssssssk.....',
    '...kwwwwwwwwwk....',
    '...kwwwwwwwwwk....',
    '..kwwwwwwwwwwwk...',
    '.kwwwwwwwwwwwwwk..',
    '.kwwwwwwwwwwwwwk..',
    'kkdddddddddddddkkk',
    'kddddddddddddddddk',
    'kddkkddddddddkkddk',
    '.kkwwkkkkkkkkwwkk.',
    '.kkwwkkkkkkkkwwkk.',
    '..kkkk......kkkk..'
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
    s: '#c8d6e5', // giáp sắt sáng
    d: '#718093', // giáp sắt tối
    l: '#f5f6fa', // viền kim loại sáng
    h: '#1b1b24', // tóc/mắt
    b: '#7a4f2d', // gỗ/ngựa nâu
    w: '#4a2c11', // gỗ tối
    g: '#2ed573', // áo cung thủ
    p: '#8854d0', // áo pháp sư
    y: '#fed330', // vàng mũ thợ mỏ
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

// ---------- 5. HỆ THỐNG ÂM THANH TỔNG HỢP (WEBAUDIO) ----------
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
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
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
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'magic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.linearRampToValueAtTime(840, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'boom') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
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
  { id: 'miner',     name: 'THO MO',  cost: 35,  hp: 75,  dmg: 8,  spd: 24, range: 10, atkSpd: 1.2, isMiner: true },
  { id: 'swordsman', name: 'KIEM SI', cost: 50,  hp: 140, dmg: 19, spd: 32, range: 12, atkSpd: 1.0 },
  { id: 'archer',    name: 'CUNG THU',cost: 75,  hp: 70,  dmg: 15, spd: 30, range: 80, atkSpd: 1.2 },
  { id: 'shield',    name: 'HO VE',  cost: 100, hp: 300, dmg: 11, spd: 22, range: 10, atkSpd: 1.4, isShield: true },
  { id: 'cavalry',   name: 'KY BINH', cost: 160, hp: 210, dmg: 38, spd: 50, range: 14, atkSpd: 1.1 },
  { id: 'mage',      name: 'PHAP SU',cost: 140, hp: 85,  dmg: 28, spd: 26, range: 68, atkSpd: 1.8, splash: 26 },
  { id: 'catapult',  name: 'BAN DA',  cost: 220, hp: 180, dmg: 60, spd: 16, range: 105, atkSpd: 3.0, splash: 32 }
];

const SPELL_DEFINITIONS = [
  { id: 'fire_rain',     name: 'MUA TEN', mana: 40, dmg: 40,  radius: 45, cd: 12, key: 'Q' },
  { id: 'thunderstrike', name: 'SAM SET', mana: 65, dmg: 180, radius: 26, cd: 18, key: 'W' },
  { id: 'divine_heal',   name: 'HOI MAU', mana: 50, heal: 90, radius: 80, cd: 15, key: 'E' }
];

// ---------- 7. SINH NỀN BẢN ĐỒ CHI TIẾT (PROCEDURAL MAP) ----------
let mapBackgroundSurface = null;
function generateBattlefieldSurface() {
  const c = mkCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(2026);

  // 1. Trời đêm & Núi non hậu cảnh
  px(ctx, 0, 0, W, 22, '#141224');
  px(ctx, 0, 16, W, 6, '#211d38');
  // Trăng lưỡi liềm pixel
  px(ctx, 160, 4, 10, 10, '#fef1b8');
  px(ctx, 163, 4, 10, 10, '#141224');

  // 2. Thảm cỏ xanh có hạt sỏi và hoa
  px(ctx, 0, 22, W, 120, '#2b6e30');
  for (let i = 0; i < 900; i++) {
    const gx = Math.floor(r() * W);
    const gy = 22 + Math.floor(r() * 120);
    px(ctx, gx, gy, 1, r() < 0.5 ? 1 : 2, r() < 0.5 ? '#225927' : '#35853b');
  }
  // Hoa dại
  for (let i = 0; i < 45; i++) {
    const fx = Math.floor(r() * W), fy = 24 + Math.floor(r() * 115);
    px(ctx, fx, fy, 2, 2, r() < 0.5 ? '#ffe066' : '#ffffff');
  }

  // 3. 3 Làn đường đất sỏi
  LANES_Y.forEach(ly => {
    px(ctx, 28, ly - 8, W - 56, 16, '#5a4533');
    for (let i = 0; i < 350; i++) {
      const rx = 28 + Math.floor(r() * (W - 56));
      const ry = ly - 8 + Math.floor(r() * 16);
      px(ctx, rx, ry, 1, 1, r() < 0.5 ? '#463424' : '#6f543e');
    }
    // Gờ viền cỏ ven đường
    for (let x = 28; x < W - 28; x += 4) {
      px(ctx, x, ly - 9, 2, 1, '#1a471e');
      px(ctx, x + 2, ly + 8, 2, 1, '#1a471e');
    }
  });

  // 4. Dòng sông uốn lượn ở giữa (X: 150 - 170)
  px(ctx, 150, 22, 20, 120, '#1f629c');
  for (let y = 22; y < 142; y += 2) {
    px(ctx, 151 + Math.floor(r() * 17), y, randi(2, 4), 1, '#3caea3');
  }
  for (let y = 22; y < 142; y += 3) {
    px(ctx, 149, y, 2, 2, '#485252');
    px(ctx, 169, y, 2, 2, '#485252');
  }

  // 5. 3 Cây cầu đá kiên cố
  LANES_Y.forEach(ly => {
    px(ctx, 147, ly - 9, 26, 18, '#7b8889');
    for (let by = ly - 8; by < ly + 8; by += 4) {
      px(ctx, 147, by, 26, 1, '#4f5757');
    }
    px(ctx, 147, ly - 10, 26, 2, '#b8c3c4');
    px(ctx, 147, ly + 8, 26, 2, '#4f5757');
    px(ctx, 147, ly - 11, 4, 3, '#eaf0f0');
    px(ctx, 169, ly - 11, 4, 3, '#eaf0f0');
    px(ctx, 147, ly + 8, 4, 3, '#eaf0f0');
    px(ctx, 169, ly + 8, 4, 3, '#eaf0f0');
  });

  // 6. Rừng thông xanh rì rào trang trí
  const plantTree = (tx, ty) => {
    px(ctx, tx + 4, ty + 10, 3, 5, '#482a10');
    px(ctx, tx + 2, ty + 2, 7, 9, '#1b5022');
    px(ctx, tx, ty + 4, 11, 6, '#287531');
    px(ctx, tx + 3, ty, 5, 4, '#3f9b43');
  };
  plantTree(38, 25); plantTree(105, 27); plantTree(205, 25); plantTree(270, 26);
  plantTree(40, 124); plantTree(110, 122); plantTree(200, 124); plantTree(265, 123);

  // 7. Khu khai mỏ vàng ở hậu phương hai phe
  // Mỏ vàng phe ta (Trái)
  px(ctx, 6, 124, 14, 10, '#3a3a46');
  px(ctx, 8, 126, 10, 6, '#141224'); // cửa hầm
  px(ctx, 10, 128, 6, 4, '#fed330'); // quặng vàng
  // Mỏ vàng phe địch (Phải)
  px(ctx, W - 20, 124, 14, 10, '#463a3a');
  px(ctx, W - 18, 126, 10, 6, '#141224');
  px(ctx, W - 16, 128, 6, 4, '#fed330');

  return c;
}

// ---------- 8. LỚP THỰC THỂ BINH SĨ (UNIT LOGIC) ----------
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

    // Logic riêng cho Thợ mỏ (Miner)
    this.minerState = 'to_mine'; // to_mine, mining, to_castle
    this.mineTimer = 0;
  }

  takeDamage(amount, isRangedArrow = false) {
    if (this.isShield && isRangedArrow) {
      amount *= 0.3; // Giảm 70% sát thương từ cung tên
      this.game.spawnFloatingText('BLOCK!', this.x, this.y - 12, '#8ab4ff');
    }
    this.hp -= amount;
    this.flashTimer = 0.12;
    this.game.spawnParticles(this.x, this.y - 6, 4, '#e03a3a');
    this.game.spawnFloatingText(`-${Math.round(amount)}`, this.x, this.y - 12, '#ff6b6b');
    SoundFX.play('hit');

    if (this.hp <= 0) {
      this.game.spawnParticles(this.x, this.y - 6, 12, this.team === 'player' ? '#8ab4ff' : '#ff8585');
    }
  }

  update(dt) {
    if (this.hp <= 0) return false;

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt * 4;
    this.walkTimer += dt * 10;

    // 1. Thợ mỏ tự động đi khai khoáng và nạp vàng
    if (this.isMiner) {
      this.updateMinerBehavior(dt);
      return true;
    }

    // 2. Tìm mục tiêu trên cùng làn
    this.target = this.findTarget();

    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      if (dist <= this.range) {
        // Tấn công mục tiêu
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingTimer = 1;
          this.performAttack();
        }
      } else {
        // Di chuyển tiếp cận
        const dir = this.team === 'player' ? 1 : -1;
        this.x += dir * this.spd * dt;
      }
    } else {
      // Tiến công về thành đối phương
      const dir = this.team === 'player' ? 1 : -1;
      this.x += dir * this.spd * dt;

      // Đánh sập cổng thành đối phương nếu áp sát
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
    const mineY = 128;

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
          this.game.gold = Math.min(999, this.game.gold + 18);
          this.game.spawnFloatingText('+18G', this.x, this.y - 12, '#ffd438');
          SoundFX.play('gold');
        } else {
          this.game.aiGold += 18;
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
        progress: 0, speed: 2.6,
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
      // Đòn đánh cận chiến
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

    // Hit flash
    if (this.flashTimer > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr, drawX, drawY);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, drawX, drawY);
    }

    // Thanh máu trên đầu
    if (this.hp < this.maxHp || this.isShield) {
      const barW = Math.max(10, spr.width);
      const barX = Math.round(this.x - barW / 2);
      const barY = Math.round(drawY - 4);
      px(ctx, barX, barY, barW, 2, '#0c0a14');
      const ratio = clamp(this.hp / this.maxHp, 0, 1);
      px(ctx, barX, barY, Math.round(barW * ratio), 2, this.team === 'player' ? '#3a76e8' : '#e03a3a');
    }
  }
}

// ---------- 9. BỘ NÃO QUẢN TRỊ TRÒ CHƠI CHÍNH ----------
class PixelKingdomEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buf = mkCanvas(W, H);
    this.bctx = this.buf.getContext('2d', { alpha: false });
    this.bctx.imageSmoothingEnabled = false;

    // Tài nguyên & Chỉ huy
    this.gold = 160;
    this.mana = 60;
    this.goldTimer = 0;
    this.manaTimer = 0;
    this.selectedLane = 1; // 0: TOP, 1: MID, 2: BOT

    // Máu thành trì
    this.playerCastleHp = 1000;
    this.enemyCastleHp = 1000;
    this.castleMaxHp = 1000;

    // Trí tuệ nhân tạo (AI)
    this.aiGold = 130;
    this.aiSpawnCooldown = 2.5;

    // Thực thể & Kỹ năng
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spellCooldowns = [0, 0, 0];
    this.ballistaTimer = 0;

    // Trạng thái vận hành
    this.state = 'play'; // play, win, lose
    this.shake = 0;
    this.gameTime = 0;
    this.lastTime = performance.now();

    // Khởi tạo đồ họa
    mapBackgroundSurface = generateBattlefieldSurface();
    this.setupInputs();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    // Tỉ lệ scale số nguyên trong không gian màn hình
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
    // 1. Phím tắt Bàn phím PC
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

    // 2. Chạm cảm ứng & Click chuột chuẩn xác
    const handlePointerAction = (clientX, clientY) => {
      SoundFX.init();
      const rect = this.canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;

      const bx = Math.floor((cssX - this.cssOffsetX) / this.cssScale);
      const by = Math.floor((cssY - this.cssOffsetY) / this.cssScale);

      if (bx < 0 || bx >= W || by < 0 || by >= H) return;

      // Click trực tiếp vào 3 làn chiến trường
      if (by >= BATTLE_TOP && by < HUD_TOP) {
        if (by < 66) this.selectedLane = 0;
        else if (by < 98) this.selectedLane = 1;
        else this.selectedLane = 2;
        return;
      }

      // Click trên thanh điều khiển HUD
      if (by >= HUD_TOP) {
        // Nút chọn làn (bx: 0 -> 60)
        if (bx >= 0 && bx < 60) {
          if (by < 155) this.selectedLane = 0;
          else if (by < 167) this.selectedLane = 1;
          else this.selectedLane = 2;
          return;
        }

        // 7 Nút mua lính (X: 64 -> 236)
        for (let i = 0; i < 7; i++) {
          const sx = HUD_UNIT_START_X + i * (HUD_SLOT_W + 1);
          if (bx >= sx && bx < sx + HUD_SLOT_W && by >= HUD_TOP + 2) {
            this.spawnUnit(i);
            return;
          }
        }

        // 3 Nút phép thuật (X: 244 -> 316)
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
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const rx = 160 + rand(-sp.radius, sp.radius);
          this.spawnParticles(rx, targetY, 4, '#ff9a1f');
          for (const u of this.units) {
            if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - rx) < 18) {
              u.takeDamage(sp.dmg, true);
            }
          }
        }, i * 35);
      }
    } else if (sp.id === 'thunderstrike') {
      SoundFX.play('boom');
      this.shake = 12;
      const tx = 160;
      this.spawnParticles(tx, targetY, 30, '#7df9ff');
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
          this.spawnParticles(u.x, u.y - 8, 8, '#7dff8a');
          this.spawnFloatingText(`+${sp.heal}`, u.x, u.y - 14, '#7dff8a');
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
      const s = rand(20, 60);
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
    this.aiGold += dt * 16;

    if (this.aiSpawnCooldown <= 0) {
      this.aiSpawnCooldown = rand(2.2, 3.8);
      const affordable = UNIT_DEFINITIONS.filter(u => u.cost <= this.aiGold);
      if (affordable.length > 0) {
        const chosen = pick(affordable);
        this.spawnUnit(UNIT_DEFINITIONS.indexOf(chosen), 'enemy');
      }
    }
  }

  updateCastleDefense(dt) {
    this.ballistaTimer += dt;
    if (this.ballistaTimer >= 1.8) {
      this.ballistaTimer = 0;
      // Tháp nỏ phe ta bắn địch áp sát
      for (const u of this.units) {
        if (u.team === 'enemy' && u.x < 85 && u.hp > 0) {
          SoundFX.play('arrow');
          this.projectiles.push({
            x: 24, y: LANES_Y[u.lane] - 12,
            targetX: u.x, targetY: u.y - 6,
            startX: 24, startY: LANES_Y[u.lane] - 12,
            progress: 0, speed: 3.0,
            target: u, dmg: 22, splash: 0,
            type: 'arrow', team: 'player'
          });
          break;
        }
      }
      // Tháp nỏ phe địch bắn quân ta áp sát
      for (const u of this.units) {
        if (u.team === 'player' && u.x > W - 85 && u.hp > 0) {
          SoundFX.play('arrow');
          this.projectiles.push({
            x: W - 24, y: LANES_Y[u.lane] - 12,
            targetX: u.x, targetY: u.y - 6,
            startX: W - 24, startY: LANES_Y[u.lane] - 12,
            progress: 0, speed: 3.0,
            target: u, dmg: 22, splash: 0,
            type: 'arrow', team: 'enemy'
          });
          break;
        }
      }
    }
  }

  update(dt) {
    this.gameTime += dt;

    // Sản sinh tài nguyên thụ động
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

    // Cooldown phép thuật
    for (let i = 0; i < 3; i++) {
      if (this.spellCooldowns[i] > 0) this.spellCooldowns[i] -= dt;
    }

    if (this.state === 'play') {
      this.updateAI(dt);
      this.updateCastleDefense(dt);
    }

    // Cập nhật lính
    this.units = this.units.filter(u => u.update(dt));

    // Cập nhật đường đạn bay parabol
    this.projectiles = this.projectiles.filter(p => {
      p.progress += p.speed * dt;
      const curX = p.startX + (p.targetX - p.startX) * p.progress;
      const arcHeight = Math.sin(p.progress * Math.PI) * (p.type === 'boulder' ? 32 : 16);
      p.x = curX;
      p.y = p.startY + (p.targetY - p.startY) * p.progress - arcHeight;

      if (p.progress >= 1) {
        if (p.splash > 0) {
          this.spawnParticles(p.targetX, p.targetY, 15, p.type === 'boulder' ? '#718093' : '#ff9a1f');
          this.shake = 4;
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

    // Cập nhật hạt hiệu ứng
    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      return pt.life > 0;
    });

    // Cập nhật chữ số nổi
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

    // 1. Vẽ nền bản đồ đã nướng sẵn
    b.drawImage(mapBackgroundSurface, 0, 0);

    // 2. Vẽ tường thành, lỗ châu mai, cờ hiệu và đuốc
    this.drawCastleFortresses(b);

    // 3. Cột máu thành trì trên đỉnh màn hình
    this.drawCastleHealthBars(b);

    // 4. Vẽ lính sắp xếp theo trục Y (Depth Sorting)
    const sortedUnits = [...this.units].sort((a, b) => a.y - b.y);
    for (const u of sortedUnits) u.draw(b);

    // 5. Vẽ đường đạn
    for (const p of this.projectiles) {
      if (p.type === 'arrow') {
        px(b, p.x, p.y, 3, 1, '#ffffff');
        px(b, p.x - 1, p.y + 1, 1, 1, '#7a4f2d');
      } else if (p.type === 'fireball') {
        px(b, p.x - 2, p.y - 2, 4, 4, '#ff9a1f');
        px(b, p.x - 1, p.y - 1, 2, 2, '#fff4b8');
      } else if (p.type === 'boulder') {
        px(b, p.x - 2, p.y - 2, 4, 4, '#57606f');
        px(b, p.x - 1, p.y - 1, 2, 2, '#747d8c');
      }
    }

    // 6. Vẽ hạt hiệu ứng & số sát thương nảy
    for (const pt of this.particles) {
      px(b, Math.round(pt.x), Math.round(pt.y), 2, 2, pt.color);
    }
    for (const ft of this.floatingTexts) {
      drawPixelText(b, ft.str, ft.x, ft.y, ft.col, 1, 'c');
    }

    b.restore();

    // 7. Vẽ thanh giao diện điều khiển (Tactical HUD) ở đáy màn hình
    this.drawTacticalHUD(b);

    // 8. Màn hình Kết Thúc Game
    if (this.state !== 'play') {
      px(b, 0, 0, W, H, 'rgba(8,6,14,0.72)');
      if (this.state === 'win') {
        drawPixelText(b, 'VIET NAM QUAN THANG!', W / 2, H / 2 - 14, '#fed330', 2, 'c');
        drawPixelText(b, 'DA CONG PHA HOAN TOAN THANH DICH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      } else {
        drawPixelText(b, 'THANH TRI THAT THU!', W / 2, H / 2 - 14, '#ff4757', 2, 'c');
        drawPixelText(b, 'QUAN DICH DA TRAN VAO THANH', W / 2, H / 2 + 6, '#ffffff', 1, 'c');
      }
      drawPixelText(b, 'NHAN F5 HOAC CLICK DE CHOI LAI', W / 2, H / 2 + 22, '#8ab4ff', 1, 'c');
    }

    // 9. Phóng to Buffer lên Canvas thực tế (Integer Scaling)
    px(this.ctx, 0, 0, this.canvas.width, this.canvas.height, '#090810');
    this.ctx.drawImage(
      this.buf,
      0, 0, W, H,
      Math.floor(this.cssOffsetX * this.dpr),
      Math.floor(this.cssOffsetY * this.dpr),
      Math.floor(W * this.cssScale * this.dpr),
      Math.floor(H * this.cssScale * this.dpr)
    );

    // 10. Gợi ý xoay ngang nếu cầm dọc điện thoại
    if (window.innerWidth < window.innerHeight) {
      const hintY = Math.max(12 * this.dpr, Math.floor(this.cssOffsetY * this.dpr) - 24 * this.dpr);
      drawPixelText(
        this.ctx,
        'XOAY NGANG MAN HINH DE CHOI TO DEP',
        this.canvas.width / 2,
        hintY,
        '#fed330',
        Math.max(1, Math.round(this.dpr)),
        'c'
      );
    }
  }

  drawCastleFortresses(ctx) {
    const t = this.gameTime;

    // 1. Tường thành phe ta (Trái: X: 0 -> 26)
    px(ctx, 0, 22, 26, 120, '#353b48');
    px(ctx, 24, 22, 2, 120, '#1e222b');
    // Gạch đá tường thành
    for (let y = 24; y < 140; y += 8) {
      px(ctx, 0, y, 24, 1, '#272c36');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, (y % 16 === 0 ? x : x + 4) % 24, y, 1, 7, '#485460');
      }
    }
    // Lỗ châu mai
    for (let y = 22; y < 140; y += 12) px(ctx, 22, y, 4, 6, '#110c1c');
    // 3 Cổng thành mở ra 3 làn
    LANES_Y.forEach(ly => {
      px(ctx, 0, ly - 7, 26, 14, '#14141e');
      px(ctx, 0, ly - 7, 26, 2, '#57606f');
      px(ctx, 22, ly - 7, 4, 14, '#0c0a14');
    });
    // Cờ Hoàng Gia vẫy gió
    const flagWave = Math.sin(t * 5) * 1.5;
    px(ctx, 12, 15, 2, 14, '#7a4f2d');
    px(ctx, 14, 16 + flagWave, 10, 6, '#3a76e8');
    px(ctx, 14, 18 + flagWave, 10, 2, '#fed330');
    // Đuốc thành rực lửa
    const flicker = Math.sin(t * 14) > 0 ? 1 : 0;
    px(ctx, 20, 66, 3, 2, '#482a10');
    px(ctx, 21, 64 - flicker, 2, 2, '#ff9a1f');
    px(ctx, 20, 98, 3, 2, '#482a10');
    px(ctx, 21, 96 - flicker, 2, 2, '#ff9a1f');

    // 2. Tường thành phe địch (Phải: X: 294 -> 320)
    px(ctx, W - 26, 22, 26, 120, '#433434');
    px(ctx, W - 26, 22, 2, 120, '#271e1e');
    for (let y = 24; y < 140; y += 8) {
      px(ctx, W - 26, y, 24, 1, '#302424');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, W - 26 + ((y % 16 === 0 ? x : x + 4) % 24), y, 1, 7, '#594444');
      }
    }
    for (let y = 22; y < 140; y += 12) px(ctx, W - 26, y, 4, 6, '#1c0c0c');
    LANES_Y.forEach(ly => {
      px(ctx, W - 26, ly - 7, 26, 14, '#1e1414');
      px(ctx, W - 26, ly - 7, 26, 2, '#6f5757');
      px(ctx, W - 26, ly - 7, 4, 14, '#140c0c');
    });
    // Cờ Đế Chế vẫy gió
    px(ctx, W - 14, 15, 2, 14, '#7a4f2d');
    px(ctx, W - 24, 16 - flagWave, 10, 6, '#e03a3a');
    px(ctx, W - 24, 18 - flagWave, 10, 2, '#f5f6fa');
    // Đuốc thành phe địch
    px(ctx, W - 23, 66, 3, 2, '#482a10');
    px(ctx, W - 23, 64 - flicker, 2, 2, '#ff9a1f');
    px(ctx, W - 23, 98, 3, 2, '#482a10');
    px(ctx, W - 23, 96 - flicker, 2, 2, '#ff9a1f');
  }

  drawCastleHealthBars(ctx) {
    // Máu thành phe ta (Trái)
    px(ctx, 4, 3, 70, 7, '#110c1c');
    const pRatio = clamp(this.playerCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, 5, 4, Math.round(68 * pRatio), 5, '#3a76e8');
    drawPixelText(ctx, `PHE TA: ${this.playerCastleHp}`, 6, 12, '#8ab4ff', 1);

    // Máu thành phe địch (Phải)
    px(ctx, W - 74, 3, 70, 7, '#110c1c');
    const eRatio = clamp(this.enemyCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, W - 73, 4, Math.round(68 * eRatio), 5, '#e03a3a');
    drawPixelText(ctx, `QUAN DICH: ${this.enemyCastleHp}`, W - 6, 12, '#ff8585', 1, 'r');
  }

  drawTacticalHUD(ctx) {
    // Khung viền nền HUD
    px(ctx, 0, HUD_TOP, W, H - HUD_TOP, '#131120');
    px(ctx, 0, HUD_TOP, W, 2, '#2d2745');
    px(ctx, 0, HUD_TOP + 2, W, 1, '#090810');

    // 1. Chỉ số Tài Nguyên (Vàng & Mana)
    drawPixelText(ctx, `VANG: ${this.gold}`, 4, HUD_TOP + 4, '#fed330', 1);
    drawPixelText(ctx, `MANA: ${this.mana}`, 4, HUD_TOP + 12, '#4fc3f7', 1);

    // 2. Nút chuyển làn chiến thuật
    for (let i = 0; i < 3; i++) {
      const ly = HUD_TOP + 20 + i * 7;
      const isCurrent = this.selectedLane === i;
      px(ctx, 4, ly, 52, 6, isCurrent ? '#3a76e8' : '#1e1c2e');
      px(ctx, 4, ly, 52, 1, isCurrent ? '#8ab4ff' : '#2d2745');
      drawPixelText(ctx, `${i + 1}.${LANE_NAMES[i]}`, 6, ly + 1, isCurrent ? '#ffffff' : '#8884a0', 1);
    }

    // 3. 7 Thẻ chiêu mộ Binh Chủng
    for (let i = 0; i < 7; i++) {
      const u = UNIT_DEFINITIONS[i];
      const sx = HUD_UNIT_START_X + i * (HUD_SLOT_W + 1);
      const canAfford = this.gold >= u.cost;

      // Khung thẻ
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 35, canAfford ? '#201d36' : '#151322');
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 1, canAfford ? '#433d6b' : '#201d36');
      px(ctx, sx, HUD_TOP + 37, HUD_SLOT_W, 1, '#090810');

      // Phím tắt
      drawPixelText(ctx, `[${i + 1}]`, sx + 2, HUD_TOP + 5, '#fed330', 1);

      // Icon lính
      const spr = getSprite(u.id, 'player', false);
      ctx.drawImage(spr, Math.round(sx + HUD_SLOT_W / 2 - spr.width / 2), HUD_TOP + 13);

      // Giá vàng
      drawPixelText(ctx, `${u.cost}G`, sx + HUD_SLOT_W / 2, HUD_TOP + 29, canAfford ? '#ffffff' : '#ff6b6b', 1, 'c');
    }

    // 4. 3 Ô Kỹ năng chỉ huy (Spells)
    for (let i = 0; i < 3; i++) {
      const sp = SPELL_DEFINITIONS[i];
      const sx = HUD_SPELL_START_X + i * (HUD_SPELL_SLOT_W + 2);
      const cd = this.spellCooldowns[i];
      const canCast = this.mana >= sp.mana && cd <= 0;

      px(ctx, sx, HUD_TOP + 3, HUD_SPELL_SLOT_W, 35, canCast ? '#1b2944' : '#121826');
      px(ctx, sx, HUD_TOP + 3, HUD_SPELL_SLOT_W, 1, canCast ? '#34528a' : '#1b2944');

      // Phím tắt
      drawPixelText(ctx, `[${sp.key}]`, sx + 2, HUD_TOP + 5, '#4fc3f7', 1);

      // Tên phép
      drawPixelText(ctx, sp.name.substring(0, 3), sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 15, '#ffffff', 1, 'c');

      // Cooldown / Năng lượng
      if (cd > 0) {
        drawPixelText(ctx, `${Math.ceil(cd)}S`, sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 27, '#ff4757', 1, 'c');
      } else {
        drawPixelText(ctx, `${sp.mana}M`, sx + HUD_SPELL_SLOT_W / 2, HUD_TOP + 27, canCast ? '#4fc3f7' : '#777777', 1, 'c');
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
