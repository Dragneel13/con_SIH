import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  height?: string;
  activeLayers?: Record<string, boolean>;
  selectedTarget?: string;
  onMarkerClick?: (targetId: string) => void;
}

export const Map: React.FC<MapProps> = ({
  initialCenter = [80.18, 21.83], // Balaghat, Madhya Pradesh coordinates
  initialZoom = 9.8,
  height = '100%',
  activeLayers = {
    sentinel2: true,
    geology: true,
    prospectivity: true,
    faults: true,
    occurrences: true,
  },
  selectedTarget = 'Target-1',
  onMarkerClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // OpenStreetMap raster tiles base style
    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
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

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.current.on('load', () => {
      if (!map.current) return;

      // 1. Sentinel-2 Optical False-Color Reflectance Layer (Cyan Overlay)
      map.current.addSource('sentinel2-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Sentinel-2 NIR Band Index' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [79.65, 21.60], [80.75, 21.60], [80.75, 22.05], [79.65, 22.05], [79.65, 21.60]
                ]]
              }
            }
          ]
        }
      });
      map.current.addLayer({
        id: 'sentinel2-fill',
        type: 'fill',
        source: 'sentinel2-source',
        paint: {
          'fill-color': '#0284C7',
          'fill-opacity': 0.15
        }
      });

      // 2. GSI Lithology & Formations Layer (Purple Sausar Belt Overlay)
      map.current.addSource('geology-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { formation: 'Mansar Formation (Manganese Ore Horizon)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [79.70, 21.68], [80.10, 21.84], [80.72, 21.84], [80.45, 21.92], [79.72, 21.66], [79.70, 21.68]
                ]]
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
          'fill-opacity': 0.3
        }
      });

      // 3. Prospectivity Heatmap Polygon Zones (Gradient Colors matching AI Heatmap in Screenshot)
      map.current.addSource('prospectivity-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            // Target 1 - Very High Red Zone
            {
              type: 'Feature',
              properties: { prospectivity: 0.92, name: 'Target 1 (Very High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [80.65, 21.80], [80.78, 21.80], [80.78, 21.88], [80.65, 21.88], [80.65, 21.80]
                ]]
              }
            },
            // Target 3 - Very High Red Zone
            {
              type: 'Feature',
              properties: { prospectivity: 0.87, name: 'Target 3 (Very High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [79.76, 21.87], [79.88, 21.87], [79.88, 21.95], [79.76, 21.95], [79.76, 21.87]
                ]]
              }
            },
            // Target 2 - High Orange Zone
            {
              type: 'Feature',
              properties: { prospectivity: 0.76, name: 'Target 2 (High)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [79.86, 21.64], [79.98, 21.64], [79.98, 21.72], [79.86, 21.72], [79.86, 21.64]
                ]]
              }
            },
            // Target 4 - Medium Yellow Zone
            {
              type: 'Feature',
              properties: { prospectivity: 0.69, name: 'Target 4 (Medium)' },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [80.25, 21.58], [80.36, 21.58], [80.36, 21.66], [80.25, 21.66], [80.25, 21.58]
                ]]
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
            0.5, '#EAB308',
            0.75, '#F97316',
            0.9, '#DC2626'
          ],
          'fill-opacity': 0.6
        }
      });

      // 4. Fault Lineaments
      map.current.addSource('faults-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: 'Balaghat Thrust Fault F-1' },
              geometry: {
                type: 'LineString',
                coordinates: [[79.60, 21.64], [80.15, 21.85], [80.75, 21.90]]
              }
            }
          ]
        }
      });
      map.current.addLayer({
        id: 'faults-line',
        type: 'line',
        source: 'faults-source',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 2,
          'line-dasharray': [3, 2]
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Dynamically update map layers visibility & markers
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const layerMap: Record<string, string> = {
      sentinel2: 'sentinel2-fill',
      geology: 'geology-fill',
      prospectivity: 'prospectivity-fill',
      faults: 'faults-line'
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

    // Re-render Map Markers (Target Pins with Priority Labels matching Screenshot)
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const targetPins = [
      { id: 'Target-1', name: 'Target 1', label: 'Very High Priority', coords: [80.72, 21.84], status: 'Very High', color: 'bg-red-600' },
      { id: 'Target-3', name: 'Target 3', label: 'High Priority', coords: [79.82, 21.91], status: 'Very High', color: 'bg-red-600' },
      { id: 'Target-2', name: 'Target 2', label: 'High Priority', coords: [79.92, 21.68], status: 'High', color: 'bg-amber-500' },
      { id: 'Target-4', name: 'Target 4', label: 'Medium Priority', coords: [80.31, 21.62], status: 'Medium', color: 'bg-yellow-500' },
    ];

    targetPins.forEach((pin) => {
      const isSelected = selectedTarget === pin.id || (selectedTarget === 'Target-1' && pin.id === 'Target-1');
      const container = document.createElement('div');
      container.className = 'flex flex-col items-center cursor-pointer group z-20';

      // Pin Bubble Label (Matching Screenshot Pin Label style)
      const labelDiv = document.createElement('div');
      labelDiv.className = `px-2 py-1 rounded shadow-lg text-[10px] font-extrabold whitespace-nowrap mb-1 transition-transform ${
        isSelected ? 'bg-white text-slate-900 ring-2 ring-amber-400 scale-110' : 'bg-[#0F172A]/90 text-white border border-slate-700'
      }`;
      labelDiv.innerHTML = `
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full ${pin.color}"></span>
          <span>${pin.name}</span>
          <span class="text-[9px] opacity-75 font-normal">(${pin.label})</span>
        </div>
      `;

      // Marker Dot
      const dotDiv = document.createElement('div');
      dotDiv.className = `w-4 h-4 rounded-full ${pin.color} border-2 border-white shadow-xl ${isSelected ? 'ring-4 ring-amber-400 scale-125' : ''}`;

      container.appendChild(labelDiv);
      container.appendChild(dotDiv);

      container.onclick = () => {
        if (onMarkerClick) onMarkerClick(pin.id);
      };

      const m = new maplibregl.Marker({ element: container })
        .setLngLat(pin.coords as [number, number])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`
          <div class="text-slate-900 p-2 text-xs font-sans">
            <strong class="text-[#003366]">${pin.name} (${pin.label})</strong><br/>
            Location: <span class="font-mono">${pin.coords[1]}° N, ${pin.coords[0]}° E</span><br/>
            Status: <span class="font-bold text-emerald-700">${pin.status}</span>
          </div>
        `))
        .addTo(map.current!);

      markersRef.current.push(m);
    });

    // Key Location Place Name Labels (Balaghat, Tirodi, Ukwa)
    const placeNames = [
      { name: 'Balaghat', coords: [80.18, 21.82] },
      { name: 'Tirodi', coords: [79.71, 21.68] },
      { name: 'Ukwa', coords: [80.46, 21.96] },
    ];

    placeNames.forEach((place) => {
      const el = document.createElement('div');
      el.className = 'text-white text-xs font-bold font-sans tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1';
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span><span>${place.name}</span>`;

      const m = new maplibregl.Marker({ element: el })
        .setLngLat(place.coords as [number, number])
        .addTo(map.current!);

      markersRef.current.push(m);
    });

  }, [activeLayers, selectedTarget, onMarkerClick]);

  return (
    <div className="relative w-full h-full rounded-xl border border-slate-700 overflow-hidden shadow-inner min-h-[580px]" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full min-h-[580px] bg-[#0F172A]" />
    </div>
  );
};
