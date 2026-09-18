import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plus, Minus, Layers as LayersIcon } from 'lucide-react';

interface MapProps {
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  height?: string;
  activeLayers?: Record<string, boolean>;
  selectedTarget?: string;
  selectedLocationPin?: { lat: number; lng: number } | null;
  onMarkerClick?: (targetId: string) => void;
  onMapClick?: (lat: number, lng: number, prospectivity: number) => void;
  onHover?: (lat: number, lng: number, prospectivity: number) => void;
}

const TARGET_COORDINATES: Record<string, [number, number]> = {
  'Target-1': [80.72, 21.84],
  'Target-3': [79.82, 21.91],
  'Target-2': [79.92, 21.68],
  'Target-4': [80.31, 21.62],
  'Target-5': [80.12, 21.78],
};

export function calculateProspectivity(lat: number, lng: number): number {
  const centers = [
    { lat: 21.84, lng: 80.72, score: 0.92 },
    { lat: 21.91, lng: 79.82, score: 0.87 },
    { lat: 21.68, lng: 79.92, score: 0.76 },
    { lat: 21.62, lng: 80.31, score: 0.69 },
    { lat: 21.78, lng: 80.12, score: 0.58 },
  ];
  let maxScore = 0.22;
  for (const c of centers) {
    const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2));
    if (dist < 0.20) {
      const contrib = c.score * Math.max(0, 1 - dist / 0.20);
      if (contrib > maxScore) maxScore = contrib;
    }
  }
  return Number(Math.min(0.96, Math.max(0.12, maxScore)).toFixed(2));
}

export const Map: React.FC<MapProps> = ({
  initialCenter = [80.18, 21.83], // Balaghat, MP
  initialZoom = 9.8,
  height = '100%',
  activeLayers = {
    sentinel2: true,
    dem: true,
    geology: true,
    occurrences: true,
    lineaments: false,
    cem: true,
    prospectivity: true,
  },
  selectedTarget = 'Target-1',
  selectedLocationPin = null,
  onMarkerClick,
  onMapClick,
  onHover,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const onHoverRef = useRef(onHover);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onHoverRef.current = onHover;
    onMapClickRef.current = onMapClick;
  }, [onHover, onMapClick]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // High-Resolution ESRI World Satellite Imagery Style
    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // 1. AOI Boundary Polygon (White/Dashed Line)
      map.current.addSource('aoi-boundary', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Balaghat AOI Boundary' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [79.62, 21.60],
                  [79.75, 21.95],
                  [80.15, 22.02],
                  [80.78, 21.92],
                  [80.75, 21.75],
                  [80.40, 21.58],
                  [79.90, 21.58],
                  [79.62, 21.60]
                ]]
              }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'aoi-boundary-line',
        type: 'line',
        source: 'aoi-boundary',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 2.5,
          'line-dasharray': [4, 2]
        }
      });

      // 2. Manganese Belt Line
      map.current.addSource('mn-belt-line', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Manganese Belt Line' },
              geometry: {
                type: 'LineString',
                coordinates: [[79.65, 21.63], [80.15, 21.83], [80.72, 21.87]]
              }
            }
          ]
        }
      });
      map.current.addLayer({
        id: 'mn-belt-line-layer',
        type: 'line',
        source: 'mn-belt-line',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 2,
          'line-dasharray': [3, 2]
        }
      });

      // 3. CEM Spectral Anomaly Layer
      map.current.addSource('cem-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { cem_score: 0.88, name: 'CEM Anomaly Hotspot' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[80.68, 21.81], [80.76, 21.81], [80.76, 21.87], [80.68, 21.87], [80.68, 21.81]]]
              }
            },
            {
              type: 'Feature',
              properties: { cem_score: 0.74, name: 'CEM Anomaly Target 3' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[79.78, 21.88], [79.86, 21.88], [79.86, 21.94], [79.78, 21.94], [79.78, 21.88]]]
              }
            }
          ]
        }
      });
      map.current.addLayer({
        id: 'cem-fill',
        type: 'fill',
        source: 'cem-source',
        paint: {
          'fill-color': '#06B6D4',
          'fill-opacity': 0.45
        }
      });

      // 4. AI Prospectivity Heatmap Raster Polygons
      map.current.addSource('prospectivity-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { prospectivity: 0.92, name: 'Target 1 (Very High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[80.65, 21.80], [80.78, 21.80], [80.78, 21.88], [80.65, 21.88], [80.65, 21.80]]]
              }
            },
            {
              type: 'Feature',
              properties: { prospectivity: 0.87, name: 'Target 3 (Very High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[79.76, 21.87], [79.88, 21.87], [79.88, 21.95], [79.76, 21.95], [79.76, 21.87]]]
              }
            },
            {
              type: 'Feature',
              properties: { prospectivity: 0.76, name: 'Target 2 (High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[79.86, 21.64], [79.98, 21.64], [79.98, 21.72], [79.86, 21.72], [79.86, 21.64]]]
              }
            },
            {
              type: 'Feature',
              properties: { prospectivity: 0.69, name: 'Target 4 (Medium)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[80.25, 21.58], [80.36, 21.58], [80.36, 21.66], [80.25, 21.66], [80.25, 21.58]]]
              }
            },
            {
              type: 'Feature',
              properties: { prospectivity: 0.45, name: 'Medium Shell' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[79.68, 21.62], [80.70, 21.75], [80.60, 21.95], [79.70, 21.85], [79.68, 21.62]]]
              }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'prospectivity-fill',
        type: 'fill',
        source: 'prospectivity-source',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'prospectivity'],
            0.1, '#2563EB',
            0.3, '#10B981',
            0.5, '#EAB308',
            0.75, '#F97316',
            0.9, '#DC2626'
          ],
          'fill-opacity': 0.65
        }
      });

      // 5. GSI Sausar Group Geology Layer
      map.current.addSource('geology-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { formation: 'Mansar Formation' },
              geometry: {
                type: 'Polygon',
                coordinates: [[[79.70, 21.68], [80.10, 21.84], [80.72, 21.84], [80.45, 21.92], [79.72, 21.66], [79.70, 21.68]]]
              }
            }
          ]
        }
      });
      map.current.addLayer({
        id: 'geology-fill',
        type: 'fill',
        source: 'geology-source',
        paint: {
          'fill-color': '#7C3AED',
          'fill-opacity': 0.25
        }
      });

      // Mousemove hover event listener
      map.current.on('mousemove', (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        const score = calculateProspectivity(lat, lng);
        if (onHoverRef.current) {
          onHoverRef.current(lat, lng, score);
        }
      });

      // Click event listener
      map.current.on('click', (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        const score = calculateProspectivity(lat, lng);
        if (onMapClickRef.current) {
          onMapClickRef.current(lat, lng, score);
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Fly to target when selectedTarget prop changes
  useEffect(() => {
    if (!map.current) return;
    const targetCoords = TARGET_COORDINATES[selectedTarget];
    if (targetCoords) {
      map.current.flyTo({
        center: targetCoords,
        zoom: 11.2,
        speed: 1.2,
        curve: 1.4,
        essential: true,
      });
    }
  }, [selectedTarget]);

  // Toggle active layers and render markers
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const layerMap: Record<string, string> = {
      sentinel2: 'esri-satellite-layer',
      geology: 'geology-fill',
      prospectivity: 'prospectivity-fill',
      lineaments: 'mn-belt-line-layer',
      cem: 'cem-fill'
    };

    Object.entries(layerMap).forEach(([key, layerId]) => {
      if (map.current?.getLayer(layerId)) {
        const isVisible = activeLayers[key] !== false;
        map.current.setLayoutProperty(
          layerId,
          'visibility',
          isVisible ? 'visible' : 'none'
        );
      }
    });

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Predefined Target Markers
    const targetPins = [
      { id: 'Target-1', name: 'MN-TGT-001', label: 'High Priority', coords: [80.72, 21.84], color: 'bg-red-600' },
      { id: 'Target-3', name: 'MN-TGT-003', label: 'High Priority', coords: [79.82, 21.91], color: 'bg-red-600' },
      { id: 'Target-2', name: 'MN-TGT-002', label: 'High Priority', coords: [79.92, 21.68], color: 'bg-amber-500' },
      { id: 'Target-4', name: 'MN-TGT-004', label: 'Moderate Priority', coords: [80.31, 21.62], color: 'bg-amber-400' },
      { id: 'Target-5', name: 'MN-TGT-005', label: 'Low Priority', coords: [80.12, 21.78], color: 'bg-emerald-600' },
    ];

    targetPins.forEach((pin) => {
      const isSelected = selectedTarget === pin.id || selectedTarget === pin.name;
      const container = document.createElement('div');
      container.className = 'flex flex-col items-center cursor-pointer group z-30';

      const labelDiv = document.createElement('div');
      labelDiv.className = `px-2.5 py-1 rounded-md shadow-2xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
        isSelected
          ? 'bg-[#1B2170] text-white ring-2 ring-amber-400 scale-110 shadow-amber-500/50'
          : 'bg-[#0F172A]/90 text-white border border-slate-700 hover:scale-105'
      }`;
      labelDiv.innerHTML = `
        <span class="w-2 h-2 rounded-full ${pin.color}"></span>
        <span class="font-bold">${pin.name}</span>
      `;

      const dotDiv = document.createElement('div');
      dotDiv.className = `w-4 h-4 rounded-full ${pin.color} border-2 border-white shadow-xl mt-1 ${
        isSelected ? 'ring-4 ring-amber-400 scale-125' : ''
      }`;

      container.appendChild(labelDiv);
      container.appendChild(dotDiv);

      container.onclick = (e) => {
        e.stopPropagation();
        if (onMarkerClick) onMarkerClick(pin.id);
      };

      const m = new maplibregl.Marker({ element: container })
        .setLngLat(pin.coords as [number, number])
        .addTo(map.current!);

      markersRef.current.push(m);
    });

    // Custom Selected Location Marker (User clicked arbitrary coordinate or entered Lat/Lng)
    if (selectedLocationPin) {
      const pinContainer = document.createElement('div');
      pinContainer.className = 'flex flex-col items-center cursor-pointer z-40 animate-bounce';
      pinContainer.innerHTML = `
        <div class="bg-amber-400 text-slate-950 font-mono font-black px-2 py-0.5 rounded text-[10px] shadow-lg border border-amber-300">
          📍 LOC (${selectedLocationPin.lat.toFixed(4)}, ${selectedLocationPin.lng.toFixed(4)})
        </div>
        <div class="w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-2xl mt-0.5"></div>
      `;
      const locMarker = new maplibregl.Marker({ element: pinContainer })
        .setLngLat([selectedLocationPin.lng, selectedLocationPin.lat])
        .addTo(map.current!);

      markersRef.current.push(locMarker);
    }

    // Place Labels
    const placeNames = [
      { name: 'Balaghat', coords: [80.18, 21.82] },
      { name: 'Tirodi', coords: [79.71, 21.68] },
      { name: 'Ukwa', coords: [80.46, 21.96] },
    ];

    placeNames.forEach((place) => {
      const el = document.createElement('div');
      el.className = 'text-white text-xs font-bold font-sans tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1 z-10 pointer-events-none';
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span><span>${place.name}</span>`;

      const m = new maplibregl.Marker({ element: el })
        .setLngLat(place.coords as [number, number])
        .addTo(map.current!);

      markersRef.current.push(m);
    });

  }, [activeLayers, selectedTarget, selectedLocationPin, onMarkerClick]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleResetZoom = () => map.current?.flyTo({ center: initialCenter, zoom: initialZoom });

  return (
    <div className="relative w-full h-full rounded-xl border border-slate-700 overflow-hidden shadow-inner min-h-[580px]" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full min-h-[580px] bg-[#0F172A]" />

      <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1.5 z-20">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-[#0F172A]/90 hover:bg-slate-800 text-white rounded-lg border border-slate-700 shadow-xl flex items-center justify-center transition active:scale-95"
          title="Zoom In (+)"
        >
          <Plus className="w-4 h-4 text-slate-200" />
        </button>

        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-[#0F172A]/90 hover:bg-slate-800 text-white rounded-lg border border-slate-700 shadow-xl flex items-center justify-center transition active:scale-95"
          title="Zoom Out (-)"
        >
          <Minus className="w-4 h-4 text-slate-200" />
        </button>

        <button
          onClick={handleResetZoom}
          className="w-8 h-8 bg-[#0F172A]/90 hover:bg-slate-800 text-white rounded-lg border border-slate-700 shadow-xl flex items-center justify-center transition active:scale-95 mt-1"
          title="Reset Extent & Layers"
        >
          <LayersIcon className="w-4 h-4 text-blue-400" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 bg-[#0F172A]/90 px-3 py-1.5 rounded-md border border-slate-700 text-[10px] text-slate-300 font-mono flex items-center gap-3 z-20 shadow-lg">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="font-bold text-white">Scale:</span>
        </div>
        <div className="flex items-center gap-2">
          <span>0</span>
          <span className="w-8 border-b-2 border-white inline-block"></span>
          <span>5</span>
          <span className="w-8 border-b-2 border-white inline-block"></span>
          <span>10</span>
          <span className="w-12 border-b-2 border-white inline-block"></span>
          <span>20 km</span>
        </div>
      </div>
    </div>
  );
};
