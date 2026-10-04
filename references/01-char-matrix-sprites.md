# Character Matrix Pixel Art Specification

## Concept
In retro development and pure Canvas 2D engines, binary image assets (PNG, WebP) introduce network requests, asynchronous loading states (`img.onload`), decoding latency, and asset management overhead.

The **Character Matrix** pattern embeds pixel sprites directly into JavaScript source code as string arrays.

## Data Structure
Each sprite is an object with:
1. `p`: A palette mapping single characters to CSS color strings (hex, rgb).
2. `m`: An array of equal-length strings, where each row represents 1 pixel vertically and each character represents 1 pixel horizontally.
3. `.` is universally reserved for transparency (no pixel drawn).

```javascript
const SPR = {
  heart: {
    p: { k: '#1b1424', r: '#ff3355', l: '#ffb3c0' },
    m: [
      '.kk.kk.',
      'krrkrrk',
      'krlrrrk',
      '.krrrk.',
      '..krk..',
      '...k...'
    ]
  }
};
```

## Palette Swapping (Color Recoloring)
To recolor a sprite without redrawing or duplicating the matrix, pass a palette override object:

```javascript
const BLUE_HEART_PALETTE = {
  id: 'blue_heart',
  r: '#3b7ae8',
  l: '#8fb8ff'
};

// Returns a canvas with blue tones instead of red
const blueHeartCanvas = spr('heart', BLUE_HEART_PALETTE);
```

## Animation Frames
For animated sprites, define sequential matrices:
- `coin0`, `coin1`, `coin2`, `coin3`
- Loop via: `const frame = Math.floor(time * fps) % frameCount;`
- Retrieve via: `spr('coin' + frame)`
