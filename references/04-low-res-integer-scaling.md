# Low-Resolution Buffer & Integer Scaling Pipeline

## Why Low-Res Virtual Framebuffers?
Modern displays have high pixel density (Retina, 2K, 4K) where drawing 1px lines produces microscopic, non-retro visuals. Scaling graphics using standard fractional CSS (`width: 100%`) creates blurry, smeared pixels due to bilinear interpolation.

## The Two-Canvas Architecture
1. **Virtual Framebuffer Canvas (`buf`)**:
   - Fixed low resolution (e.g. 160×240 for vertical games, 320×180 for 16:9).
   - All game logic, coordinates, sprites, particles, and lighting operate strictly within this coordinate space.
2. **Presentation Screen Canvas (`screen`)**:
   - Matches window dimensions multiplied by `window.devicePixelRatio`.
   - Projects the buffer to the center using integer scaling (`scale = Math.floor(...)`).

```javascript
const V_W = 160, V_H = 240;
const buf = document.createElement('canvas');
buf.width = V_W; buf.height = V_H;
const g = buf.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;

const screen = document.getElementById('game');
const sctx = screen.getContext('2d', { alpha: false });
sctx.imageSmoothingEnabled = false;

let scale = 1, ox = 0, oy = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  screen.width = Math.floor(window.innerWidth * dpr);
  screen.height = Math.floor(window.innerHeight * dpr);
  screen.style.width = window.innerWidth + 'px';
  screen.style.height = window.innerHeight + 'px';

  // Math.floor ensures exact pixel doubling/tripling without subpixel distortion
  scale = Math.max(1, Math.floor(Math.min(screen.width / V_W, screen.height / V_H)));
  ox = Math.floor((screen.width - V_W * scale) / 2);
  oy = Math.floor((screen.height - V_H * scale) / 2);
  
  sctx.imageSmoothingEnabled = false;
}

function present() {
  sctx.fillStyle = '#0d0a14'; // Letterbox / pillarbox color
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buf, ox, oy, V_W * scale, V_H * scale);
}
```

## Screen Coordinate to Virtual World Coordinate Mapping
To convert mouse/touch events from screen coordinates back into low-res game coordinates:
```javascript
function screenToVirtual(clientX, clientY) {
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX * dpr - ox) / scale,
    y: (clientY * dpr - oy) / scale
  };
}
```
