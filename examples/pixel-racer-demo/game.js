'use strict';
/* =====================================================================
 *  ĐUA XE PIXEL
 *  Kỹ thuật (học từ Tiệm Nét Cỏ):
 *   - Canvas 2D thuần, không engine, không WebGL
 *   - Pixel art định nghĩa bằng MA TRẬN KÝ TỰ + BẢNG MÀU, vẽ bằng fillRect
 *   - Sprite được "nướng" sẵn ra canvas phụ, lưu trong cache LRU
 *   - Font bitmap 3x5 tự vẽ (PixelFont)
 *   - Vẽ lên buffer độ phân giải thấp 160x240 rồi phóng to theo số nguyên,
 *     imageSmoothingEnabled = false để pixel luôn sắc nét
 *   - Ánh sáng ngày/đêm bằng globalCompositeOperation + gradient
 * ===================================================================== */

// ---------- Hằng số ----------
const W = 160, H = 240;
const ROAD_L = 24, ROAD_R = 136, LANE_W = 28;
const LANES = [38, 66, 94, 122];          // 0,1: ngược chiều | 2,3: cùng chiều
const STAGE_LEN = 1500;                   // mét mỗi chặng
const PLAYER_Y = H - 48;

// ---------- Tiện ích ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
};

class LRU extends Map {
  constructor(n) { super(); this.n = n; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.n) super.delete(this.keys().next().value); return this; }
}

// =====================================================================
//  SPRITE: ma trận ký tự + bảng màu  ('.' = trong suốt)
// =====================================================================
const OUT = '#1b1424';
const TIRE_A = '#16121c', TIRE_B = '#4a4458';

function houseMap() {
  const m = [], w = 18, h = 18;
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      let c;
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) c = 'k';
      else if (y === 8) c = 'e';
      else if (y < 8) c = (y % 2 === 0 && x % 3 === 0) ? 'l' : 'r';
      else c = (y % 2 === 1 && x % 3 === 1) ? 's' : 'd';
      if (x >= 12 && x <= 14 && y >= 2 && y <= 5) c = (x === 12 || x === 14 || y === 2) ? 'k' : 'c';
      row += c;
    }
    m.push(row);
  }
  return m;
}

const SPR = {
  car: {
    p: { k: OUT, y: '#fff6b0', r: '#e83b3b', d: '#9e2330', l: '#ff8f7a', w: '#5fcde4', c: '#c8f4ff', v: '#3a8ab0', b: '#ff2244', t: TIRE_A, u: TIRE_B },
    m: [
      '..kkkkkk..',
      '.kyrrrryk.',
      '.krrllrrk.',
      'tkrrllrrkt',
      'ukwwwwwwku',
      '.kwcwwwwk.',
      '.kdrllrdk.',
      '.krrllrrk.',
      '.krrllrrk.',
      '.kdrllrdk.',
      'tkvvvvvvkt',
      'ukrrllrrku',
      '.krrllrrk.',
      '.kbrrrrbk.',
      '..kkkkkk..'
    ]
  },
  police: {
    p: { k: OUT, y: '#fff6b0', h: '#f4f4f8', n: '#2a2a3a', a: '#ff2a3a', e: '#2a6aff', w: '#5fcde4', c: '#c8f4ff', v: '#3a8ab0', b: '#ff2244', t: TIRE_A, u: TIRE_B },
    m: [
      '..kkkkkk..',
      '.kyhhhhyk.',
      '.khhhhhhk.',
      'tkhhhhhhkt',
      'ukwwwwwwku',
      '.kwcwwwwk.',
      '.kaaaeeek.',
      '.knnnnnnk.',
      '.knhhhhnk.',
      '.knnnnnnk.',
      'tkvvvvvvkt',
      'ukhhhhhhku',
      '.khhhhhhk.',
      '.kbhhhhbk.',
      '..kkkkkk..'
    ]
  },
  truck: {
    p: { k: OUT, y: '#fff6b0', d: '#3b6fd1', w: '#5fcde4', c: '#c8f4ff', g: '#e6e2d3', h: '#ffffff', s: '#bdb6a0', b: '#ff2244', t: TIRE_A, u: TIRE_B },
    m: [
      '..kkkkkkkk..',
      '.kyddddddyk.',
      '.kddddddddk.',
      'tkwwwwwwwwkt',
      'ukwccwwwwwku',
      '.kddddddddk.',
      '.kkkkkkkkkk.',
      '.kghhhhhhgk.',
      '.kggggggggk.',
      'tkggggggggkt',
      'ukggggggggku',
      '.kgssssssgk.',
      '.kggggggggk.',
      '.kgssssssgk.',
      '.kggggggggk.',
      '.kgssssssgk.',
      '.kggggggggk.',
      '.kggggggggk.',
      'tkggggggggkt',
      'ukggggggggku',
      '.kggggggggk.',
      '.kbggggggbk.',
      '..kkkkkkkk..'
    ]
  },
  coin0: { p: { k: '#8a4b08', y: '#ffd23a', l: '#fff7c2' }, m: ['.kkkk.', 'kyyyyk', 'kylyyk', 'kylyyk', 'kyyyyk', '.kkkk.'] },
  coin1: { p: { k: '#8a4b08', y: '#ffd23a', l: '#fff7c2' }, m: ['..kk..', '.kyyk.', '.klyk.', '.klyk.', '.kyyk.', '..kk..'] },
  coin2: { p: { k: '#8a4b08', y: '#ffd23a', l: '#fff7c2' }, m: ['...k..', '..yk..', '..lk..', '..lk..', '..yk..', '...k..'] },
  fuel: {
    p: { k: OUT, r: '#e83b3b', w: '#ffe066' },
    m: ['..kk...', '.kkkkk.', 'krrrrrk', 'krwrrrk', 'krrwrrk', 'krrrwrk', 'krrrrrk', '.kkkkk.']
  },
  nitro: {
    p: { k: OUT, b: '#2f7bff', l: '#9fd0ff', w: '#ffffff' },
    m: ['..kk..', '..kk..', '.kbbk.', 'kbllbk', 'kblbbk', 'kbbbbk', 'kbwwbk', 'kbbbbk', '.kkkk.']
  },
  heart: {
    p: { k: OUT, r: '#ff3355', l: '#ffb3c0' },
    m: ['.kk.kk.', 'krrkrrk', 'krlrrrk', '.krrrk.', '..krk..', '...k...']
  },
  flame0: { p: { y: '#fff2a0', o: '#ff9a1f', r: '#e83b3b' }, m: ['.yy.', 'yooy', 'yooy', '.oo.', '.rr.', '..r.'] },
  flame1: { p: { y: '#fff2a0', o: '#ff9a1f', r: '#e83b3b' }, m: ['.yy.', 'yooy', '.oo.', '.or.', '..r.', '....'] },
  tree: {
    p: { k: OUT, g: '#3f8f3a', l: '#6fc35a', d: '#2a6328', b: '#7a4a2a' },
    m: [
      '....kkkk....',
      '..kkggggkk..',
      '.kgglggggdk.',
      '.kglgggggdk.',
      'kgggggggggdk',
      'kggglgggggdk',
      'kgggggggggdk',
      '.kggggggddk.',
      '..kddggddk..',
      '...kkddkk...',
      '.....bb.....',
      '.....bb.....',
      '....kbbk....',
      '....kkkk....'
    ]
  },
  pine: {
    p: { k: OUT, g: '#2f7a4a', l: '#5fb07a', d: '#1f5a34', b: '#7a4a2a' },
    m: [
      '....kk....',
      '...kggk...',
      '...kglk...',
      '..kggggk..',
      '..kglggk..',
      '.kggggggk.',
      '..kkggkk..',
      '.kggglggk.',
      'kggggggggk',
      '.kkggggkk.',
      'kgggglgggk',
      'kggggggggk',
      '.kkkkkkkk.',
      '....bb....',
      '....bb....',
      '...kkkk...'
    ]
  },
  bush: { p: { k: OUT, g: '#3f8f3a', l: '#6fc35a' }, m: ['..kkkk..', '.kgglgk.', 'kgglgggk', 'kggggggk', '.kkkkkk.'] },
  rock: { p: { k: OUT, s: '#8a8a98', l: '#b8b8c8', d: '#5a5a68' }, m: ['.kkkk.', 'kslssk', 'ksssdk', '.kkkk.'] },
  cactus: {
    p: { k: OUT, g: '#4a9a4a', d: '#2f6a32' },
    m: ['...kk...', '..kgdk..', 'k.kgdk..', 'gkkgdk.k', 'gggggkkg', 'kkkgdggk', '..kgdkk.', '..kgdk..', '..kgdk..', '..kkkk..']
  },
  lamp: {
    p: { k: OUT, s: '#7a7a8a', y: '#fff2a0' },
    m: ['kkkkkk', 'ksssyy', 'kkkkkk', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'sk....', 'kkk...', 'kkk...']
  },
  house: {
    p: { k: OUT, r: '#d9503b', l: '#ff7a5a', e: '#7a2a20', d: '#a33a2a', s: '#c24a33', c: '#6a6a78' },
    m: houseMap()
  }
};
SPR.coin3 = SPR.coin1;

// Bảng màu thay thế, được ghi nhớ theo id (để làm khóa cache)
const palMemo = new Map();
function P(id, fn) { let p = palMemo.get(id); if (!p) { p = fn(); p.id = id; palMemo.set(id, p); } return p; }

const CAR_COLORS = [
  { r: '#e83b3b', d: '#9e2330', l: '#ff8f7a' },
  { r: '#3b7ae8', d: '#24449e', l: '#8fb8ff' },
  { r: '#3bc45a', d: '#23803a', l: '#8fe89a' },
  { r: '#f2c230', d: '#b0821a', l: '#fff09a' },
  { r: '#e4e4ec', d: '#9a9aa8', l: '#e83b3b' },
  { r: '#a55ae8', d: '#6a2ea0', l: '#d4a0ff' },
  { r: '#ff8a2a', d: '#b0521a', l: '#ffc07a' },
  { r: '#3ad6c8', d: '#1f8a80', l: '#a0fff4' }
];
const COLOR_NAMES = ['DO', 'XANH DUONG', 'XANH LA', 'VANG', 'TRANG', 'TIM', 'CAM', 'NGOC'];
const tires = f => (f ? { t: TIRE_B, u: TIRE_A } : { t: TIRE_A, u: TIRE_B });
const palPlayer = (ci, f) => P('pc' + ci + f, () => ({ ...CAR_COLORS[ci], ...tires(f) }));
const palTraffic = (ci, f) => P('tc' + ci + f, () => ({ ...CAR_COLORS[ci], l: CAR_COLORS[ci].r, ...tires(f) }));
const palPolice = (lf, f) => P('po' + lf + f, () => ({ a: lf ? '#2a6aff' : '#ff2a3a', e: lf ? '#ff2a3a' : '#2a6aff', ...tires(f) }));
const palTruck = (ci, f) => P('tr' + ci + f, () => ({ d: CAR_COLORS[ci].d, ...tires(f) }));
const palBurnt = P('burnt', () => ({ r: '#3a3238', d: '#241e24', l: '#4a4048', w: '#2a2a30', c: '#3a3a40', v: '#202024', y: '#555', b: '#331' }));

// Nướng sprite ra canvas phụ — mỗi tổ hợp (tên, bảng màu, lật) chỉ vẽ 1 lần
const sprCache = new LRU(1200);
function spr(name, pal, fx, fy) {
  const key = name + '|' + (pal ? pal.id : '') + '|' + (fx ? 1 : 0) + (fy ? 1 : 0);
  let c = sprCache.get(key);
  if (c) return c;
  const d = SPR[name], m = d.m;
  const h = m.length, w = Math.max(...m.map(r => r.length));
  c = mkCanvas(w, h);
  const x2 = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < m[y].length; x++) {
      const ch = m[y][x];
      if (ch === '.') continue;
      const col = (pal && pal[ch]) || d.p[ch];
      if (col) px(x2, fx ? w - 1 - x : x, fy ? h - 1 - y : y, 1, 1, col);
    }
  }
  sprCache.set(key, c);
  return c;
}
const sprW = n => SPR[n].m[0].length;
const sprH = n => SPR[n].m.length;

// =====================================================================
//  PIXEL FONT 3x5 (mỗi ký tự = chuỗi 15 bit)
// =====================================================================
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '-': '000000111000000', '/': '001001010100100',
  '+': '000010111010000', '<': '001010100010001', '>': '100010001010100', '%': '101001010100101', '*': '000101010101000'
};
const textCache = new LRU(400);
function text(s, x, y, col = '#fff', sc = 1, align = 'l', sh = OUT) {
  s = String(s).toUpperCase();
  const key = s + '|' + col + '|' + sc + '|' + sh;
  let c = textCache.get(key);
  if (!c) {
    const w = Math.max(1, s.length * 4 * sc - sc + sc), h = 6 * sc;
    c = mkCanvas(w, h);
    const t = c.getContext('2d');
    const draw = (ox, oy, cl) => {
      for (let i = 0; i < s.length; i++) {
        const gl = FONT[s[i]];
        if (!gl) continue;
        for (let b = 0; b < 15; b++) if (gl[b] === '1') px(t, ox + (i * 4 + (b % 3)) * sc, oy + Math.floor(b / 3) * sc, sc, sc, cl);
      }
    };
    if (sh) draw(sc, sc, sh);
    draw(0, 0, col);
    textCache.set(key, c);
  }
  const dx = align === 'c' ? x - Math.floor(c.width / 2) : align === 'r' ? x - c.width : x;
  g.drawImage(c, Math.round(dx), Math.round(y));
}

// =====================================================================
//  TEXTURE NỀN (sinh thủ tục, seed cố định)
// =====================================================================
const BIOMES = [
  { name: 'DONG CO', g: ['#4c9a3a', '#438a33', '#5aad45'], fl: ['#ffe066', '#ff8fb1', '#ffffff'], tree: { g: '#3f8f3a', l: '#6fc35a', d: '#2a6328' }, objs: ['tree', 'tree', 'pine', 'bush', 'bush', 'house', 'rock'] },
  { name: 'MUA THU', g: ['#8a9a3a', '#7a8a33', '#a0ad45'], fl: ['#ff9a3a', '#e8553b', '#ffe066'], tree: { g: '#d9772b', l: '#ffb347', d: '#a34f1c' }, objs: ['tree', 'tree', 'tree', 'bush', 'house', 'rock'] },
  { name: 'SA MAC', g: ['#e0c07a', '#d0ae68', '#ecd08e'], fl: ['#c49a5a', '#b08550'], tree: { g: '#8a9a4a', l: '#b0c06a', d: '#5a6a32' }, objs: ['cactus', 'cactus', 'rock', 'rock', 'bush'] },
  { name: 'XU TUYET', g: ['#e8f0f8', '#d4e0ee', '#ffffff'], fl: ['#b8c8dc'], tree: { g: '#2f6a4a', l: '#ffffff', d: '#1f4a34' }, objs: ['pine', 'pine', 'pine', 'rock', 'house'] }
];
const ROOFS = [
  { r: '#d9503b', l: '#ff7a5a', e: '#7a2a20', d: '#a33a2a', s: '#c24a33' },
  { r: '#3b6fd1', l: '#6a9aff', e: '#1a2a6a', d: '#2a4a9a', s: '#3460b8' },
  { r: '#5a8a3a', l: '#8ac05a', e: '#2a4a1a', d: '#3a6a2a', s: '#4a7a32' }
];

const groundCache = new Map();
function groundTex(bi) {
  if (groundCache.has(bi)) return groundCache.get(bi);
  const b = BIOMES[bi], r = rng(bi * 977 + 13);
  const tile = mkCanvas(32, 32), t = tile.getContext('2d');
  px(t, 0, 0, 32, 32, b.g[0]);
  for (let i = 0; i < 150; i++) px(t, Math.floor(r() * 32), Math.floor(r() * 32), 1, r() < 0.5 ? 1 : 2, b.g[r() < 0.5 ? 1 : 2]);
  for (let i = 0; i < 5; i++) {
    const x = 1 + Math.floor(r() * 29), y = 1 + Math.floor(r() * 29), c = b.fl[Math.floor(r() * b.fl.length)];
    px(t, x, y - 1, 1, 1, c); px(t, x - 1, y, 3, 1, c); px(t, x, y + 1, 1, 1, c);
  }
  const mk = ox => {
    const s = mkCanvas(24, H + 64), sc = s.getContext('2d');
    for (let y = 0; y < H + 64; y += 32) for (let x = -ox; x < 24; x += 32) sc.drawImage(tile, x, y);
    return s;
  };
  const res = { L: mk(0), R: mk(11) };
  groundCache.set(bi, res);
  return res;
}

const roadTex = (() => {
  const r = rng(4242), tile = mkCanvas(ROAD_R - ROAD_L, 32), t = tile.getContext('2d');
  px(t, 0, 0, tile.width, 32, '#4b4b5a');
  for (let i = 0; i < 320; i++) px(t, Math.floor(r() * tile.width), Math.floor(r() * 32), 1, 1, r() < 0.5 ? '#555567' : '#42424f');
  for (let i = 0; i < 3; i++) { let x = Math.floor(r() * tile.width), y = Math.floor(r() * 32); for (let j = 0; j < 6; j++) { px(t, x, y, 1, 1, '#3a3a46'); x += r() < 0.5 ? 1 : -1; y = (y + 1) % 32; } }
  const s = mkCanvas(tile.width, H + 64), sc = s.getContext('2d');
  for (let y = 0; y < H + 64; y += 32) sc.drawImage(tile, 0, y);
  return s;
})();

// =====================================================================
//  ÂM THANH (WebAudio, không cần file)
// =====================================================================
const Snd = {
  ctx: null, muted: store.get('pr_muted', false), eng: null, engGain: null, nb: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = this.ctx = new C();
      const o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 420; gn.gain.value = 0;
      o.connect(f); f.connect(gn); gn.connect(c.destination); o.start();
      this.eng = o; this.engGain = gn;
      this.nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  toggle() { this.muted = !this.muted; store.set('pr_muted', this.muted); },
  engine(speed, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.eng.frequency.setTargetAtTime(42 + speed * 0.5, t, 0.06);
    this.engGain.gain.setTargetAtTime(this.muted || !on ? 0 : 0.03, t, 0.1);
  },
  tone(f1, f2, dur, type = 'square', vol = 0.05, delay = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), gn = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, freq = 800) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = this.nb; f.type = 'bandpass'; f.frequency.value = freq;
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(c.destination); s.start(t); s.stop(t + dur + 0.05);
  }
};

// =====================================================================
//  CANVAS: buffer độ phân giải thấp + màn hình thật
// =====================================================================
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buf = mkCanvas(W, H);
const g = buf.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;
const L = mkCanvas(W, H);                 // lớp bóng tối ban đêm
const lc = L.getContext('2d');
let DPR = 1, S = 1, OX = 0, OY = 0;

function resize() {
  DPR = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * DPR);
  screen.height = Math.floor(window.innerHeight * DPR);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';
  S = Math.max(1, Math.floor(Math.min(screen.width / W, screen.height / H)));   // zoom số nguyên
  OX = Math.floor((screen.width - W * S) / 2);
  OY = Math.floor((screen.height - H * S) / 2);
  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// =====================================================================
//  TRẠNG THÁI GAME
// =====================================================================
let state = 'title';                      // title | count | play | pause | over
let T = 0;                                // thời gian hoạt ảnh
let G = null;
let best = store.get('pr_best', 0);
let playerColor = store.get('pr_color', 0);
const player = { x: LANES[2], y: PLAYER_Y, vx: 0, hearts: 3, inv: 0, fuel: 100, nitro: 40, boost: false, wasBoost: false, dead: false, deadAng: 0, braking: false };
const keys = { left: false, right: false, brake: false, nitro: false };

function newGame(attract) {
  G = {
    attract, score: 0, dist: 0, coins: 0, stage: 1, nextStageAt: STAGE_LEN, speed: attract ? 120 : 0, mult: 1,
    traffic: [], side: [], picks: [], parts: [], floats: [], rain: [], raining: false,
    scroll: 0, sideGap: 0, lampGap: 40, spawnT: 0.5, pickT: 4, coinT: 1.5, exT: 0,
    dayT: attract ? 40 : 0, shake: 0, count: 3, goT: 0, biome: 0, nextBiome: -1, bY: 0,
    banner: { s: '', s2: '', t: 0 }, over: 0, overT: 0, reason: '', newBest: false, lowWarn: false
  };
  Object.assign(player, { x: LANES[2], y: PLAYER_Y, vx: 0, hearts: 3, inv: 0, fuel: 100, nitro: 40, boost: false, wasBoost: false, dead: false, deadAng: 0 });
  for (let y = H + 10; y > -10; y -= rand(16, 30)) spawnSide(y);
  for (let i = 0; i < 70; i++) G.rain.push({ x: rand(0, W), y: rand(0, H), l: randi(3, 6) });
}

function startGame() {
  newGame(false);
  state = 'count';
  for (const k in keys) keys[k] = false;
  Snd.tone(440, 440, 0.15);
}

function endGame(reason) {
  state = 'over';
  G.reason = reason;
  G.overT = 0;
  G.score = Math.floor(G.score);
  if (G.score > best) { best = G.score; G.newBest = true; store.set('pr_best', best); }
  [523, 392, 330, 262].forEach((f, i) => Snd.tone(f, f * 0.98, 0.22, 'square', 0.05, i * 0.18));
}

function togglePause() {
  if (state === 'play') state = 'pause';
  else if (state === 'pause') state = 'play';
}

function changeColor(d) {
  playerColor = (playerColor + d + CAR_COLORS.length) % CAR_COLORS.length;
  store.set('pr_color', playerColor);
  Snd.tone(660, 880, 0.06);
}

function nextStage() {
  G.stage++;
  G.nextStageAt += STAGE_LEN;
  G.nextBiome = (G.stage - 1) % BIOMES.length;
  G.bY = -40;
  G.raining = G.stage >= 2 && G.nextBiome !== 2 && Math.random() < 0.4;
  G.score += 500;
  G.banner = { s: 'CHANG ' + G.stage, s2: BIOMES[G.nextBiome].name + (G.raining ? ' - MUA' : '') + '  +500', t: 2.5 };
  [523, 659, 784, 1047].forEach((f, i) => Snd.tone(f, f, 0.12, 'square', 0.05, i * 0.09));
}

function floatText(s, x, y, col) { G.floats.push({ s, x, y, col, life: 1.1 }); }

// ---------- Particle ----------
function part(o) { G.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, s: 1, world: true, k: 'spark' }, o, { max: o.life })); }
function boom(x, y, big) {
  for (let i = 0; i < (big ? 40 : 22); i++) part({ x, y, vx: rand(-70, 70), vy: rand(-80, 40), life: rand(0.4, 0.9), col: pick(['#fff2a0', '#ffb020', '#ff5a2a', '#e83b3b']), s: randi(1, 2), g: 60 });
  for (let i = 0; i < (big ? 14 : 8); i++) part({ x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-15, 15), vy: rand(-25, -5), life: rand(0.8, 1.6), col: '#5a5a66', s: rand(2, 4), k: 'smoke' });
  part({ x, y, life: 0.25, r: big ? 42 : 26, k: 'flash' });
}
function sparkle(x, y, col) {
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; part({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.4, col, world: false }); }
}

// ---------- Vật bên đường ----------
function curSpawnBiome() { return G.nextBiome >= 0 ? G.nextBiome : G.biome; }
function spawnSide(y) {
  const bi = curSpawnBiome(), b = BIOMES[bi];
  for (const side of [0, 1]) {
    if (Math.random() > 0.8) continue;
    const kind = pick(b.objs), w = sprW(kind), h = sprH(kind);
    const x = side === 0 ? randi(1, Math.max(1, ROAD_L - 5 - w)) : randi(ROAD_R + 4, Math.max(ROAD_R + 4, W - 1 - w));
    let pal = null;
    if (kind === 'tree' || kind === 'pine' || kind === 'bush') pal = P('tree' + bi, () => ({ ...b.tree }));
    if (kind === 'house') { const ri = randi(0, ROOFS.length - 1); pal = bi === 3 ? P('roofsnow', () => ({ r: '#ffffff', l: '#e0ecf8', e: '#8aa0b8', d: '#d4e0ee', s: '#c0d0e4' })) : P('roof' + ri, () => ({ ...ROOFS[ri] })); }
    G.side.push({ kind, x, y: y - h - randi(0, 8), w, h, pal, fx: side === 1 && kind !== 'house' && Math.random() < 0.5 });
  }
}
function spawnLamp() {
  const h = sprH('lamp');
  G.side.push({ kind: 'lamp', x: ROAD_L - 6, y: -h - 2, w: 6, h, pal: null, fx: false, lamp: true });
  G.side.push({ kind: 'lamp', x: ROAD_R, y: -h - 2, w: 6, h, pal: null, fx: true, lamp: true });
}

// ---------- Xe cộ ----------
function laneFree(l, y, self, gap = 44) {
  for (const o of G.traffic) if (o !== self && !o.wreck && o.lane === l && Math.abs(o.y - y) < gap) return false;
  return true;
}
function spawnTraffic() {
  if (G.traffic.length >= 11) return;
  const st = G.stage, lane = randi(0, 3), dir = lane < 2 ? -1 : 1;
  const r = Math.random(), type = r < 0.14 ? 'truck' : r < 0.22 ? 'police' : 'car';
  const w = sprW(type), h = sprH(type);
  let spd = dir < 0 ? rand(70, 110) + st * 6 : rand(50, 100) + st * 6;
  if (type === 'truck') spd *= 0.75;
  let y = -h - 4;
  if (dir > 0 && spd > G.speed + 10) y = H + 4;
  if (!laneFree(lane, y, null, h + 40)) return;
  G.traffic.push({ type, lane, x: LANES[lane] - w / 2, tx: LANES[lane] - w / 2, y, w, h, spd, cur: spd, dir, ci: randi(0, CAR_COLORS.length - 1), blink: 0, blinkDir: 0, nl: lane, wreck: false, ang: 0, va: 0, vx: 0, rel: null });
}

function crash(c) {
  const p = player;
  p.hearts--; p.inv = 2; G.shake = 10; G.speed *= 0.45;
  const cx = c.x + c.w / 2;
  c.wreck = true; c.va = (Math.random() < 0.5 ? -1 : 1) * rand(5, 9); c.vx = cx < p.x ? -45 : 45;
  p.vx = cx < p.x ? 70 : -70;
  boom((cx + p.x) / 2, Math.max(c.y, p.y), false);
  Snd.noise(0.5, 0.35, 400); Snd.tone(220, 40, 0.4, 'sawtooth', 0.06);
  floatText('-1 TIM', p.x, p.y - 10, '#ff5a6a');
  if (p.hearts <= 0) {
    p.dead = true; G.over = 1.8;
    boom(p.x, p.y + 7, true); G.shake = 16;
    Snd.noise(0.9, 0.4, 250);
  }
}

function updateTraffic(dt, collide) {
  const p = player;
  const pb = { x: p.x - 4, y: p.y + 1, w: 8, h: 13 };
  for (const c of G.traffic) {
    if (c.wreck) {
      c.ang += c.va * dt; c.va *= Math.pow(0.3, dt); c.x += c.vx * dt; c.vx *= Math.pow(0.2, dt);
      c.y += G.speed * dt;
      if (Math.random() < dt * 8) part({ x: c.x + c.w / 2, y: c.y + c.h / 2, vx: rand(-6, 6), vy: rand(-20, -8), life: rand(0.6, 1.2), col: '#4a4a55', s: rand(2, 3), k: 'smoke' });
      continue;
    }
    // giữ khoảng cách với xe phía trước
    let spd = c.spd;
    for (const o of G.traffic) {
      if (o === c || o.wreck || o.dir !== c.dir || Math.abs((o.x + o.w / 2) - (c.x + c.w / 2)) > 16) continue;
      if (c.dir > 0 && o.y < c.y && c.y - (o.y + o.h) < 14) spd = Math.min(spd, o.cur * 0.95);
      if (c.dir < 0 && o.y > c.y && o.y - (c.y + c.h) < 14) spd = Math.min(spd, o.cur * 0.95);
    }
    c.cur = approach(c.cur, spd, 90 * dt);
    c.y += (G.speed - c.dir * c.cur) * dt;
    // chuyển làn có xi-nhan
    if (c.dir > 0 && c.type !== 'truck' && !c.blinkDir && Math.random() < 0.22 * dt && c.y > 10 && c.y < H - 70) {
      const nl = c.lane === 2 ? 3 : 2;
      if (laneFree(nl, c.y, c)) { c.blinkDir = nl > c.lane ? 1 : -1; c.blink = 0.9; c.nl = nl; }
    }
    if (c.blinkDir) {
      if (c.blink > 0) { c.blink -= dt; if (c.blink <= 0) { c.lane = c.nl; c.tx = LANES[c.nl] - c.w / 2; } }
      else { const d = c.tx - c.x; c.x += clamp(d, -28 * dt, 28 * dt); if (Math.abs(d) < 0.3) { c.x = c.tx; c.blinkDir = 0; } }
    }
    if (!collide || p.dead) continue;
    const cb = { x: c.x + 1, y: c.y + 1, w: c.w - 2, h: c.h - 2 };
    const hit = pb.x < cb.x + cb.w && pb.x + pb.w > cb.x && pb.y < cb.y + cb.h && pb.y + pb.h > cb.y;
    if (hit) { if (p.inv <= 0) crash(c); continue; }
    // suýt chạm: tâm hai xe đổi chỗ trên trục y khi đi sát nhau
    const rel = Math.sign((c.y + c.h / 2) - (p.y + 7));
    if (c.rel !== null && rel !== c.rel && rel !== 0) {
      const gap = Math.max(cb.x - (pb.x + pb.w), pb.x - (cb.x + cb.w));
      if (gap >= 0 && gap < 5 && p.inv <= 0) {
        const bonus = 50 * G.mult;
        G.score += bonus;
        floatText('SUYT CHAM +' + bonus, p.x, p.y - 8, '#5fe4ff');
        Snd.tone(660, 990, 0.08, 'triangle', 0.06);
      }
    }
    c.rel = rel;
  }
  G.traffic = G.traffic.filter(c => c.y < H + 50 && c.y > -90);
}

// ---------- Vật phẩm ----------
function spawnCoins() {
  const lane = randi(0, 3);
  if (!laneFree(lane, -40, null, 70)) return;
  for (let i = 0; i < 5; i++) G.picks.push({ kind: 'coin', x: LANES[lane], y: -10 - i * 12 });
}
function spawnPick() {
  const p = player;
  let opts = ['fuel', 'fuel', 'nitro', 'nitro'];
  if (p.fuel < 45) opts.push('fuel', 'fuel', 'fuel');
  if (p.hearts < 3 && Math.random() < 0.25) opts = ['heart'];
  const lane = randi(0, 3);
  if (!laneFree(lane, -20, null, 50)) return;
  G.picks.push({ kind: pick(opts), x: LANES[lane], y: -14 });
}
function collect(k, x, y) {
  const p = player;
  if (k === 'coin') { G.coins++; const v = 25 * G.mult; G.score += v; floatText('+' + v, x, y, '#ffe066'); sparkle(x, y, '#ffe066'); Snd.tone(988, 1480, 0.1, 'square', 0.04); }
  if (k === 'fuel') { p.fuel = Math.min(100, p.fuel + 35); floatText('XANG +35', x, y, '#7dff8a'); sparkle(x, y, '#7dff8a'); Snd.tone(440, 880, 0.2, 'triangle', 0.07); }
  if (k === 'nitro') { p.nitro = Math.min(100, p.nitro + 40); floatText('NITRO +40', x, y, '#5fa8ff'); sparkle(x, y, '#5fa8ff'); Snd.tone(330, 1320, 0.25, 'sawtooth', 0.04); }
  if (k === 'heart') { p.hearts = Math.min(3, p.hearts + 1); floatText('+1 TIM', x, y, '#ff5a7a'); sparkle(x, y, '#ff5a7a'); Snd.tone(523, 1047, 0.3, 'triangle', 0.07); }
}

// =====================================================================
//  CẬP NHẬT
// =====================================================================
function updatePlayer(dt) {
  const p = player;
  if (p.dead) {
    G.speed = approach(G.speed, 0, 110 * dt);
    p.deadAng += dt * 3 * (G.speed / 100);
    if (Math.random() < dt * 14) part({ x: p.x + rand(-3, 3), y: p.y + 7, vx: rand(-8, 8), vy: rand(-30, -12), life: rand(0.8, 1.4), col: '#3a3a44', s: rand(2, 4), k: 'smoke' });
    G.over -= dt;
    if (G.over <= 0) endGame('XE BI PHA HUY');
    return;
  }
  const maxS = Math.min(250, 150 + G.stage * 12);
  p.braking = keys.brake;
  p.boost = keys.nitro && p.nitro > 0 && p.fuel > 0;
  if (p.boost) { p.nitro = Math.max(0, p.nitro - 28 * dt); if (!p.wasBoost) Snd.noise(0.6, 0.18, 1500); }
  p.wasBoost = p.boost;
  const off = p.x < ROAD_L + 3 || p.x > ROAD_R - 3;
  let target = p.fuel <= 0 ? 0 : keys.brake ? 30 : p.boost ? maxS + 100 : maxS;
  if (off) target = Math.min(target, 75);
  const acc = target > G.speed ? (p.boost ? 190 : 55) : (keys.brake ? 170 : p.fuel <= 0 ? 35 : 90);
  G.speed = approach(G.speed, target, acc * dt);

  const grip = G.raining ? 0.55 : 1;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const maxVx = 95 * Math.min(1, 0.35 + G.speed / 150);
  p.vx = approach(p.vx, dir * maxVx, (dir ? 380 : 300) * grip * dt);
  p.x += p.vx * dt;
  if (p.x < 9) { p.x = 9; p.vx = 0; }
  if (p.x > W - 9) { p.x = W - 9; p.vx = 0; }
  p.y = approach(p.y, p.boost ? PLAYER_Y - 14 : PLAYER_Y, 30 * dt);

  p.fuel = Math.max(0, p.fuel - dt * 1.5 * (0.3 + G.speed / maxS));
  if (p.fuel <= 0 && G.speed < 4) { endGame('HET XANG'); return; }
  if (p.fuel < 20 && !G.lowWarn) { G.lowWarn = true; floatText('SAP HET XANG!', W / 2, H / 2, '#ff5a5a'); Snd.tone(880, 440, 0.3, 'square', 0.05); }
  if (p.fuel > 25) G.lowWarn = false;
  if (p.inv > 0) p.inv -= dt;

  const onc = p.x < ROAD_L + 2 * LANE_W && !off;
  G.mult = 1 + (onc ? 1 : 0) + (p.boost ? 1 : 0);
  G.dist += G.speed * dt * 0.25;
  G.score += G.speed * dt * 0.1 * G.mult;
  if (G.dist >= G.nextStageAt) nextStage();

  // khói pô / lửa nitro / bụi lề đường / khói drift
  G.exT -= dt;
  if (G.exT <= 0 && G.speed > 5) {
    G.exT = p.boost ? 0.02 : 0.08;
    if (p.boost) part({ x: p.x + rand(-2, 2), y: p.y + 19, vy: rand(20, 50), life: 0.25, col: pick(['#fff2a0', '#ff9a1f', '#5fa8ff']), s: 1, world: false });
    else part({ x: p.x + 2, y: p.y + 15, vx: rand(-4, 4), vy: 10, life: 0.4, col: '#9a9aa8', s: 1, k: 'smoke' });
  }
  if (off && G.speed > 30 && Math.random() < dt * 30) {
    part({ x: p.x + rand(-5, 5), y: p.y + 14, vx: rand(-20, 20), vy: rand(-10, 10), life: 0.5, col: BIOMES[G.biome].g[1], s: 2, k: 'smoke' });
    G.shake = Math.max(G.shake, 1.5);
  }
  if (Math.abs(p.vx) > 70 && G.speed > 110 && Math.random() < dt * 25) {
    part({ x: p.x + (p.vx > 0 ? -4 : 4), y: p.y + 13, vy: 5, life: 0.5, col: '#d8d8e0', s: 2, k: 'smoke' });
  }
}

function updateWorld(dt, spawn, collide) {
  G.scroll += G.speed * dt;
  G.dayT += dt;
  if (G.nextBiome >= 0) { G.bY += G.speed * dt; if (G.bY > H + 40) { G.biome = G.nextBiome; G.nextBiome = -1; } }

  G.sideGap -= G.speed * dt;
  if (G.sideGap <= 0) { spawnSide(-4); G.sideGap = rand(16, 30); }
  G.lampGap -= G.speed * dt;
  if (G.lampGap <= 0) { spawnLamp(); G.lampGap = 120; }
  for (const o of G.side) o.y += G.speed * dt;
  G.side = G.side.filter(o => o.y < H + 30);

  if (spawn) {
    G.spawnT -= dt * (0.5 + G.speed / 160);
    if (G.spawnT <= 0) { spawnTraffic(); G.spawnT = rand(0.45, 1.1) / (1 + (G.stage - 1) * 0.12); }
    if (!G.attract) {
      G.coinT -= dt * (G.speed / 150);
      if (G.coinT <= 0) { spawnCoins(); G.coinT = rand(2, 4); }
      G.pickT -= dt * (G.speed / 150);
      if (G.pickT <= 0) { spawnPick(); G.pickT = rand(4.5, 8); }
    }
  }
  updateTraffic(dt, collide);

  const p = player;
  for (const k of G.picks) {
    k.y += G.speed * dt;
    if (collide && !p.dead && !k.got) {
      const w = sprW(k.kind === 'coin' ? 'coin0' : k.kind), h = sprH(k.kind === 'coin' ? 'coin0' : k.kind);
      if (Math.abs(k.x - p.x) < (w / 2 + 5) && k.y + h > p.y && k.y < p.y + 15) { k.got = true; collect(k.kind, k.x, k.y); }
    }
  }
  G.picks = G.picks.filter(k => !k.got && k.y < H + 20);

  for (const q of G.parts) {
    q.x += q.vx * dt; q.y += (q.vy + (q.world ? G.speed : 0)) * dt; q.vy += q.g * dt; q.life -= dt;
  }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const f of G.floats) { f.y -= 22 * dt; f.life -= dt; }
  G.floats = G.floats.filter(f => f.life > 0);

  const raining = G.raining && (G.nextBiome < 0 || G.bY > H / 2);
  if (raining) for (const r of G.rain) { r.y += (220 + G.speed * 0.6) * dt; r.x -= 35 * dt; if (r.y > H) { r.y -= H + 10; r.x = rand(0, W + 40); } if (r.x < -5) r.x += W + 10; }
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.banner.t > 0) G.banner.t -= dt;
  if (G.goT > 0) G.goT -= dt;
}

function update(dt) {
  T += dt;
  if (state === 'pause') { Snd.engine(0, false); return; }
  if (state === 'title') {
    G.speed = approach(G.speed, 120, 60 * dt);
    updateWorld(dt, true, false);
    Snd.engine(0, false);
    return;
  }
  if (state === 'count') {
    const before = Math.ceil(G.count);
    G.count -= dt;
    const now = Math.ceil(G.count);
    if (G.count <= 0) { state = 'play'; G.goT = 0.8; Snd.tone(880, 880, 0.4, 'square', 0.06); }
    else if (now !== before) Snd.tone(440, 440, 0.15);
    updateWorld(dt, false, false);
    Snd.engine(20, true);
    return;
  }
  if (state === 'play') {
    updatePlayer(dt);
    if (state === 'play') updateWorld(dt, true, true);
    Snd.engine(G.speed, !player.dead);
    return;
  }
  if (state === 'over') {
    G.overT += dt;
    G.speed = approach(G.speed, 0, 80 * dt);
    updateWorld(dt, false, false);
    Snd.engine(0, false);
  }
}

// =====================================================================
//  VẼ
// =====================================================================
function darkness() {
  const ph = (G.dayT % 120) / 120;
  const d = (1 - Math.cos(ph * Math.PI * 2)) / 2;
  return clamp((d - 0.3) / 0.45, 0, 1);
}

function drawGround(bi, y0, y1, off) {
  if (y1 <= y0) return;
  g.save();
  g.beginPath(); g.rect(-8, y0, W + 16, y1 - y0); g.clip();
  const t = groundTex(bi);
  g.drawImage(t.L, 0, off); g.drawImage(t.R, ROAD_R, off);
  g.restore();
}

function drawRoad() {
  const off = Math.floor(G.scroll % 32) - 32;
  px(g, -8, -8, W + 16, H + 16, BIOMES[G.biome].g[0]);
  if (G.nextBiome >= 0) {
    const by = Math.floor(G.bY);
    drawGround(G.nextBiome, -8, by, off);
    drawGround(G.biome, by, H + 8, off);
  } else drawGround(G.biome, -8, H + 8, off);

  g.drawImage(roadTex, ROAD_L, off);
  // lề đỏ trắng
  const co = Math.floor(G.scroll % 16) - 16;
  for (let y = co; y < H + 8; y += 16) {
    px(g, ROAD_L - 3, y, 3, 8, '#e83b3b'); px(g, ROAD_L - 3, y + 8, 3, 8, '#f4f4f8');
    px(g, ROAD_R, y, 3, 8, '#e83b3b'); px(g, ROAD_R, y + 8, 3, 8, '#f4f4f8');
  }
  // vạch kẻ đường
  px(g, ROAD_L + 1, -8, 1, H + 16, '#d8d8e0');
  px(g, ROAD_R - 2, -8, 1, H + 16, '#d8d8e0');
  px(g, 78, -8, 1, H + 16, '#ffc830');
  px(g, 81, -8, 1, H + 16, '#ffc830');
  const dof = Math.floor(G.scroll % 20) - 20;
  for (let y = dof; y < H + 8; y += 20) {
    px(g, ROAD_L + LANE_W - 1, y, 2, 10, '#e8e8f0');
    px(g, ROAD_L + 3 * LANE_W - 1, y, 2, 10, '#e8e8f0');
  }
}

function shadow(x, y, w, h) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(Math.round(x), Math.round(y), w, h); }

function drawCarSprite(img, cx, cy, ang) {
  if (!ang) { g.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2)); return; }
  g.save(); g.translate(Math.round(cx), Math.round(cy)); g.rotate(ang);
  g.drawImage(img, -Math.floor(img.width / 2), -Math.floor(img.height / 2));
  g.restore();
}

function drawWorld(lights) {
  drawRoad();
  // vật bên đường (sắp theo y để che khuất đúng)
  const side = G.side.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const o of side) {
    if (o.kind !== 'lamp') shadow(o.x + 2, o.y + o.h - 2, o.w - 2, 3);
    g.drawImage(spr(o.kind, o.pal, o.fx), Math.round(o.x), Math.round(o.y));
    if (o.lamp) lights.push({ t: 'pt', x: o.fx ? o.x : o.x + 5, y: o.y + 1, r: 30, col: '255,230,150' });
  }
  // vật phẩm
  for (const k of G.picks) {
    const bob = Math.round(Math.sin(T * 6 + k.y * 0.1));
    let img;
    if (k.kind === 'coin') img = spr('coin' + (Math.floor(T * 10 + k.y * 0.05) % 4));
    else img = spr(k.kind);
    shadow(k.x - 2, k.y + img.height + 1, 5, 1);
    g.drawImage(img, Math.round(k.x - img.width / 2), Math.round(k.y + bob));
    lights.push({ t: 'pt', x: k.x, y: k.y + 3, r: 9, col: k.kind === 'coin' ? '255,210,60' : k.kind === 'nitro' ? '80,150,255' : k.kind === 'heart' ? '255,80,110' : '255,90,60' });
  }
  // xe cộ
  const cars = G.traffic.slice().sort((a, b) => (a.wreck ? -1 : 0) - (b.wreck ? -1 : 0) || a.y - b.y);
  for (const c of cars) {
    const wf = Math.floor((G.scroll - c.dir * c.cur * T) / 3) & 1;
    let pal, name = c.type;
    if (c.type === 'car') pal = palTraffic(c.ci, wf);
    else if (c.type === 'truck') pal = palTruck(c.ci, wf);
    else pal = palPolice(Math.floor(T * 6) & 1, wf);
    if (c.wreck) pal = c.type === 'car' ? palTraffic(c.ci, 0) : pal;
    const img = spr(name, pal, false, c.dir < 0);
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    shadow(c.x + 2, c.y + 3, c.w - 2, c.h - 2);
    drawCarSprite(img, cx, cy, c.wreck ? c.ang : 0);
    if (c.wreck) continue;
    if (c.blinkDir && (Math.floor(T * 6) & 1)) {
      const bx = c.blinkDir < 0 ? c.x + 1 : c.x + c.w - 3;
      px(g, Math.round(bx), Math.round(c.y + 1), 2, 2, '#ffb020');
      px(g, Math.round(bx), Math.round(c.y + c.h - 3), 2, 2, '#ffb020');
      lights.push({ t: 'pt', x: bx + 1, y: c.y + 2, r: 5, col: '255,170,30' });
    }
    if (c.dir > 0) {
      lights.push({ t: 'cone', x: cx, y: c.y, dir: -1, len: 40, sp: 12 });
      lights.push({ t: 'pt', x: cx, y: c.y + c.h, r: 8, col: '255,40,60' });
    } else {
      lights.push({ t: 'cone', x: cx, y: c.y + c.h, dir: 1, len: 50, sp: 14 });
    }
    if (c.type === 'police') lights.push({ t: 'pt', x: cx, y: cy, r: 14, col: (Math.floor(T * 6) & 1) ? '60,110,255' : '255,40,60' });
  }
  // xe người chơi
  const p = player;
  if (!G.attract && state !== 'title') {
    const wf = Math.floor(G.scroll / 3) & 1;
    const img = spr('car', p.dead ? palBurnt : palPlayer(playerColor, wf));
    shadow(p.x - 3, p.y + 3, 8, 13);
    const visible = !(p.inv > 0 && !p.dead && (Math.floor(T * 14) & 1));
    if (visible) {
      if (p.boost) g.drawImage(spr('flame' + (Math.floor(T * 20) & 1)), Math.round(p.x - 2), Math.round(p.y + 15));
      drawCarSprite(img, p.x, p.y + 7.5, p.dead ? p.deadAng : (p.vx / 95) * 0.14);
      if (p.braking && !p.dead) { px(g, Math.round(p.x - 3), Math.round(p.y + 13), 1, 1, '#ffffff'); px(g, Math.round(p.x + 2), Math.round(p.y + 13), 1, 1, '#ffffff'); }
    }
    if (!p.dead) {
      lights.push({ t: 'cone', x: p.x, y: p.y, dir: -1, len: 80, sp: 22 });
      lights.push({ t: 'pt', x: p.x, y: p.y + 14, r: p.braking ? 14 : 7, col: '255,40,60' });
    }
  }
  // hạt
  for (const q of G.parts) {
    const a = q.life / q.max;
    if (q.k === 'flash') continue;
    if (q.k === 'smoke') {
      const s = Math.max(1, Math.round(q.s * (1 + (1 - a) * 1.6)));
      g.globalAlpha = a * 0.6; px(g, Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s, q.col);
    } else {
      g.globalAlpha = Math.min(1, a * 1.5); px(g, Math.round(q.x), Math.round(q.y), q.s, q.s, q.col);
    }
  }
  g.globalAlpha = 1;
  // vệt tốc độ khi nitro
  if (p.boost && state === 'play') {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 7; i++) g.fillRect(randi(ROAD_L, ROAD_R), randi(0, H), 1, randi(6, 16));
  }
}

function drawLighting(lights, sx, sy) {
  const dark = darkness();
  const flashes = G.parts.filter(q => q.k === 'flash');
  if (dark > 0.01) {
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(8,10,38,${0.82 * dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';     // "khoét" bóng tối bằng nguồn sáng
    for (const l of lights) {
      const x = l.x + sx, y = l.y + sy;
      if (l.t === 'cone') {
        const y2 = y + l.dir * l.len, gr = lc.createLinearGradient(0, y, 0, y2);
        gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gr; lc.beginPath();
        lc.moveTo(x - 3, y); lc.lineTo(x + 3, y); lc.lineTo(x + l.sp, y2); lc.lineTo(x - l.sp, y2); lc.closePath(); lc.fill();
      } else {
        const gr = lc.createRadialGradient(x, y, 0, x, y, l.r);
        gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gr; lc.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      }
    }
    for (const f of flashes) {
      const gr = lc.createRadialGradient(f.x + sx, f.y + sy, 0, f.x + sx, f.y + sy, f.r * 1.5);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gr; lc.fillRect(0, 0, W, H);
    }
    g.drawImage(L, 0, 0);
  }
  // quầng sáng màu cộng dồn
  g.globalCompositeOperation = 'lighter';
  if (dark > 0.01) {
    for (const l of lights) {
      if (l.t !== 'pt') continue;
      const x = l.x + sx, y = l.y + sy, r = l.r * 0.6;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${l.col},${0.45 * dark})`); gr.addColorStop(1, `rgba(${l.col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  for (const f of flashes) {
    const a = f.life / f.max, x = f.x + sx, y = f.y + sy;
    const gr = g.createRadialGradient(x, y, 0, x, y, f.r);
    gr.addColorStop(0, `rgba(255,230,160,${a})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
  }
  g.globalCompositeOperation = 'source-over';
}

function drawRain() {
  if (!G.raining || (G.nextBiome >= 0 && G.bY <= H / 2)) return;
  g.fillStyle = 'rgba(40,50,90,0.18)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(190,210,255,0.6)';
  for (const r of G.rain) { g.fillRect(Math.round(r.x), Math.round(r.y), 1, r.l); g.fillRect(Math.round(r.x) - 1, Math.round(r.y) + r.l, 1, 1); }
}

function bar(x, y, w, v, col, bg = '#2a2034') {
  px(g, x - 1, y - 1, w + 2, 6, OUT);
  px(g, x, y, w, 4, bg);
  px(g, x, y, Math.round(w * clamp(v, 0, 1)), 4, col);
  px(g, x, y, Math.round(w * clamp(v, 0, 1)), 1, 'rgba(255,255,255,0.35)');
}

function drawHUD() {
  const p = player;
  g.fillStyle = 'rgba(27,20,36,0.78)'; g.fillRect(0, 0, W, 22);
  px(g, 0, 22, W, 1, OUT);
  text(String(Math.floor(G.score)).padStart(6, '0'), 2, 2, '#ffe066');
  text('C' + G.stage + ' ' + Math.floor(G.dist) + 'M', W / 2 + 4, 2, '#ffffff', 1, 'c');
  for (let i = 0; i < 3; i++) g.drawImage(spr('heart', i < p.hearts ? null : P('hempty', () => ({ r: '#4a3a4a', l: '#5a4a5a' }))), W - 9 - i * 8, 2);
  // xăng
  g.drawImage(spr('fuel'), 2, 12);
  const low = p.fuel < 20 && (Math.floor(T * 4) & 1);
  bar(11, 14, 36, p.fuel / 100, low ? '#ff3a3a' : p.fuel < 35 ? '#ffb020' : '#5ad65a');
  // nitro
  g.drawImage(spr('nitro'), W - 47, 12);
  bar(W - 39, 14, 36, p.nitro / 100, p.boost ? '#bfe0ff' : '#2f7bff');
  // tốc độ
  text(Math.round(G.speed * 0.9) + ' KM/H', W / 2 + 4, 14, p.boost ? '#9fd0ff' : '#ffffff', 1, 'c');
  // tiến độ chặng
  const prog = 1 - (G.nextStageAt - G.dist) / STAGE_LEN;
  px(g, 0, 23, Math.round(W * clamp(prog, 0, 1)), 1, '#ffb020');
  // hệ số nhân
  if (G.mult > 1 && state === 'play' && !p.dead) {
    const onc = p.x < ROAD_L + 2 * LANE_W;
    text('X' + G.mult + (onc ? ' NGUOC CHIEU' : ' NITRO'), 3, 27, (Math.floor(T * 5) & 1) ? '#ff5a5a' : '#ffe066');
  }
  // chữ bay
  for (const f of G.floats) { g.globalAlpha = clamp(f.life * 2, 0, 1); text(f.s, f.x, f.y, f.col, 1, 'c'); }
  g.globalAlpha = 1;
  // banner chặng
  if (G.banner.t > 0) {
    const a = clamp(G.banner.t * 2, 0, 1);
    g.globalAlpha = a;
    g.fillStyle = 'rgba(27,20,36,0.8)'; g.fillRect(0, 80, W, 34);
    text(G.banner.s, W / 2, 84, '#ffe066', 3, 'c');
    text(G.banner.s2, W / 2, 104, '#ffffff', 1, 'c');
    g.globalAlpha = 1;
  }
}

function drawPanel(x, y, w, h) {
  px(g, x - 2, y - 2, w + 4, h + 4, OUT);
  px(g, x, y, w, h, '#2a2034');
  px(g, x, y, w, 2, '#3e3250');
}

function drawTitle() {
  g.fillStyle = 'rgba(13,10,20,0.55)'; g.fillRect(0, 0, W, H);
  const cols = ['#ff5a5a', '#ffb020', '#ffe066', '#5ad65a', '#5fcde4', '#a55ae8'];
  const logo = 'DUA XE';
  let x = W / 2 - Math.floor((logo.length * 16 - 4) / 2);
  for (let i = 0; i < logo.length; i++) {
    const yb = Math.round(Math.sin(T * 4 + i * 0.7) * 2);
    text(logo[i], x + i * 16, 20 + yb, cols[(i + Math.floor(T * 3)) % cols.length], 4);
  }
  text('PIXEL', W / 2, 46, '#ffe066', 3, 'c');
  text('KY LUC ' + best, W / 2, 72, '#ffb020', 1, 'c');

  drawPanel(30, 88, 100, 82);
  text('CHON XE', W / 2, 93, '#9fd0ff', 1, 'c');
  const wf = Math.floor(T * 12) & 1;
  const img = spr('car', palPlayer(playerColor, wf));
  const bob = Math.round(Math.sin(T * 10));
  g.drawImage(spr('flame' + (Math.floor(T * 20) & 1)), W / 2 - 6, 149 + bob, 12, 18);
  g.drawImage(img, W / 2 - 15, 104 + bob, 30, 45);
  const ab = Math.floor(T * 3) & 1;
  text('<', 40 - ab, 122, '#ffffff', 2);
  text('>', 114 + ab, 122, '#ffffff', 2);
  text(COLOR_NAMES[playerColor], W / 2, 162, '#ffffff', 1, 'c');

  if (Math.floor(T * 2.5) & 1) text('ENTER / CHAM DE CHOI', W / 2, 180, '#7dff8a', 1, 'c');
  const hc = '#b8b0c8';
  text('TRAI PHAI: LAI XE', W / 2, 196, hc, 1, 'c');
  text('XUONG: PHANH  SPACE: NITRO', W / 2, 205, hc, 1, 'c');
  text('P: TAM DUNG  M: AM THANH', W / 2, 214, hc, 1, 'c');
  text('NGUOC CHIEU = X2 DIEM', W / 2, 226, '#ff8a5a', 1, 'c');
}

function drawOver() {
  g.fillStyle = 'rgba(13,10,20,0.6)'; g.fillRect(0, 0, W, H);
  drawPanel(14, 48, 132, 146);
  text('GAME OVER', W / 2, 56, '#ff5a5a', 2, 'c');
  text(G.reason, W / 2, 74, '#ffb020', 1, 'c');
  const rows = [['DIEM', G.score], ['QUANG DUONG', Math.floor(G.dist) + 'M'], ['XU', G.coins], ['CHANG', G.stage], ['KY LUC', best]];
  rows.forEach(([k, v], i) => { text(k, 24, 92 + i * 12, '#b8b0c8'); text(String(v), 136, 92 + i * 12, '#ffffff', 1, 'r'); });
  if (G.newBest && (Math.floor(T * 4) & 1)) text('KY LUC MOI!', W / 2, 156, '#ffe066', 1, 'c');
  if (G.overT > 0.8) text('ENTER / CHAM DE CHOI LAI', W / 2, 176, '#7dff8a', 1, 'c');
}

function render() {
  const lights = [];
  const sx = G.shake > 0 ? Math.round(rand(-G.shake, G.shake) * 0.5) : 0;
  const sy = G.shake > 0 ? Math.round(rand(-G.shake, G.shake) * 0.5) : 0;
  g.save();
  g.translate(sx, sy);
  drawWorld(lights);
  g.restore();
  drawLighting(lights, sx, sy);
  drawRain();

  if (state === 'title') { drawTitle(); return; }
  drawHUD();
  if (state === 'count') {
    const n = Math.ceil(G.count);
    const sc = 6 + Math.round((G.count % 1) * 3);
    text(String(n), W / 2, 90 - sc * 2, '#ffe066', sc, 'c');
    text('SAN SANG', W / 2, 130, '#ffffff', 1, 'c');
  }
  if (state === 'play' && G.goT > 0) text('GO!', W / 2, 84, '#7dff8a', 6, 'c');
  if (state === 'pause') {
    g.fillStyle = 'rgba(13,10,20,0.6)'; g.fillRect(0, 0, W, H);
    text('TAM DUNG', W / 2, 100, '#ffe066', 3, 'c');
    text('P / CHAM DE TIEP TUC', W / 2, 126, '#ffffff', 1, 'c');
  }
  if (state === 'over') drawOver();
  if (Snd.muted) text('M: TAT TIENG', W - 2, H - 8, '#8a8098', 1, 'r');
}

function present() {
  sctx.fillStyle = '#0d0a14';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buf, OX, OY, W * S, H * S);
}

// =====================================================================
//  INPUT
// =====================================================================
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'brake', KeyS: 'brake', Space: 'nitro', ShiftLeft: 'nitro', ShiftRight: 'nitro' };
window.addEventListener('keydown', e => {
  Snd.init();
  const k = KEYMAP[e.code];
  if (k || e.code === 'ArrowUp') e.preventDefault();
  if (e.code === 'KeyM' && !e.repeat) { Snd.toggle(); return; }
  if (state === 'title') {
    if (e.repeat) return;
    if (k === 'left') changeColor(-1);
    else if (k === 'right') changeColor(1);
    else if (e.code === 'Enter' || e.code === 'Space') startGame();
    return;
  }
  if (state === 'over') {
    if ((e.code === 'Enter' || e.code === 'Space') && G.overT > 0.8) startGame();
    return;
  }
  if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) { togglePause(); return; }
  if (k) keys[k] = true;
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'play') state = 'pause'; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') state = 'pause'; });

function toLogical(e) { return { x: (e.clientX * DPR - OX) / S, y: (e.clientY * DPR - OY) / S }; }
screen.addEventListener('pointerdown', e => {
  Snd.init();
  if (e.pointerType === 'touch') document.body.classList.add('touch');
  const r = toLogical(e);
  if (state === 'title') {
    if (r.y > 100 && r.y < 170) { if (r.x < 58) { changeColor(-1); return; } if (r.x > 102) { changeColor(1); return; } }
    startGame();
  } else if (state === 'over' && G.overT > 0.8) startGame();
  else if (state === 'pause') togglePause();
});

if ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) document.body.classList.add('touch');
document.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  const down = e => {
    e.preventDefault(); Snd.init();
    if (state === 'title') { if (k === 'left') changeColor(-1); else if (k === 'right') changeColor(1); else startGame(); return; }
    if (state === 'over') { if (G.overT > 0.8) startGame(); return; }
    keys[k] = true; b.classList.add('on');
  };
  const up = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
});
document.getElementById('pauseBtn').addEventListener('pointerdown', e => { e.preventDefault(); togglePause(); });

// =====================================================================
//  VÒNG LẶP
// =====================================================================
newGame(true);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  render();
  present();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
