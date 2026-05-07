'use client';

import React from 'react';

export interface ElevationLayerSettings {
  waterThreshold: number;
  snowThreshold: number;
  lowLayerHeightMm: number;
  midLayerHeightMm: number;
  highLayerHeightMm: number;
}

interface ElevationLayersProps {
  value: ElevationLayerSettings;
  onChange: (next: ElevationLayerSettings) => void;
  disabled?: boolean;
}

export default function ElevationLayers({ value, onChange, disabled = false }: ElevationLayersProps) {
  const setValue = <K extends keyof ElevationLayerSettings>(key: K, val: number) => {
    const next = { ...value, [key]: val };

    // Keep thresholds ordered so water < snow.
    if (key === 'waterThreshold' && next.waterThreshold >= next.snowThreshold) {
      next.snowThreshold = Math.min(0.95, next.waterThreshold + 0.05);
    }
    if (key === 'snowThreshold' && next.snowThreshold <= next.waterThreshold) {
      next.waterThreshold = Math.max(0.05, next.snowThreshold - 0.05);
    }

    onChange(next);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-1">Elevation Colors (AMS)</h2>
      <p className="text-sm text-gray-600 mb-4">
        Low elevations print blue, mid elevations green, high elevations white.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Water/Blue Threshold: {(value.waterThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="5"
            max="85"
            step="1"
            value={Math.round(value.waterThreshold * 100)}
            onChange={(e) => setValue('waterThreshold', Number(e.target.value) / 100)}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Snow/White Threshold: {(value.snowThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="15"
            max="95"
            step="1"
            value={Math.round(value.snowThreshold * 100)}
            onChange={(e) => setValue('snowThreshold', Number(e.target.value) / 100)}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Blue mm</label>
            <input
              type="number"
              min="0.5"
              max="20"
              step="0.5"
              value={value.lowLayerHeightMm}
              onChange={(e) => setValue('lowLayerHeightMm', Number(e.target.value))}
              disabled={disabled}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Green mm</label>
            <input
              type="number"
              min="1"
              max="30"
              step="0.5"
              value={value.midLayerHeightMm}
              onChange={(e) => setValue('midLayerHeightMm', Number(e.target.value))}
              disabled={disabled}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">White mm</label>
            <input
              type="number"
              min="1"
              max="40"
              step="0.5"
              value={value.highLayerHeightMm}
              onChange={(e) => setValue('highLayerHeightMm', Number(e.target.value))}
              disabled={disabled}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          <span>Blue</span>
          <span className="inline-block w-3 h-3 rounded-full bg-green-500 ml-3" />
          <span>Green</span>
          <span className="inline-block w-3 h-3 rounded-full bg-gray-100 border border-gray-300 ml-3" />
          <span>White</span>
        </div>
      </div>
    </div>
  );
}
