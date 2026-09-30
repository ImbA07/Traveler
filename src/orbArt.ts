// Geometry for the Traveler sphere (viewBox 0 0 300 300, sphere centre 150/150, radius 100).
// Flat, hand-drawn look: pale sphere, dark ruined skyline along the lower rim.

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export const ORB = { cx: 150, cy: 150, r: 100 };

// dark ruins along the rim (tall scar on the right, broken spires at the bottom, scar on the left)
export const RUIN_PATHS: string[] = [
  // right scar climbing the edge
  'M 236 150 L 241 158 L 233 177 L 240 192 L 229 206 L 234 221 L 221 237 L 200 252 L 196 236 L 212 214 L 216 196 L 224 176 L 230 160 Z',
  // central skyline of towers and broken walls
  'M 88 262 L 90 238 L 96 234 L 98 226 L 102 232 L 110 230 L 112 240 L 120 237 L 122 229 L 128 231 L 130 242 L 140 237 L 142 222 L 146 235 L 154 232 L 156 216 L 160 203 L 163 217 L 165 233 L 173 230 L 175 211 L 180 198 L 184 184 L 186 199 L 188 214 L 192 227 L 200 232 L 206 228 L 210 241 L 222 248 L 224 262 Z',
  // left scar
  'M 58 186 L 65 177 L 69 196 L 78 205 L 76 215 L 88 224 L 93 236 L 104 238 L 110 252 L 60 262 Z',
  // dark rim floor along the very bottom
  'M 52 226 L 66 236 L 74 232 L 84 244 L 100 240 L 116 250 L 134 244 L 152 252 L 172 244 L 190 252 L 208 242 L 224 246 L 240 232 L 252 226 L 252 270 L 52 270 Z',
  // thin spires
  'M 74 200 L 75.5 186 L 77 201 Z',
  'M 176 212 L 177.5 170 L 179 211 Z',
  'M 236 176 L 238 152 L 240 178 Z',
  'M 120 236 L 121.5 216 L 123 236 Z',
];

// fine scratches on the surface
export const SCRATCHES: string[] = [
  'M 82 128 Q 118 108 176 116',
  'M 68 160 Q 112 172 158 150',
  'M 196 98 Q 226 118 232 146',
  'M 104 82 Q 146 70 190 84',
  'M 120 190 Q 150 178 186 186',
  'M 88 210 L 96 200',
  'M 206 176 L 214 166',
];

export function speckles(): { x: number; y: number; w: number; h: number; rot: number }[] {
  const r = rng(11);
  const out: { x: number; y: number; w: number; h: number; rot: number }[] = [];
  while (out.length < 46) {
    const x = 55 + r() * 190;
    const y = 55 + r() * 170;
    const dx = x - ORB.cx;
    const dy = y - ORB.cy;
    if (dx * dx + dy * dy > 92 * 92) continue;
    out.push({ x, y, w: 0.8 + r() * 2.6, h: 0.7 + r() * 1.4, rot: r() * 180 });
  }
  return out;
}

export function dust(): { x: number; y: number; r: number; o: number }[] {
  const r = rng(29);
  return Array.from({ length: 34 }, () => {
    const a = -0.9 + r() * 1.6; // upper right
    const d = 100 + r() * 42;
    return {
      x: ORB.cx + Math.cos(a) * d,
      y: ORB.cy - Math.sin(a) * d * 0.9 - 6,
      r: 0.5 + r() * 1.2,
      o: 0.15 + r() * 0.5,
    };
  });
}

// thin star-map ring: 12-point star polygon inside two circles (like the intro art)
export function ringLines(): { x1: number; y1: number; x2: number; y2: number }[] {
  const R = 120;
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: ORB.cx + Math.cos(a) * R, y: ORB.cy + Math.sin(a) * R };
  });
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < 12; i++) {
    for (const k of [5]) {
      const j = (i + k) % 12;
      out.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y });
    }
    // spokes toward the sphere
    out.push({
      x1: pts[i].x,
      y1: pts[i].y,
      x2: ORB.cx + (pts[i].x - ORB.cx) * 0.86,
      y2: ORB.cy + (pts[i].y - ORB.cy) * 0.86,
    });
  }
  return out;
}
export const RING_POINTS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: ORB.cx + Math.cos(a) * 120, y: ORB.cy + Math.sin(a) * 120 };
});
