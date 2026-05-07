import { NextRequest, NextResponse } from 'next/server';

interface LayerSettings {
  waterThreshold: number;
  snowThreshold: number;
  lowLayerHeightMm: number;
  midLayerHeightMm: number;
  highLayerHeightMm: number;
}

interface GenerateBody {
  latitude: number;
  longitude: number;
  size: number;
  shape: 'square' | 'circle';
  layers?: Partial<LayerSettings>;
}

const DEFAULT_LAYERS: LayerSettings = {
  waterThreshold: 0.35,
  snowThreshold: 0.78,
  lowLayerHeightMm: 2,
  midLayerHeightMm: 7,
  highLayerHeightMm: 12,
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBody;
    const { latitude, longitude, size, shape } = body;
    const layers = sanitizeLayerSettings(body.layers);
    const stl = createLayeredTerrainSTL(layers);

    return new NextResponse(stl, {
      headers: {
        'Content-Type': 'model/stl',
        'Content-Disposition': `attachment; filename="map-${latitude}-${longitude}.stl"`,
        'X-Map-Shape': shape,
        'X-Map-Size-Meters': String(size),
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate model' }, { status: 500 });
  }
}

function sanitizeLayerSettings(input?: Partial<LayerSettings>): LayerSettings {
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function createLayeredTerrainSTL(layers: LayerSettings): ArrayBuffer {
  const n = 64;
  const verticesTop: number[][] = [];
  const verticesBottom: number[][] = [];

  const topZ = (x: number, y: number): number => {
    // Procedural terrain placeholder until wired to DEM pipeline.
    const ridge = Math.sin(x * 2.4) * Math.cos(y * 2.1);
    const slope = (x + y) * 0.25;
    const bowl = -0.18 * (x * x + y * y);
    const normalized = clamp((ridge * 0.55 + slope + bowl + 1) / 2, 0, 1);

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

      // Top surface
      triangles.push([a, b, c], [b, d, c]);

      // Bottom surface (reversed winding)
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

function writeBinarySTL(vertices: number[][], faces: number[][], headerText: string): ArrayBuffer {

  const buffer = new ArrayBuffer(84 + faces.length * 50);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write header (80 bytes)
  const header = headerText;
  for (let i = 0; i < Math.min(header.length, 80); i++) {
    bytes[i] = header.charCodeAt(i);
  }

  // Write number of triangles
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
      const v = vertices[face[i]];
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
