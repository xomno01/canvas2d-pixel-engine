'use strict';
/* =====================================================================
 *  PIXEL KINGDOM TACTICS (DÀN TRẬN CÔNG THÀNH)
 *  Kỹ thuật đồ họa (Canvas 2D Pixel Engine):
 *   - Virtual Buffer 320x180 (Widescreen 16:9 Retro)
 *   - Integer Scaling + imageSmoothingEnabled = false
 *   - Character Matrix Pixel Art + Palette Swapping
 *   - Offscreen LRU Sprite Baking
 *   - 3x5 Embedded Bitmap Font (PixelFont)
 *   - Dynamic Day/Night Lighting via globalCompositeOperation
 *   - Procedural WebAudio Sound Synthesis
 * ===================================================================== */

// ---------- Hằng số Kích Thước & Tọa Độ ----------
const V_W = 320, V_H = 180;
const LANE_Y = [52, 94, 136];
const CASTLE_L = 34, CASTLE_R = 286;

// ---------- Tiện ích ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

class LRU extends Map {
  constructor(limit = 1200) { super(); this.limit = limit; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.limit) super.delete(this.keys().next().value); return this; }
}

// =====================================================================
//  SPRITE MATRIX (Ma trận ký tự & bảng màu)
// =====================================================================
const OUT = '#161224';

const SPR = {
  // 1. Thợ mỏ (Miner)
  miner: {
    p: { k: OUT, s: '#f5cba7', c: '#d4ac0d', a: '#795548', b: '#3b7ae8', h: '#f39c12' },
    m: [
      '..khhhk..',
      '.khssshk.',
      '..ksssk..',
      '..kbbbk..',
      '.kbaaabbk',
      '..kbbbk..',
      '..kaka...',
      '.kk.kk...'
    ]
  },
  miner_mine: {
    p: { k: OUT, s: '#f5cba7', c: '#d4ac0d', a: '#795548', b: '#3b7ae8', h: '#f39c12', m: '#95a5a6' },
    m: [
      '..khhhk.m',
      '.khssshkm',
      '..ksssk.a',
      '..kbbbk.a',
      '.kbaaabbk',
      '..kbbbk..',
      '..kaka...',
      '.kk.kk...'
    ]
  },

  // 2. Kiếm sĩ (Swordsman)
  sword_walk0: {
    p: { k: OUT, s: '#f5cba7', a: '#bdc3c7', b: '#3b7ae8', d: '#7f8c8d', m: '#ffffff' },
    m: [
      '..kkkk...',
      '.kssssk..',
      '.kaaaak..',
      'kabbbaak.',
      'kaabbbaak',
      '.kaaaak..',
      '..kak....',
      '.kk.kk...'
    ]
  },
  sword_walk1: {
    p: { k: OUT, s: '#f5cba7', a: '#bdc3c7', b: '#3b7ae8', d: '#7f8c8d', m: '#ffffff' },
    m: [
      '..kkkk...',
      '.kssssk..',
      '.kaaaak..',
      'kabbbaak.',
      'kaabbbaak',
      '.kaaaak..',
      '...kak...',
      '..kk.kk..'
    ]
  },
  sword_attack: {
    p: { k: OUT, s: '#f5cba7', a: '#bdc3c7', b: '#3b7ae8', d: '#7f8c8d', m: '#ffffff' },
    m: [
      '..kkkk...m',
      '.kssssk.m.',
      '.kaaaak.a.',
      'kabbbaakam',
      'kaabbbaak.',
      '.kaaaak...',
      '..kkkk....',
      '.kk..kk...'
    ]
  },

  // 3. Cung thủ (Archer)
  archer_walk0: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', g: '#27ae60', w: '#795548' },
    m: [
      '..kkkk...',
      '.kssssk..',
      '.kggggk..',
      'kgbbbgk..',
      '.kggggkw.',
      '..kggk.w.',
      '..kkk..w.',
      '.kk.k....'
    ]
  },
  archer_walk1: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', g: '#27ae60', w: '#795548' },
    m: [
      '..kkkk...',
      '.kssssk..',
      '.kggggk..',
      'kgbbbgk..',
      '.kggggkw.',
      '..kggk.w.',
      '...kkk.w.',
      '..k.kk...'
    ]
  },
  archer_shoot: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', g: '#27ae60', w: '#795548', a: '#e74c3c' },
    m: [
      '..kkkk..w',
      '.kssssk.w',
      '.kggggk.w',
      'kgbbbgkwa',
      '.kggggk.w',
      '..kggk..w',
      '..kkkk...',
      '.kk..kk..'
    ]
  },

  // 4. Hộ vệ khiên (Shieldbearer)
  shield_walk0: {
    p: { k: OUT, s: '#f5cba7', a: '#7f8c8d', b: '#3b7ae8', m: '#ecf0f1' },
    m: [
      '..kkkk..',
      '.kssssk.',
      'kaaaaakm',
      'kaabbakm',
      'kaaaaakm',
      'kaaaaakm',
      '.kk.kk.m',
      '.kk.kk..'
    ]
  },
  shield_walk1: {
    p: { k: OUT, s: '#f5cba7', a: '#7f8c8d', b: '#3b7ae8', m: '#ecf0f1' },
    m: [
      '..kkkk..',
      '.kssssk.',
      'kaaaaakm',
      'kaabbakm',
      'kaaaaakm',
      'kaaaaakm',
      '..k..k.m',
      '.kk.kk..'
    ]
  },

  // 5. Kỵ binh (Cavalry)
  cavalry_walk0: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', h: '#8e44ad', r: '#8d6e63', a: '#bdc3c7' },
    m: [
      '..kkkk........',
      '.kssssk...aaaa',
      'kabbbaak.a....',
      '.krrrrrrrrk...',
      'krrrrrrrrrrrk.',
      'krrrk..krrrrk.',
      '.kkk....kkkk..'
    ]
  },
  cavalry_walk1: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', h: '#8e44ad', r: '#8d6e63', a: '#bdc3c7' },
    m: [
      '..kkkk........',
      '.kssssk...aaaa',
      'kabbbaak.a....',
      '.krrrrrrrrk...',
      'krrrrrrrrrrrk.',
      '..krrk..krrk..',
      '..kk......kk..'
    ]
  },

  // 6. Pháp sư (Mage)
  mage_walk0: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', p: '#8e44ad', f: '#e67e22', w: '#f1c40f' },
    m: [
      '..kppk...',
      '.kppssk..',
      '.kpppsk..',
      '.kppppk.w',
      'kbbbbbbkw',
      '.kbbbbk.w',
      '..kbbk...',
      '.kk..kk..'
    ]
  },
  mage_walk1: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', p: '#8e44ad', f: '#e67e22', w: '#f1c40f' },
    m: [
      '..kppk...',
      '.kppssk..',
      '.kpppsk..',
      '.kppppk.w',
      'kbbbbbbkw',
      '.kbbbbk.w',
      '...kkk...',
      '..kk.kk..'
    ]
  },
  mage_cast: {
    p: { k: OUT, s: '#f5cba7', b: '#3b7ae8', p: '#8e44ad', f: '#e67e22', w: '#f1c40f', l: '#ffffff' },
    m: [
      '..kppk..fw',
      '.kppssk.wf',
      '.kpppsk..w',
      '.kppppk..w',
      'kbbbbbbk..',
      '.kbbbbk...',
      '..kkkk....',
      '.kk..kk...'
    ]
  },

  // Vật thể môi trường & Đạn
  arrow: { p: { k: '#795548', w: '#bdc3c7' }, m: ['kkw'] },
  fireball: { p: { y: '#f1c40f', o: '#e67e22', r: '#e74c3c' }, m: ['.oo.', 'oyro', 'oyro', '.oo.'] },
  gold_rock: { p: { k: OUT, g: '#7f8c8d', y: '#f1c40f', w: '#f39c12' }, m: ['..kkkk..', '.kggggk.', 'kgyygggk', 'kgywyyk.', '.kkkkkk.'] },
  torch: { p: { k: OUT, w: '#795548', f: '#e74c3c', y: '#f1c40f' }, m: ['..yy..', '.yffy.', '..ww..', '..ww..', '..kk..'] },
  tree: {
    p: { k: OUT, g: '#27ae60', l: '#2ecc71', d: '#1e8449', b: '#795548' },
    m: [
      '..kkkk..',
      '.kggllk.',
      'kggggglk',
      'kddggggk',
      '.kddddk.',
      '..kbbk..',
      '..kkkk..'
    ]
  }
};

// Bảng màu cho 2 phe (Phe Ta: Xanh Dương, Phe Địch: Đỏ)
const TEAM_PALS = {
  blue: { id: 'blue', b: '#2980b9', g: '#27ae60' },
  red: { id: 'red', b: '#c0392b', g: '#8e44ad' }
};

// Cache LRU cho sprite
const sprCache = new LRU(1000);
function spr(name, pal, fx = false, fy = false) {
  const key = `${name}|${pal ? pal.id : ''}|${fx ? 1 : 0}${fy ? 1 : 0}`;
  let c = sprCache.get(key);
  if (c) return c;
  const d = SPR[name];
  if (!d) return null;
  const m = d.m;
  const h = m.length, w = Math.max(...m.map(r => r.length));
  c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < m[y].length; x++) {
      const ch = m[y][x];
      if (ch === '.') continue;
      const col = (pal && pal[ch]) || d.p[ch];
      if (col) px(ctx, fx ? w - 1 - x : x, fy ? h - 1 - y : y, 1, 1, col);
    }
  }
  sprCache.set(key, c);
  return c;
}

// =====================================================================
//  PIXEL FONT 3x5
// =====================================================================
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010',
  '-': '000000111000000', '+': '000010111010000', '/': '001001010100100'
};

const textCache = new LRU(500);
function drawText(c, str, x, y, col = '#ffffff', sc = 1, align = 'l', sh = OUT) {
  str = String(str).toUpperCase();
  const key = `${str}|${col}|${sc}|${sh}`;
  let cv = textCache.get(key);
  if (!cv) {
    const w = Math.max(1, str.length * 4 * sc - sc), h = 6 * sc;
    cv = mkCanvas(w, h);
    const t = cv.getContext('2d');
    const render = (ox, oy, cl) => {
      for (let i = 0; i < str.length; i++) {
        const gl = FONT[str[i]];
        if (!gl) continue;
        for (let b = 0; b < 15; b++) {
          if (gl[b] === '1') px(t, ox + (i * 4 + (b % 3)) * sc, oy + Math.floor(b / 3) * sc, sc, sc, cl);
        }
      }
    };
    if (sh) render(sc, sc, sh);
    render(0, 0, col);
    textCache.set(key, cv);
  }
  const dx = align === 'c' ? x - Math.floor(cv.width / 2) : align === 'r' ? x - cv.width : x;
  c.drawImage(cv, Math.round(dx), Math.round(y));
}

// =====================================================================
//  ÂM THANH WEBAUDIO (Zero dependencies)
// =====================================================================
const Snd = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) this.ctx = new C();
    } catch (e) { this.ctx = null; }
  },
  tone(f1, f2, dur, type = 'square', vol = 0.05, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), gn = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  sword() { this.tone(400, 150, 0.08, 'sawtooth', 0.06); },
  bow() { this.tone(600, 900, 0.06, 'triangle', 0.05); },
  hit() { this.tone(180, 60, 0.1, 'square', 0.07); },
  fire() { this.tone(250, 80, 0.25, 'sawtooth', 0.08); },
  thunder() { this.tone(120, 30, 0.6, 'sawtooth', 0.12); },
  heal() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'triangle', 0.04, i * 0.06)); },
  coin() { this.tone(988, 1318, 0.1, 'square', 0.04); }
};

// =====================================================================
//  CANVAS BUFFERS & SCALING PIPELINE
// =====================================================================
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buf = mkCanvas(V_W, V_H);
const g = buf.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;

// Light overlay canvas for day/night
const lightBuf = mkCanvas(V_W, V_H);
const lc = lightBuf.getContext('2d');

let SCALE = 1, OX = 0, OY = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * dpr);
  screen.height = Math.floor(window.innerHeight * dpr);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';

  SCALE = Math.max(1, Math.floor(Math.min(screen.width / V_W, screen.height / V_H)));
  OX = Math.floor((screen.width - V_W * SCALE) / 2);
  OY = Math.floor((screen.height - V_H * SCALE) / 2);

  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// =====================================================================
//  CẤU HÌNH BINH CHỦNG & GAME DATA
// =====================================================================
const UNIT_TYPES = {
  miner: { name: 'THO MO', cost: 40, hp: 70, atk: 0, range: 0, spd: 0, rate: 0, goldRate: 4 },
  swordsman: { name: 'KIEM SI', cost: 50, hp: 140, atk: 22, range: 12, spd: 26, rate: 1.0 },
  archer: { name: 'CUNG THU', cost: 80, hp: 80, atk: 24, range: 85, spd: 22, rate: 1.5 },
  shieldbearer: { name: 'HO VE', cost: 110, hp: 280, atk: 12, range: 12, spd: 15, rate: 1.2, shield: 0.6 },
  cavalry: { name: 'KY BINH', cost: 150, hp: 190, atk: 40, range: 16, spd: 52, rate: 1.2, charge: true },
  mage: { name: 'PHAP SU', cost: 180, hp: 75, atk: 35, range: 75, spd: 18, rate: 2.2, aoe: 24 }
};

const SPELLS = {
  arrow_rain: { cost: 40, name: 'MUA TEN', cd: 8 },
  thunder: { cost: 70, name: 'THIEN LOI', cd: 14 },
  heal: { cost: 50, name: 'CHIEN HOI', cd: 10 }
};

// =====================================================================
//  TRẠNG THÁI GAME
// =====================================================================
let activeLane = 1;
let gold = 120, mana = 60;
let aiGold = 80;
let gameSpeed = 1;
let timeOfDay = 0; // 0 to 120s cycle
let state = 'play'; // 'play', 'victory', 'defeat'

const castle = {
  blue: { hp: 1000, maxHp: 1000, lastShoot: 0 },
  red: { hp: 1000, maxHp: 1000, lastShoot: 0 }
};

let units = [];
let projectiles = [];
let particles = [];
let floats = [];
let lights = [];
let thunderFlash = 0;

// Bộ đếm hồi chiêu kỹ năng
const spellCD = { arrow_rain: 0, thunder: 0, heal: 0 };

// AI Spawner timer
let aiTimer = 2.0;

// ---------- Hàm Triệu Hồi Đơn Vị ----------
function summonUnit(typeKey, team, lane) {
  const cfg = UNIT_TYPES[typeKey];
  const isBlue = team === 'blue';

  if (isBlue) {
    if (gold < cfg.cost) return false;
    gold -= cfg.cost;
    Snd.coin();
  }

  const u = {
    type: typeKey,
    team: team,
    lane: lane,
    x: isBlue ? (typeKey === 'miner' ? 24 : CASTLE_L + 4) : CASTLE_R - 4,
    y: LANE_Y[lane] + (typeKey === 'miner' ? randi(-12, 12) : randi(-2, 2)),
    hp: cfg.hp,
    maxHp: cfg.hp,
    atk: cfg.atk,
    range: cfg.range,
    spd: cfg.spd,
    rate: cfg.rate,
    cd: 0.5,
    goldTimer: 0,
    animTime: rand(0, 5),
    state: 'walk', // 'walk', 'attack', 'dead'
    target: null,
    deadT: 0
  };

  units.push(u);
  return true;
}

// ---------- Dùng Kỹ Năng Chỉ Huy ----------
function castSpell(spellKey, lane) {
  const sp = SPELLS[spellKey];
  if (mana < sp.cost || spellCD[spellKey] > 0) return false;
  mana -= sp.cost;
  spellCD[spellKey] = sp.cd;

  if (spellKey === 'arrow_rain') {
    Snd.bow();
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const tx = rand(CASTLE_L + 20, CASTLE_R - 20);
        projectiles.push({
          type: 'sky_arrow',
          team: 'blue',
          x: tx,
          y: -10,
          tx: tx,
          ty: LANE_Y[lane] + rand(-8, 8),
          lane: lane,
          dmg: 28,
          spd: 180
        });
      }, i * 35);
    }
  } else if (spellKey === 'thunder') {
    thunderFlash = 0.45;
    Snd.thunder();
    // Giáng sét vào quân địch đông nhất trên làn đó
    const enemies = units.filter(u => u.team === 'red' && u.lane === lane && u.state !== 'dead');
    enemies.forEach(e => {
      e.hp -= 95;
      floatText('-95 SÉT', e.x, e.y - 12, '#5fcde4');
      spawnSparks(e.x, e.y, '#5fcde4', 12);
    });
    // Sát thương lâu đài địch nếu áp sát
    if (enemies.length === 0) {
      castle.red.hp = Math.max(0, castle.red.hp - 80);
      floatText('-80 THÀNH', CASTLE_R + 10, LANE_Y[lane], '#ffe066');
    }
  } else if (spellKey === 'heal') {
    Snd.heal();
    const allies = units.filter(u => u.team === 'blue' && u.lane === lane && u.state !== 'dead');
    allies.forEach(a => {
      a.hp = Math.min(a.maxHp, a.hp + 65);
      floatText('+65 HP', a.x, a.y - 10, '#2ecc71');
      spawnSparks(a.x, a.y, '#2ecc71', 8);
    });
  }
  return true;
}

// ---------- Hiệu ứng bay & Hạt ----------
function floatText(s, x, y, col) { floats.push({ s, x, y, col, life: 1.0 }); }
function spawnSparks(x, y, col, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: rand(-30, 30),
      vy: rand(-30, 10),
      life: rand(0.3, 0.6),
      col
    });
  }
}

// =====================================================================
//  LOGIC CẬP NHẬT TRẬN ĐẤU
// =====================================================================
function update(dt) {
  if (state !== 'play') return;
  dt *= gameSpeed;

  timeOfDay = (timeOfDay + dt) % 120;
  gold = Math.min(999, gold + dt * 4.5);
  mana = Math.min(100, mana + dt * 3.2);
  aiGold = Math.min(999, aiGold + dt * 4.0);

  // Giảm hồi chiêu kỹ năng
  for (const k in spellCD) if (spellCD[k] > 0) spellCD[k] = Math.max(0, spellCD[k] - dt);
  if (thunderFlash > 0) thunderFlash = Math.max(0, thunderFlash - dt);

  // AI Đơn vị tự động triển khai
  aiTimer -= dt;
  if (aiTimer <= 0) {
    aiTimer = rand(2.2, 4.0);
    const randLane = randi(0, 2);
    // Chọn quân tương khắc dựa trên số vàng AI có
    const possibleUnits = ['swordsman', 'swordsman', 'archer', 'shieldbearer', 'cavalry', 'mage'];
    const chosen = pick(possibleUnits);
    if (aiGold >= UNIT_TYPES[chosen].cost) {
      aiGold -= UNIT_TYPES[chosen].cost;
      summonUnit(chosen, 'red', randLane);
    }
  }

  // Cập nhật từng đơn vị
  for (const u of units) {
    if (u.state === 'dead') {
      u.deadT += dt;
      continue;
    }

    u.animTime += dt;
    u.cd = Math.max(0, u.cd - dt);

    // Thợ mỏ tạo vàng định kỳ
    if (u.type === 'miner') {
      u.goldTimer += dt;
      if (u.goldTimer >= 1.0) {
        u.goldTimer = 0;
        gold = Math.min(999, gold + UNIT_TYPES.miner.goldRate);
        floatText('+4G', u.x, u.y - 6, '#ffd23a');
      }
      continue;
    }

    const isBlue = u.team === 'blue';
    const dir = isBlue ? 1 : -1;
    const enemyCastleX = isBlue ? CASTLE_R : CASTLE_L;

    // Tìm mục tiêu gần nhất cùng làn
    let target = null;
    let targetDist = 9999;

    for (const other of units) {
      if (other.team !== u.team && other.lane === u.lane && other.state !== 'dead') {
        const d = Math.abs(other.x - u.x);
        if (d < targetDist && ((isBlue && other.x > u.x) || (!isBlue && other.x < u.x))) {
          targetDist = d;
          target = other;
        }
      }
    }

    // Kiểm tra cự ly lâu đài đối phương
    const castleDist = Math.abs(enemyCastleX - u.x);

    // Xử lý tấn công lính địch hoặc công phá thành trì
    if (target && targetDist <= u.range) {
      u.state = 'attack';
      if (u.cd <= 0) {
        u.cd = u.rate;
        performAttack(u, target);
      }
    } else if (castleDist <= u.range + 8) {
      u.state = 'attack';
      if (u.cd <= 0) {
        u.cd = u.rate;
        performCastleAttack(u, isBlue ? 'red' : 'blue');
      }
    } else {
      // Tiến lên phía trước
      u.state = 'walk';
      u.x += dir * u.spd * dt;
    }

    // Kiểm tra lính chết
    if (u.hp <= 0) {
      u.state = 'dead';
      spawnSparks(u.x, u.y, isBlue ? '#3b7ae8' : '#e74c3c', 10);
    }
  }

  // Tháp canh lâu đài tự động bắn tên phòng thủ
  updateCastleTowers(dt);

  // Cập nhật đường đạn bay (Arrows & Fireballs)
  updateProjectiles(dt);

  // Cập nhật hạt & text nổi
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);

  for (const f of floats) {
    f.y -= 14 * dt;
    f.life -= dt;
  }
  floats = floats.filter(f => f.life > 0);

  // Lọc lính chết sau khi hiện hoạt cảnh
  units = units.filter(u => u.state !== 'dead' || u.deadT < 0.8);

  // Kiểm tra thắng bại
  if (castle.red.hp <= 0) {
    state = 'victory';
    Snd.tone(523, 1047, 0.6, 'triangle', 0.15);
  } else if (castle.blue.hp <= 0) {
    state = 'defeat';
    Snd.tone(300, 80, 0.8, 'sawtooth', 0.15);
  }

  updateDOMHUD();
}

function performAttack(attacker, target) {
  if (attacker.type === 'swordsman' || attacker.type === 'cavalry' || attacker.type === 'shieldbearer') {
    Snd.sword();
    let dmg = attacker.atk;
    if (target.type === 'shieldbearer' && attacker.type === 'archer') dmg *= (1 - UNIT_TYPES.shieldbearer.shield);
    target.hp -= Math.round(dmg);
    floatText('-' + Math.round(dmg), target.x, target.y - 8, '#e74c3c');
    spawnSparks(target.x, target.y, '#ffffff', 4);
  } else if (attacker.type === 'archer') {
    Snd.bow();
    projectiles.push({
      type: 'arrow',
      team: attacker.team,
      x: attacker.x,
      y: attacker.y - 2,
      target: target,
      dmg: attacker.atk,
      spd: 160
    });
  } else if (attacker.type === 'mage') {
    Snd.fire();
    projectiles.push({
      type: 'fireball',
      team: attacker.team,
      x: attacker.x,
      y: attacker.y - 2,
      tx: target.x,
      ty: target.y,
      dmg: attacker.atk,
      spd: 120,
      aoe: UNIT_TYPES.mage.aoe,
      lane: attacker.lane
    });
  }
}

function performCastleAttack(attacker, enemyTeam) {
  const c = castle[enemyTeam];
  let dmg = attacker.atk;
  c.hp = Math.max(0, c.hp - Math.round(dmg));
  floatText('-' + Math.round(dmg), enemyTeam === 'red' ? CASTLE_R + 6 : CASTLE_L - 6, attacker.y, '#ffd23a');
  Snd.hit();
}

function updateCastleTowers(dt) {
  for (const team of ['blue', 'red']) {
    const c = castle[team];
    c.lastShoot += dt;
    if (c.lastShoot >= 1.5) {
      const isBlue = team === 'blue';
      const originX = isBlue ? CASTLE_L : CASTLE_R;
      // Tìm kẻ thù gần thành nhất trên bất kỳ làn nào
      const enemy = units.find(u => u.team !== team && u.state !== 'dead' && Math.abs(u.x - originX) < 75);
      if (enemy) {
        c.lastShoot = 0;
        Snd.bow();
        projectiles.push({
          type: 'tower_arrow',
          team: team,
          x: originX,
          y: enemy.y - 6,
          target: enemy,
          dmg: 30,
          spd: 170
        });
      }
    }
  }
}

function updateProjectiles(dt) {
  for (const p of projectiles) {
    if (p.type === 'arrow' || p.type === 'tower_arrow') {
      if (!p.target || p.target.state === 'dead') {
        p.dead = true;
        continue;
      }
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        p.dead = true;
        let finalDmg = p.dmg;
        if (p.target.type === 'shieldbearer') finalDmg *= 0.4;
        p.target.hp -= Math.round(finalDmg);
        floatText('-' + Math.round(finalDmg), p.target.x, p.target.y - 8, '#e74c3c');
        spawnSparks(p.target.x, p.target.y, '#ffffff', 4);
      } else {
        p.x += (dx / dist) * p.spd * dt;
        p.y += (dy / dist) * p.spd * dt;
      }
    } else if (p.type === 'fireball') {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        p.dead = true;
        Snd.hit();
        spawnSparks(p.x, p.y, '#f39c12', 16);
        // Sát thương diện rộng (AoE)
        units.forEach(u => {
          if (u.team !== p.team && u.lane === p.lane && u.state !== 'dead') {
            if (Math.abs(u.x - p.x) <= p.aoe) {
              u.hp -= p.dmg;
              floatText('-' + p.dmg, u.x, u.y - 10, '#f39c12');
            }
          }
        });
      } else {
        p.x += (dx / dist) * p.spd * dt;
        p.y += (dy / dist) * p.spd * dt;
      }
    } else if (p.type === 'sky_arrow') {
      p.y += p.spd * dt;
      if (p.y >= p.ty) {
        p.dead = true;
        units.forEach(u => {
          if (u.team !== p.team && u.lane === p.lane && u.state !== 'dead') {
            if (Math.abs(u.x - p.tx) <= 12) {
              u.hp -= p.dmg;
              floatText('-' + p.dmg, u.x, u.y - 8, '#e74c3c');
            }
          }
        });
      }
    }
  }
  projectiles = projectiles.filter(p => !p.dead);
}

// =====================================================================
//  RENDER PIPELINE (CANVAS 2D)
// =====================================================================
function darknessAmount() {
  const ph = (timeOfDay % 120) / 120;
  const d = (1 - Math.cos(ph * Math.PI * 2)) / 2;
  return clamp((d - 0.25) / 0.5, 0, 0.78);
}

function drawScene() {
  // 1. Nền cỏ & 3 Làn đường đất
  g.fillStyle = '#2d6a4f';
  g.fillRect(0, 0, V_W, V_H);

  // Vẽ 3 dải đường chiến trường
  for (let i = 0; i < 3; i++) {
    const ly = LANE_Y[i];
    g.fillStyle = i === activeLane ? '#8d6e63' : '#6d4c41';
    g.fillRect(CASTLE_L - 4, ly - 8, CASTLE_R - CASTLE_L + 8, 18);
    // Viền mép đường đất
    g.fillStyle = '#4e342e';
    g.fillRect(CASTLE_L - 4, ly - 9, CASTLE_R - CASTLE_L + 8, 1);
    g.fillRect(CASTLE_L - 4, ly + 10, CASTLE_R - CASTLE_L + 8, 1);
  }

  // 2. Mỏ vàng phe Ta (Gần thành xanh)
  g.drawImage(spr('gold_rock'), 16, 26);
  g.drawImage(spr('gold_rock'), 14, 150);

  // 3. Cây cối trang trí trên bãi cỏ giữa các làn
  const treeY = [24, 72, 114, 162];
  for (const ty of treeY) {
    g.drawImage(spr('tree'), 80, ty);
    g.drawImage(spr('tree'), 160, ty - 4);
    g.drawImage(spr('tree'), 235, ty);
  }

  // 4. Lâu đài Phe Ta (Xanh) & Phe Địch (Đỏ)
  drawCastle(CASTLE_L - 24, 'blue', castle.blue);
  drawCastle(CASTLE_R - 4, 'red', castle.red);

  // Đuốc thành phát sáng
  g.drawImage(spr('torch'), CASTLE_L - 6, 44);
  g.drawImage(spr('torch'), CASTLE_L - 6, 128);
  g.drawImage(spr('torch'), CASTLE_R + 2, 44);
  g.drawImage(spr('torch'), CASTLE_R + 2, 128);

  // 5. Đơn vị lính chiến đấu
  // Sắp xếp đơn vị theo tọa độ Y để có độ sâu che khuất (Depth sorting)
  const sortedUnits = units.slice().sort((a, b) => a.y - b.y);
  for (const u of sortedUnits) {
    const pal = TEAM_PALS[u.team];
    const isWalk = Math.floor(u.animTime * 6) % 2 === 0;
    let sprKey = `${u.type}_walk${isWalk ? 0 : 1}`;
    if (u.state === 'attack') {
      if (u.type === 'swordsman') sprKey = 'sword_attack';
      else if (u.type === 'archer') sprKey = 'archer_shoot';
      else if (u.type === 'mage') sprKey = 'mage_cast';
    } else if (u.type === 'miner') {
      sprKey = isWalk ? 'miner' : 'miner_mine';
    }

    const s = spr(sprKey, pal, u.team === 'red');
    if (s) {
      // Bóng đổ
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(Math.round(u.x - s.width / 2 + 1), Math.round(u.y + 6), s.width - 2, 2);
      // Sprite
      g.drawImage(s, Math.round(u.x - s.width / 2), Math.round(u.y - s.height / 2));
    }

    // Thanh máu trên đầu mỗi lính
    if (u.state !== 'dead') {
      const bw = 10, bh = 2;
      const bx = Math.round(u.x - bw / 2), by = Math.round(u.y - 8);
      g.fillStyle = OUT;
      g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      g.fillStyle = '#4a4458';
      g.fillRect(bx, by, bw, bh);
      const hpW = Math.round(bw * clamp(u.hp / u.maxHp, 0, 1));
      g.fillStyle = u.team === 'blue' ? '#3b7ae8' : '#e74c3c';
      g.fillRect(bx, by, hpW, bh);
    }
  }

  // 6. Đạn bay (Projectiles)
  for (const p of projectiles) {
    if (p.type === 'arrow' || p.type === 'tower_arrow') {
      g.drawImage(spr('arrow'), Math.round(p.x), Math.round(p.y));
    } else if (p.type === 'sky_arrow') {
      g.drawImage(spr('arrow', null, false, true), Math.round(p.x), Math.round(p.y));
    } else if (p.type === 'fireball') {
      g.drawImage(spr('fireball'), Math.round(p.x - 2), Math.round(p.y - 2));
    }
  }

  // 7. Hiệu ứng hạt
  for (const pt of particles) {
    g.fillStyle = pt.col;
    g.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1);
  }

  // 8. Chữ số nổi (Damage numbers)
  for (const f of floats) {
    drawText(g, f.s, f.x, f.y, f.col, 1, 'c');
  }
}

function drawCastle(x, team, data) {
  const isBlue = team === 'blue';
  const stoneCol = isBlue ? '#2c3e50' : '#4a235a';
  const roofCol = isBlue ? '#2980b9' : '#c0392b';

  // Tháp chính
  g.fillStyle = stoneCol;
  g.fillRect(x, 16, 26, 150);
  // Răng cưa tháp canh
  for (let y = 18; y < 160; y += 14) {
    g.fillStyle = '#1c2833';
    g.fillRect(x + 2, y, 6, 8);
  }
  // Mái tháp
  g.fillStyle = roofCol;
  g.fillRect(x, 12, 26, 4);

  // Thanh máu lâu đài
  const bw = 24, bh = 3;
  const bx = x + 1, by = 6;
  g.fillStyle = OUT;
  g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  g.fillStyle = '#2c3e50';
  g.fillRect(bx, by, bw, bh);
  const hpW = Math.round(bw * clamp(data.hp / data.maxHp, 0, 1));
  g.fillStyle = isBlue ? '#3498db' : '#e74c3c';
  g.fillRect(bx, by, hpW, bh);
  drawText(g, data.hp + '/' + data.maxHp, bx + bw / 2, by - 5, '#ffffff', 1, 'c');
}

// Ánh sáng dynamic ngày/đêm bằng globalCompositeOperation
function drawLighting() {
  const dark = darknessAmount();
  if (dark > 0.05) {
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, V_W, V_H);
    lc.fillStyle = `rgba(10, 12, 32, ${dark})`;
    lc.fillRect(0, 0, V_W, V_H);

    // Khoét lỗ ánh sáng đuốc và đạn ma pháp
    lc.globalCompositeOperation = 'destination-out';
    const lightsList = [
      { x: CASTLE_L - 4, y: 46, r: 24 },
      { x: CASTLE_L - 4, y: 130, r: 24 },
      { x: CASTLE_R + 4, y: 46, r: 24 },
      { x: CASTLE_R + 4, y: 130, r: 24 }
    ];

    // Cầu lửa phát sáng
    projectiles.filter(p => p.type === 'fireball').forEach(p => {
      lightsList.push({ x: p.x, y: p.y, r: 22 });
    });

    for (const l of lightsList) {
      const gr = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gr;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }

    g.drawImage(lightBuf, 0, 0);

    // Quầng sáng phát quang màu cam lửa
    g.globalCompositeOperation = 'lighter';
    for (const l of lightsList) {
      const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.6);
      gr.addColorStop(0, 'rgba(255, 180, 50, 0.45)');
      gr.addColorStop(1, 'rgba(255, 120, 0, 0)');
      g.fillStyle = gr;
      g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }

  // Chớp sấm sét toàn màn hình
  if (thunderFlash > 0) {
    g.fillStyle = `rgba(235, 245, 255, ${thunderFlash * 1.8})`;
    g.fillRect(0, 0, V_W, V_H);
  }
}

// Bảng kết thúc trận
function drawEndBanner() {
  if (state === 'victory') {
    g.fillStyle = 'rgba(13, 10, 20, 0.75)';
    g.fillRect(0, 0, V_W, V_H);
    drawText(g, 'CHIEN THANG!', V_W / 2, 60, '#f1c40f', 3, 'c');
    drawText(g, 'DA CONG PHA HOAN TOAN THANH TRI DICH', V_W / 2, 85, '#ffffff', 1, 'c');
    drawText(g, 'NHAN SPACE HOAC REFRESH DE CHOI LAI', V_W / 2, 110, '#2ecc71', 1, 'c');
  } else if (state === 'defeat') {
    g.fillStyle = 'rgba(13, 10, 20, 0.75)';
    g.fillRect(0, 0, V_W, V_H);
    drawText(g, 'THAT BAI!', V_W / 2, 60, '#e74c3c', 3, 'c');
    drawText(g, 'THANH TRI CUA BAN DA BI CONG PHA', V_W / 2, 85, '#ffffff', 1, 'c');
    drawText(g, 'NHAN SPACE HOAC REFRESH DE THU LAI', V_W / 2, 110, '#f39c12', 1, 'c');
  }
}

function render() {
  drawScene();
  drawLighting();
  drawEndBanner();
}

function present() {
  sctx.fillStyle = '#0d0a14';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buf, OX, OY, V_W * SCALE, V_H * SCALE);
}

// =====================================================================
//  CẬP NHẬT HUD DOM
// =====================================================================
function updateDOMHUD() {
  const gEl = document.getElementById('gold-val');
  const mEl = document.getElementById('mana-val');
  if (gEl) gEl.innerText = Math.floor(gold);
  if (mEl) mEl.innerText = Math.floor(mana);

  // Cập nhật trạng thái bật/tắt nút quân & kỹ năng
  document.querySelectorAll('.card-btn[data-unit]').forEach(b => {
    const t = b.dataset.unit;
    const cost = UNIT_TYPES[t].cost;
    b.classList.toggle('disabled', gold < cost);
  });
  document.querySelectorAll('.card-btn[data-spell]').forEach(b => {
    const sp = b.dataset.spell;
    const cost = SPELLS[sp].cost;
    const isCd = spellCD[sp] > 0;
    b.classList.toggle('disabled', mana < cost || isCd);

    let overlay = b.querySelector('.cooldown-overlay');
    if (isCd) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cooldown-overlay';
        b.appendChild(overlay);
      }
      overlay.innerText = Math.ceil(spellCD[sp]);
    } else if (overlay) {
      overlay.remove();
    }
  });
}

// =====================================================================
//  TƯƠNG TÁC NGƯỜI DÙNG (INPUT)
// =====================================================================
function setActiveLane(l) {
  activeLane = clamp(l, 0, 2);
  document.querySelectorAll('.lane-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.lane, 10) === activeLane);
  });
}

// Phím tắt bàn phím
window.addEventListener('keydown', e => {
  Snd.init();
  if (e.code === 'Digit1') setActiveLane(0);
  if (e.code === 'Digit2') setActiveLane(1);
  if (e.code === 'Digit3') setActiveLane(2);

  if (e.code === 'Digit4') summonUnit('miner', 'blue', activeLane);
  if (e.code === 'Digit5') summonUnit('swordsman', 'blue', activeLane);
  if (e.code === 'Digit6') summonUnit('archer', 'blue', activeLane);
  if (e.code === 'Digit7') summonUnit('shieldbearer', 'blue', activeLane);
  if (e.code === 'Digit8') summonUnit('cavalry', 'blue', activeLane);
  if (e.code === 'Digit9') summonUnit('mage', 'blue', activeLane);

  if (e.code === 'KeyQ') castSpell('arrow_rain', activeLane);
  if (e.code === 'KeyW') castSpell('thunder', activeLane);
  if (e.code === 'KeyE') castSpell('heal', activeLane);

  if (e.code === 'Space' && (state === 'victory' || state === 'defeat')) {
    location.reload();
  }
});

// Click vào làn
document.querySelectorAll('.lane-btn').forEach(b => {
  b.addEventListener('click', () => {
    Snd.init();
    setActiveLane(parseInt(b.dataset.lane, 10));
  });
});

// Click thẻ bài lính & phép
document.querySelectorAll('.card-btn[data-unit]').forEach(b => {
  b.addEventListener('click', () => {
    Snd.init();
    summonUnit(b.dataset.unit, 'blue', activeLane);
  });
});
document.querySelectorAll('.card-btn[data-spell]').forEach(b => {
  b.addEventListener('click', () => {
    Snd.init();
    castSpell(b.dataset.spell, activeLane);
  });
});

// Tốc độ & Âm thanh
document.getElementById('speed-btn').addEventListener('click', () => {
  Snd.init();
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  document.getElementById('speed-btn').innerText = gameSpeed + 'X';
});
document.getElementById('sound-btn').addEventListener('click', () => {
  Snd.init();
  Snd.muted = !Snd.muted;
  document.getElementById('sound-btn').innerText = Snd.muted ? '🔇 TẮT' : '🔊 BẬT';
});

// =====================================================================
//  VÒNG LẶP CHÍNH (60 FPS)
// =====================================================================
let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  render();
  present();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
