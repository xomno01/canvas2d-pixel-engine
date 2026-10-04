---
name: canvas2d-pixel-engine
description: >-
  Comprehensive guide, architecture patterns, and reusable code templates for creating
  high-performance retro pixel-art graphics and animated 2D games using pure HTML5 Canvas 2D
  without external game engines or WebGL. Teaches how to design character-matrix pixel sprites,
  implement offscreen LRU sprite caching, build 3x5 bitmap fonts, enforce integer-scaled low-res
  framebuffers, and render dynamic day/night composite lighting.
---

# Canvas 2D Retro Pixel Art Engine

This skill guides you through building lightweight, high-performance pixel-art web games and graphical applications using **pure HTML5 Canvas 2D** without any heavy game engine (no Phaser, PixiJS, Three.js, or WebGL).

This methodology is reverse-engineered and refined from production retro web games (e.g. *Tiệm Nét Cỏ*), offering instant loading times, zero external dependencies, 60 FPS performance, and authentic retro pixel aesthetics.

---

## Core Architecture Overview

```text
┌───────────────────────────────────────────────────────────────┐
│                     CANVAS 2D PIPELINE                        │
│                                                               │
│   1. Sprite Definitions (Character Matrix + Color Palette)    │
│                           ▼                                   │
│   2. Offscreen LRU Baking (mkCanvas + fillRect -> Cached)     │
│                           ▼                                   │
│   3. Low-Res Buffer (e.g. 160x240 Virtual Framebuffer)        │
│                           ▼                                   │
│   4. Composite Lighting (destination-out + lighter blend)     │
│                           ▼                                   │
│   5. Integer Scaling (imageSmoothingEnabled = false)          │
│                           ▼                                   │
│   6. Real Screen (Nearest-neighbor upscaled to DPI/Window)    │
└───────────────────────────────────────────────────────────────┘
```

---

## 5 Essential Pillars of the Engine

### Pillar 1: Character Matrix Pixel Art (`SPR`)
Define sprites directly in source code as 2D string arrays where each character maps to a hex color, and `.` represents transparency.

```javascript
const SPR = {
  car: {
    p: { k: '#1b1424', r: '#e83b3b', l: '#ff8f7a', w: '#5fcde4', y: '#fff6b0' },
    m: [
      '..kkkkkk..',
      '.kyrrrryk.',
      '.krrllrrk.',
      'tkrrllrrkt',
      'ukwwwwwwku',
      '.kdrllrdk.',
      '..kkkkkk..'
    ]
  }
};
```
*Full documentation & palette swapping:* [`references/01-char-matrix-sprites.md`](./references/01-char-matrix-sprites.md)

---

### Pillar 2: Offscreen LRU Sprite Baking
Never iterate over the character matrix on every animation frame. "Bake" each sprite + palette + flip combination onto an offscreen canvas once, and store it in an LRU (Least Recently Used) cache.

```javascript
class LRU extends Map {
  constructor(limit = 1000) { super(); this.limit = limit; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.limit) super.delete(this.keys().next().value); return this; }
}

const sprCache = new LRU(1200);

function spr(name, pal, flipX = false, flipY = false) {
  const key = `${name}|${pal ? pal.id : ''}|${flipX ? 1 : 0}${flipY ? 1 : 0}`;
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
        ctx.fillRect(flipX ? w - 1 - x : x, flipY ? h - 1 - y : y, 1, 1);
      }
    }
  }
  sprCache.set(key, c);
  return c;
}
```
*Full documentation:* [`references/02-lru-sprite-baking.md`](./references/02-lru-sprite-baking.md)

---

### Pillar 3: Embedded 3x5 Bitmap Font (`PixelFont`)
Avoid custom web font loading latency or layout shifts by defining an embedded 3×5 bitmap font using 15-bit binary strings (`0` = empty, `1` = pixel).

```javascript
const FONT_3X5 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111',
  ':': '000010000010000', '!': '010010010000010', '-': '000000111000000'
};

function drawText(ctx, str, x, y, col = '#fff', scale = 1, shadowCol = '#1b1424') {
  str = String(str).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const glyph = FONT_3X5[str[i]];
    if (!glyph) continue;
    for (let b = 0; b < 15; b++) {
      if (glyph[b] === '1') {
        const px = x + (i * 4 + (b % 3)) * scale;
        const py = y + Math.floor(b / 3) * scale;
        if (shadowCol) {
          ctx.fillStyle = shadowCol;
          ctx.fillRect(px + scale, py + scale, scale, scale);
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, scale, scale);
      }
    }
  }
}
```
*Full glyph table & caching:* [`references/03-bitmap-font-3x5.md`](./references/03-bitmap-font-3x5.md)

---

### Pillar 4: Low-Resolution Buffer with Nearest-Neighbor Upscaling
Never render directly to screen resolution. Render to an internal virtual canvas (e.g. 160×240 or 320×180), then project to screen with integer scaling and `imageSmoothingEnabled = false`.

```javascript
const VIRTUAL_W = 160, VIRTUAL_H = 240;
const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
const buffer = document.createElement('canvas');
buffer.width = VIRTUAL_W; buffer.height = VIRTUAL_H;
const g = buffer.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * dpr);
  screen.height = Math.floor(window.innerHeight * dpr);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';
  
  // Integer scaling to eliminate sub-pixel shimmer
  const scale = Math.max(1, Math.floor(Math.min(screen.width / VIRTUAL_W, screen.height / VIRTUAL_H)));
  const ox = Math.floor((screen.width - VIRTUAL_W * scale) / 2);
  const oy = Math.floor((screen.height - VIRTUAL_H * scale) / 2);
  
  sctx.imageSmoothingEnabled = false;
  return { scale, ox, oy };
}
```
*Full documentation:* [`references/04-low-res-integer-scaling.md`](./references/04-low-res-integer-scaling.md)

---

### Pillar 5: Dynamic Composite Lighting (Day/Night & Headlights)
Simulate headlights, streetlamps, torches, and darkness without 3D shaders by using `globalCompositeOperation = 'destination-out'` to punch light holes into a darkness overlay, then `'lighter'` for glowing halos.

```javascript
function drawLighting(g, lights, darkness = 0.8) {
  if (darkness <= 0.05) return;
  
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = VIRTUAL_W; lightCanvas.height = VIRTUAL_H;
  const lc = lightCanvas.getContext('2d');
  
  // 1. Fill darkness mask
  lc.fillStyle = `rgba(8, 10, 38, ${darkness})`;
  lc.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
  
  // 2. Punch light holes (destination-out)
  lc.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    if (l.type === 'cone') {
      const grad = lc.createLinearGradient(l.x, l.y, l.x, l.y + l.dir * l.len);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.beginPath();
      lc.moveTo(l.x - 2, l.y); lc.lineTo(l.x + 2, l.y);
      lc.lineTo(l.x + l.spread, l.y + l.dir * l.len);
      lc.lineTo(l.x - l.spread, l.y + l.dir * l.len);
      lc.closePath();
      lc.fill();
    } else if (l.type === 'point') {
      const grad = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
  }
  
  // 3. Draw darkness mask onto buffer
  g.drawImage(lightCanvas, 0, 0);
  
  // 4. Additive color glow (lighter)
  g.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (l.color) {
      const grad = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.6);
      grad.addColorStop(0, `rgba(${l.color}, 0.5)`);
      grad.addColorStop(1, `rgba(${l.color}, 0)`);
      g.fillStyle = grad;
      g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
  }
  g.globalCompositeOperation = 'source-over';
}
```
*Full documentation:* [`references/05-composite-lighting-fx.md`](./references/05-composite-lighting-fx.md)

---

## Step-by-Step Implementation Workflow

When asked to build a retro pixel game or graphics application:

1. **Step 1: Set Up HTML & Viewport**:
   Copy [`templates/minimal-canvas-shell.html`](./templates/minimal-canvas-shell.html). Use a single `<canvas id="game">` with DOM overlays only for UI/controls.
2. **Step 2: Choose Low-Res Virtual Resolution**:
   - Vertical arcade / mobile: `160 x 240`
   - 16:9 widescreen retro: `320 x 180` or `256 x 144`
   - Classic SNES/GameBoy: `256 x 224` or `160 x 144`
3. **Step 3: Define Sprites & Color Palettes**:
   Use character matrix arrays from [`templates/sprite-definitions.js`](./templates/sprite-definitions.js). Keep character tokens memorable (`k` for black/outline, `r` for red, `w` for white).
4. **Step 4: Implement Game Loop & LRU Baking**:
   Copy [`templates/pixel-renderer-starter.js`](./templates/pixel-renderer-starter.js) which wires up `requestAnimationFrame`, LRU cache, and low-res to high-res presentation.
5. **Step 5: Synthesize Procedural Audio with WebAudio**:
   Synthesize square/sawtooth waves and filtered noise buffers for zero-asset sound effects.
6. **Step 6: Test & Verify**:
   Run with `node scripts/test-render.js` to ensure coordinate math produces no `NaN` and maintain stable 60 FPS.

---

## Directory Reference

- [`templates/`](./templates/): Ready-to-use boilerplate and starter files.
- [`references/`](./references/): Detailed deep-dive manuals for each technique.
- [`examples/pixel-racer-demo/`](./examples/pixel-racer-demo/): Complete working reference implementation of a retro racer.
- [`examples/char-matrix-viewer.html`](./examples/char-matrix-viewer.html): Interactive visual tool to design and preview character-matrix pixel art in real time.
