'use strict';
/* =====================================================================
 *  ĐẠI CHIẾN TIỆM NET - Bản Chuẩn "Net Cỏ"
 *  - Canvas 2D engine cho logic game, HTML/CSS cho UI.
 *  - Sprites con người, đường phố, nhà cửa.
 * ===================================================================== */

const W = 180, H = 260; // Playable area

const rand = (a, b) => a + Math.random() * (b - a);
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

class LRU extends Map {
  constructor(n) { super(); this.n = n; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.n) super.delete(this.keys().next().value); return this; }
}

const OUT = '#1b1424';
const SPR = {
  tre_trau: {
    p: { k: OUT, s: '#ffccaa', h: '#2a2a35', t: '#e74c3c', p: '#2980b9', b: '#e67e22' },
    m: ['.khhhhk.','khhhhhhk','kshsshhk','kssssssk','.kttttk.','kkkttkkk','k.kttk.k','.kppppk.','.kppppk.','.kb..bk.']
  },
  chu_quan: {
    p: { k: OUT, s: '#ffccaa', h: '#111', t: '#3498db', p: '#34495e', b: '#000' },
    m: ['.khhhhk.','khhhhhhk','kshsshhk','kssssssk','.kttttk.','kkkttkkk','k.kttk.k','.kppppk.','.kppppk.','.kb..bk.']
  },
  shipper: {
    p: { k: OUT, s: '#ffccaa', h: '#e67e22', t: '#2ecc71', p: '#7f8c8d', b: '#111', m: '#95a5a6' },
    m: ['.khhhhk.','khhhhhhk','kshsshhk','kssssssk','.kttttk.','kkkttkkk','k.kttk.k','.kppppk.','kkmmmukk','kmmmmmmk','k.kb..bk']
  },
  giang_ho: {
    p: { k: OUT, s: '#ffccaa', h: '#111', t: '#000', p: '#2c3e50', b: '#000' },
    m: ['..khhhhk..','.khhhhhhk.','.kshsshhk.','.kssssssk.','..kttttk..','.kkkttkkk.','kk.kttk.kk','k..kppk..k','...kppk...','...kb.bk...']
  },
  spell: {
    p: { k: OUT, y: '#f1c40f', w: '#fff' },
    m: ['...kyk...','..kyyyk..','.kyywyk..','kyyyyyyk','..kyyyk..','...kyk...','...kyk...']
  },
  net_building: {
    p: { k: OUT, w: '#bdc3c7', b: '#34495e', n: '#e74c3c', g: '#2ecc71', d: '#7f8c8d' },
    m: [
      '..kkkkkkkkkkkkkk..',
      '.kwwwwwwwwwwwwwwk.',
      'kwwwwwwwwwwwwwwwwk',
      'kbbbbbbbbbbbbbbbbk',
      'kbnnnnnbbbbgggggbk',
      'kbbbbbbbbbbbbbbbbk',
      'kwwwwwwwwwwwwwwwwk',
      'kwddddwwwwwddddwwk',
      'kwddddwwwwwddddwwk',
      'kwwwwwwwwwwwwwwwwk',
      'kwwwwwwwwwwwwwwwwk',
      'kwwkkkwwwwwkkkwwwk',
      'kwwkdkwwwwwkdkwwwk',
      'kwwkdkwwwwwkdkwwwk',
      'kwwkdkwwwwwkdkwwwk',
      'kkkkkkkkkkkkkkkkkk'
    ]
  },
  shop_building: {
    p: { k: OUT, w: '#ecf0f1', y: '#f1c40f', b: '#2980b9', d: '#95a5a6' },
    m: [
      '..kkkkkkkkkk..',
      '.kwwwwwwwwwwk.',
      'kwwwwwwwwwwwwk',
      'kyyyyyyyyyyyyk',
      'kbbbbbbbbbbbbk',
      'kwwwwwwwwwwwwk',
      'kwwddddwwwwwwk',
      'kwwddddwwwwwwk',
      'kwwwwwwwwwwwwk',
      'kwwkkkwwwwwwwk',
      'kwwkdkwwwwwwwk',
      'kkkkkkkkkkkkkk'
    ]
  }
};

const PAL_BLUE = { t: '#3498db', p: '#34495e', n: '#3498db' }; // Xanh
const PAL_RED  = { t: '#e74c3c', p: '#c0392b', n: '#e74c3c' }; // Đỏ

const sprCache = new LRU(200);
function spr(name, team, fx) {
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
      // Trẻ trâu đổi áo theo màu team, các quân khác có thể giữ nguyên hoặc đổi
      let col = (name!=='spell' && name!=='net_building' && name!=='shop_building' && tPal[ch]) ? tPal[ch] : d.p[ch];
      if (name==='net_building' || name==='shop_building') {
        if (ch==='n' || ch==='b') col = tPal[ch] || d.p[ch];
      }
      if (col) px(ctx, fx ? w-1-x : x, y, 1, 1, col);
    }
  }
  sprCache.set(key, c);
  return c;
}

// --- Procedural Map ---
const TEX = {};
function genMap() {
  let c = mkCanvas(W, H); let ctx = c.getContext('2d');
  // Mặt đường nhựa
  px(ctx, 0, 0, W, H, '#2c3e50');
  for (let i=0; i<800; i++) px(ctx, rand(0,W), rand(0,H), 1, 1, Math.random()>0.5?'#34495e':'#233140');
  
  // Lề đường (Vỉa hè lát gạch)
  px(ctx, 0, 0, 30, H, '#7f8c8d');
  px(ctx, W-30, 0, 30, H, '#7f8c8d');
  for (let y=0; y<H; y+=10) {
    px(ctx, 0, y, 30, 1, '#95a5a6'); px(ctx, W-30, y, 30, 1, '#95a5a6');
    px(ctx, 10, y, 1, 10, '#95a5a6'); px(ctx, 20, y, 1, 10, '#95a5a6');
    px(ctx, W-20, y, 1, 10, '#95a5a6'); px(ctx, W-10, y, 1, 10, '#95a5a6');
  }
  // Vạch kẻ đường giữa
  for (let y=0; y<H; y+=20) px(ctx, W/2 - 2, y, 4, 10, '#bdc3c7');
  
  // Dải phân cách / Rào cản ở giữa bản đồ
  px(ctx, 0, H/2 - 10, W, 20, '#34495e'); // Vỉa hè ngang
  px(ctx, 0, H/2 - 10, W, 2, '#2c3e50');
  px(ctx, 0, H/2 + 8, W, 2, '#2c3e50');
  
  // Cầu vượt qua rào (Vạch qua đường)
  px(ctx, 40, H/2 - 12, 20, 24, '#34495e');
  px(ctx, 120, H/2 - 12, 20, 24, '#34495e');
  for (let y=H/2-10; y<=H/2+8; y+=4) {
    px(ctx, 42, y, 16, 2, '#ecf0f1');
    px(ctx, 122, y, 16, 2, '#ecf0f1');
  }

  TEX.bg = c;
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

const CARD_DB = [
  { id: 'tre_trau', cost: 2, hp: 80, dmg: 15, range: 10, speed: 25, type: 'ground', size: 8, atkSpd: 0.8 },
  { id: 'chu_quan', cost: 3, hp: 60, dmg: 12, range: 60, speed: 18, type: 'ground', size: 8, atkSpd: 1.0 },
  { id: 'shipper', cost: 4, hp: 120, dmg: 20, range: 12, speed: 40, type: 'ground', size: 10, atkSpd: 1.2 },
  { id: 'giang_ho', cost: 5, hp: 300, dmg: 25, range: 12, speed: 12, type: 'ground', size: 12, atkSpd: 2.0 },
  { id: 'spell', cost: 4, isSpell: true, splash: 40, dmg: 150 }
];

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
    this.atkSpd = stats.atkSpd;
    this.size = stats.size;
    this.splash = stats.splash || 0;
    this.cooldown = 0; this.target = null;
    this.isBuilding = ['net_building','shop_building'].includes(type);
    this.flash = 0; this.dir = team === 'player' ? -1 : 1; this.walkAnim = 0;
  }
  
  takeDamage(amt) {
    this.hp -= amt; this.flash = 0.1;
    if (this.hp <= 0 && this.isBuilding) {
      this.game.shake = 15;
      for(let i=0; i<30; i++) this.game.parts.push(new Particle(this.x, this.y, rand(-50,50), rand(-50,50), rand(0.5,1.5), '#bdc3c7'));
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
          if (this.range > 20) { // Đánh xa (Chủ quán ném lon)
            this.game.projs.push({x: this.x, y: this.y-this.size, tx: this.target.x, ty: this.target.y, tgt: this.target, dmg: this.dmg, splash: this.splash, team: this.team, isArrow: true});
            Snd.play(600, 400, 0.1, 'sine', 0.05);
          } else { // Cận chiến
            this.target.takeDamage(this.dmg);
            for(let i=0; i<5; i++) this.game.parts.push(new Particle(this.target.x, this.target.y, rand(-20,20), rand(-20,20), 0.3, '#e74c3c'));
            Snd.play(200, 50, 0.1, 'square', 0.05);
          }
        }
      } else if (!this.isBuilding) {
        let tgtX = this.target.x, tgtY = this.target.y;
        // AI tìm đường qua vạch kẻ đường
        let cross = (this.team === 'player' && this.y > H/2 + 10 && tgtY < H/2 - 10) || 
                    (this.team === 'enemy' && this.y < H/2 - 10 && tgtY > H/2 + 10);
        if (cross) {
          tgtX = Math.abs(this.x - 50) < Math.abs(this.x - 130) ? 50 : 130;
          tgtY = H/2;
        }
        let mx = tgtX - this.x, my = tgtY - this.y;
        let mDist = Math.hypot(mx, my);
        this.x += (mx / mDist) * this.speed * dt;
        this.y += (my / mDist) * this.speed * dt;
        this.walkAnim += dt * 15;
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
    let dx = this.x - hw, dy = this.y - s.height + bob + (this.isBuilding ? hw*0.4 : 0);
    
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(s, dx, dy);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(s, dx, dy);
    }
    if (this.hp < this.maxHp) {
      px(ctx, this.x - 10, this.y - s.height - 5, 20, 2, '#111');
      px(ctx, this.x - 10, this.y - s.height - 5, 20*(this.hp/this.maxHp), 2, this.team==='player'?'#2ecc71':'#e74c3c');
    }
  }
}

class Game {
  constructor() {
    this.ents = []; this.parts = []; this.projs = [];
    this.elixir = 5; this.aiElixir = 5;
    this.deck = [0, 1, 2, 3, 4]; // indices in CARD_DB
    this.hand = [0, 1, 2, 4];
    this.shake = 0; this.drag = null; this.dx = 0; this.dy = 0;
    this.last = performance.now();
    this.initMap();
    this.updateUI();
  }
  
  initMap() {
    const b = (t,x,y,tm,hp,dmg) => this.ents.push(new Entity(this, t, x, y, tm, {hp, dmg, range: 45, speed: 0, size: 24, atkSpd: 1.0}));
    b('net_building', 90, 240, 'player', 2000, 40); b('net_building', 90, 40, 'enemy', 2000, 40);
    b('shop_building', 35, 190, 'player', 1400, 30); b('shop_building', 145, 190, 'player', 1400, 30);
    b('shop_building', 35, 90, 'enemy', 1400, 30); b('shop_building', 145, 90, 'enemy', 1400, 30);
  }
  
  updateUI() {
    for (let i=0; i<4; i++) {
      let card = CARD_DB[this.hand[i]];
      document.getElementById('cost-'+i).innerText = card.cost;
      // Generate image for card
      let s = spr(card.id, 'player');
      let tmp = mkCanvas(32, 32); let tc = tmp.getContext('2d');
      tc.imageSmoothingEnabled = false;
      tc.drawImage(s, 16 - s.width/2, 16 - s.height/2, s.width, s.height);
      document.getElementById('img-'+i).src = tmp.toDataURL();
    }
  }

  findTarget(e) {
    let best = null, minDist = Infinity;
    for (let o of this.ents) {
      if (o.team !== e.team && o.hp > 0) {
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
    // Cập nhật thanh UI
    document.getElementById('elixir-fill').style.width = (this.elixir*10) + '%';
    document.getElementById('elixir-text').innerText = this.elixir.toFixed(1);
    for(let i=0; i<4; i++) {
      if(this.elixir >= CARD_DB[this.hand[i]].cost) document.getElementById('card-'+i).classList.remove('disabled');
      else document.getElementById('card-'+i).classList.add('disabled');
    }

    this.aiElixir += dt*0.35;
    if (this.aiElixir > 6) {
      let ch = [0, 1, 2, 3];
      let tId = pick(ch); let c = CARD_DB[tId];
      if (this.aiElixir >= c.cost) {
        this.aiElixir -= c.cost;
        let x = Math.random()>0.5 ? 35 : 145;
        this.ents.push(new Entity(this, c.id, x, 30, 'enemy', c));
      }
    }
    
    this.ents = this.ents.filter(e => !e.update(dt));
    
    this.projs = this.projs.filter(p => {
      let dx = p.tx - p.x, dy = p.ty - p.y;
      let d = Math.hypot(dx, dy);
      if (p.type === 'spell') { p.z -= 400*dt; if (p.z < 0) p.z = 0; }
      if (d < 5 || (p.type === 'spell' && p.z <= 0)) {
        if (p.splash > 0) {
          Snd.play(150, 20, 0.4, 'sawtooth', 0.1); this.shake = 15;
          for(let i=0; i<20; i++) this.parts.push(new Particle(p.x, p.y, rand(-60,60), rand(-60,60), rand(0.5,1), '#f1c40f'));
          for(let e of this.ents) if (e.team !== p.team && Math.hypot(e.x - p.x, e.y - p.y) <= p.splash) e.takeDamage(p.dmg);
        } else if (p.tgt && p.tgt.hp > 0) {
          p.tgt.takeDamage(p.dmg);
          for(let i=0; i<5; i++) this.parts.push(new Particle(p.x, p.y, rand(-20,20), rand(-20,20), 0.3, '#bdc3c7'));
        }
        return false;
      }
      let s = p.type === 'spell' ? 200 : 150;
      p.x += (dx/d)*s*dt; p.y += (dy/d)*s*dt;
      return true;
    });
    
    this.parts = this.parts.filter(p => { p.update(dt); return p.life > 0; });
    if (this.shake > 0) this.shake -= dt*30;

    g.save();
    px(g, 0, 0, W, H, '#111');
    if (this.shake > 0) g.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
    
    g.drawImage(TEX.bg, 0, 0);
    
    this.ents.sort((a,b) => a.y - b.y);
    for (let e of this.ents) e.draw(g);
    
    for (let p of this.projs) {
      if (p.type === 'spell') {
        const s = spr(p.type, 'neutral');
        g.drawImage(s, p.x - s.width/2, p.y - s.height/2 - p.z);
      } else {
        px(g, p.x, p.y, 2, 2, '#fff'); // Lon nước Throw
      }
    }
    for (let p of this.parts) p.draw(g);
    
    if (this.drag !== null) {
      let c = CARD_DB[this.hand[this.drag]];
      g.globalAlpha = 0.6;
      let s = spr(c.id, 'player');
      g.drawImage(s, this.dx - s.width/2, this.dy - s.height/2);
      px(g, 0, c.isSpell ? 0 : H/2 + 15, W, H, c.isSpell ? 'rgba(52, 152, 219, 0.2)' : 'rgba(46, 204, 113, 0.2)');
      g.globalAlpha = 1.0;
    }

    g.restore();

    // Lên hình thực tế
    px(sctx, 0, 0, screen.width, screen.height, '#111');
    sctx.drawImage(buf, 0, 0, W, H, Math.floor((screen.width - W*S)/2), 0, W*S, H*S); // Đẩy lên Top để vừa UI bên dưới

    if(this.running) requestAnimationFrame(t => this.loop(t));
  }
}

// Khởi tạo
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buf = mkCanvas(W, H);
const g = buf.getContext('2d', { alpha: false });
let S = 1;
function resize() {
  screen.width = document.getElementById('gameContainer').clientWidth;
  screen.height = document.getElementById('gameContainer').clientHeight - (document.getElementById('gameContainer').clientHeight * 0.22); // Để chỗ cho UI
  S = Math.max(1, Math.floor(Math.min(screen.width / W, screen.height / H)));
  sctx.imageSmoothingEnabled = false;
  g.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();
genMap();

let gameInstance = null;

window.startGame = function() {
  document.getElementById('ui-overlay').style.display = 'none';
  document.getElementById('game-ui').style.display = 'flex';
  Snd.init();
  if(!gameInstance) {
    gameInstance = new Game();
    gameInstance.running = true;
    requestAnimationFrame(t => gameInstance.loop(t));
    
    // Setup drag events
    const getP = e => {
      const r = screen.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left - Math.floor((screen.width - W*S)/2))/S, y: (cy - r.top)/S };
    };
    
    for(let i=0; i<4; i++) {
      let cardEl = document.getElementById('card-'+i);
      const dn = (e) => {
        e.preventDefault();
        if(gameInstance.elixir >= CARD_DB[gameInstance.hand[i]].cost) {
          gameInstance.drag = i;
          let p = getP(e); gameInstance.dx = p.x || W/2; gameInstance.dy = p.y || H/2;
        }
      };
      cardEl.addEventListener('mousedown', dn);
      cardEl.addEventListener('touchstart', dn, {passive:false});
    }
    
    const mv = e => { if (gameInstance.drag !== null) { e.preventDefault(); const p = getP(e); gameInstance.dx = p.x; gameInstance.dy = p.y; } };
    const up = e => {
      if (gameInstance.drag !== null) {
        let idx = gameInstance.hand[gameInstance.drag]; let c = CARD_DB[idx];
        if (gameInstance.dy > 0 && gameInstance.dy < H && (gameInstance.dy > H/2 + 15 || c.isSpell)) {
          gameInstance.elixir -= c.cost;
          Snd.play(400, 800, 0.15, 'triangle', 0.05);
          if (c.isSpell) {
            gameInstance.projs.push({x: gameInstance.dx, y: -20, tx: gameInstance.dx, ty: gameInstance.dy, dmg: c.dmg, splash: c.splash, type: 'spell', team: 'player', z: 150});
          } else {
            gameInstance.ents.push(new Entity(gameInstance, c.id, gameInstance.dx, gameInstance.dy, 'player', c));
          }
          gameInstance.hand[gameInstance.drag] = gameInstance.deck[(Math.random()*gameInstance.deck.length)|0];
          gameInstance.updateUI();
        }
        gameInstance.drag = null;
      }
    };
    screen.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    screen.addEventListener('touchmove', mv, {passive:false}); window.addEventListener('touchend', up);
  }
};
