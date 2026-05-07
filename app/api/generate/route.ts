import { NextRequest, NextResponse } from 'next/server';
import { createLayeredTerrainSTL, GenerateBody, sanitizeLayerSettings } from '@/lib/terrain';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBody;
    const { latitude, longitude, size, shape } = body;
    const layers = sanitizeLayerSettings(body.layers);
    const backendUrl = process.env.PY_BACKEND_URL;

    if (backendUrl) {
      const upstream = await fetch(`${backendUrl.replace(/\/$/, '')}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude, size, shape, layers }),
      });

      if (upstream.ok) {
        const stl = await upstream.arrayBuffer();
        return new NextResponse(stl, {
          headers: {
            'Content-Type': upstream.headers.get('content-type') || 'model/stl',
            'Content-Disposition': `attachment; filename="map-${latitude}-${longitude}.stl"`,
            'X-Generator-Mode': 'python-backend',
          },
        });
      }
    }

    const stl = createLayeredTerrainSTL(layers);

    return new NextResponse(stl, {
      headers: {
        'Content-Type': 'model/stl',
        'Content-Disposition': `attachment; filename="map-${latitude}-${longitude}.stl"`,
        'X-Map-Shape': shape,
        'X-Map-Size-Meters': String(size),
        'X-Generator-Mode': 'local-fallback',
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate model' }, { status: 500 });
  }
}
