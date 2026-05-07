'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { LatLngTuple } from 'leaflet';

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  isLoading: boolean;
}

export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  size: number; // size in meters (radius from center)
}

const LeafletMapPicker = dynamic(() => import('./LeafletMapPicker'), {
  ssr: false,
});

export default function LocationPicker({ onLocationSelect, isLoading }: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [size, setSize] = useState(5000); // 5km default
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([49.03, -118.44]);
  const [pinnedLocation, setPinnedLocation] = useState<LatLngTuple | null>(null);

  const geocodeAddress = async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    return response.json();
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  };

  const handleSearchAddress = async () => {
    setError('');
    if (!address.trim()) {
      setError('Please enter an address to search');
      return;
    }

    try {
      const data = await geocodeAddress(address);

      if (data.length === 0) {
        setError('Address not found');
        return;
      }

      const location = data[0];
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);
      setMapCenter([lat, lon]);
      setPinnedLocation([lat, lon]);
      setAddress(location.display_name);
    } catch (err) {
      setError('Failed to search address');
      console.error(err);
    }
  };

  const handleMapPick = async (coords: LatLngTuple) => {
    setError('');
    setPinnedLocation(coords);
    setMapCenter(coords);

    try {
      const resolvedAddress = await reverseGeocode(coords[0], coords[1]);
      setAddress(resolvedAddress);
    } catch (err) {
      console.error(err);
      setAddress(`${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address.trim() && !pinnedLocation) {
      setError('Enter an address or pin a location on the map');
      return;
    }

    try {
      let selectedAddress = address;
      let latitude = pinnedLocation?.[0];
      let longitude = pinnedLocation?.[1];

      if (latitude === undefined || longitude === undefined) {
        const data = await geocodeAddress(address);
        if (data.length === 0) {
          setError('Address not found');
          return;
        }
        const location = data[0];
        latitude = parseFloat(location.lat);
        longitude = parseFloat(location.lon);
        selectedAddress = location.display_name;
      }

      onLocationSelect({
        address: selectedAddress,
        latitude,
        longitude,
        size,
      });
    } catch (err) {
      setError('Failed to resolve location');
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(13,148,136,0.45)] p-6 w-full max-w-md">
      <h2 className="text-2xl font-semibold mb-1 text-slate-900">Pick Location</h2>
      <p className="text-sm text-slate-600 mb-4">Search by address or click directly on the map.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-800">Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main St or Grand Forks"
              className="w-full px-4 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium disabled:bg-gray-400"
            >
              Find
            </button>
          </div>
        </div>

        <LeafletMapPicker center={mapCenter} pin={pinnedLocation} onPick={handleMapPick} />

        {pinnedLocation && (
          <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-xs text-teal-900">
            Pinned: {pinnedLocation[0].toFixed(5)}, {pinnedLocation[1].toFixed(5)}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-800">
            Map Size: {(size / 1000).toFixed(1)} km
          </label>
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-full"
            disabled={isLoading}
          />
          <div className="text-xs text-slate-500 mt-1">1 km - 50 km square area</div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Map'}
        </button>
      </form>
    </div>
  );
}
