export interface LayerSettings {
  waterThreshold: number;
  snowThreshold: number;
  lowLayerHeightMm: number;
  midLayerHeightMm: number;
  highLayerHeightMm: number;
}

export interface GenerateBody {
  latitude: number;
  longitude: number;
  size: number;
  shape: 'square' | 'circle';
  layers?: Partial<LayerSettings>;
}

export const DEFAULT_LAYERS: LayerSettings = {
  waterThreshold: 0.35,
  snowThreshold: 0.78,
  lowLayerHeightMm: 2,
  midLayerHeightMm: 7,
  highLayerHeightMm: 12,
};

const METERS_PER_LAT_DEGREE = 111320;

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function sanitizeLayerSettings(input?: Partial<LayerSettings>): LayerSettings {
  const merged: LayerSettings = {
    ...DEFAULT_LAYERS,
    ...input,
  };

  const waterThreshold = clamp(merged.waterThreshold, 0.05, 0.9);
  const snowThreshold = clamp(Math.max(merged.snowThreshold, waterThreshold + 0.05), 0.1, 0.98);

  return {
    waterThreshold,
    snowThreshold,
    lowLayerHeightMm: clamp(merged.lowLayerHeightMm, 0.5, 20),
    midLayerHeightMm: clamp(merged.midLayerHeightMm, 1, 30),
    highLayerHeightMm: clamp(merged.highLayerHeightMm, 1.5, 50),
  };
}

function normalizedTerrain(x: number, y: number): number {
  const ridge = Math.sin(x * 2.4) * Math.cos(y * 2.1);
  const slope = (x + y) * 0.25;
  const bowl = -0.18 * (x * x + y * y);
  return clamp((ridge * 0.55 + slope + bowl + 1) / 2, 0, 1);
}

function metersToLatDegrees(meters: number): number {
  return meters / METERS_PER_LAT_DEGREE;
}

function metersToLonDegrees(meters: number, latitude: number): number {
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const safeCos = Math.max(0.15, Math.abs(cosLat));
  return meters / (METERS_PER_LAT_DEGREE * safeCos);
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

interface SamplePoint {
  lat: number;
  lon: number;
}

async function fetchSrtmElevations(points: SamplePoint[]): Promise<number[]> {
  const batches = chunk(points, 95);
  const elevations: number[] = [];

  for (const batch of batches) {
    const locations = batch
      .map((point) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`)
      .join('|');

    const url = `https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(locations)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`DEM request failed (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data.results)) {
      throw new Error('DEM response missing results array');
    }

    for (const result of data.results) {
      const elevation = typeof result.elevation === 'number' ? result.elevation : NaN;
      elevations.push(elevation);
    }
  }

  return elevations;
}

function fillMissingElevations(values: number[]): number[] {
  const valid = values.filter((value) => Number.isFinite(value));
  const fallback = valid.length > 0 ? valid[0] : 0;
  return values.map((value) => (Number.isFinite(value) ? value : fallback));
}

export async function createRealTerrainSTL(
  centerLat: number,
  centerLon: number,
  sizeMeters: number,
  layers: LayerSettings
): Promise<ArrayBuffer> {
  const grid = 32;
  const halfMeters = sizeMeters / 2;
  const halfLatDeg = metersToLatDegrees(halfMeters);
  const halfLonDeg = metersToLonDegrees(halfMeters, centerLat);

  const points: SamplePoint[] = [];
  for (let row = 0; row < grid; row++) {
    const tRow = row / (grid - 1);
    const lat = centerLat + halfLatDeg - tRow * 2 * halfLatDeg;
    for (let col = 0; col < grid; col++) {
      const tCol = col / (grid - 1);
      const lon = centerLon - halfLonDeg + tCol * 2 * halfLonDeg;
      points.push({ lat, lon });
    }
  }

  const rawElevations = await fetchSrtmElevations(points);
  const elevations = fillMissingElevations(rawElevations);

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const rangeElevation = Math.max(1, maxElevation - minElevation);

  const printWidthMm = 160;
  const baseThicknessMm = 2;
  const reliefMm = clamp(rangeElevation / 25, 6, Math.max(12, layers.highLayerHeightMm * 2));
  const printDepthMm = printWidthMm;

  const verticesTop: number[][] = [];
  const verticesBottom: number[][] = [];

  for (let row = 0; row < grid; row++) {
    const y = (row / (grid - 1)) * printDepthMm - printDepthMm / 2;
    for (let col = 0; col < grid; col++) {
      const x = (col / (grid - 1)) * printWidthMm - printWidthMm / 2;
      const elevation = elevations[row * grid + col] as number;
      const normalized = (elevation - minElevation) / rangeElevation;
      const z = baseThicknessMm + normalized * reliefMm;

      verticesTop.push([x, y, z]);
      verticesBottom.push([x, y, 0]);
    }
  }

  const triangles: number[][] = [];
  const idx = (i: number, j: number) => j * grid + i;
  const bottomOffset = verticesTop.length;

  for (let j = 0; j < grid - 1; j++) {
    for (let i = 0; i < grid - 1; i++) {
      const a = idx(i, j);
      const b = idx(i + 1, j);
      const c = idx(i, j + 1);
      const d = idx(i + 1, j + 1);

      triangles.push([a, b, c], [b, d, c]);
      triangles.push(
        [bottomOffset + a, bottomOffset + c, bottomOffset + b],
        [bottomOffset + b, bottomOffset + c, bottomOffset + d]
      );
    }
  }

  for (let i = 0; i < grid - 1; i++) {
    const t0 = idx(i, 0);
    const t1 = idx(i + 1, 0);
    const b0 = bottomOffset + t0;
    const b1 = bottomOffset + t1;
    triangles.push([t0, b0, t1], [t1, b0, b1]);
  }

  for (let i = 0; i < grid - 1; i++) {
    const t0 = idx(i, grid - 1);
    const t1 = idx(i + 1, grid - 1);
    const b0 = bottomOffset + t0;
    const b1 = bottomOffset + t1;
    triangles.push([t1, b0, t0], [b1, b0, t1]);
  }

  for (let j = 0; j < grid - 1; j++) {
    const t0 = idx(0, j);
    const t1 = idx(0, j + 1);
    const b0 = bottomOffset + t0;
    const b1 = bottomOffset + t1;
    triangles.push([t1, b0, t0], [b1, b0, t1]);
  }

  for (let j = 0; j < grid - 1; j++) {
    const t0 = idx(grid - 1, j);
    const t1 = idx(grid - 1, j + 1);
    const b0 = bottomOffset + t0;
    const b1 = bottomOffset + t1;
    triangles.push([t0, b0, t1], [t1, b0, b1]);
  }

  const vertices = [...verticesTop, ...verticesBottom];
  return writeBinarySTL(vertices, triangles, 'Real DEM terrain STL');
}

export function createLayeredTerrainSTL(layers: LayerSettings): ArrayBuffer {
  const n = 64;
  const verticesTop: number[][] = [];
  const verticesBottom: number[][] = [];

  const topZ = (x: number, y: number): number => {
    const normalized = normalizedTerrain(x, y);

    if (normalized <= layers.waterThreshold) return layers.lowLayerHeightMm;
    if (normalized <= layers.snowThreshold) return layers.midLayerHeightMm;
    return layers.highLayerHeightMm;
  };

  for (let j = 0; j < n; j++) {
    const y = (j / (n - 1)) * 2 - 1;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const sx = x * 60;
      const sy = y * 60;
      const z = topZ(x, y);
      verticesTop.push([sx, sy, z]);
      verticesBottom.push([sx, sy, 0]);
    }
  }

  const triangles: number[][] = [];
  const idx = (i: number, j: number) => j * n + i;
  const bOffset = verticesTop.length;

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = idx(i, j);
      const b = idx(i + 1, j);
      const c = idx(i, j + 1);
      const d = idx(i + 1, j + 1);

      triangles.push([a, b, c], [b, d, c]);
      triangles.push([bOffset + a, bOffset + c, bOffset + b], [bOffset + b, bOffset + c, bOffset + d]);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const t0 = idx(i, 0);
    const t1 = idx(i + 1, 0);
    const b0 = bOffset + t0;
    const b1 = bOffset + t1;
    triangles.push([t0, b0, t1], [t1, b0, b1]);
  }

  for (let i = 0; i < n - 1; i++) {
    const t0 = idx(i, n - 1);
    const t1 = idx(i + 1, n - 1);
    const b0 = bOffset + t0;
    const b1 = bOffset + t1;
    triangles.push([t1, b0, t0], [b1, b0, t1]);
  }

  for (let j = 0; j < n - 1; j++) {
    const t0 = idx(0, j);
    const t1 = idx(0, j + 1);
    const b0 = bOffset + t0;
    const b1 = bOffset + t1;
    triangles.push([t1, b0, t0], [b1, b0, t1]);
  }

  for (let j = 0; j < n - 1; j++) {
    const t0 = idx(n - 1, j);
    const t1 = idx(n - 1, j + 1);
    const b0 = bOffset + t0;
    const b1 = bOffset + t1;
    triangles.push([t0, b0, t1], [t1, b0, b1]);
  }

  const vertices = [...verticesTop, ...verticesBottom];
  return writeBinarySTL(vertices, triangles, 'Layered elevation terrain STL');
}

function addCuboid(vertices: number[][], faces: number[][], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void {
  const base = vertices.length;
  vertices.push(
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1]
  );

  faces.push(
    [base + 4, base + 5, base + 6], [base + 4, base + 6, base + 7],
    [base + 0, base + 2, base + 1], [base + 0, base + 3, base + 2],
    [base + 0, base + 4, base + 7], [base + 0, base + 7, base + 3],
    [base + 1, base + 2, base + 6], [base + 1, base + 6, base + 5],
    [base + 0, base + 1, base + 5], [base + 0, base + 5, base + 4],
    [base + 3, base + 7, base + 6], [base + 3, base + 6, base + 2]
  );
}

export function createBandTerrainSTL(layers: LayerSettings, band: 'low' | 'mid' | 'high'): ArrayBuffer {
  const n = 48;
  const min = -60;
  const max = 60;
  const step = (max - min) / n;
  const vertices: number[][] = [];
  const faces: number[][] = [];

  const belongs = (v: number): boolean => {
    if (band === 'low') return v <= layers.waterThreshold;
    if (band === 'mid') return v > layers.waterThreshold && v <= layers.snowThreshold;
    return v > layers.snowThreshold;
  };

  const height = band === 'low' ? layers.lowLayerHeightMm : band === 'mid' ? layers.midLayerHeightMm : layers.highLayerHeightMm;

  for (let j = 0; j < n; j++) {
    const y0 = min + j * step;
    const y1 = y0 + step;
    const y = ((y0 + y1) / 2) / 60;

    for (let i = 0; i < n; i++) {
      const x0 = min + i * step;
      const x1 = x0 + step;
      const x = ((x0 + x1) / 2) / 60;
      const value = normalizedTerrain(x, y);
      if (!belongs(value)) continue;
      addCuboid(vertices, faces, x0, x1, y0, y1, 0, height);
    }
  }

  return writeBinarySTL(vertices, faces, `AMS ${band} band terrain`);
}

export function writeBinarySTL(vertices: number[][], faces: number[][], headerText: string): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + faces.length * 50);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < Math.min(headerText.length, 80); i++) {
    bytes[i] = headerText.charCodeAt(i);
  }

  view.setUint32(80, faces.length, true);

  let offset = 84;
  for (const face of faces) {
    const v0 = vertices[face[0]] as number[];
    const v1 = vertices[face[1]] as number[];
    const v2 = vertices[face[2]] as number[];

    const nx = (v1[1] - v0[1]) * (v2[2] - v0[2]) - (v1[2] - v0[2]) * (v2[1] - v0[1]);
    const ny = (v1[2] - v0[2]) * (v2[0] - v0[0]) - (v1[0] - v0[0]) * (v2[2] - v0[2]);
    const nz = (v1[0] - v0[0]) * (v2[1] - v0[1]) - (v1[1] - v0[1]) * (v2[0] - v0[0]);

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    for (let i = 0; i < 3; i++) {
      const v = vertices[face[i]] as number[];
      view.setFloat32(offset, v[0], true); offset += 4;
      view.setFloat32(offset, v[1], true); offset += 4;
      view.setFloat32(offset, v[2], true); offset += 4;
    }

    bytes[offset] = 0;
    bytes[offset + 1] = 0;
    offset += 2;
  }

  return buffer;
}
