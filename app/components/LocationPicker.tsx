'use client';

import React, { useState } from 'react';

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

export default function LocationPicker({ onLocationSelect, isLoading }: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [size, setSize] = useState(5000); // 5km default
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    try {
      // Use Nominatim API (open-source geocoding)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (data.length === 0) {
        setError('Address not found');
        return;
      }

      const location = data[0];
      onLocationSelect({
        address: location.display_name,
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        size,
      });
    } catch (err) {
      setError('Failed to geocode address');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4">Location</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., Grand Forks, British Columbia"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
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
          <div className="text-xs text-gray-500 mt-1">1 km - 50 km</div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Map'}
        </button>
      </form>
    </div>
  );
}
