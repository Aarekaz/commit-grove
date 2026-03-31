// Seasonal color system — blends terrain, tree, and water colors
// based on the current week position in the year (0-52)

type RGB = [number, number, number];

type SeasonPalette = {
  land: RGB;
  shoreline: RGB;
  water: RGB;
  trunk: RGB;
  canopy: RGB[];     // by contribution level 1-4
  canopyDark: RGB[];  // darker canopy layers
};

const WINTER: SeasonPalette = {
  land: [0.78, 0.82, 0.86],       // pale blue-gray snow
  shoreline: [0.72, 0.76, 0.80],  // icy edge
  water: [0.55, 0.68, 0.78],      // cold pale blue
  trunk: [0.35, 0.30, 0.28],      // dark bare wood
  canopy: [
    [0.65, 0.72, 0.76],  // frost white-blue
    [0.58, 0.66, 0.72],
    [0.50, 0.58, 0.66],
    [0.42, 0.50, 0.60],
  ],
  canopyDark: [
    [0.55, 0.62, 0.68],
    [0.48, 0.56, 0.64],
    [0.42, 0.50, 0.58],
    [0.36, 0.44, 0.54],
  ],
};

const SPRING: SeasonPalette = {
  land: [0.50, 0.68, 0.40],       // fresh light green
  shoreline: [0.58, 0.72, 0.48],  // bright edge
  water: [0.35, 0.58, 0.72],      // clear blue
  trunk: [0.38, 0.30, 0.22],      // warm brown
  canopy: [
    [0.85, 0.65, 0.72],  // cherry blossom pink
    [0.80, 0.55, 0.65],
    [0.72, 0.48, 0.58],
    [0.65, 0.40, 0.52],
  ],
  canopyDark: [
    [0.78, 0.58, 0.65],
    [0.72, 0.50, 0.58],
    [0.65, 0.42, 0.52],
    [0.58, 0.35, 0.46],
  ],
};

const SUMMER: SeasonPalette = {
  land: [0.35, 0.54, 0.29],       // rich green
  shoreline: [0.54, 0.67, 0.42],  // warm green edge
  water: [0.29, 0.54, 0.69],      // warm blue
  trunk: [0.32, 0.25, 0.18],      // deep brown
  canopy: [
    [0.45, 0.72, 0.38],  // vibrant green
    [0.30, 0.62, 0.28],
    [0.22, 0.54, 0.22],
    [0.16, 0.46, 0.18],
  ],
  canopyDark: [
    [0.38, 0.62, 0.32],
    [0.25, 0.54, 0.24],
    [0.18, 0.46, 0.18],
    [0.12, 0.38, 0.14],
  ],
};

const AUTUMN: SeasonPalette = {
  land: [0.58, 0.48, 0.32],       // warm brown earth
  shoreline: [0.62, 0.54, 0.38],  // sandy edge
  water: [0.32, 0.48, 0.58],      // cool gray-blue
  trunk: [0.36, 0.28, 0.20],      // dark brown
  canopy: [
    [0.82, 0.58, 0.25],  // golden orange
    [0.78, 0.42, 0.18],  // burnt orange
    [0.72, 0.32, 0.15],  // deep red-orange
    [0.65, 0.25, 0.12],  // dark crimson
  ],
  canopyDark: [
    [0.75, 0.50, 0.20],
    [0.70, 0.36, 0.15],
    [0.62, 0.28, 0.12],
    [0.55, 0.22, 0.10],
  ],
};

// Season keyframes at week positions
const SEASON_KEYS: { week: number; palette: SeasonPalette }[] = [
  { week: 0, palette: WINTER },    // Jan 1
  { week: 8, palette: WINTER },    // late Feb
  { week: 12, palette: SPRING },   // mid Mar
  { week: 20, palette: SPRING },   // mid May
  { week: 24, palette: SUMMER },   // mid Jun
  { week: 36, palette: SUMMER },   // early Sep
  { week: 40, palette: AUTUMN },   // early Oct
  { week: 48, palette: AUTUMN },   // late Nov
  { week: 52, palette: WINTER },   // Dec 31
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
    land: lerpRGB(a.land, b.land, t),
    shoreline: lerpRGB(a.shoreline, b.shoreline, t),
    water: lerpRGB(a.water, b.water, t),
    trunk: lerpRGB(a.trunk, b.trunk, t),
    canopy: a.canopy.map((c, i) => lerpRGB(c, b.canopy[i], t)) as [RGB, RGB, RGB, RGB],
    canopyDark: a.canopyDark.map((c, i) => lerpRGB(c, b.canopyDark[i], t)) as [RGB, RGB, RGB, RGB],
  };
}

export function getSeasonPalette(week: number): SeasonPalette {
  const w = Math.max(0, Math.min(52, week));

  // Find the two keyframes we're between
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

// City seasonal colors
type CitySeason = {
  body: RGB[];
  glass: RGB[];
  parkGreen: RGB[];
  road: RGB;
  pavement: RGB;
  water: RGB;
};

const CITY_SUMMER: CitySeason = {
  body: [[0.55, 0.72, 0.52], [0.40, 0.62, 0.38], [0.30, 0.54, 0.30], [0.22, 0.46, 0.24], [0.16, 0.38, 0.18]],
  glass: [[0.65, 0.80, 0.62], [0.50, 0.72, 0.50], [0.38, 0.64, 0.40], [0.30, 0.56, 0.32], [0.22, 0.48, 0.25]],
  parkGreen: [[0.55, 0.78, 0.45], [0.40, 0.70, 0.35], [0.30, 0.62, 0.28], [0.22, 0.55, 0.22], [0.18, 0.48, 0.18]],
  road: [0.82, 0.82, 0.84],
  pavement: [0.53, 0.53, 0.56],
  water: [0.29, 0.54, 0.69],
};

const CITY_WINTER: CitySeason = {
  body: [[0.60, 0.63, 0.68], [0.50, 0.54, 0.60], [0.42, 0.46, 0.54], [0.35, 0.40, 0.50], [0.28, 0.34, 0.45]],
  glass: [[0.68, 0.74, 0.82], [0.55, 0.64, 0.76], [0.45, 0.55, 0.70], [0.38, 0.48, 0.64], [0.30, 0.42, 0.58]],
  parkGreen: [[0.65, 0.70, 0.72], [0.58, 0.64, 0.66], [0.52, 0.58, 0.60], [0.46, 0.52, 0.54], [0.40, 0.46, 0.48]],
  road: [0.80, 0.82, 0.86],
  pavement: [0.58, 0.60, 0.65],
  water: [0.55, 0.68, 0.78],
};

const CITY_AUTUMN: CitySeason = {
  body: [[0.62, 0.55, 0.45], [0.55, 0.46, 0.35], [0.48, 0.38, 0.28], [0.42, 0.32, 0.22], [0.36, 0.26, 0.18]],
  glass: [[0.72, 0.62, 0.48], [0.65, 0.54, 0.40], [0.58, 0.46, 0.34], [0.52, 0.40, 0.28], [0.46, 0.34, 0.22]],
  parkGreen: [[0.75, 0.60, 0.35], [0.68, 0.48, 0.25], [0.62, 0.38, 0.18], [0.55, 0.30, 0.14], [0.48, 0.25, 0.12]],
  road: [0.78, 0.76, 0.72],
  pavement: [0.55, 0.52, 0.48],
  water: [0.32, 0.48, 0.58],
};

const CITY_SEASON_KEYS: { week: number; palette: CitySeason }[] = [
  { week: 0, palette: CITY_WINTER },
  { week: 8, palette: CITY_WINTER },
  { week: 12, palette: CITY_SUMMER },
  { week: 24, palette: CITY_SUMMER },
  { week: 36, palette: CITY_SUMMER },
  { week: 40, palette: CITY_AUTUMN },
  { week: 48, palette: CITY_AUTUMN },
  { week: 52, palette: CITY_WINTER },
];

function lerpCitySeason(a: CitySeason, b: CitySeason, t: number): CitySeason {
  return {
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
