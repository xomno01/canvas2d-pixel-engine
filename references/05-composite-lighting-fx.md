# Dynamic Lighting & Composite Effects in Canvas 2D

## Technique Overview
Without WebGL fragment shaders, 2D Canvas games can achieve dynamic, authentic lighting by utilizing `globalCompositeOperation`.

Two blending modes provide the complete lighting pipeline:
1. `'destination-out'`: Erases or reduces opacity from an existing mask (used to cut holes in darkness).
2. `'lighter'`: Adds RGB color values together (additive blending, used for neon glow, fire, and muzzle flashes).

## Step-by-Step Implementation

### Step 1: Darkness Mask
Create an offscreen mask canvas the same size as your low-res buffer:
```javascript
const mask = document.createElement('canvas');
mask.width = V_W; mask.height = V_H;
const mc = mask.getContext('2d');

// Clear and fill with night darkness color (deep blue/black)
mc.globalCompositeOperation = 'source-over';
mc.clearRect(0, 0, V_W, V_H);
mc.fillStyle = 'rgba(8, 10, 36, 0.85)';
mc.fillRect(0, 0, V_W, V_H);
```

### Step 2: Carve Out Light Cones & Radii
Switch mask blend mode to `'destination-out'`:
```javascript
mc.globalCompositeOperation = 'destination-out';

// Headlight cone using LinearGradient
const gradCone = mc.createLinearGradient(x, y, x, y - 80);
gradCone.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
gradCone.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

mc.fillStyle = gradCone;
mc.beginPath();
mc.moveTo(x - 2, y);
mc.lineTo(x + 2, y);
mc.lineTo(x + 24, y - 80);
mc.lineTo(x - 24, y - 80);
mc.closePath();
mc.fill();

// Lantern / Torch radial light using RadialGradient
const gradPoint = mc.createRadialGradient(x, y, 0, x, y, radius);
gradPoint.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
gradPoint.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
mc.fillStyle = gradPoint;
mc.fillRect(x - radius, y - radius, radius * 2, radius * 2);
```

### Step 3: Composite Mask Onto Scene
Draw the completed mask on top of the world canvas:
```javascript
g.drawImage(mask, 0, 0);
```

### Step 4: Additive Color Halos
Switch the main buffer context to `'lighter'` to add warm headlight tints and siren colors:
```javascript
g.globalCompositeOperation = 'lighter';

const haloGrad = g.createRadialGradient(x, y, 0, x, y, radius * 0.5);
haloGrad.addColorStop(0, 'rgba(255, 230, 140, 0.4)');
haloGrad.addColorStop(1, 'rgba(255, 230, 140, 0.0)');
g.fillStyle = haloGrad;
g.fillRect(x - radius, y - radius, radius * 2, radius * 2);

// Always reset back to normal
g.globalCompositeOperation = 'source-over';
```
