# Offscreen LRU Sprite Baking

## The Problem
Iterating over a 16x16 matrix requires 256 checks and multiple `ctx.fillRect()` calls per entity per frame. With 50 entities on screen at 60 FPS, this results in over 750,000 operations per second, quickly causing frame drops on mobile devices.

## The Solution: Offscreen Pre-rendering + LRU Cache
1. When a sprite is requested with a specific palette and orientation (flipX, flipY), check if an offscreen `<canvas>` already exists in an LRU (Least Recently Used) cache.
2. If cached, return the offscreen canvas immediately and draw via `ctx.drawImage(cachedCanvas, x, y)`.
3. If not cached, create a temporary canvas, render the matrix using `fillRect` once, store in cache, and return.

```javascript
class LRU extends Map {
  constructor(limit = 1200) {
    super();
    this.limit = limit;
  }
  get(key) {
    const val = super.get(key);
    if (val !== undefined) {
      // Move to most recently used
      super.delete(key);
      super.set(key, val);
    }
    return val;
  }
  set(key, val) {
    super.delete(key);
    super.set(key, val);
    if (this.size > this.limit) {
      // Evict oldest entry
      super.delete(this.keys().next().value);
    }
    return this;
  }
}
```

## Cache Key Composition
The cache key must uniquely identify the graphical state:
```javascript
const key = `${spriteName}|${paletteId}|${flipX ? 1 : 0}${flipY ? 1 : 0}`;
```
Setting `limit` to 800 - 1500 entries keeps memory footprint under 15 MB while eliminating 99.8% of repetitive rendering cost.
