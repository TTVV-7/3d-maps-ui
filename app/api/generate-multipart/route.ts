import { zipSync } from 'fflate';
import { NextRequest, NextResponse } from 'next/server';
import { createBandTerrainSTL, GenerateBody, sanitizeLayerSettings } from '@/lib/terrain';

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBody;
    const { latitude, longitude, size, shape } = body;
    const layers = sanitizeLayerSettings(body.layers);

    const backendUrl = process.env.PY_BACKEND_URL;
    if (backendUrl) {
      const upstream = await fetch(`${backendUrl.replace(/\/$/, '')}/generate-multipart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude, size, shape, layers }),
      });

      if (upstream.ok) {
        const zipBuffer = await upstream.arrayBuffer();
        return new NextResponse(zipBuffer, {
          headers: {
            'Content-Type': upstream.headers.get('content-type') || 'application/zip',
            'Content-Disposition': `attachment; filename="map-ams-parts-${latitude}-${longitude}.zip"`,
            'X-Generator-Mode': 'python-backend',
          },
        });
      }
    }

    const low = new Uint8Array(createBandTerrainSTL(layers, 'low'));
    const mid = new Uint8Array(createBandTerrainSTL(layers, 'mid'));
    const high = new Uint8Array(createBandTerrainSTL(layers, 'high'));

    const zip = zipSync(
      {
        'blue-low.stl': low,
        'green-mid.stl': mid,
        'white-high.stl': high,
      },
      { level: 6 }
    );

    return new NextResponse(asArrayBuffer(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="map-ams-parts-${latitude}-${longitude}.zip"`,
        'X-Generator-Mode': 'local-fallback',
      },
    });
  } catch (error) {
    console.error('Multipart generation error:', error);
    return NextResponse.json({ error: 'Failed to generate AMS multipart package' }, { status: 500 });
  }
}
