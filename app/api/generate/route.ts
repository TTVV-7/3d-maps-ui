import { NextRequest, NextResponse } from 'next/server';
import { createRealTerrainSTL, GenerateBody, sanitizeLayerSettings } from '@/lib/terrain';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
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
        const upstreamMode = upstream.headers.get('x-generator-mode') || 'python-backend';
        return new NextResponse(stl, {
          headers: {
            'Content-Type': upstream.headers.get('content-type') || 'model/stl',
            'Content-Disposition': `attachment; filename="map-${latitude}-${longitude}.stl"`,
            'X-Generator-Mode': upstreamMode,
            'X-Debug-Trace-Id': traceId,
          },
        });
      }
    }

    const terrain = await createRealTerrainSTL(latitude, longitude, size, layers);
    const { stl, debug } = terrain;
    console.info(
      `[generate][${traceId}] source=${debug.source} grid=${debug.gridSize} samples=${debug.sampleCount} range=${debug.elevationRange.toFixed(
        2
      )}m time=${debug.durationMs}ms`
    );

    return new NextResponse(stl, {
      headers: {
        'Content-Type': 'model/stl',
        'Content-Disposition': `attachment; filename="map-${latitude}-${longitude}.stl"`,
        'X-Map-Shape': shape,
        'X-Map-Size-Meters': String(size),
        'X-Generator-Mode': 'real-dem',
        'X-Debug-Trace-Id': traceId,
        'X-Debug-Dem-Source': debug.source,
        'X-Debug-Grid-Size': String(debug.gridSize),
        'X-Debug-Sample-Count': String(debug.sampleCount),
        'X-Debug-Elevation-Min': debug.minElevation.toFixed(2),
        'X-Debug-Elevation-Max': debug.maxElevation.toFixed(2),
        'X-Debug-Elevation-Range': debug.elevationRange.toFixed(2),
        'X-Debug-Duration-Ms': String(debug.durationMs),
        'X-Debug-Upstream-Errors': debug.upstreamErrors.join(' || '),
      },
    });
  } catch (error) {
    console.error(`[generate][${traceId}] Generation error:`, error);
    return NextResponse.json(
      {
        error: 'Failed to generate model from real elevation data. Please try a smaller area or try again shortly.',
        traceId,
        details: String(error),
      },
      { status: 502 }
    );
  }
}
