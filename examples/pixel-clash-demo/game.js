// Pixel Clash - Pure Canvas 2D Engine
// No dependencies, advanced juice & game feel

const CANVAS_W = 180;
const CANVAS_H = 320;
const BATTLE_H = 260; // Playable area
const UI_H = 60; // Card & Elixir area

// --- SPRITES (ASCII Art) ---
const SPRITES_DEF = {
  KING: [
    "---1111111111---",
    "--112222222211--",
    "--122222222221--",
    "-11222222222211-",
    "-12222222222221-",
    "1122222222222211",
    "1221122112211221",
    "1221122112211221",
    "1222222222222221",
    "1222222222222221",
    "1222211111122221",
    "1222213333122221",
    "1222213333122221",
    "1222213333122221",
    "1111113333111111",
    "1111111111111111"
  ],
  CROWN: [
    "--111111111111--",
    "-11222222222211-",
    "-122112211221121",
    "-122112211221121",
    "-122222222222221",
    "-122222222222221",
    "-122211111122221",
    "-122213333122221",
    "-122213333122221",
    "-111111111111111"
  ],
  KNIGHT: [
    "--3333--",
    "-333333-",
    "-131131-",
    "-112211-",
    "-412214-",
    "44122144",
    "-411114-",
    "--4--4--"
  ],
  ARCHER: [
    "--3333--",
    "-333333-",
    "-131131-",
    "-41221--",
    "-442211-",
    "-41221--",
    "--1111--",
    "--4--4--"
  ],
  GOLEM: [
    "----11111111----",
    "---1144444411---",
    "--114411114411--",
    "-11441333314411-",
    "-14413133131441-",
    "-14413333331441-",
    "1144113333114411",
    "1444411111144441",
    "1444444444444441",
    "1444444444444441",
    "-11444444444411-",
    "--114444444411--",
    "---1111111111---",
    "---1144114411---",
    "---1444114441---",
    "---1111--1111---"
  ],
  DRAGON: [
    "---11------11---",
    "--1133----3311--",
    "-113311--113311-",
    "1133331111333311",
    "1333333113333331",
    "-11113311331111-",
    "----11222211----",
    "-----112211-----",
    "------1111------",
    "-----122221-----",
    "----12122121----",
    "----12222221----",
    "-----122221-----",
    "------1111------",
    "-----11--11-----",
    "-----1----1-----"
  ],
  FIREBALL: [
    "-111-",
    "12221",
    "12321",
    "12221",
    "-111-"
  ],
  ARROW: [
    "4-",
    "-1"
  ]
};

// --- PALETTES ---
// Team 1: Blue, Team 2: Red
const PALETTES = {
  'player': { '1': '#111', '2': '#3498db', '3': '#f1c40f', '4': '#95a5a6' },
  'enemy':  { '1': '#111', '2': '#e74c3c', '3': '#f1c40f', '4': '#95a5a6' },
  'neutral':{ '1': '#111', '2': '#e67e22', '3': '#f1c40f', '4': '#95a5a6' }
};

// --- RENDERER (LRU Cache & Bitmap Generator) ---
const SPRITE_CACHE = {};
function getSprite(name, team, flipped = false) {
  const key = `${name}_${team}_${flipped}`;
  if (SPRITE_CACHE[key]) return SPRITE_CACHE[key];

  const ascii = SPRITES_DEF[name];
  const h = ascii.length;
  const w = ascii[0].length;
  const scale = 2; // integer scaling
  
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  
  const pal = PALETTES[team] || PALETTES['neutral'];
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const charX = flipped ? (w - 1 - x) : x;
      const char = ascii[y][charX];
      if (char !== '-') {
        ctx.fillStyle = pal[char] || '#FFF';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  SPRITE_CACHE[key] = canvas;
  return canvas;
}

// --- AUDIO ENGINE (Web Audio API Synth) ---
const Audio = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  play(type) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'spawn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'shoot') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }
};

// --- GAME DATA & CLASSES ---
const CARD_DB = {
  'KNIGHT': { cost: 3, hp: 120, dmg: 20, range: 12, speed: 25, type: 'ground', targets: 'all', size: 8, atkSpd: 1.2 },
  'ARCHER': { cost: 3, hp: 40, dmg: 10, range: 60, speed: 30, type: 'ground', targets: 'all', size: 8, atkSpd: 1.0, count: 2 },
  'GOLEM':  { cost: 6, hp: 400, dmg: 40, range: 15, speed: 15, type: 'ground', targets: 'buildings', size: 16, atkSpd: 2.5 },
  'DRAGON': { cost: 4, hp: 150, dmg: 25, range: 45, speed: 25, type: 'air', targets: 'all', size: 16, atkSpd: 1.8, splash: 25 },
  'FIREBALL':{cost: 4, isSpell: true, splash: 40, dmg: 120 }
};

class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, 2, 2);
    ctx.globalAlpha = 1;
  }
}

class Projectile {
  constructor(x, y, target, dmg, splash, type, team) {
    this.x = x; this.y = y; this.target = target;
    this.dmg = dmg; this.splash = splash; this.type = type; this.team = team;
    this.speed = 100;
    this.z = type === 'FIREBALL' ? 100 : 10;
    
    // For spells that target a point instead of entity
    if (!target.hp) {
      this.targetPos = { x: target.x, y: target.y };
      this.speed = 150;
    }
  }
  update(dt, game) {
    let tx = this.targetPos ? this.targetPos.x : this.target.x;
    let ty = this.targetPos ? this.targetPos.y : this.target.y;
    
    let dx = tx - this.x;
    let dy = ty - this.y;
    let dist = Math.hypot(dx, dy);
    
    if (this.type === 'FIREBALL') {
      this.z -= 150 * dt; // Fall from sky
      if (this.z < 0) this.z = 0;
    }

    if (dist < 5 || (this.type === 'FIREBALL' && this.z <= 0)) {
      // Hit!
      Audio.play(this.type === 'FIREBALL' ? 'explosion' : 'hit');
      if (this.splash > 0) {
        game.explode(this.x, this.y, this.splash, this.dmg, this.team);
        game.shake(this.type === 'FIREBALL' ? 8 : 3);
      } else if (this.target.hp) {
        this.target.takeDamage(this.dmg, game);
        game.spawnParticles(this.x, this.y, 5, PALETTES[this.target.team]['2']);
      }
      return true; // destroy
    }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
    return false;
  }
  draw(ctx) {
    const spr = getSprite(this.type, this.team);
    ctx.drawImage(spr, this.x - spr.width/2, this.y - spr.height/2 - this.z);
  }
}

class Entity {
  constructor(id, type, x, y, team, stats) {
    this.id = id; this.type = type; this.x = x; this.y = y; this.team = team;
    this.hp = stats.hp; this.maxHp = stats.hp; this.dmg = stats.dmg;
    this.range = stats.range; this.speed = stats.speed; 
    this.atkSpd = stats.atkSpd; this.isAir = (stats.type === 'air');
    this.targets = stats.targets; this.size = stats.size;
    this.splash = stats.splash || 0;
    
    this.cooldown = 0;
    this.target = null;
    this.isBuilding = ['KING','CROWN'].includes(type);
    this.flash = 0;
    this.dir = team === 'player' ? -1 : 1;
    this.walkAnim = 0;
  }
  
  takeDamage(amount, game) {
    this.hp -= amount;
    this.flash = 0.1;
    if (this.hp <= 0 && this.isBuilding) {
      game.shake(10);
      game.spawnParticles(this.x, this.y, 30, '#bdc3c7');
      Audio.play('explosion');
    }
  }

  update(dt, game) {
    if (this.flash > 0) this.flash -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    
    if (this.hp <= 0) return true; // dead

    // Find target
    if (!this.target || this.target.hp <= 0) {
      this.target = game.findTarget(this);
    }
    
    if (this.target) {
      let dx = this.target.x - this.x;
      let dy = this.target.y - this.y;
      let dist = Math.hypot(dx, dy);
      
      if (dist <= this.range + this.target.size/2) {
        // Attack
        if (this.cooldown <= 0) {
          this.cooldown = this.atkSpd;
          // Spawn projectile
          if (this.range > 20) {
            let pType = this.type === 'DRAGON' ? 'FIREBALL' : 'ARROW';
            game.projectiles.push(new Projectile(this.x, this.y - this.size, this.target, this.dmg, this.splash, pType, this.team));
            Audio.play('shoot');
          } else {
            // Melee
            this.target.takeDamage(this.dmg, game);
            game.spawnParticles(this.target.x, this.target.y, 3, '#e74c3c');
            Audio.play('hit');
          }
        }
      } else if (!this.isBuilding) {
        // Move
        // Pathfinding: Move towards nearest bridge first if crossing river
        let tgtX = this.target.x;
        let tgtY = this.target.y;
        
        // If target is across river (y=130), head to nearest bridge (x=45 or 135)
        let crossRiver = (this.team === 'player' && this.y > 140 && tgtY < 120) || 
                         (this.team === 'enemy' && this.y < 120 && tgtY > 140);
                         
        if (crossRiver && !this.isAir) {
          let b1 = 45, b2 = 135;
          tgtX = Math.abs(this.x - b1) < Math.abs(this.x - b2) ? b1 : b2;
          tgtY = 130;
        }

        let mx = tgtX - this.x;
        let my = tgtY - this.y;
        let mDist = Math.hypot(mx, my);
        
        this.x += (mx / mDist) * this.speed * dt;
        this.y += (my / mDist) * this.speed * dt;
        this.walkAnim += dt * 10;
        
        // Facing
        if (mx > 0) this.dir = 1; else if (mx < 0) this.dir = -1;
      }
    }
    return false;
  }
  
  draw(ctx) {
    const spr = getSprite(this.type, this.team, this.dir < 0);
    const hw = spr.width / 2;
    const hh = spr.height / 2;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, hw*0.8, hw*0.4, 0, 0, Math.PI*2);
    ctx.fill();
    
    let bob = (!this.isBuilding && this.target && Math.hypot(this.target.x-this.x, this.target.y-this.y) > this.range) ? Math.sin(this.walkAnim)*2 : 0;
    let flyY = this.isAir ? -15 + Math.sin(Date.now()/200)*3 : 0;
    
    let drawX = this.x - hw;
    let drawY = this.y - spr.height + bob + flyY + (this.isBuilding ? hw*0.4 : 0);

    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr, drawX, drawY);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(spr, drawX, drawY);
    }
    
    // HP Bar
    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x - 10, this.y - spr.height - 5 + flyY, 20, 3);
      ctx.fillStyle = this.team === 'player' ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(this.x - 10, this.y - spr.height - 5 + flyY, 20 * (this.hp/this.maxHp), 3);
    }
  }
}

// --- MAIN GAME ---
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.lastTime = performance.now();
    
    this.elixir = 5;
    this.deck = ['KNIGHT', 'ARCHER', 'GOLEM', 'DRAGON', 'FIREBALL'];
    this.hand = ['KNIGHT', 'ARCHER', 'GOLEM', 'FIREBALL'];
    
    this.entities = [];
    this.particles = [];
    this.projectiles = [];
    this.shakeTime = 0;
    
    this.dragCard = null;
    this.dragX = 0; this.dragY = 0;
    this.idCounter = 0;
    
    this.setupMap();
    this.setupEvents();
    requestAnimationFrame((t) => this.loop(t));
    
    document.getElementById('loading').style.display = 'none';
  }
  
  setupMap() {
    // King Towers
    this.entities.push(new Entity(++this.idCounter, 'KING', 90, 240, 'player', {hp: 2000, dmg: 40, range: 45, speed: 0, size: 32, atkSpd: 1}));
    this.entities.push(new Entity(++this.idCounter, 'KING', 90, 30, 'enemy', {hp: 2000, dmg: 40, range: 45, speed: 0, size: 32, atkSpd: 1}));
    // Crown Towers
    this.entities.push(new Entity(++this.idCounter, 'CROWN', 35, 190, 'player', {hp: 1400, dmg: 35, range: 45, speed: 0, size: 24, atkSpd: 0.8}));
    this.entities.push(new Entity(++this.idCounter, 'CROWN', 145, 190, 'player', {hp: 1400, dmg: 35, range: 45, speed: 0, size: 24, atkSpd: 0.8}));
    this.entities.push(new Entity(++this.idCounter, 'CROWN', 35, 70, 'enemy', {hp: 1400, dmg: 35, range: 45, speed: 0, size: 24, atkSpd: 0.8}));
    this.entities.push(new Entity(++this.idCounter, 'CROWN', 145, 70, 'enemy', {hp: 1400, dmg: 35, range: 45, speed: 0, size: 24, atkSpd: 0.8}));
  }
  
  setupEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const down = (e) => {
      e.preventDefault(); Audio.init();
      const {x, y} = getPos(e);
      if (y > BATTLE_H) {
        let cardW = CANVAS_W / 4;
        let index = Math.floor(x / cardW);
        if (index >= 0 && index < 4 && this.elixir >= CARD_DB[this.hand[index]].cost) {
          this.dragCard = index;
          this.dragX = x; this.dragY = y;
        }
      }
    };
    const move = (e) => {
      if (this.dragCard !== null) {
        e.preventDefault();
        const pos = getPos(e);
        this.dragX = pos.x; this.dragY = pos.y;
      }
    };
    const up = (e) => {
      if (this.dragCard !== null) {
        let type = this.hand[this.dragCard];
        let cost = CARD_DB[type].cost;
        let isSpell = CARD_DB[type].isSpell;
        // Check valid spawn area (player side) or spell (anywhere)
        if (this.dragY < BATTLE_H && (this.dragY > 130 || isSpell)) {
          this.elixir -= cost;
          Audio.play('spawn');
          if (isSpell) {
            this.projectiles.push(new Projectile(this.dragX, -20, {x: this.dragX, y: this.dragY}, CARD_DB[type].dmg, CARD_DB[type].splash, type, 'player'));
          } else {
            let count = CARD_DB[type].count || 1;
            for(let i=0; i<count; i++) {
              let off = (i - (count-1)/2) * 10;
              this.entities.push(new Entity(++this.idCounter, type, this.dragX + off, this.dragY, 'player', CARD_DB[type]));
            }
          }
          // Cycle deck
          this.hand[this.dragCard] = this.deck[(Math.random()*this.deck.length)|0]; 
        }
        this.dragCard = null;
      }
    };
    
    this.canvas.addEventListener('mousedown', down);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    this.canvas.addEventListener('touchstart', down, {passive: false});
    this.canvas.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('touchend', up);
  }
  
  findTarget(entity) {
    let best = null;
    let minDist = Infinity;
    for (let e of this.entities) {
      if (e.team !== entity.team && e.hp > 0) {
        if (entity.targets === 'buildings' && !e.isBuilding) continue;
        if (e.isAir && entity.type === 'KNIGHT') continue; // melee can't hit air
        
        let dist = Math.hypot(e.x - entity.x, e.y - entity.y);
        if (dist < minDist) { minDist = dist; best = e; }
      }
    }
    return best;
  }
  
  explode(x, y, radius, dmg, team) {
    this.spawnParticles(x, y, 40, '#f39c12');
    for (let e of this.entities) {
      if (e.team !== team && e.hp > 0) {
        if (Math.hypot(e.x - x, e.y - y) <= radius) {
          e.takeDamage(dmg, this);
        }
      }
    }
  }

  spawnParticles(x, y, count, color) {
    for (let i=0; i<count; i++) {
      let a = Math.random() * Math.PI * 2;
      let s = Math.random() * 50 + 20;
      this.particles.push(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, 0.2+Math.random()*0.3, color));
    }
  }
  
  shake(amt) { this.shakeTime = amt; }

  enemyAI(dt) {
    if (!this.aiElixir) this.aiElixir = 5;
    this.aiElixir += dt * 0.35;
    if (this.aiElixir > 6) {
      let choices = ['KNIGHT', 'ARCHER', 'GOLEM', 'DRAGON'];
      let type = choices[(Math.random()*choices.length)|0];
      if (this.aiElixir >= CARD_DB[type].cost) {
        this.aiElixir -= CARD_DB[type].cost;
        let x = Math.random() > 0.5 ? 35 : 145; // Spawn behind crowns
        let count = CARD_DB[type].count || 1;
        for(let i=0; i<count; i++) {
          this.entities.push(new Entity(++this.idCounter, type, x + i*10, 20, 'enemy', CARD_DB[type]));
        }
      }
    }
  }

  loop(time) {
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (dt > 0.1) dt = 0.1; // cap
    
    this.elixir = Math.min(10, this.elixir + dt * 0.35);
    this.enemyAI(dt);
    
    // Update
    this.entities = this.entities.filter(e => !e.update(dt, this));
    this.projectiles = this.projectiles.filter(p => !p.update(dt, this));
    this.particles = this.particles.filter(p => { p.update(dt); return p.life > 0; });
    
    if (this.shakeTime > 0) this.shakeTime -= dt * 30;

    // Draw
    const ctx = this.ctx;
    ctx.save();
    
    if (this.shakeTime > 0) {
      ctx.translate((Math.random()-0.5)*this.shakeTime, (Math.random()-0.5)*this.shakeTime);
    }
    
    // Background Grass
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, CANVAS_W, BATTLE_H);
    // River
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 125, CANVAS_W, 20);
    // Bridges
    ctx.fillStyle = '#d35400';
    ctx.fillRect(30, 120, 30, 30);
    ctx.fillRect(120, 120, 30, 30);
    
    // Cloud shadows (parallax)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    let cx = (time/50) % (CANVAS_W+100) - 50;
    ctx.beginPath(); ctx.arc(cx, 100, 40, 0, 7); ctx.arc(cx+30, 90, 50, 0, 7); ctx.fill();

    // Sort Y for depth rendering
    this.entities.sort((a,b) => a.y - b.y);
    
    for (let e of this.entities) e.draw(ctx);
    for (let p of this.projectiles) p.draw(ctx);
    for (let p of this.particles) p.draw(ctx);
    
    ctx.restore(); // reset shake

    // --- UI LAYER ---
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, BATTLE_H, CANVAS_W, UI_H);
    
    // Cards
    for (let i=0; i<4; i++) {
      let type = this.hand[i];
      let cost = CARD_DB[type].cost;
      let cw = CANVAS_W/4;
      let cx = i * cw;
      
      // Card BG
      ctx.fillStyle = this.elixir >= cost ? '#ecf0f1' : '#7f8c8d';
      ctx.fillRect(cx + 2, BATTLE_H + 2, cw - 4, UI_H - 12);
      
      // Icon
      let spr = getSprite(type, 'player');
      ctx.drawImage(spr, cx + cw/2 - spr.width/2, BATTLE_H + 10);
      
      // Cost
      ctx.fillStyle = '#9b59b6'; // elixir color
      ctx.beginPath(); ctx.arc(cx + 10, BATTLE_H + 10, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(cost, cx + 7, BATTLE_H + 13);
    }
    
    // Elixir Bar
    ctx.fillStyle = '#000';
    ctx.fillRect(0, CANVAS_H - 10, CANVAS_W, 10);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(0, CANVAS_H - 10, (this.elixir/10)*CANVAS_W, 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(Math.floor(this.elixir), CANVAS_W/2 - 5, CANVAS_H - 1);
    
    // Drag preview
    if (this.dragCard !== null) {
      let type = this.hand[this.dragCard];
      ctx.globalAlpha = 0.5;
      let spr = getSprite(type, 'player');
      ctx.drawImage(spr, this.dragX - spr.width/2, this.dragY - spr.height/2);
      ctx.globalAlpha = 1.0;
      
      // Valid zone highlight
      if (this.dragY < BATTLE_H && (this.dragY > 130 || CARD_DB[type].isSpell)) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
        ctx.fillRect(0, CARD_DB[type].isSpell ? 0 : 130, CANVAS_W, BATTLE_H);
      } else {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.fillRect(0, 0, CANVAS_W, BATTLE_H);
      }
    }
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.onload = () => {
  new Game(document.getElementById('gameCanvas'));
};
