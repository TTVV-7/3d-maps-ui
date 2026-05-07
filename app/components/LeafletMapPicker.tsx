'use client';

import L, { LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet';

interface LeafletMapPickerProps {
  center: LatLngTuple;
  sizeMeters: number;
  onCenterChange: (coords: LatLngTuple) => void;
  onSizeChange: (sizeMeters: number) => void;
}

const centerIcon = L.divIcon({
  className: 'custom-pin',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0f766e;border:3px solid #e6fffb;box-shadow:0 8px 18px rgba(15,118,110,0.45)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const cornerIcon = L.divIcon({
  className: 'custom-pin',
  html: '<div style="width:14px;height:14px;border-radius:3px;background:#0ea5e9;border:2px solid #f0f9ff;box-shadow:0 6px 14px rgba(14,165,233,0.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const METERS_PER_LAT_DEGREE = 111320;

function latMetersToDegrees(meters: number): number {
  return meters / METERS_PER_LAT_DEGREE;
}

function lonMetersToDegrees(meters: number, latitude: number): number {
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const safeCos = Math.max(0.15, Math.abs(cosLat));
  return meters / (METERS_PER_LAT_DEGREE * safeCos);
}

function latDegreesToMeters(degrees: number): number {
  return Math.abs(degrees) * METERS_PER_LAT_DEGREE;
}

function lonDegreesToMeters(degrees: number, latitude: number): number {
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const safeCos = Math.max(0.15, Math.abs(cosLat));
  return Math.abs(degrees) * METERS_PER_LAT_DEGREE * safeCos;
}

function getBounds(center: LatLngTuple, sizeMeters: number): [[number, number], [number, number]] {
  const half = sizeMeters / 2;
  const latDeg = latMetersToDegrees(half);
  const lonDeg = lonMetersToDegrees(half, center[0]);

  return [
    [center[0] - latDeg, center[1] - lonDeg],
    [center[0] + latDeg, center[1] + lonDeg],
  ];
}

function getCorner(center: LatLngTuple, sizeMeters: number): LatLngTuple {
  const half = sizeMeters / 2;
  return [
    center[0] + latMetersToDegrees(half),
    center[1] + lonMetersToDegrees(half, center[0]),
  ];
}

function RecenterMap({ center }: { center: LatLngTuple }) {
  const map = useMap();
  map.setView(center, map.getZoom(), { animate: true });
  return null;
}

function ClickCapture({ onPick }: { onPick: (coords: LatLngTuple) => void }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export default function LeafletMapPicker({
  center,
  sizeMeters,
  onCenterChange,
  onSizeChange,
}: LeafletMapPickerProps) {
  const corner = getCorner(center, sizeMeters);
  const bounds = getBounds(center, sizeMeters);

  const onCornerDragged = (nextCorner: LatLngTuple) => {
    const latHalfMeters = latDegreesToMeters(nextCorner[0] - center[0]);
    const lonHalfMeters = lonDegreesToMeters(nextCorner[1] - center[1], center[0]);
    const halfMeters = Math.max(300, Math.max(latHalfMeters, lonHalfMeters));
    onSizeChange(Math.min(50000, Math.round(halfMeters * 2)));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-teal-200/60">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="h-64 w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />
        <ClickCapture onPick={onCenterChange} />
        <Rectangle pathOptions={{ color: '#0ea5e9', weight: 2, fillOpacity: 0.08 }} bounds={bounds} />
        <Marker
          position={center}
          icon={centerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const pos = marker.getLatLng();
              onCenterChange([pos.lat, pos.lng]);
            },
          }}
        />
        <Marker
          position={corner}
          icon={cornerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const pos = marker.getLatLng();
              onCornerDragged([pos.lat, pos.lng]);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
