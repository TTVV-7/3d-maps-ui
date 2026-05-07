'use client';

import L, { LatLngTuple } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

interface LeafletMapPickerProps {
  center: LatLngTuple;
  pin: LatLngTuple | null;
  onPick: (coords: LatLngTuple) => void;
}

const pinIcon = L.divIcon({
  className: 'custom-pin',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0f766e;border:3px solid #e6fffb;box-shadow:0 8px 18px rgba(15,118,110,0.45)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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

export default function LeafletMapPicker({ center, pin, onPick }: LeafletMapPickerProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-teal-200/60">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="h-64 w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />
        <ClickCapture onPick={onPick} />
        {pin && <Marker position={pin} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
