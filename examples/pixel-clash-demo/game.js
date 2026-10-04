'use strict';
/* =====================================================================
 *  PIXEL CLASH - Tiệm Nét Cỏ Style
 *  - Canvas 2D thuần, virtual buffer 180x320, integer scaling.
 *  - Procedural Textures (Grass, Water).
 *  - PixelFont 3x5.
 *  - LRU Cache cho sprites.
 *  - Âm thanh WebAudio.
 * ===================================================================== */

const W = 180, H = 320;
const BATTLE_H = 250;
const UI_H = 70;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

class LRU extends Map {
  constructor(n) { super(); this.n = n; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.n) super.delete(this.keys().next().value); return this; }
}

const OUT = '#1b1424';
const SPR = {
  knight: {
    p: { k: OUT, a: '#b8b8c8', b: '#8a8a98', c: '#5a5a68', f: '#ffccaa', e: '#111' },
    m: ['..kkkk..','.kaaaak.','kaaaaabk','kfefefbk','.kffbbk.','kaaaaak.','.kbbbbk.','..kkkk..']
  },
  archer: {
    p: { k: OUT, a: '#6fc35a', b: '#3f8f3a', c: '#2a6328', f: '#ffccaa', e: '#111', w: '#7a4a2a' },
    m: ['..kkkk..','.kaaaak.','kaaaaabk','kfefefbk','.kffwbk.','kaaawwk.','.kbbbbk.','..kkkk..']
  },
  golem: {
    p: { k: OUT, s: '#8a8a98', d: '#5a5a68', e: '#00ffff' },
    m: ['....kkkkkkkk....','...kssssssssk...','..ksssssssssdk..','.ksssssssssssdk.','.kssekssskseksd.','.kssekssskseksd.','ksssssssssssssdk','ksssssssssssssdk','ksssssssssssssdk','ksssssssssssssdk','kddddddddddddddk','.kddddddddddddk.','..kkkkkkkkkkkk..','..ksssk..ksssk..','..ksssk..ksssk..','..kkkkk..kkkkk..']
  },
  dragon: {
    p: { k: OUT, a: '#3f8f3a', b: '#6fc35a', c: '#ffcc00', d: '#e83b3b' },
    m: ['..kk......kk..','.kbbk....kbbk.','.kbbkk..kkbbk.','kkbbbbkkbbbbkk','kaabbbkkaaabbk','.kkkabkkbakkk.','...kkbbbbkk...','....kbbbbk....','....kbbagk....','...kbcccbk....','...kbcbcbk....','...kbbbaak....','....kbbbbk....','.....kkkk.....','....k....k....','....k....k....']
  },
  fireball: {
    p: { k: OUT, y: '#fff2a0', o: '#ff9a1f', r: '#e83b3b' },
    m: ['..kk..','.kooy.','krooyk','krooyk','.krro.','..kk..']
  },
  king_tower: {
    p: { k: OUT, w: '#b8b8c8', s: '#8a8a98', d: '#5a5a68', r: '#e83b3b', l: '#ff8f7a' },
    m: ['...kkk.kkk.kkk...','..kwwwkwwwkwwwk..','..kwwwkwwwkwwwk..','.kswwwwwwwwwwwsk.','.kdswwwwwwwwwsdk.','kkdssssssssssddkk','kddkkddkkddkkddkk','kddkkddkkddkkddkk','ksssssssssssssssk','ksssssssssssssssk','ksssskkkkkkkssssk','ksssskrrrrrkssssk','ksssskrrrrrkssssk','ksssskrrrrrkssssk','kkkkkkrrrrrkkkkkk','......kkkkk......']
  },
  crown_tower: {
    p: { k: OUT, w: '#b8b8c8', s: '#8a8a98', d: '#5a5a68', r: '#e83b3b', l: '#ff8f7a' },
    m: ['..kk.kk.kk..','.kwwkwwkwwk.','.kswwwwwwsdk','.kswwwwwwsdk','.kdssssssddk','.ksssssssssk','.ksssssssssk','.ksssssssssk','.ksssssssssk','.ksssssssssk','.kkkkkkkkkkk']
  }
};

const PAL_BLUE = { r: '#3b7ae8', l: '#8fb8ff' };
const PAL_RED = { r: '#e83b3b', l: '#ff8f7a' };

const sprCache = new LRU(500);
function spr(name, team, fx, fy) {
  const key = name + '|' + team + '|' + (fx?1:0);
  let c = sprCache.get(key);
  if (c) return c;
  const d = SPR[name], m = d.m;
  const h = m.length, w = Math.max(...m.map(r=>r.length));
  c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  const tPal = team === 'player' ? PAL_BLUE : PAL_RED;
  for (let y=0; y<h; y++) {
    for (let x=0; x<m[y].length; x++) {
      const ch = m[y][x];
      if (ch === '.') continue;
      let col = tPal[ch] || d.p[ch];
      if (col) px(ctx, fx ? w-1-x : x, fy ? h-1-y : y, 1, 1, col);
    }
  }
  sprCache.set(key, c);
  return c;
}

const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
  5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '-': '000000111000000', '+': '000010111010000'
};
const textCache = new LRU(200);
function text(ctx, s, x, y, col = '#fff', sc = 1, align = 'l', sh = OUT) {
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
  ctx.drawImage(c, Math.round(dx), Math.round(y));
}

// --- Procedural Textures ---
const TEX = {};
function genTextures() {
  const r = rng(12345);
  // Grass
  let c = mkCanvas(W, BATTLE_H);
  let ctx = c.getContext('2d');
  px(ctx, 0, 0, W, BATTLE_H, '#4c9a3a');
  for (let i=0; i<800; i++) px(ctx, Math.floor(r()*W), Math.floor(r()*BATTLE_H), 1, r()<0.5?1:2, r()<0.5?'#438a33':'#5aad45');
  for (let i=0; i<30; i++) {
    let x = randi(2, W-2), y = randi(2, BATTLE_H-2);
    px(ctx, x, y-1, 1, 1, '#ffe066'); px(ctx, x-1, y, 3, 1, '#ffe066'); px(ctx, x, y+1, 1, 1, '#ffe066');
  }
  TEX.grass = c;
  
  // Water
  c = mkCanvas(W, 30); ctx = c.getContext('2d');
  px(ctx, 0, 0, W, 30, '#3498db');
  for (let i=0; i<100; i++) px(ctx, Math.floor(r()*W), Math.floor(r()*30), randi(2,6), 1, '#2980b9');
  TEX.water = c;
  
  // Bridge
  c = mkCanvas(30, 30); ctx = c.getContext('2d');
  px(ctx, 0, 0, 30, 30, '#d35400');
  for(let i=0; i<30; i+=4) px(ctx, 0, i, 30, 1, '#a04000');
  px(ctx, 0, 0, 2, 30, '#873600'); px(ctx, 28, 0, 2, 30, '#873600');
  TEX.bridge = c;
}

// --- Audio ---
const Snd = {
  ctx: null,
  init() { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(f1, f2, dur, type='square', vol=0.05) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), gn = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t+dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t+dur+0.05);
  }
};

// --- GAME LOGIC ---
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buf = mkCanvas(W, H);
const g = buf.getContext('2d', { alpha: false });
let DPR = 1, S = 1, OX = 0, OY = 0;

function resize() {
  DPR = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * DPR);
  screen.height = Math.floor(window.innerHeight * DPR);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';
  S = Math.max(1, Math.floor(Math.min(screen.width / W, screen.height / H)));
  OX = Math.floor((screen.width - W * S) / 2);
  OY = Math.floor((screen.height - H * S) / 2);
  sctx.imageSmoothingEnabled = false;
  g.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();
genTextures();

const CARD_DB = {
  'knight': { cost: 3, hp: 120, dmg: 20, range: 12, speed: 20, type: 'ground', targets: 'all', size: 8, atkSpd: 1.2 },
  'archer': { cost: 3, hp: 40, dmg: 10, range: 60, speed: 25, type: 'ground', targets: 'all', size: 8, atkSpd: 1.0, count: 2 },
  'golem':  { cost: 6, hp: 400, dmg: 40, range: 15, speed: 10, type: 'ground', targets: 'buildings', size: 16, atkSpd: 2.5 },
  'dragon': { cost: 4, hp: 150, dmg: 25, range: 45, speed: 20, type: 'air', targets: 'all', size: 16, atkSpd: 1.8, splash: 25 },
  'fireball':{cost: 4, isSpell: true, splash: 40, dmg: 120 }
};

class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color;
  }
  update(dt) { this.x += this.vx*dt; this.y += this.vy*dt; this.life -= dt; }
  draw(ctx) { ctx.globalAlpha = Math.max(0, this.life/this.maxLife); px(ctx, this.x, this.y, 2, 2, this.color); ctx.globalAlpha = 1; }
}

class Entity {
  constructor(game, type, x, y, team, stats) {
    this.game = game; this.type = type; this.x = x; this.y = y; this.team = team;
    this.hp = stats.hp; this.maxHp = stats.hp; this.dmg = stats.dmg;
    this.range = stats.range; this.speed = stats.speed; 
    this.atkSpd = stats.atkSpd; this.isAir = (stats.type === 'air');
    this.targets = stats.targets; this.size = stats.size;
    this.splash = stats.splash || 0;
    this.cooldown = 0; this.target = null;
    this.isBuilding = ['king_tower','crown_tower'].includes(type);
    this.flash = 0; this.dir = team === 'player' ? -1 : 1; this.walkAnim = 0;
  }
  
  takeDamage(amt) {
    this.hp -= amt; this.flash = 0.1;
    if (this.hp <= 0 && this.isBuilding) {
      this.game.shake = 15;
      for(let i=0; i<30; i++) this.game.parts.push(new Particle(this.x, this.y, rand(-50,50), rand(-50,50), rand(0.5,1.5), '#b8b8c8'));
      Snd.play(100, 10, 0.4, 'sawtooth', 0.1);
    }
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.hp <= 0) return true;
    if (!this.target || this.target.hp <= 0) this.target = this.game.findTarget(this);
    if (this.target) {
      let dx = this.target.x - this.x, dy = this.target.y - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist <= this.range + this.target.size/2) {
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          if (this.range > 20) {
            let pt = this.type === 'dragon' ? 'fireball' : 'arrow';
            this.game.projs.push({x: this.x, y: this.y-this.size, tx: this.target.x, ty: this.target.y, tgt: this.target, dmg: this.dmg, splash: this.splash, type: pt, team: this.team, z: pt==='fireball'?100:10});
            Snd.play(600, 400, 0.1, 'sine', 0.05);
          } else {
            this.target.takeDamage(this.dmg);
            for(let i=0; i<5; i++) this.game.parts.push(new Particle(this.target.x, this.target.y, rand(-20,20), rand(-20,20), 0.3, '#e83b3b'));
            Snd.play(200, 50, 0.1, 'square', 0.05);
          }
        }
      } else if (!this.isBuilding) {
        let tgtX = this.target.x, tgtY = this.target.y;
        let cross = (this.team === 'player' && this.y > 140 && tgtY < 120) || (this.team === 'enemy' && this.y < 120 && tgtY > 140);
        if (cross && !this.isAir) {
          tgtX = Math.abs(this.x - 45) < Math.abs(this.x - 135) ? 45 : 135;
          tgtY = 135;
        }
        let mx = tgtX - this.x, my = tgtY - this.y;
        let mDist = Math.hypot(mx, my);
        this.x += (mx / mDist) * this.speed * dt;
        this.y += (my / mDist) * this.speed * dt;
        this.walkAnim += dt * 10;
        if (mx > 0) this.dir = 1; else if (mx < 0) this.dir = -1;
      }
    }
    return false;
  }
  
  draw(ctx) {
    const s = spr(this.type, this.team, this.dir < 0);
    const hw = s.width/2, hh = s.height/2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, hw*0.8, hw*0.4, 0, 0, Math.PI*2); ctx.fill();
    let bob = (!this.isBuilding && this.target && Math.hypot(this.target.x-this.x, this.target.y-this.y) > this.range) ? Math.sin(this.walkAnim)*2 : 0;
    let flyY = this.isAir ? -15 + Math.sin(Date.now()/200)*3 : 0;
    let dx = this.x - hw, dy = this.y - s.height + bob + flyY + (this.isBuilding ? hw*0.4 : 0);
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(s, dx, dy);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(s, dx, dy);
    }
    if (this.hp < this.maxHp) {
      px(ctx, this.x - 10, this.y - s.height - 5 + flyY, 20, 2, '#111');
      px(ctx, this.x - 10, this.y - s.height - 5 + flyY, 20*(this.hp/this.maxHp), 2, this.team==='player'?'#2ecc71':'#e83b3b');
    }
  }
}

class Game {
  constructor() {
    this.ents = []; this.parts = []; this.projs = []; this.texts = [];
    this.elixir = 5; this.aiElixir = 5;
    this.deck = ['knight', 'archer', 'golem', 'dragon', 'fireball'];
    this.hand = ['knight', 'archer', 'golem', 'fireball'];
    this.shake = 0; this.drag = null; this.dx = 0; this.dy = 0;
    this.last = performance.now();
    this.initMap();
    this.events();
    requestAnimationFrame(t => this.loop(t));
  }
  
  initMap() {
    const b = (t,x,y,tm,hp,dmg) => this.ents.push(new Entity(this, t, x, y, tm, {hp, dmg, range: 45, speed: 0, size: 24, atkSpd: 0.9}));
    b('king_tower', 90, 230, 'player', 2000, 40); b('king_tower', 90, 30, 'enemy', 2000, 40);
    b('crown_tower', 35, 180, 'player', 1400, 35); b('crown_tower', 145, 180, 'player', 1400, 35);
    b('crown_tower', 35, 80, 'enemy', 1400, 35); b('crown_tower', 145, 80, 'enemy', 1400, 35);
  }
  
  events() {
    const getP = e => {
      const r = screen.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left - OX)/S, y: (cy - r.top - OY)/S };
    };
    const dn = e => {
      e.preventDefault(); Snd.init();
      const {x, y} = getP(e);
      if (y > BATTLE_H) {
        let cw = W/4, idx = Math.floor(x/cw);
        if (idx>=0 && idx<4 && this.elixir >= CARD_DB[this.hand[idx]].cost) { this.drag = idx; this.dx = x; this.dy = y; }
      }
    };
    const mv = e => { if (this.drag !== null) { e.preventDefault(); const p = getP(e); this.dx = p.x; this.dy = p.y; } };
    const up = e => {
      if (this.drag !== null) {
        let t = this.hand[this.drag]; let c = CARD_DB[t];
        if (this.dy < BATTLE_H && (this.dy > 135 || c.isSpell)) {
          this.elixir -= c.cost;
          Snd.play(400, 800, 0.15, 'triangle', 0.05);
          if (c.isSpell) {
            this.projs.push({x: this.dx, y: -20, tx: this.dx, ty: this.dy, dmg: c.dmg, splash: c.splash, type: t, team: 'player', z: 150});
          } else {
            let count = c.count || 1;
            for(let i=0; i<count; i++) this.ents.push(new Entity(this, t, this.dx + (i - (count-1)/2)*12, this.dy, 'player', c));
          }
          this.hand[this.drag] = this.deck[(Math.random()*this.deck.length)|0];
        }
        this.drag = null;
      }
    };
    screen.addEventListener('mousedown', dn); screen.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    screen.addEventListener('touchstart', dn, {passive:false}); screen.addEventListener('touchmove', mv, {passive:false}); window.addEventListener('touchend', up);
  }
  
  findTarget(e) {
    let best = null, minDist = Infinity;
    for (let o of this.ents) {
      if (o.team !== e.team && o.hp > 0) {
        if (e.targets === 'buildings' && !o.isBuilding) continue;
        if (o.isAir && e.type === 'knight') continue;
        let d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d < minDist) { minDist = d; best = o; }
      }
    }
    return best;
  }
  
  loop(time) {
    let dt = (time - this.last)/1000; this.last = time;
    if (dt > 0.1) dt = 0.1;
    
    this.elixir = Math.min(10, this.elixir + dt*0.35);
    this.aiElixir += dt*0.35;
    if (this.aiElixir > 6) {
      let ch = ['knight', 'archer', 'golem', 'dragon'];
      let t = pick(ch); let c = CARD_DB[t];
      if (this.aiElixir >= c.cost) {
        this.aiElixir -= c.cost;
        let x = Math.random()>0.5 ? 35 : 145;
        let count = c.count || 1;
        for(let i=0; i<count; i++) this.ents.push(new Entity(this, t, x + (i - (count-1)/2)*12, 20, 'enemy', c));
      }
    }
    
    this.ents = this.ents.filter(e => !e.update(dt));
    
    this.projs = this.projs.filter(p => {
      let dx = p.tx - p.x, dy = p.ty - p.y;
      let d = Math.hypot(dx, dy);
      if (p.type === 'fireball') { p.z -= 200*dt; if (p.z < 0) p.z = 0; }
      if (d < 5 || (p.type === 'fireball' && p.z <= 0)) {
        if (p.splash > 0) {
          Snd.play(150, 20, 0.3, 'sawtooth', 0.1); this.shake = 10;
          for(let i=0; i<20; i++) this.parts.push(new Particle(p.x, p.y, rand(-40,40), rand(-40,40), rand(0.5,1), '#ff9a1f'));
          for(let e of this.ents) if (e.team !== p.team && Math.hypot(e.x - p.x, e.y - p.y) <= p.splash) e.takeDamage(p.dmg);
        } else if (p.tgt && p.tgt.hp > 0) {
          p.tgt.takeDamage(p.dmg);
          for(let i=0; i<5; i++) this.parts.push(new Particle(p.x, p.y, rand(-20,20), rand(-20,20), 0.3, '#ffccaa'));
        }
        return false;
      }
      let s = p.type === 'fireball' ? 120 : 150;
      p.x += (dx/d)*s*dt; p.y += (dy/d)*s*dt;
      return true;
    });
    
    this.parts = this.parts.filter(p => { p.update(dt); return p.life > 0; });
    
    if (this.shake > 0) this.shake -= dt*30;

    g.save();
    px(g, 0, 0, W, H, '#111');
    if (this.shake > 0) g.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
    
    g.drawImage(TEX.grass, 0, 0);
    const wv = Math.sin(time/300)*2;
    g.drawImage(TEX.water, wv, 120); g.drawImage(TEX.water, wv - W, 120); g.drawImage(TEX.water, wv + W, 120);
    g.drawImage(TEX.bridge, 30, 120); g.drawImage(TEX.bridge, 120, 120);
    
    this.ents.sort((a,b) => a.y - b.y);
    for (let e of this.ents) e.draw(g);
    
    for (let p of this.projs) {
      if (p.type === 'fireball') {
        const s = spr(p.type, 'neutral');
        g.drawImage(s, p.x - s.width/2, p.y - s.height/2 - p.z);
      } else {
        px(g, p.x, p.y - p.z, 2, 2, '#fff');
      }
    }
    for (let p of this.parts) p.draw(g);
    
    // Light mask (Day/Night cycle)
    const ph = (time/20000) % 1;
    const dark = (1 - Math.cos(ph * Math.PI * 2)) / 2;
    g.globalCompositeOperation = 'multiply';
    const lval = Math.floor(255 - dark*120);
    px(g, 0, 0, W, BATTLE_H, `rgb(${lval},${lval},${Math.min(255, lval+20)})`);
    g.globalCompositeOperation = 'source-over';
    
    g.restore();

    // UI Layer
    px(g, 0, BATTLE_H, W, UI_H, '#1b1424');
    px(g, 0, BATTLE_H, W, 2, '#3a3a46');
    for (let i=0; i<4; i++) {
      let t = this.hand[i]; let c = CARD_DB[t];
      let cw = W/4, cx = i*cw;
      px(g, cx+2, BATTLE_H+5, cw-4, UI_H-20, this.elixir >= c.cost ? '#2a2a36' : '#1a1a24');
      px(g, cx+2, BATTLE_H+5, cw-4, 1, this.elixir >= c.cost ? '#4a4a5a' : '#2a2a36');
      let s = spr(t, 'player');
      g.drawImage(s, cx + cw/2 - s.width/2, BATTLE_H + 12);
      
      px(g, cx+4, BATTLE_H+35, 10, 10, '#9b59b6');
      px(g, cx+4, BATTLE_H+35, 10, 1, '#d2b4de');
      text(g, c.cost, cx+6, BATTLE_H+37, '#fff', 1);
    }
    
    // Elixir Bar
    px(g, 5, H-12, W-10, 8, '#000');
    px(g, 5, H-12, (this.elixir/10)*(W-10), 8, '#9b59b6');
    px(g, 5, H-12, (this.elixir/10)*(W-10), 2, '#d2b4de');
    text(g, "ELIXIR " + Math.floor(this.elixir), 10, H-11, '#fff', 1);
    
    if (this.drag !== null) {
      let t = this.hand[this.drag]; let c = CARD_DB[t];
      g.globalAlpha = 0.6;
      let s = spr(t, 'player');
      g.drawImage(s, this.dx - s.width/2, this.dy - s.height/2);
      px(g, 0, c.isSpell ? 0 : 135, W, BATTLE_H, c.isSpell ? 'rgba(52, 152, 219, 0.2)' : 'rgba(46, 204, 113, 0.2)');
      g.globalAlpha = 1.0;
    }

    // Integer Scale to screen
    px(sctx, 0, 0, screen.width, screen.height, '#111');
    sctx.drawImage(buf, 0, 0, W, H, OX, OY, W*S, H*S);

    requestAnimationFrame(t => this.loop(t));
  }
}

window.onload = () => new Game();
