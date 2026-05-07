'use client';

import React, { useState } from 'react';
import LocationPicker, { LocationData } from './components/LocationPicker';
import ShapeSelector from './components/ShapeSelector';
import ModelViewer from './components/ModelViewer';
import ElevationLayers, { ElevationLayerSettings } from './components/ElevationLayers';

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedShape, setSelectedShape] = useState<'square' | 'circle'>('square');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPackingAms, setIsPackingAms] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
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
        throw new Error('Failed to generate model');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setModelUrl(url);
      setDownloadUrl(url);
    } catch (error) {
      console.error('Error generating model:', error);
      alert('Failed to generate model');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">3D Map Generator</h1>
          <p className="text-lg text-gray-600">Create 3D printable topographic maps of any location</p>
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold mb-3">Selected Location</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-semibold">Address:</span> {selectedLocation.address.split(',')[0]}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Latitude:</span> {selectedLocation.latitude.toFixed(4)}
                  </p>
                  <p className="text-gray-600">
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">3D Preview</h2>
              <ModelViewer modelUrl={modelUrl} />
              {isLoading && (
                <div className="mt-4 text-center">
                  <p className="text-gray-500">Generating 3D model... This may take a minute.</p>
                  <div className="mt-2 flex justify-center">
                    <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-3">How It Works</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Enter a location (address or coordinates)</li>
            <li>✓ Choose the map size and shape</li>
            <li>✓ Set blue/green/white elevation thresholds for AMS</li>
            <li>✓ Click "Generate Map" to create a 3D model</li>
            <li>✓ Preview the model in the 3D viewer</li>
            <li>✓ Download the STL file for 3D printing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
