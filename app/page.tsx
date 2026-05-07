'use client';

import React, { useState } from 'react';
import LocationPicker, { LocationData } from './components/LocationPicker';
import ShapeSelector from './components/ShapeSelector';
import ModelViewer from './components/ModelViewer';
import ElevationLayers, { ElevationLayerSettings } from './components/ElevationLayers';

interface GenerationDebugInfo {
  traceId?: string;
  mode?: string;
  demSource?: string;
  gridSize?: string;
  sampleCount?: string;
  elevationRange?: string;
  durationMs?: string;
  upstreamErrors?: string;
  error?: string;
  details?: string;
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedShape, setSelectedShape] = useState<'square' | 'circle'>('square');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPackingAms, setIsPackingAms] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [generationDebug, setGenerationDebug] = useState<GenerationDebugInfo | null>(null);
  const [layerSettings, setLayerSettings] = useState<ElevationLayerSettings>({
    waterThreshold: 0.35,
    snowThreshold: 0.78,
    lowLayerHeightMm: 2,
    midLayerHeightMm: 7,
    highLayerHeightMm: 12,
  });

  const handleLocationSelect = async (location: LocationData) => {
    setSelectedLocation(location);
    setIsLoading(true);
    setModelUrl(null);
    setDownloadUrl(null);
    setGenerationDebug(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          size: location.size,
          shape: selectedShape,
          layers: layerSettings,
        }),
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        setGenerationDebug({
          traceId: failure.traceId,
          error: failure.error || 'Generation failed',
          details: failure.details,
        });
        throw new Error(failure.error || 'Failed to generate model');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setModelUrl(url);
      setDownloadUrl(url);
      setGenerationDebug({
        traceId: response.headers.get('x-debug-trace-id') || undefined,
        mode: response.headers.get('x-generator-mode') || undefined,
        demSource: response.headers.get('x-debug-dem-source') || undefined,
        gridSize: response.headers.get('x-debug-grid-size') || undefined,
        sampleCount: response.headers.get('x-debug-sample-count') || undefined,
        elevationRange: response.headers.get('x-debug-elevation-range') || undefined,
        durationMs: response.headers.get('x-debug-duration-ms') || undefined,
        upstreamErrors: response.headers.get('x-debug-upstream-errors') || undefined,
      });
    } catch (error) {
      console.error('Error generating model:', error);
      alert('Failed to generate model. Check debug panel for trace ID/details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl && selectedLocation) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `3d-map-ams-${selectedLocation.latitude.toFixed(2)}-${selectedLocation.longitude.toFixed(2)}.stl`;
      link.click();
    }
  };

  const handleDownloadMultipart = async () => {
    if (!selectedLocation) return;

    setIsPackingAms(true);
    try {
      const response = await fetch('/api/generate-multipart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          size: selectedLocation.size,
          shape: selectedShape,
          layers: layerSettings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AMS multipart package');
      }

      const zipBlob = await response.blob();
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `3d-map-ams-parts-${selectedLocation.latitude.toFixed(2)}-${selectedLocation.longitude.toFixed(2)}.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error generating AMS package:', error);
      alert('Failed to generate AMS multipart package');
    } finally {
      setIsPackingAms(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#ccfbf1_0,#ecfeff_35%,#f1f5f9_70%)] py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="inline-flex items-center rounded-full bg-teal-100 text-teal-800 text-xs font-semibold tracking-wide px-3 py-1 mb-4">
            TERRAIN WORKBENCH
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">3D Terrain Studio</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pick an address or pin any point on the map, then generate printable terrain with AMS elevation bands.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <LocationPicker onLocationSelect={handleLocationSelect} isLoading={isLoading} />
            <ShapeSelector
              selectedShape={selectedShape}
              onShapeChange={setSelectedShape}
              disabled={isLoading}
            />
            <ElevationLayers
              value={layerSettings}
              onChange={setLayerSettings}
              disabled={isLoading}
            />

            {selectedLocation && (
              <div className="rounded-2xl border border-white/40 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(2,132,199,0.45)] p-6">
                <h3 className="text-lg font-semibold mb-3 text-slate-900">Selected Location</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-700">
                    <span className="font-semibold">Address:</span> {selectedLocation.address.split(',')[0]}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Latitude:</span> {selectedLocation.latitude.toFixed(4)}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Longitude:</span> {selectedLocation.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {downloadUrl && (
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Download STL File
                </button>
                <button
                  onClick={handleDownloadMultipart}
                  disabled={isPackingAms || isLoading}
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  {isPackingAms ? 'Packaging AMS ZIP...' : 'Download AMS Multipart ZIP'}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - 3D Viewer */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/40 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-24px_rgba(15,118,110,0.45)] p-6">
              <h2 className="text-2xl font-semibold mb-4 text-slate-900">3D Preview</h2>
              <ModelViewer modelUrl={modelUrl} />
              {isLoading && (
                <div className="mt-4 text-center">
                  <p className="text-slate-600">Generating 3D model... This may take a minute.</p>
                  <div className="mt-2 flex justify-center">
                    <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 rounded-2xl border border-white/40 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(15,118,110,0.28)] p-6">
          <h3 className="text-xl font-semibold mb-3 text-slate-900">How It Works</h3>
          <ul className="space-y-2 text-slate-700">
            <li>✓ Enter a location (address or coordinates)</li>
            <li>✓ Or pin a location directly on the map</li>
            <li>✓ Choose the map size and shape</li>
            <li>✓ Set blue/green/white elevation thresholds for AMS</li>
            <li>✓ Click "Generate Map" to create a 3D model</li>
            <li>✓ Preview the model in the 3D viewer</li>
            <li>✓ Download the STL file for 3D printing</li>
          </ul>
        </div>

        {generationDebug && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Generation Debug</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
              <p><span className="font-semibold">Trace ID:</span> {generationDebug.traceId || '-'}</p>
              <p><span className="font-semibold">Mode:</span> {generationDebug.mode || '-'}</p>
              <p><span className="font-semibold">DEM Source:</span> {generationDebug.demSource || '-'}</p>
              <p><span className="font-semibold">Grid Size:</span> {generationDebug.gridSize || '-'}</p>
              <p><span className="font-semibold">Samples:</span> {generationDebug.sampleCount || '-'}</p>
              <p><span className="font-semibold">Elevation Range:</span> {generationDebug.elevationRange || '-'}</p>
              <p><span className="font-semibold">Duration (ms):</span> {generationDebug.durationMs || '-'}</p>
            </div>
            {generationDebug.error && (
              <p className="mt-3 text-red-700 text-sm"><span className="font-semibold">Error:</span> {generationDebug.error}</p>
            )}
            {generationDebug.details && (
              <p className="mt-1 text-red-600 text-xs break-words">{generationDebug.details}</p>
            )}
            {generationDebug.upstreamErrors && generationDebug.upstreamErrors !== '' && (
              <p className="mt-3 text-amber-700 text-xs break-words">
                <span className="font-semibold">Upstream Notes:</span> {generationDebug.upstreamErrors}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
