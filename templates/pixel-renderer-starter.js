'use strict';
/**
 * Canvas 2D Retro Pixel Engine Starter
 */

// 1. Virtual low-resolution dimensions
const V_W = 160, V_H = 240;

// 2. Canvases: Virtual buffer + Physical presentation screen
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buf = document.createElement('canvas');
buf.width = V_W; buf.height = V_H;
const g = buf.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;

let scale = 1, ox = 0, oy = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * dpr);
  screen.height = Math.floor(window.innerHeight * dpr);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';

  scale = Math.max(1, Math.floor(Math.min(screen.width / V_W, screen.height / V_H)));
  ox = Math.floor((screen.width - V_W * scale) / 2);
  oy = Math.floor((screen.height - V_H * scale) / 2);

  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// 3. LRU Cache for baked sprites
class LRU extends Map {
  constructor(limit = 1000) { super(); this.limit = limit; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.limit) super.delete(this.keys().next().value); return this; }
}
const sprCache = new LRU(1000);

// 4. Sprites repository
const SPR = {
  player: {
    p: { k: '#1b1424', r: '#e83b3b', w: '#5fcde4', y: '#ffe066' },
    m: [
      '..kkkk..',
      '.krrrrk.',
      'krrwwrrk',
      'krrrrrrk',
      '.kyyryk.',
      '..kkkk..'
    ]
  }
};

function spr(name, pal, fx = false, fy = false) {
  const key = `${name}|${pal ? pal.id : ''}|${fx ? 1 : 0}${fy ? 1 : 0}`;
  let c = sprCache.get(key);
  if (c) return c;
  const d = SPR[name], m = d.m;
  const h = m.length, w = Math.max(...m.map(r => r.length));
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < m[y].length; x++) {
      const ch = m[y][x];
      if (ch === '.') continue;
      const col = (pal && pal[ch]) || d.p[ch];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(fx ? w - 1 - x : x, fy ? h - 1 - y : y, 1, 1);
      }
    }
  }
  sprCache.set(key, c);
  return c;
}

// 5. Game Loop
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Update logic
  // ...

  // Render to virtual buffer
  g.fillStyle = '#1c172e';
  g.fillRect(0, 0, V_W, V_H);

  // Draw sprite from cache
  const playerSpr = spr('player');
  g.drawImage(playerSpr, Math.floor(V_W / 2 - playerSpr.width / 2), Math.floor(V_H / 2 - playerSpr.height / 2));

  // Present to physical screen
  sctx.fillStyle = '#0d0a14';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buf, ox, oy, V_W * scale, V_H * scale);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
