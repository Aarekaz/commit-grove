// Seasonal color system — dramatic palette shifts through the year
// Each season is a completely different mood, not a subtle tint

type RGB = [number, number, number];

type SeasonPalette = {
  // Sky gradient (top → bottom of background)
  skyTop: RGB;
  skyBottom: RGB;
  // Terrain
  land: RGB;
  shoreline: RGB;
  water: RGB;
  // Trees
  trunk: RGB;
  canopy: RGB[];     // by contribution level 0-3
  canopyDark: RGB[];  // darker canopy layers
};

// ═══════════════════════════════════════════════════
// WINTER — Monochrome. Still. Frozen silence.
// ═══════════════════════════════════════════════════
const WINTER: SeasonPalette = {
  skyTop: [0.85, 0.88, 0.92],
  skyBottom: [0.92, 0.93, 0.95],
  land: [0.82, 0.85, 0.88],       // snow-covered ground
  shoreline: [0.75, 0.80, 0.85],  // icy edge
  water: [0.48, 0.58, 0.68],      // dark frozen steel
  trunk: [0.28, 0.24, 0.22],      // bare dark wood
  canopy: [
    [0.62, 0.68, 0.74],  // frost-dusted gray-blue
    [0.55, 0.62, 0.70],
    [0.48, 0.56, 0.66],
    [0.40, 0.50, 0.62],
  ],
  canopyDark: [
    [0.52, 0.58, 0.65],
    [0.45, 0.52, 0.62],
    [0.38, 0.46, 0.58],
    [0.32, 0.42, 0.55],
  ],
};

// ═══════════════════════════════════════════════════
// SPRING — Cherry blossoms on fresh green. Rebirth.
// ═══════════════════════════════════════════════════
const SPRING: SeasonPalette = {
  skyTop: [0.72, 0.82, 0.94],
  skyBottom: [0.88, 0.92, 0.96],
  land: [0.52, 0.72, 0.42],       // fresh lime green
  shoreline: [0.60, 0.75, 0.50],  // bright grassy edge
  water: [0.30, 0.62, 0.75],      // clear turquoise
  trunk: [0.42, 0.32, 0.24],      // warm brown awakening
  canopy: [
    [0.92, 0.62, 0.72],  // soft cherry blossom
    [0.88, 0.52, 0.64],  // deeper pink
    [0.82, 0.42, 0.56],  // rich sakura
    [0.76, 0.35, 0.50],  // deep magenta-pink
  ],
  canopyDark: [
    [0.85, 0.55, 0.65],
    [0.80, 0.46, 0.58],
    [0.74, 0.38, 0.50],
    [0.68, 0.30, 0.44],
  ],
};

// ═══════════════════════════════════════════════════
// SUMMER — Deep, rich, lush. Peak of life.
// ═══════════════════════════════════════════════════
const SUMMER: SeasonPalette = {
  skyTop: [0.55, 0.72, 0.90],
  skyBottom: [0.82, 0.88, 0.94],
  land: [0.30, 0.48, 0.25],       // deep rich earth-green
  shoreline: [0.42, 0.58, 0.35],  // mossy edge
  water: [0.18, 0.42, 0.62],      // deep warm azure
  trunk: [0.30, 0.22, 0.14],      // dark chocolate brown
  canopy: [
    [0.28, 0.65, 0.22],  // vibrant emerald
    [0.20, 0.58, 0.18],  // rich forest green
    [0.15, 0.50, 0.14],  // deep green
    [0.10, 0.42, 0.10],  // darkest canopy
  ],
  canopyDark: [
    [0.22, 0.55, 0.18],
    [0.16, 0.48, 0.14],
    [0.12, 0.42, 0.10],
    [0.08, 0.35, 0.08],
  ],
};

// ═══════════════════════════════════════════════════
// AUTUMN — Amber, crimson, golden. Beautiful decay.
// ═══════════════════════════════════════════════════
const AUTUMN: SeasonPalette = {
  skyTop: [0.70, 0.65, 0.58],
  skyBottom: [0.88, 0.84, 0.78],
  land: [0.55, 0.42, 0.28],       // golden-brown earth
  shoreline: [0.60, 0.50, 0.35],  // sandy warm edge
  water: [0.25, 0.35, 0.48],      // dark steely blue
  trunk: [0.32, 0.22, 0.14],      // dark weathered wood
  canopy: [
    [0.88, 0.62, 0.18],  // bright golden amber
    [0.85, 0.45, 0.12],  // burnt orange
    [0.78, 0.28, 0.10],  // deep crimson-red
    [0.68, 0.18, 0.08],  // dark blood red
  ],
  canopyDark: [
    [0.80, 0.55, 0.14],
    [0.76, 0.38, 0.10],
    [0.68, 0.24, 0.08],
    [0.58, 0.15, 0.06],
  ],
};

// Keyframes — longer transitions for more dramatic blending
const SEASON_KEYS: { week: number; palette: SeasonPalette }[] = [
  { week: 0, palette: WINTER },
  { week: 6, palette: WINTER },    // deep winter
  { week: 10, palette: SPRING },   // spring arrives
  { week: 18, palette: SPRING },   // full spring
  { week: 22, palette: SUMMER },   // summer begins
  { week: 34, palette: SUMMER },   // long summer
  { week: 38, palette: AUTUMN },   // autumn hits
  { week: 46, palette: AUTUMN },   // deep autumn
  { week: 50, palette: WINTER },   // winter returns
  { week: 52, palette: WINTER },
];

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function lerpPalette(a: SeasonPalette, b: SeasonPalette, t: number): SeasonPalette {
  return {
    skyTop: lerpRGB(a.skyTop, b.skyTop, t),
    skyBottom: lerpRGB(a.skyBottom, b.skyBottom, t),
    land: lerpRGB(a.land, b.land, t),
    shoreline: lerpRGB(a.shoreline, b.shoreline, t),
    water: lerpRGB(a.water, b.water, t),
    trunk: lerpRGB(a.trunk, b.trunk, t),
    canopy: a.canopy.map((c, i) => lerpRGB(c, b.canopy[i], t)) as [RGB, RGB, RGB, RGB],
    canopyDark: a.canopyDark.map((c, i) => lerpRGB(c, b.canopyDark[i], t)) as [RGB, RGB, RGB, RGB],
  };
}

export type { SeasonPalette };

export function getSeasonPalette(week: number): SeasonPalette {
  const w = Math.max(0, Math.min(52, week));

  let fromIdx = 0;
  for (let i = SEASON_KEYS.length - 1; i >= 0; i--) {
    if (w >= SEASON_KEYS[i].week) {
      fromIdx = i;
      break;
    }
  }

  const toIdx = Math.min(fromIdx + 1, SEASON_KEYS.length - 1);
  const from = SEASON_KEYS[fromIdx];
  const to = SEASON_KEYS[toIdx];

  if (from.week === to.week) return from.palette;

  const t = (w - from.week) / (to.week - from.week);
  return lerpPalette(from.palette, to.palette, t);
}

// ═══════════════════════════════════════════════════
// CITY SEASONS
// ═══════════════════════════════════════════════════

type CitySeason = {
  skyTop: RGB;
  skyBottom: RGB;
  body: RGB[];
  glass: RGB[];
  parkGreen: RGB[];
  road: RGB;
  pavement: RGB;
  water: RGB;
};

const CITY_WINTER: CitySeason = {
  skyTop: [0.85, 0.88, 0.92],
  skyBottom: [0.92, 0.93, 0.95],
  body: [[0.68, 0.72, 0.78], [0.58, 0.62, 0.70], [0.48, 0.54, 0.64], [0.40, 0.46, 0.58], [0.32, 0.40, 0.52]],
  glass: [[0.75, 0.80, 0.88], [0.65, 0.72, 0.82], [0.55, 0.64, 0.76], [0.48, 0.58, 0.72], [0.40, 0.52, 0.66]],
  parkGreen: [[0.72, 0.76, 0.78], [0.65, 0.70, 0.72], [0.58, 0.64, 0.66], [0.52, 0.58, 0.60], [0.46, 0.52, 0.55]],
  road: [0.85, 0.87, 0.90],
  pavement: [0.65, 0.68, 0.72],
  water: [0.48, 0.58, 0.68],
};

const CITY_SPRING: CitySeason = {
  skyTop: [0.72, 0.82, 0.94],
  skyBottom: [0.88, 0.92, 0.96],
  body: [[0.78, 0.72, 0.68], [0.70, 0.64, 0.58], [0.62, 0.56, 0.50], [0.55, 0.48, 0.42], [0.48, 0.42, 0.36]],
  glass: [[0.82, 0.78, 0.75], [0.74, 0.70, 0.66], [0.66, 0.62, 0.58], [0.58, 0.54, 0.50], [0.52, 0.48, 0.44]],
  parkGreen: [[0.55, 0.78, 0.45], [0.45, 0.72, 0.35], [0.35, 0.65, 0.28], [0.28, 0.58, 0.22], [0.22, 0.50, 0.18]],
  road: [0.84, 0.82, 0.80],
  pavement: [0.62, 0.58, 0.55],
  water: [0.30, 0.62, 0.75],
};

const CITY_SUMMER: CitySeason = {
  skyTop: [0.55, 0.72, 0.90],
  skyBottom: [0.82, 0.88, 0.94],
  body: [[0.48, 0.65, 0.45], [0.38, 0.58, 0.36], [0.28, 0.50, 0.28], [0.22, 0.42, 0.22], [0.16, 0.35, 0.16]],
  glass: [[0.55, 0.72, 0.52], [0.45, 0.65, 0.44], [0.35, 0.58, 0.36], [0.28, 0.50, 0.28], [0.22, 0.44, 0.22]],
  parkGreen: [[0.28, 0.65, 0.22], [0.20, 0.58, 0.18], [0.15, 0.50, 0.14], [0.10, 0.42, 0.10], [0.08, 0.35, 0.08]],
  road: [0.78, 0.78, 0.76],
  pavement: [0.52, 0.52, 0.50],
  water: [0.18, 0.42, 0.62],
};

const CITY_AUTUMN: CitySeason = {
  skyTop: [0.70, 0.65, 0.58],
  skyBottom: [0.88, 0.84, 0.78],
  body: [[0.72, 0.58, 0.42], [0.65, 0.50, 0.34], [0.58, 0.42, 0.26], [0.50, 0.35, 0.20], [0.44, 0.28, 0.16]],
  glass: [[0.78, 0.65, 0.48], [0.72, 0.58, 0.40], [0.65, 0.50, 0.32], [0.58, 0.42, 0.26], [0.52, 0.36, 0.20]],
  parkGreen: [[0.82, 0.58, 0.22], [0.78, 0.45, 0.15], [0.72, 0.32, 0.10], [0.65, 0.24, 0.08], [0.58, 0.18, 0.06]],
  road: [0.80, 0.76, 0.72],
  pavement: [0.58, 0.54, 0.48],
  water: [0.25, 0.35, 0.48],
};

const CITY_SEASON_KEYS: { week: number; palette: CitySeason }[] = [
  { week: 0, palette: CITY_WINTER },
  { week: 6, palette: CITY_WINTER },
  { week: 10, palette: CITY_SPRING },
  { week: 18, palette: CITY_SPRING },
  { week: 22, palette: CITY_SUMMER },
  { week: 34, palette: CITY_SUMMER },
  { week: 38, palette: CITY_AUTUMN },
  { week: 46, palette: CITY_AUTUMN },
  { week: 50, palette: CITY_WINTER },
  { week: 52, palette: CITY_WINTER },
];

function lerpCitySeason(a: CitySeason, b: CitySeason, t: number): CitySeason {
  return {
    skyTop: lerpRGB(a.skyTop, b.skyTop, t),
    skyBottom: lerpRGB(a.skyBottom, b.skyBottom, t),
    body: a.body.map((c, i) => lerpRGB(c as RGB, b.body[i] as RGB, t)) as RGB[],
    glass: a.glass.map((c, i) => lerpRGB(c as RGB, b.glass[i] as RGB, t)) as RGB[],
    parkGreen: a.parkGreen.map((c, i) => lerpRGB(c as RGB, b.parkGreen[i] as RGB, t)) as RGB[],
    road: lerpRGB(a.road, b.road, t),
    pavement: lerpRGB(a.pavement, b.pavement, t),
    water: lerpRGB(a.water, b.water, t),
  };
}

export function getCitySeasonPalette(week: number): CitySeason {
  const w = Math.max(0, Math.min(52, week));
  let fromIdx = 0;
  for (let i = CITY_SEASON_KEYS.length - 1; i >= 0; i--) {
    if (w >= CITY_SEASON_KEYS[i].week) {
      fromIdx = i;
      break;
    }
  }
  const toIdx = Math.min(fromIdx + 1, CITY_SEASON_KEYS.length - 1);
  const from = CITY_SEASON_KEYS[fromIdx];
  const to = CITY_SEASON_KEYS[toIdx];
  if (from.week === to.week) return from.palette;
  const t = (w - from.week) / (to.week - from.week);
  return lerpCitySeason(from.palette, to.palette, t);
}
