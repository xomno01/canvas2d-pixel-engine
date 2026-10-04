'use strict';
/* =====================================================================
 *  PIXEL KINGDOM WARS - ĐẠI CHIẾN VƯƠNG QUỐC
 *  Chuẩn đồ họa Pixel Art Canvas 2D Retro (kỹ thuật học từ Tiệm Nét Cỏ)
 *  - Virtual buffer: 320 x 180 (Widescreen 16:9)
 *  - Integer scaling pixelated, 0 thư viện ngoài
 *  - 3 làn chiến thuật (Top, Mid, Bot) + Thành trì + Cầu sông
 *  - 6 Binh chủng hoạt ảnh chi tiết + 3 Kỹ năng tối thượng
 *  - Hệ thống âm thanh WebAudio Synth
 * ===================================================================== */

// ---------- HẰNG SỐ & ĐỘ PHÂN GIẢI ----------
const W = 320, H = 180;
const BATTLE_TOP = 24;
const BATTLE_BOT = 138;
const HUD_TOP = 138;
const LANES_Y = [50, 82, 114];
const LANE_NAMES = ['TOP', 'MID', 'BOT'];

// ---------- HÀM TIỆN ÍCH ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// ---------- BỘ FONT PIXEL 3x5 HOÀN CHỈNH ----------
const FONT = {
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

const fontCache = new Map();
function drawText(ctx, str, x, y, col = '#ffffff', sc = 1, align = 'l', shadowCol = '#0d0b14') {
  str = String(str).toUpperCase();
  const key = `${str}|${col}|${sc}|${shadowCol}`;
  let cvs = fontCache.get(key);
  if (!cvs) {
    const w = Math.max(1, str.length * 4 * sc), h = 6 * sc;
    cvs = mkCanvas(w, h);
    const cctx = cvs.getContext('2d');
    const render = (ox, oy, c) => {
      for (let i = 0; i < str.length; i++) {
        const glyph = FONT[str[i]];
        if (!glyph) continue;
        for (let b = 0; b < 15; b++) {
          if (glyph[b] === '1') px(cctx, ox + (i * 4 + (b % 3)) * sc, oy + Math.floor(b / 3) * sc, sc, sc, c);
        }
      }
    };
    if (shadowCol) render(sc, sc, shadowCol);
    render(0, 0, col);
    fontCache.set(key, cvs);
  }
  const dx = align === 'c' ? x - Math.floor(cvs.width / 2) : align === 'r' ? x - cvs.width : x;
  ctx.drawImage(cvs, Math.round(dx), Math.round(y));
}

// ---------- BẢNG MÀU & ĐỊNH NGHĨA SPRITE CHI TIẾT ----------
const OUT = '#120c1f';
const PAL_BLUE = { m: '#3b7ae8', d: '#1f4896', l: '#8fb8ff' }; // Xanh Hoàng Gia
const PAL_RED  = { m: '#e03b3b', d: '#8f1a1a', l: '#ff8a8a' }; // Đỏ Đế Chế

const SPRITES_DEF = {
  // Kiếm sĩ (12x14)
  swordsman: [
    '....kkkk....',
    '...kssssk...',
    '..kssssssk..',
    '..kshsshsk..',
    '..kssssssk..',
    '..kmmddmmk..',
    '.kmmmmmmmmk.',
    'k.kmmmmmmk.k',
    'w..kddddk..w',
    'w..kssssk..w',
    '...kllllk...',
    '...kd..dk...',
    '...kd..dk...',
    '..kk....kk..'
  ],
  // Cung thủ (11x14)
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
  // Hộ vệ khiên sắt (14x14)
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
  // Pháp sư (12x15)
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
  // Kỵ binh (20x16)
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
  // Máy bắn đá (18x14)
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
  ],
  // Lâu đài trái/phải (28x40)
  castle: [
    'kk.kk.kk.kk.kk.kk.kk',
    'ksskksskksskksskkssk',
    'kssssssssssssssssssk',
    'kssssssssssssssssssk',
    'kddddddddddddddddddk',
    'kmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmk',
    'kddddddddddddddddddk',
    'kssssssssssssssssssk',
    'ksskksssssssssskkssk',
    'ksskksssssssssskkssk',
    'kssssssssssssssssssk',
    'kssssssssssssssssssk',
    'kddddddddddddddddddk',
    'kddddddddddddddddddk',
    'kssssssssssssssssssk',
    'kssssssssssssssssssk',
    'kssssskkkkkkkksssssk',
    'ksssskwwwwwwwwkssssk',
    'ksssskwwwwwwwwkssssk',
    'ksssskwwwwwwwwkssssk',
    'ksssskwwwwwwwwkssssk',
    'kkkkkkwwwwwwwwkkkkkk'
  ]
};

const spriteCache = new Map();
function getSprite(name, team = 'player', flipped = false) {
  const key = `${name}|${team}|${flipped ? 1 : 0}`;
  let cvs = spriteCache.get(key);
  if (cvs) return cvs;

  const m = SPRITES_DEF[name];
  if (!m) return mkCanvas(1, 1);
  const h = m.length, w = m[0].length;
  cvs = mkCanvas(w, h);
  const ctx = cvs.getContext('2d');

  const teamPal = team === 'player' ? PAL_BLUE : PAL_RED;
  const colMap = {
    k: OUT,
    s: '#c8d4df', // giáp sáng
    d: '#7a8c99', // giáp tối
    l: '#eef4fa', // ánh sáng
    h: '#1b1b24', // tóc/mắt
    b: '#7d5233', // nâu ngựa / gỗ
    w: '#4a2f18', // gỗ đậm
    g: '#3f8a42', // xanh lá cung thủ
    p: '#6c3cb8', // tím pháp sư
    y: '#ffd438', // ngọc vàng
    m: teamPal.m,
    D: teamPal.d,
    L: teamPal.l
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = m[y][x];
      if (ch === '.') continue;
      const col = colMap[ch] || '#ffffff';
      const drawX = flipped ? (w - 1 - x) : x;
      px(ctx, drawX, y, 1, 1, col);
    }
  }

  spriteCache.set(key, cvs);
  return cvs;
}

// ---------- HỆ THỐNG ÂM THANH TỔNG HỢP WEBAUDIO ----------
const Snd = {
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
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now); osc.stop(now + 0.13);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'arrow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'magic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now); osc.stop(now + 0.23);
    } else if (type === 'boom') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now); osc.stop(now + 0.36);
    } else if (type === 'coin') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(987, now);
      osc.frequency.setValueAtTime(1318, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  }
};

// ---------- ĐỊNH NGHĨA BINH CHỦNG & KỸ NĂNG ----------
const UNIT_TYPES = [
  { id: 'swordsman', name: 'KIEM SI', cost: 45, hp: 130, dmg: 18, spd: 32, range: 12, atkSpd: 1.0, w: 12, h: 14, icon: '⚔' },
  { id: 'archer',    name: 'CUNG THU',cost: 70, hp: 65,  dmg: 14, spd: 30, range: 75, atkSpd: 1.2, w: 11, h: 14, icon: '🏹' },
  { id: 'shield',    name: 'HO VE',  cost: 95, hp: 260, dmg: 10, spd: 22, range: 10, atkSpd: 1.4, w: 14, h: 14, icon: '🛡' },
  { id: 'mage',      name: 'PHAP SU',cost: 130,hp: 80,  dmg: 28, spd: 26, range: 65, atkSpd: 1.8, w: 12, h: 15, icon: '🧙', splash: 22 },
  { id: 'cavalry',   name: 'KY BINH', cost: 160,hp: 200, dmg: 35, spd: 48, range: 14, atkSpd: 1.1, w: 20, h: 16, icon: '🐎' },
  { id: 'catapult',  name: 'BAN DA',  cost: 210,hp: 170, dmg: 55, spd: 16, range: 95, atkSpd: 2.8, w: 18, h: 14, icon: '☄', splash: 30 }
];

const SPELLS = [
  { id: 'arrow_rain', name: 'MUA TEN', mana: 40, dmg: 35, radius: 45, cd: 12, key: 'Q', icon: '🌧' },
  { id: 'lightning',  name: 'SAM SET', mana: 65, dmg: 160, radius: 25, cd: 18, key: 'W', icon: '⚡' },
  { id: 'healing',    name: 'HOI MAU', mana: 50, heal: 80, radius: 60, cd: 15, key: 'E', icon: '💚' }
];

// ---------- SINH NỀN BẢN ĐỒ CHI TIẾT (PROCEDURAL TEXTURE) ----------
let mapBackgroundCanvas = null;
function createMapBackground() {
  const c = mkCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(777);

  // 1. Bầu trời hoàng hôn & đồi xa
  px(ctx, 0, 0, W, 22, '#19182b');
  px(ctx, 0, 16, W, 6, '#28253e');
  // Mặt trăng pixel
  px(ctx, 160, 4, 10, 10, '#fff4b8');
  px(ctx, 163, 4, 10, 10, '#19182b');

  // 2. Thảm cỏ xanh có hạt noise & hoa dại
  px(ctx, 0, 22, W, 116, '#2d6e32');
  for (let i = 0; i < 900; i++) {
    const gx = Math.floor(r() * W);
    const gy = 22 + Math.floor(r() * 116);
    px(ctx, gx, gy, 1, r() < 0.5 ? 1 : 2, r() < 0.5 ? '#245928' : '#37873e');
  }
  // Hoa dại vàng & trắng
  for (let i = 0; i < 40; i++) {
    const fx = Math.floor(r() * W), fy = 24 + Math.floor(r() * 112);
    px(ctx, fx, fy, 2, 2, r() < 0.5 ? '#ffe066' : '#ffffff');
  }

  // 3. 3 Làn đường đất sỏi (Dirt Paths)
  LANES_Y.forEach((ly) => {
    // Vỉa đất
    px(ctx, 28, ly - 8, W - 56, 16, '#5e4835');
    for (let i = 0; i < 350; i++) {
      const rx = 28 + Math.floor(r() * (W - 56));
      const ry = ly - 8 + Math.floor(r() * 16);
      px(ctx, rx, ry, 1, 1, r() < 0.5 ? '#4a3726' : '#735841');
    }
    // Gờ cỏ ven đường
    for (let x = 28; x < W - 28; x += 4) {
      px(ctx, x, ly - 9, 2, 1, '#1e4a22');
      px(ctx, x + 2, ly + 8, 2, 1, '#1e4a22');
    }
  });

  // 4. Dòng sông ở giữa (X: 150 - 170)
  px(ctx, 150, 22, 20, 116, '#20639b');
  for (let y = 22; y < 138; y += 2) {
    px(ctx, 151 + Math.floor(r() * 17), y, randi(2, 4), 1, '#3caea3');
  }
  // Bờ đá sông
  for (let y = 22; y < 138; y += 3) {
    px(ctx, 149, y, 2, 2, '#4d5656');
    px(ctx, 169, y, 2, 2, '#4d5656');
  }

  // 5. Ba cây cầu đá bắc qua sông (Stone Bridges)
  LANES_Y.forEach((ly) => {
    // Mặt cầu
    px(ctx, 147, ly - 9, 26, 18, '#7f8c8d');
    for (let by = ly - 8; by < ly + 8; by += 4) {
      px(ctx, 147, by, 26, 1, '#535c5c');
    }
    // Lan can cầu
    px(ctx, 147, ly - 10, 26, 2, '#bdc3c7');
    px(ctx, 147, ly + 8, 26, 2, '#535c5c');
    // Trụ cầu đá
    px(ctx, 147, ly - 11, 4, 3, '#ecf0f1');
    px(ctx, 169, ly - 11, 4, 3, '#ecf0f1');
    px(ctx, 147, ly + 8, 4, 3, '#ecf0f1');
    px(ctx, 169, ly + 8, 4, 3, '#ecf0f1');
  });

  // 6. Rừng cây trang trí ở các góc
  const drawTree = (tx, ty) => {
    px(ctx, tx + 4, ty + 10, 3, 5, '#4a2c11');
    px(ctx, tx + 2, ty + 2, 7, 9, '#1e5425');
    px(ctx, tx, ty + 4, 11, 6, '#2d7a36');
    px(ctx, tx + 3, ty, 5, 4, '#43a047');
  };
  drawTree(42, 26); drawTree(110, 28); drawTree(200, 26); drawTree(265, 27);
  drawTree(45, 122); drawTree(115, 120); drawTree(195, 122); drawTree(260, 121);

  return c;
}

const HUD_START_X = 54;
const HUD_SLOT_W = 28;
const SPELL_START_X = 230;
const SPELL_SLOT_W = 26;

// ---------- LỚP THỰC THỂ BINH SĨ ----------
class Unit {
  constructor(game, def, laneIdx, team) {
    this.game = game;
    this.def = def;
    this.lane = laneIdx;
    this.team = team;

    this.x = team === 'player' ? 32 : W - 32;
    this.y = LANES_Y[laneIdx] + randi(-2, 2);
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dmg = def.dmg;
    this.spd = def.spd;
    this.range = def.range;
    this.atkSpd = def.atkSpd;
    this.splash = def.splash || 0;

    this.cooldown = 0;
    this.target = null;
    this.state = 'walk'; // walk, attack, hurt, dead
    this.walkTimer = rand(0, 10);
    this.swingProgress = 0;
    this.flash = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 0.12;
    this.game.spawnParticles(this.x, this.y - 6, 4, '#e03b3b');
    this.game.spawnFloatingText(`-${Math.round(amount)}`, this.x, this.y - 12, '#ff6b6b');
    Snd.play('hit');
    if (this.hp <= 0) {
      this.state = 'dead';
      this.game.spawnParticles(this.x, this.y - 6, 12, this.team === 'player' ? '#8fb8ff' : '#ff8a8a');
    }
  }

  update(dt) {
    if (this.state === 'dead') return false;

    if (this.flash > 0) this.flash -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.walkTimer += dt * 10;

    // Tìm mục tiêu trên cùng làn
    this.target = this.findTarget();

    if (this.target) {
      const dist = Math.abs(this.target.x - this.x);
      if (dist <= this.range) {
        // Tấn công
        this.state = 'attack';
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingProgress = 1;
          this.performAttack();
        }
      } else {
        // Tiếp cận
        this.state = 'walk';
        const dir = this.team === 'player' ? 1 : -1;
        this.x += dir * this.spd * dt;
      }
    } else {
      // Tiến về thành đối phương
      this.state = 'walk';
      const dir = this.team === 'player' ? 1 : -1;
      this.x += dir * this.spd * dt;

      // Đánh thành địch nếu tới nơi
      const targetCastleX = this.team === 'player' ? W - 28 : 28;
      if (Math.abs(this.x - targetCastleX) <= this.range + 10) {
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          this.swingProgress = 1;
          const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
          this.game.damageCastle(enemyTeam, this.dmg);
          Snd.play('boom');
          this.game.shake = 3;
        }
      }
    }

    if (this.swingProgress > 0) this.swingProgress -= dt * 4;
    return this.hp > 0;
  }

  performAttack() {
    if (this.def.id === 'archer') {
      // Bắn tên
      Snd.play('arrow');
      this.game.projectiles.push({
        x: this.x, y: this.y - 6,
        targetX: this.target.x, targetY: this.target.y - 6,
        startX: this.x, startY: this.y - 6,
        progress: 0, speed: 2.5,
        target: this.target, dmg: this.dmg, splash: 0,
        type: 'arrow', team: this.team
      });
    } else if (this.def.id === 'mage') {
      // Cầu lửa ma thuật
      Snd.play('magic');
      this.game.projectiles.push({
        x: this.x, y: this.y - 8,
        targetX: this.target.x, targetY: this.target.y - 6,
        startX: this.x, startY: this.y - 8,
        progress: 0, speed: 1.8,
        target: this.target, dmg: this.dmg, splash: this.splash,
        type: 'fireball', team: this.team
      });
    } else if (this.def.id === 'catapult') {
      // Tảng đá nổ
      Snd.play('boom');
      this.game.projectiles.push({
        x: this.x, y: this.y - 10,
        targetX: this.target.x, targetY: this.target.y - 4,
        startX: this.x, startY: this.y - 10,
        progress: 0, speed: 1.2,
        target: this.target, dmg: this.dmg, splash: this.splash,
        type: 'boulder', team: this.team
      });
    } else {
      // Cận chiến
      if (this.target && this.target.hp > 0) {
        this.target.takeDamage(this.dmg);
      }
    }
  }

  findTarget() {
    let closest = null;
    let minDist = Infinity;
    for (const u of this.game.units) {
      if (u.team !== this.team && u.lane === this.lane && u.hp > 0) {
        // Chỉ nhắm địch ở phía trước
        const forward = this.team === 'player' ? (u.x >= this.x - 4) : (u.x <= this.x + 4);
        if (forward) {
          const d = Math.abs(u.x - this.x);
          if (d < minDist) { minDist = d; closest = u; }
        }
      }
    }
    return closest;
  }

  draw(ctx) {
    const spr = getSprite(this.def.id, this.team, this.team === 'enemy');
    const bob = this.state === 'walk' ? Math.sin(this.walkTimer) * 1.5 : 0;
    const swing = this.swingProgress > 0 ? (this.team === 'player' ? 3 : -3) : 0;

    const drawX = Math.round(this.x - spr.width / 2 + swing);
    const drawY = Math.round(this.y - spr.height + bob);

    // Đổ bóng nhân vật
    ctx.fillStyle = 'rgba(10,8,16,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, spr.width * 0.45, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flash chớp trắng khi dính đòn
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr, drawX, drawY);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, drawX, drawY);
    }

    // Thanh máu trên đầu
    const barW = Math.max(10, spr.width);
    const barX = Math.round(this.x - barW / 2);
    const barY = Math.round(drawY - 4);
    px(ctx, barX, barY, barW, 2, '#0d0b14');
    const hpRatio = clamp(this.hp / this.maxHp, 0, 1);
    px(ctx, barX, barY, Math.round(barW * hpRatio), 2, this.team === 'player' ? '#3877e8' : '#e03b3b');
  }
}

// ---------- ĐIỀU HÀNH GAME CHÍNH ----------
class PixelKingdomWars {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buf = mkCanvas(W, H);
    this.bctx = this.buf.getContext('2d', { alpha: false });
    this.bctx.imageSmoothingEnabled = false;

    // Kinh tế & Chỉ huy
    this.gold = 150;
    this.mana = 60;
    this.goldTimer = 0;
    this.manaTimer = 0;
    this.selectedLane = 1; // 0: TOP, 1: MID, 2: BOT

    // Máu thành trì
    this.playerCastleHp = 1000;
    this.enemyCastleHp = 1000;
    this.castleMaxHp = 1000;

    // AI phe địch
    this.aiGold = 120;
    this.aiTimer = 2.0;

    // Thực thể
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spellCooldowns = [0, 0, 0];

    // Trạng thái game
    this.state = 'play'; // play, win, lose
    this.shake = 0;
    this.gameTime = 0;
    this.lastTime = performance.now();

    // Khởi tạo
    mapBackgroundCanvas = createMapBackground();
    this.setupInputs();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    // Tỉ lệ scale số nguyên trong không gian CSS
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
    // Bàn phím
    window.addEventListener('keydown', e => {
      Snd.init();
      const k = e.key.toUpperCase();
      if (k === '1') this.spawnUnit(0);
      else if (k === '2') this.spawnUnit(1);
      else if (k === '3') this.spawnUnit(2);
      else if (k === '4') this.spawnUnit(3);
      else if (k === '5') this.spawnUnit(4);
      else if (k === '6') this.spawnUnit(5);
      else if (k === 'Q') this.castSpell(0);
      else if (k === 'W') this.castSpell(1);
      else if (k === 'E') this.castSpell(2);
      else if (k === ' ' || k === 'TAB') {
        e.preventDefault();
        this.selectedLane = (this.selectedLane + 1) % 3;
      }
    });

    // Chuột & Chạm cảm ứng
    const handleTap = (clientX, clientY) => {
      Snd.init();
      const rect = this.canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;

      const bx = Math.floor((cssX - this.cssOffsetX) / this.cssScale);
      const by = Math.floor((cssY - this.cssOffsetY) / this.cssScale);

      if (bx < 0 || bx >= W || by < 0 || by >= H) return;

      // Click chọn làn trực tiếp trên chiến trường
      if (by >= BATTLE_TOP && by < HUD_TOP) {
        if (by < 66) this.selectedLane = 0;
        else if (by < 98) this.selectedLane = 1;
        else this.selectedLane = 2;
        return;
      }

      // Click trên thanh HUD
      if (by >= HUD_TOP) {
        // Nút chọn làn (bx: 0 -> 52)
        if (bx >= 0 && bx < 52) {
          if (by < 155) this.selectedLane = 0;
          else if (by < 167) this.selectedLane = 1;
          else this.selectedLane = 2;
          return;
        }

        // 6 Nút mua lính
        for (let i = 0; i < 6; i++) {
          const sx = HUD_START_X + i * (HUD_SLOT_W + 1);
          if (bx >= sx && bx < sx + HUD_SLOT_W && by >= HUD_TOP + 3) {
            this.spawnUnit(i);
            return;
          }
        }

        // 3 Nút phép thuật
        for (let i = 0; i < 3; i++) {
          const sx = SPELL_START_X + i * (SPELL_SLOT_W + 2);
          if (bx >= sx && bx < sx + SPELL_SLOT_W && by >= HUD_TOP + 3) {
            this.castSpell(i);
            return;
          }
        }
      }
    };

    this.canvas.addEventListener('mousedown', e => handleTap(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length > 0) handleTap(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
  }

  spawnUnit(typeIdx, team = 'player') {
    if (this.state !== 'play') return;
    const def = UNIT_TYPES[typeIdx];
    if (team === 'player') {
      if (this.gold < def.cost) return;
      this.gold -= def.cost;
      this.units.push(new Unit(this, def, this.selectedLane, 'player'));
      Snd.play('spawn');
    } else {
      if (this.aiGold < def.cost) return;
      this.aiGold -= def.cost;
      const aiLane = randi(0, 2);
      this.units.push(new Unit(this, def, aiLane, 'enemy'));
    }
  }

  castSpell(spellIdx) {
    if (this.state !== 'play') return;
    const sp = SPELLS[spellIdx];
    if (this.mana < sp.mana || this.spellCooldowns[spellIdx] > 0) return;

    this.mana -= sp.mana;
    this.spellCooldowns[spellIdx] = sp.cd;
    const targetY = LANES_Y[this.selectedLane];

    if (sp.id === 'arrow_rain') {
      Snd.play('arrow');
      this.shake = 6;
      for (let i = 0; i < 18; i++) {
        setTimeout(() => {
          const rx = 160 + rand(-sp.radius, sp.radius);
          this.spawnParticles(rx, targetY, 3, '#ffe066');
          for (const u of this.units) {
            if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - rx) < 16) {
              u.takeDamage(sp.dmg);
            }
          }
        }, i * 40);
      }
    } else if (sp.id === 'lightning') {
      Snd.play('boom');
      this.shake = 12;
      const tx = 160;
      this.spawnParticles(tx, targetY, 25, '#7df9ff');
      for (const u of this.units) {
        if (u.team === 'enemy' && u.lane === this.selectedLane && Math.abs(u.x - tx) <= sp.radius) {
          u.takeDamage(sp.dmg);
        }
      }
    } else if (sp.id === 'healing') {
      Snd.play('magic');
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
      if (this.playerCastleHp <= 0) this.state = 'lose';
    } else {
      this.enemyCastleHp = Math.max(0, this.enemyCastleHp - dmg);
      if (this.enemyCastleHp <= 0) this.state = 'win';
    }
  }

  spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(20, 60);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.2, 0.5), maxLife: 0.5,
        color
      });
    }
  }

  spawnFloatingText(str, x, y, col) {
    this.floatingTexts.push({ str, x, y, col, life: 0.8 });
  }

  updateAI(dt) {
    this.aiTimer -= dt;
    this.aiGold += dt * 14;

    if (this.aiTimer <= 0) {
      this.aiTimer = rand(2.2, 4.0);
      // AI phân tích và thả quân
      const affordable = UNIT_TYPES.filter(u => u.cost <= this.aiGold);
      if (affordable.length > 0) {
        const choice = pick(affordable);
        this.spawnUnit(UNIT_TYPES.indexOf(choice), 'enemy');
      }
    }
  }

  update(dt) {
    this.gameTime += dt;

    // Sinh tài nguyên thụ động
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
    }

    // Cập nhật lính
    this.units = this.units.filter(u => u.update(dt));

    // Cập nhật đường đạn
    this.projectiles = this.projectiles.filter(p => {
      p.progress += p.speed * dt;
      const curX = p.startX + (p.targetX - p.startX) * p.progress;
      const arc = Math.sin(p.progress * Math.PI) * (p.type === 'boulder' ? 32 : 16);
      p.x = curX;
      p.y = p.startY + (p.targetY - p.startY) * p.progress - arc;

      if (p.progress >= 1) {
        // Chạm mục tiêu
        if (p.splash > 0) {
          this.spawnParticles(p.targetX, p.targetY, 15, p.type === 'boulder' ? '#8a8a98' : '#ff9a1f');
          this.shake = 4;
          for (const u of this.units) {
            if (u.team !== p.team && Math.abs(u.x - p.targetX) <= p.splash) {
              u.takeDamage(p.dmg);
            }
          }
        } else if (p.target && p.target.hp > 0) {
          p.target.takeDamage(p.dmg);
        }
        return false;
      }
      return true;
    });

    // Cập nhật hạt
    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      return pt.life > 0;
    });

    // Chữ số nổi
    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y -= dt * 14;
      ft.life -= dt;
      return ft.life > 0;
    });

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 25);
  }

  draw() {
    const b = this.bctx;

    // Rung màn hình
    b.save();
    if (this.shake > 0) {
      b.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // 1. Vẽ nền bản đồ đã nướng sẵn
    b.drawImage(mapBackgroundCanvas, 0, 0);

    // 2. Vẽ thành lũy và tháp canh hai bên
    this.drawCastleFortresses(b);

    // Cột máu thành trì trên cùng
    this.drawCastleHpBars(b);

    // 3. Sắp xếp lính theo trục Y (Depth Sorting) và vẽ
    const sortedUnits = [...this.units].sort((a, b) => a.y - b.y);
    for (const u of sortedUnits) u.draw(b);

    // 4. Vẽ đường đạn
    for (const p of this.projectiles) {
      if (p.type === 'arrow') {
        px(b, p.x, p.y, 3, 1, '#ffffff');
        px(b, p.x - 1, p.y + 1, 1, 1, '#8a512b');
      } else if (p.type === 'fireball') {
        px(b, p.x - 2, p.y - 2, 4, 4, '#ff9a1f');
        px(b, p.x - 1, p.y - 1, 2, 2, '#fff4b8');
      } else if (p.type === 'boulder') {
        px(b, p.x - 2, p.y - 2, 4, 4, '#696a75');
        px(b, p.x - 1, p.y - 1, 2, 2, '#878896');
      }
    }

    // 5. Vẽ hạt hiệu ứng & chữ sát thương nổi
    for (const pt of this.particles) {
      px(b, Math.round(pt.x), Math.round(pt.y), 2, 2, pt.color);
    }
    for (const ft of this.floatingTexts) {
      drawText(b, ft.str, ft.x, ft.y, ft.col, 1, 'c');
    }

    b.restore(); // Hết rung màn hình

    // 6. Vẽ thanh giao diện điều khiển (Tactical HUD) ở dưới cùng
    this.drawHUD(b);

    // 7. Thông báo kết thúc game
    if (this.state !== 'play') {
      px(b, 0, 0, W, H, 'rgba(10,8,16,0.65)');
      if (this.state === 'win') {
        drawText(b, 'VIET NAM QUAN THANG!', W / 2, H / 2 - 12, '#ffd700', 2, 'c');
        drawText(b, 'DA PHA HUY HOAN TOAN THANH DICH', W / 2, H / 2 + 8, '#ffffff', 1, 'c');
      } else {
        drawText(b, 'THANH TRI THAT THU!', W / 2, H / 2 - 12, '#ff4d4d', 2, 'c');
        drawText(b, 'QUAN DICH DA CHIEM DONG THANH TRI', W / 2, H / 2 + 8, '#ffffff', 1, 'c');
      }
      drawText(b, 'NHAN F5 HOAC CLICK DE CHOI LAI', W / 2, H / 2 + 24, '#8fb8ff', 1, 'c');
    }

    // Phóng to buffer lên màn hình thực tế (Integer Scaling)
    px(this.ctx, 0, 0, this.canvas.width, this.canvas.height, '#0d0b14');
    this.ctx.drawImage(
      this.buf,
      0, 0, W, H,
      Math.floor(this.cssOffsetX * this.dpr),
      Math.floor(this.cssOffsetY * this.dpr),
      Math.floor(W * this.cssScale * this.dpr),
      Math.floor(H * this.cssScale * this.dpr)
    );

    // Gợi ý xoay ngang màn hình nếu đang cầm dọc điện thoại
    if (window.innerWidth < window.innerHeight) {
      const hintY = Math.max(12 * this.dpr, Math.floor(this.cssOffsetY * this.dpr) - 24 * this.dpr);
      drawText(
        this.ctx,
        'XOAY NGANG MAN HINH DE CHOI TO DEP',
        this.canvas.width / 2,
        hintY,
        '#ffd438',
        Math.max(1, Math.round(this.dpr)),
        'c'
      );
    }
  }

  drawCastleFortresses(ctx) {
    const t = this.gameTime;

    // 1. Tường thành phe ta (Bên Trái: X: 0 -> 26)
    px(ctx, 0, 22, 26, 116, '#3a3a46');
    px(ctx, 24, 22, 2, 116, '#1e1e26');
    // Hoa văn gạch đá
    for (let y = 24; y < 136; y += 8) {
      px(ctx, 0, y, 24, 1, '#2a2a33');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, (y % 16 === 0 ? x : x + 4) % 24, y, 1, 7, '#4c4c5c');
      }
    }
    // Lỗ châu mai (Battlements)
    for (let y = 22; y < 138; y += 12) {
      px(ctx, 22, y, 4, 6, '#120c1f');
    }
    // 3 Cửa vòm đá dẫn ra 3 làn
    LANES_Y.forEach(ly => {
      px(ctx, 0, ly - 7, 26, 14, '#151320');
      px(ctx, 0, ly - 7, 26, 2, '#5a5a6e');
      px(ctx, 22, ly - 7, 4, 14, '#0d0b14');
    });
    // Cờ hiệu Hoàng Gia vẫy gió
    const flagWave = Math.sin(t * 5) * 1.5;
    px(ctx, 12, 16, 2, 14, '#8a512b'); // cán cờ
    px(ctx, 14, 17 + flagWave, 10, 6, '#3877e8');
    px(ctx, 14, 19 + flagWave, 10, 2, '#ffd700');
    // Đuốc thành lập lòe
    const torchFlicker = Math.sin(t * 12) > 0 ? 1 : 0;
    px(ctx, 20, 66, 3, 2, '#4a2c11');
    px(ctx, 21, 64 - torchFlicker, 2, 2, '#ff9a1f');
    px(ctx, 20, 98, 3, 2, '#4a2c11');
    px(ctx, 21, 96 - torchFlicker, 2, 2, '#ff9a1f');

    // 2. Tường thành phe địch (Bên Phải: X: 294 -> 320)
    px(ctx, W - 26, 22, 26, 116, '#463a3a');
    px(ctx, W - 26, 22, 2, 116, '#261e1e');
    for (let y = 24; y < 136; y += 8) {
      px(ctx, W - 26, y, 24, 1, '#332a2a');
      for (let x = 0; x < 24; x += 8) {
        px(ctx, W - 26 + ((y % 16 === 0 ? x : x + 4) % 24), y, 1, 7, '#5c4c4c');
      }
    }
    for (let y = 22; y < 138; y += 12) {
      px(ctx, W - 26, y, 4, 6, '#1f0c0c');
    }
    LANES_Y.forEach(ly => {
      px(ctx, W - 26, ly - 7, 26, 14, '#201313');
      px(ctx, W - 26, ly - 7, 26, 2, '#6e5a5a');
      px(ctx, W - 26, ly - 7, 4, 14, '#140b0b');
    });
    // Cờ hiệu Đế Chế vẫy gió
    px(ctx, W - 14, 16, 2, 14, '#8a512b');
    px(ctx, W - 24, 17 - flagWave, 10, 6, '#e03b3b');
    px(ctx, W - 24, 19 - flagWave, 10, 2, '#ffffff');
    // Đuốc thành phe địch
    px(ctx, W - 23, 66, 3, 2, '#4a2c11');
    px(ctx, W - 23, 64 - torchFlicker, 2, 2, '#ff9a1f');
    px(ctx, W - 23, 98, 3, 2, '#4a2c11');
    px(ctx, W - 23, 96 - torchFlicker, 2, 2, '#ff9a1f');
  }

  drawCastleHpBars(ctx) {
    // Máu thành phe ta (Trái)
    px(ctx, 4, 3, 70, 7, '#120c1f');
    const pRatio = clamp(this.playerCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, 5, 4, Math.round(68 * pRatio), 5, '#3877e8');
    drawText(ctx, `PHE TA: ${this.playerCastleHp}`, 6, 12, '#8fb8ff', 1);

    // Máu thành phe địch (Phải)
    px(ctx, W - 74, 3, 70, 7, '#120c1f');
    const eRatio = clamp(this.enemyCastleHp / this.castleMaxHp, 0, 1);
    px(ctx, W - 73, 4, Math.round(68 * eRatio), 5, '#e03b3b');
    drawText(ctx, `QUAN DICH: ${this.enemyCastleHp}`, W - 6, 12, '#ff8a8a', 1, 'r');
  }

  drawHUD(ctx) {
    // Khung nền HUD
    px(ctx, 0, HUD_TOP, W, H - HUD_TOP, '#151324');
    px(ctx, 0, HUD_TOP, W, 2, '#312b4d');
    px(ctx, 0, HUD_TOP + 2, W, 1, '#0b0a12');

    // 1. Chỉ số Tài Nguyên (Vàng & Mana)
    drawText(ctx, `VANG: ${this.gold}`, 4, HUD_TOP + 4, '#ffd438', 1);
    drawText(ctx, `MANA: ${this.mana}`, 4, HUD_TOP + 12, '#4fc3f7', 1);

    // 2. Nút chuyển làn (Lane Toggle)
    for (let i = 0; i < 3; i++) {
      const ly = HUD_TOP + 20 + i * 7;
      const isSel = this.selectedLane === i;
      px(ctx, 4, ly, 45, 6, isSel ? '#3877e8' : '#221f38');
      px(ctx, 4, ly, 45, 1, isSel ? '#8fb8ff' : '#312b4d');
      drawText(ctx, `${i + 1}.${LANE_NAMES[i]}`, 6, ly + 1, isSel ? '#ffffff' : '#8a88a0', 1);
    }

    // 3. 6 Ô lính (Recruit Cards)
    for (let i = 0; i < 6; i++) {
      const u = UNIT_TYPES[i];
      const sx = HUD_START_X + i * (HUD_SLOT_W + 1);
      const canAfford = this.gold >= u.cost;

      // Khung thẻ
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 35, canAfford ? '#23203b' : '#171526');
      px(ctx, sx, HUD_TOP + 3, HUD_SLOT_W, 1, canAfford ? '#4a4475' : '#221f38');
      px(ctx, sx, HUD_TOP + 37, HUD_SLOT_W, 1, '#0d0b14');

      // Phím tắt
      drawText(ctx, `[${i + 1}]`, sx + 2, HUD_TOP + 5, '#ffd438', 1);

      // Icon lính
      const spr = getSprite(u.id, 'player', false);
      ctx.drawImage(spr, Math.round(sx + HUD_SLOT_W / 2 - spr.width / 2), HUD_TOP + 13);

      // Giá vàng
      drawText(ctx, `${u.cost}G`, sx + HUD_SLOT_W / 2, HUD_TOP + 29, canAfford ? '#ffffff' : '#ff6b6b', 1, 'c');
    }

    // 4. 3 Ô Kỹ năng chỉ huy (Spells)
    for (let i = 0; i < 3; i++) {
      const sp = SPELLS[i];
      const sx = SPELL_START_X + i * (SPELL_SLOT_W + 2);
      const cd = this.spellCooldowns[i];
      const canCast = this.mana >= sp.mana && cd <= 0;

      px(ctx, sx, HUD_TOP + 3, SPELL_SLOT_W, 35, canCast ? '#1f2e4d' : '#141c2e');
      px(ctx, sx, HUD_TOP + 3, SPELL_SLOT_W, 1, canCast ? '#3d61a3' : '#1f2e4d');

      // Phím tắt
      drawText(ctx, `[${sp.key}]`, sx + 2, HUD_TOP + 5, '#4fc3f7', 1);

      // Tên phép
      drawText(ctx, sp.name.substring(0, 3), sx + SPELL_SLOT_W / 2, HUD_TOP + 15, '#ffffff', 1, 'c');

      // Năng lượng / Cooldown
      if (cd > 0) {
        drawText(ctx, `${Math.ceil(cd)}S`, sx + SPELL_SLOT_W / 2, HUD_TOP + 27, '#ff5252', 1, 'c');
      } else {
        drawText(ctx, `${sp.mana}M`, sx + SPELL_SLOT_W / 2, HUD_TOP + 27, canCast ? '#4fc3f7' : '#888888', 1, 'c');
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

// Khởi chạy game khi trang web load
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new PixelKingdomWars(canvas);
});
