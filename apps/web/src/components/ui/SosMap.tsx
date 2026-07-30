import { BRGY_BOUNDARY, BRGY_CENTER, BRGY_MAX_BOUNDS } from '@brgy/shared';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  labelText: string;
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:30px;line-height:30px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">📍</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

// Geometry lives in @brgy/shared — the API enforces the same polygon on SOS sends.
const boundary = BRGY_BOUNDARY.map(([lat, lng]) => [lat, lng] as [number, number]);
const maxBounds = L.latLngBounds(
  [BRGY_MAX_BOUNDS[0][0], BRGY_MAX_BOUNDS[0][1]],
  [BRGY_MAX_BOUNDS[1][0], BRGY_MAX_BOUNDS[1][1]],
);

/** Plain-Leaflet OSM embed, locked to Barangay 591 coverage; re-renders pins on change. */
export function SosMap({ pins, height = 320 }: { pins: MapPin[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      maxBounds, // can't pan outside the barangay
      maxBoundsViscosity: 1.0,
      minZoom: 16, // can't zoom out past the coverage area
      maxZoom: 19,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.setView([BRGY_CENTER[0], BRGY_CENTER[1]], 17);
    L.polygon(boundary, {
      color: '#1E3A5F',
      weight: 2.5,
      dashArray: '8 6',
      fillColor: '#1E3A5F',
      fillOpacity: 0.05,
    })
      .bindTooltip('Barangay 591 coverage — Zone 58, District VI', { sticky: true })
      .addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    pins.forEach((p) => {
      L.marker([p.lat, p.lng], { icon: pinIcon }).bindPopup(p.labelText).addTo(layer);
    });
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 17);
    else if (pins.length > 1) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
  }, [pins]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E3E8F0', zIndex: 0 }}
    />
  );
}
