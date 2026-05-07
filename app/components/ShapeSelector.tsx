'use client';

import React from 'react';

interface ShapeSelectorProps {
  selectedShape: 'square' | 'circle';
  onShapeChange: (shape: 'square' | 'circle') => void;
  disabled: boolean;
}

export default function ShapeSelector({ selectedShape, onShapeChange, disabled }: ShapeSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4">Map Shape</h2>
      <div className="space-y-3">
        <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors" 
               style={{borderColor: selectedShape === 'square' ? '#3b82f6' : '#d1d5db'}}>
          <input
            type="radio"
            name="shape"
            value="square"
            checked={selectedShape === 'square'}
            onChange={() => onShapeChange('square')}
            disabled={disabled}
            className="w-4 h-4 mr-3"
          />
          <div>
            <p className="font-semibold">Square</p>
            <p className="text-sm text-gray-600">Rectangular bounding box</p>
          </div>
        </label>

        <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors opacity-50"
               style={{borderColor: '#d1d5db'}}>
          <input
            type="radio"
            name="shape"
            value="circle"
            disabled
            className="w-4 h-4 mr-3"
          />
          <div>
            <p className="font-semibold">Circle</p>
            <p className="text-sm text-gray-600">Coming soon</p>
          </div>
        </label>
      </div>
    </div>
  );
}
