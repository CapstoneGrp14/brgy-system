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

export interface HeatPoint {
  lat: number;
  lng: number;
}

// Concentric falloff for one hotspot, as a fraction of its radius. Drawing these
// once per *cluster* (not per incident) keeps the glow round and even — stacking
// them per incident produced lumpy blobs with hard overlap edges.
const HEAT_RINGS: Array<{ scale: number; opacity: number }> = [
  { scale: 1, opacity: 0.1 },
  { scale: 0.66, opacity: 0.12 },
  { scale: 0.36, opacity: 0.16 },
];

const CLUSTER_RADIUS_M = 35;
const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LNG = 107_700; // at ~14.6°N

/** Merge nearby incidents into one hotspot so the map shows spots, not lumps. */
function clusterHeat(points: HeatPoint[]) {
  const acc: Array<{ lat: number; lng: number; count: number; sumLat: number; sumLng: number }> = [];
  points.forEach((p) => {
    const hit = acc.find((c) => {
      const dy = (p.lat - c.lat) * M_PER_DEG_LAT;
      const dx = (p.lng - c.lng) * M_PER_DEG_LNG;
      return Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_M;
    });
    if (!hit) {
      acc.push({ lat: p.lat, lng: p.lng, count: 1, sumLat: p.lat, sumLng: p.lng });
      return;
    }
    hit.count += 1;
    hit.sumLat += p.lat;
    hit.sumLng += p.lng;
    hit.lat = hit.sumLat / hit.count;
    hit.lng = hit.sumLng / hit.count;
  });
  return acc;
}

// Minimalist marker — a fixed red dot with one thin ring expanding from its
// centre. An outline reads clean over the hotspot glow; a filled halo muddied it.
const pinIcon = L.divIcon({
  className: '',
  html:
    '<div style="position:relative;width:34px;height:34px">' +
    '<div class="sos-pin-ring" style="position:absolute;inset:0;border-radius:50%;border:1.5px solid #D64541"></div>' +
    '<div style="position:absolute;top:12px;left:12px;width:10px;height:10px;border-radius:50%;background:#D64541;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>' +
    '</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Geometry lives in @brgy/shared — the API enforces the same polygon on SOS sends.
const boundary = BRGY_BOUNDARY.map(([lat, lng]) => [lat, lng] as [number, number]);
const maxBounds = L.latLngBounds(
  [BRGY_MAX_BOUNDS[0][0], BRGY_MAX_BOUNDS[0][1]],
  [BRGY_MAX_BOUNDS[1][0], BRGY_MAX_BOUNDS[1][1]],
);

/** Plain-Leaflet OSM embed, locked to Barangay 591 coverage; re-renders pins on change. */
export function SosMap({ pins, heat = [], height = 320 }: { pins: MapPin[]; heat?: HeatPoint[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.LayerGroup | null>(null);

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
    heatRef.current = L.layerGroup().addTo(map); // added first → stays beneath the pins
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      heatRef.current = null;
    };
  }, []);

  // Hotspot heat layer — a static glow only. Nearby past incidents accumulate
  // into a hotspot; the pulse belongs to the live pins, not to history.
  useEffect(() => {
    const layer = heatRef.current;
    if (!layer) return;
    layer.clearLayers();
    clusterHeat(heat).forEach((c) => {
      // Busier spots read hotter: radius grows with the incident count.
      const radius = 15 + Math.min(c.count, 8) * 2.5;
      HEAT_RINGS.forEach((ring) => {
        L.circle([c.lat, c.lng], {
          radius: radius * ring.scale,
          stroke: false,
          fillColor: '#D64541',
          fillOpacity: ring.opacity,
          interactive: false,
        }).addTo(layer);
      });
    });
  }, [heat]);

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
