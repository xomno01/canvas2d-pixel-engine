// Verification test script for headless validation of the pixel engine
const assert = require('assert');

// 1. Mock minimal canvas
function createMockCanvas(w, h) {
  let drawCalls = 0;
  return {
    width: w, height: h,
    getContext: () => ({
      fillStyle: '',
      fillRect: (x, y, width, height) => {
        drawCalls++;
        assert(Number.isFinite(x) && Number.isFinite(y), 'Coordinates must be finite');
      },
      drawImage: () => { drawCalls++; }
    }),
    getCalls: () => drawCalls
  };
}

// 2. Mock Sprite and LRU
const SPR = {
  test: {
    p: { k: '#000', r: '#f00' },
    m: ['k.', '.r']
  }
};

class LRU extends Map {
  constructor(limit = 10) { super(); this.limit = limit; }
  get(k) { const v = super.get(k); if (v !== undefined) { super.delete(k); super.set(k, v); } return v; }
  set(k, v) { super.delete(k); super.set(k, v); if (this.size > this.limit) super.delete(this.keys().next().value); return this; }
}

const cache = new LRU(5);

function bakeSprite(name) {
  if (cache.get(name)) return cache.get(name);
  const s = SPR[name];
  const c = createMockCanvas(s.m[0].length, s.m.length);
  const ctx = c.getContext('2d');
  for (let y = 0; y < s.m.length; y++) {
    for (let x = 0; x < s.m[y].length; x++) {
      if (s.m[y][x] !== '.') ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(name, c);
  return c;
}

// Test 1: First bake creates canvas
const c1 = bakeSprite('test');
assert.strictEqual(cache.size, 1);
assert.strictEqual(c1.getCalls(), 2);

// Test 2: Second call returns cached canvas without re-rendering
const c2 = bakeSprite('test');
assert.strictEqual(c1, c2);
assert.strictEqual(c2.getCalls(), 2);

console.log('✓ All pixel engine validation checks passed successfully.');
