# Embedded 3x5 Bitmap Font Specification

## Glyph Representation
Each glyph is stored as a 15-bit string (`0` or `1`), corresponding to a 3-column by 5-row pixel grid:

```text
Bit indices:
0  1  2     Row 0
3  4  5     Row 1
6  7  8     Row 2
9  10 11    Row 3
12 13 14    Row 4
```

Example: Letter 'A'
```text
0 1 0   -> Row 0: .#.
1 0 1   -> Row 1: #.#
1 1 1   -> Row 2: ###
1 0 1   -> Row 3: #.#
1 0 1   -> Row 4: #.#
Bit string: "010101111101101"
```

## Complete Glyph Dictionary
```javascript
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010',
  '-': '000000111000000', '/': '001001010100100', '+': '000010111010000'
};
```

## Alignment and Drop Shadow
- Each character width is `3 * scale`, with `1 * scale` gap between characters.
- Width calculation: `textWidth = string.length * 4 * scale - scale`.
- Left, Center, and Right alignment are achieved by offsetting `x`:
  - Left: `drawX = x`
  - Center: `drawX = x - Math.floor(textWidth / 2)`
  - Right: `drawX = x - textWidth`
- Drop shadow: Render the glyph first at `(drawX + scale, drawY + scale)` with shadow color before rendering foreground.
