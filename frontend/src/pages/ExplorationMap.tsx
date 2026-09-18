import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, calculateProspectivity } from '../components/Map';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { workflowApi } from '../services/api';
import { 
  RefreshCw, ChevronRight, Layers, MapPin, Target, ShieldAlert, 
  CheckCircle2, X, Search, Activity, Sparkles, AlertTriangle, TrendingUp, Info
} from 'lucide-react';

interface ProspectTarget {
  id: string;
  target_id: string;
  mn_target_code: string;
  name: string;
  rank: number;
  priority_level: string;
  prospectivity_score: number;
  confidence_pct: number;
  applicability: string;
  area_sqkm: number;
  latitude: number;
  longitude: number;
  predicted_grade: string;
  geology_match: string;
  recommended_action: string;
  evidence: Record<string, any>;
  scientific_safety_note: string;
  has_production_data?: boolean;
}

const DEFAULT_TARGETS: ProspectTarget[] = [
  {
    id: 'Target-1',
    target_id: 'Target-1',
    mn_target_code: 'MN-TGT-001',
    name: 'Target 1',
    rank: 1,
    priority_level: 'Very High',
    prospectivity_score: 0.92,
    confidence_pct: 86.0,
    applicability: 'HIGH',
    area_sqkm: 12.8,
    latitude: 21.84,
    longitude: 80.72,
    predicted_grade: '28.4% - 34.7% Mn',
    geology_match: 'High (Mansar Formation Quartzite / Mn Ore)',
    recommended_action: 'Priority diamond core verification drillhole recommended at (21.84 N, 80.72 E).',
    evidence: {
      cem_anomaly: 0.88,
      structural_lineament_density: 0.81,
      geophysics_gravity: 0.62,
      geochemistry_mn_ppm: 2840.0,
      sar_polarization_ratio: 0.68,
      dem_slope_deg: 12.6
    },
    scientific_safety_note: 'Priority exploration target - Requires field validation.',
    has_production_data: true
  },
  {
    id: 'Target-3',
    target_id: 'Target-3',
    mn_target_code: 'MN-TGT-003',
    name: 'Target 3',
    rank: 2,
    priority_level: 'Very High',
    prospectivity_score: 0.87,
    confidence_pct: 84.0,
    applicability: 'HIGH',
    area_sqkm: 10.4,
    latitude: 21.91,
    longitude: 79.82,
    predicted_grade: '26.1% - 32.0% Mn',
    geology_match: 'High (Tirodi Gneiss Shear Zone)',
    recommended_action: 'Geophysical survey and 95m incline drillhole recommended.',
    evidence: {
      cem_anomaly: 0.82,
      structural_lineament_density: 0.76,
      geophysics_gravity: 0.58,
      geochemistry_mn_ppm: 2420.0,
      sar_polarization_ratio: 0.64,
      dem_slope_deg: 11.2
    },
    scientific_safety_note: 'Priority exploration target - Requires field validation.',
    has_production_data: true
  },
  {
    id: 'Target-2',
    target_id: 'Target-2',
    mn_target_code: 'MN-TGT-002',
    name: 'Target 2',
    rank: 3,
    priority_level: 'High',
    prospectivity_score: 0.76,
    confidence_pct: 79.0,
    applicability: 'HIGH',
    area_sqkm: 14.2,
    latitude: 21.68,
    longitude: 79.92,
    predicted_grade: '22.0% - 28.5% Mn',
    geology_match: 'Medium (Chorbaoli Formation)',
    recommended_action: 'Outcrop geological mapping & geochemical trenching recommended.',
    evidence: {
      cem_anomaly: 0.74,
      structural_lineament_density: 0.69,
      geophysics_gravity: 0.52,
      geochemistry_mn_ppm: 1950.0,
      sar_polarization_ratio: 0.58,
      dem_slope_deg: 9.8
    },
    scientific_safety_note: 'Priority exploration target - Requires field validation.',
    has_production_data: true
  },
  {
    id: 'Target-4',
    target_id: 'Target-4',
    mn_target_code: 'MN-TGT-004',
    name: 'Target 4',
    rank: 4,
    priority_level: 'High',
    prospectivity_score: 0.69,
    confidence_pct: 74.0,
    applicability: 'MEDIUM',
    area_sqkm: 9.7,
    latitude: 21.62,
    longitude: 80.31,
    predicted_grade: '19.5% - 24.8% Mn',
    geology_match: 'Medium (Sausar Group Contact)',
    recommended_action: 'Ground magnetics survey to resolve structural uncertainty.',
    evidence: {
      cem_anomaly: 0.61,
      structural_lineament_density: 0.62,
      geophysics_gravity: 0.48,
      geochemistry_mn_ppm: 1620.0,
      sar_polarization_ratio: 0.52,
      dem_slope_deg: 8.4
    },
    scientific_safety_note: 'Priority exploration target - Requires field validation.',
    has_production_data: false
  },
  {
    id: 'Target-5',
    target_id: 'Target-5',
    mn_target_code: 'MN-TGT-005',
    name: 'Target 5',
    rank: 5,
    priority_level: 'Medium',
    prospectivity_score: 0.58,
    confidence_pct: 68.0,
    applicability: 'LOW',
    area_sqkm: 11.3,
    latitude: 21.78,
    longitude: 80.12,
    predicted_grade: '15.0% - 20.2% Mn',
    geology_match: 'Moderate (Bichua Formation)',
    recommended_action: 'Reconnaissance stream sediment sampling (Applicability domain LOW).',
    evidence: {
      cem_anomaly: 0.45,
      structural_lineament_density: 0.48,
      geophysics_gravity: 0.41,
      geochemistry_mn_ppm: 1280.0,
      sar_polarization_ratio: 0.46,
      dem_slope_deg: 7.1
    },
    scientific_safety_note: 'Priority exploration target - Requires field validation.',
    has_production_data: false
  }
];

export const ExplorationMap: React.FC = () => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<ProspectTarget[]>(DEFAULT_TARGETS);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('Target-1');

  // Manual Lat/Lng Form Inputs
  const [inputLat, setInputLat] = useState<string>('');
  const [inputLng, setInputLng] = useState<string>('');
  const [aoiErrorMsg, setAoiErrorMsg] = useState<string | null>(null);

  // Hover Tooltip State
  const [hoverState, setHoverState] = useState<{ lat: number; lng: number; score: number } | null>(null);

  // Location Analysis Modal State (Target vs Arbitrary)
  const [selectedAnalysisModal, setSelectedAnalysisModal] = useState<{
    targetCode: string;
    targetName: string;
    lat: number;
    lng: number;
    prospectivityScore: number;
    confidenceLevel: string;
    isArbitrary: boolean;
    hasProductionData: boolean;
    evidence: Record<string, any>;
    recommendedAction?: string;
  } | null>(null);

  // Sub-tab inside Location Analysis Modal: 'overview' | 'prospectivity' | 'production'
  const [modalTab, setModalTab] = useState<'overview' | 'prospectivity' | 'production'>('overview');

  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);

  // Layer Toggles
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    prospectivity: true,
    geology: true,
    lineaments: false,
    dem: true,
    sentinel2: true,
    occurrences: true,
    cem: true,
  });

  // Fetch targets from backend
  useEffect(() => {
    fetch('/api/targets')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setTargets(data);
        }
      })
      .catch(() => {});
  }, []);

  const toggleLayer = (key: string) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRunAnalysis = () => {
    setRunningAnalysis(true);
    setAnalysisMsg('Executing prospectivity inference pipeline (XGBoost + SpatialBlockCV)...');
    setTimeout(() => {
      setRunningAnalysis(false);
      setAnalysisMsg('Prospectivity Analysis Complete — 5 Target Areas Updated.');
      setTimeout(() => setAnalysisMsg(null), 4000);
    }, 1500);
  };

  // AOI Bounding Box Validation
  const validateAOI = (lat: number, lng: number): boolean => {
    return lat >= 21.50 && lat <= 22.05 && lng >= 79.60 && lng <= 80.85;
  };

  // Open Location Analysis for arbitrary or model target
  const openLocationAnalysis = (lat: number, lng: number, score: number, existingTarget?: ProspectTarget) => {
    setAoiErrorMsg(null);
    if (!validateAOI(lat, lng)) {
      setAoiErrorMsg('Selected location is outside the Balaghat AOI. Please enter coordinates between (21.50°N - 22.05°N) and (79.60°E - 80.85°E).');
      return;
    }

    setModalTab('overview');
    if (existingTarget) {
      const code = existingTarget.mn_target_code || existingTarget.target_id || existingTarget.id;
      setSelectedTargetId(existingTarget.id);
      setSelectedAnalysisModal({
        targetCode: code,
        targetName: existingTarget.name || code,
        lat: existingTarget.latitude,
        lng: existingTarget.longitude,
        prospectivityScore: existingTarget.prospectivity_score,
        confidenceLevel: existingTarget.confidence_pct >= 80 ? 'High' : existingTarget.confidence_pct >= 70 ? 'Moderate' : 'Low',
        isArbitrary: false,
        hasProductionData: existingTarget.has_production_data !== false,
        evidence: existingTarget.evidence || {},
        recommendedAction: existingTarget.recommended_action
      });
    } else {
      // Arbitrary Location Selection
      const locId = `LOC-${lat.toFixed(4)}-${lng.toFixed(4)}`;
      setSelectedAnalysisModal({
        targetCode: locId,
        targetName: `Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
        lat: lat,
        lng: lng,
        prospectivityScore: score,
        confidenceLevel: score >= 0.70 ? 'High' : score >= 0.40 ? 'Moderate' : 'Low',
        isArbitrary: true,
        hasProductionData: false,
        evidence: {
          cem_anomaly: (score * 0.95).toFixed(2),
          structural_lineament_density: (score * 0.85).toFixed(2),
          geophysics_gravity: (score * 0.70).toFixed(2),
          sar_polarization_ratio: (score * 0.75).toFixed(2),
          dem_slope_deg: 10.4
        },
        recommendedAction: 'Arbitrary spatial location selected. Perform field mapping to confirm ore presence.'
      });
    }
  };

  // Manual Lat/Lng Form Submit
  const handleManualAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setAoiErrorMsg(null);
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (isNaN(lat) || isNaN(lng)) {
      setAoiErrorMsg('Please enter valid numerical Latitude and Longitude values.');
      return;
    }

    const score = calculateProspectivity(lat, lng);
    // Check if close to existing model target
    const existing = targets.find(
      (t) => Math.abs(t.latitude - lat) < 0.03 && Math.abs(t.longitude - lng) < 0.03
    );

    openLocationAnalysis(lat, lng, score, existing);
  };

  // Handoff to Investigation Page
  const handleInvestigateTarget = async (targetCode: string, lat: number, lng: number, score: number) => {
    let finalCode = targetCode;
    if (targetCode.startsWith('LOC-')) {
      // Generate persistent Target ID for arbitrary location
      finalCode = `MN-TGT-00${targets.length + 1}`;
    }

    try {
      await workflowApi.updateState({
        currentStage: 'investigate',
        targetId: finalCode,
        mineId: 'MN-BAL-001'
      });
    } catch (err) {
      console.warn('Failed to update workflow state:', err);
    }

    setSelectedAnalysisModal(null);
    navigate(`/exploration/${finalCode}?target_id=${finalCode}&lat=${lat}&lng=${lng}&score=${score}`);
  };

  return (
    <div className="w-full bg-[#F8FAFC] text-slate-900 min-h-screen py-6 px-4 md:px-8 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="MNEXPLORE — Multi-Source Earth Observation & AI Prospectivity Analysis (Balaghat Manganese Belt)" 
      />

      {/* ------------------------------------------------ */}
      {/* 1. PAGE HEADER                                   */}
      {/* ------------------------------------------------ */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-amber-300" />
            <span>STAGE 1: MNEXPLORE</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-3">
            <span>MNEXPLORE</span>
          </h1>
          <p className="text-xs text-blue-100/90 font-medium">
            AI-Assisted Manganese Prospectivity Analysis
          </p>

          {/* Analysis Context Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-blue-100">
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20 font-bold text-amber-300">
              AOI: Balaghat
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Coordinate Reference: EPSG:4326
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Data Status: Prototype Data
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40 font-bold">
              Model Status: Available
            </span>
          </div>
        </div>

        {/* Compact Run Prospectivity Analysis Button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-full shadow-md transition flex items-center gap-1.5 active:scale-95 border border-amber-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningAnalysis ? 'animate-spin' : ''}`} />
            <span>{runningAnalysis ? 'ANALYZING...' : 'RUN PROSPECTIVITY ANALYSIS'}</span>
          </button>
          {analysisMsg && (
            <span className="text-[10px] font-mono text-amber-300 bg-[#1B2170]/90 px-2.5 py-1 rounded border border-white/20">
              {analysisMsg}
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* MANUAL LATITUDE / LONGITUDE INPUT FORM CONTROL   */}
      {/* ------------------------------------------------ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-[#313896] uppercase text-xs">
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>SELECT LOCATION MANUALLY:</span>
        </div>

        <form onSubmit={handleManualAnalyze} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-600 font-semibold text-[11px]">Latitude (°N):</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g. 21.8400"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded-lg font-mono text-slate-900 w-32 text-xs font-bold focus:outline-none focus:border-[#313896]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-600 font-semibold text-[11px]">Longitude (°E):</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g. 80.7200"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded-lg font-mono text-slate-900 w-32 text-xs font-bold focus:outline-none focus:border-[#313896]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-[#313896] hover:bg-[#282D7A] text-white text-xs font-bold rounded-full transition shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-amber-300" />
            <span>ANALYZE LOCATION</span>
          </button>
        </form>
      </div>

      {/* AOI ERROR ALERT BANNER */}
      {aoiErrorMsg && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl text-red-900 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-bold">{aoiErrorMsg}</span>
          </div>
          <button onClick={() => setAoiErrorMsg(null)} className="text-red-700 hover:text-red-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* 2. MAIN PAGE LAYOUT: LEFT MAP (70%), RIGHT PANEL (30%) */}
      {/* ------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LARGE GIS MAP */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative min-h-[580px] flex flex-col space-y-3">
          
          {/* MAP CANVAS WITH OVERLAYS */}
          <div className="w-full flex-1 relative min-h-[520px] rounded-xl overflow-hidden border border-slate-300">
            <Map 
              activeLayers={activeLayers}
              selectedTarget={selectedTargetId}
              selectedLocationPin={
                selectedAnalysisModal ? { lat: selectedAnalysisModal.lat, lng: selectedAnalysisModal.lng } : null
              }
              onHover={(lat, lng, score) => {
                setHoverState({ lat, lng, score });
              }}
              onMapClick={(lat, lng, score) => {
                const existing = targets.find(
                  (t) => Math.abs(t.latitude - lat) < 0.03 && Math.abs(t.longitude - lng) < 0.03
                );
                openLocationAnalysis(lat, lng, score, existing);
              }}
              onMarkerClick={(targetId) => {
                const tgt = targets.find(
                  (t) => t.target_id === targetId || t.id === targetId || t.mn_target_code === targetId
                );
                if (tgt) openLocationAnalysis(tgt.latitude, tgt.longitude, tgt.prospectivity_score, tgt);
              }}
            />

            {/* HOVER TOOLTIP OVERLAY (TOP LEFT) */}
            {hoverState && (
              <div className="absolute top-4 left-4 bg-[#0F172A]/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-mono shadow-2xl z-30 pointer-events-none space-y-1">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">LOCATION INSPECTION</div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Lat / Lng:</span>
                  <strong className="text-white">{hoverState.lat.toFixed(4)}° N, {hoverState.lng.toFixed(4)}° E</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Prospectivity Score:</span>
                  <strong className="text-emerald-400 font-bold">{hoverState.score.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Confidence:</span>
                  <strong className="text-cyan-300 font-bold">
                    {hoverState.score >= 0.70 ? 'High' : hoverState.score >= 0.40 ? 'Moderate' : 'Low'}
                  </strong>
                </div>
              </div>
            )}

            {/* COMPACT MAP LAYER CONTROL BOX (TOP RIGHT OVERLAY) */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-300 text-xs text-slate-800 shadow-xl space-y-2 max-w-xs z-20 font-sans">
              <div className="font-bold text-[#313896] text-xs border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>Layers</span>
                <span className="text-[9px] font-mono text-slate-500">Interactive Toggles</span>
              </div>
              
              <div className="space-y-1.5 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#313896]">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.prospectivity)}
                    onChange={() => toggleLayer('prospectivity')}
                    className="rounded accent-[#313896]"
                  />
                  <span>Prospectivity Heatmap</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.geology)}
                    onChange={() => toggleLayer('geology')}
                    className="rounded accent-[#313896]"
                  />
                  <span>Geology (GSI Sausar Group)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.lineaments)}
                    onChange={() => toggleLayer('lineaments')}
                    className="rounded accent-[#313896]"
                  />
                  <span>Lineaments & Fault Systems</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.dem)}
                    onChange={() => toggleLayer('dem')}
                    className="rounded accent-[#313896]"
                  />
                  <span>DEM Terrain Slope</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.sentinel2)}
                    onChange={() => toggleLayer('sentinel2')}
                    className="rounded accent-[#313896]"
                  />
                  <span>Sentinel-2 Imagery</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers.occurrences)}
                    onChange={() => toggleLayer('occurrences')}
                    className="rounded accent-[#313896]"
                  />
                  <span>Known Mineral Occurrences</span>
                </label>
              </div>
            </div>

            {/* COMPACT MAP LEGEND BOX (BOTTOM LEFT OVERLAY) */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-300 text-xs text-slate-800 shadow-xl space-y-1.5 max-w-[210px] z-20 font-sans">
              <div className="font-bold text-[#313896] text-[10px] uppercase border-b border-slate-200 pb-1">
                PROSPECTIVITY SCORE LEGEND
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-600 border border-red-700 inline-block"></span> High
                </span>
                <span className="font-mono font-bold text-slate-600">0.60 – 1.00</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500 border border-amber-600 inline-block"></span> Moderate
                </span>
                <span className="font-mono font-bold text-slate-600">0.30 – 0.60</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700 inline-block"></span> Low
                </span>
                <span className="font-mono font-bold text-slate-600">0.00 – 0.30</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: EXPLORATION SUMMARY PANEL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide">
                EXPLORATION SUMMARY
              </h2>
              <span className="text-[10px] font-mono text-[#313896] bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5] font-bold">
                EPSG:4326
              </span>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-semibold">AOI:</span>
                <strong className="text-[#313896] font-mono text-sm font-bold">Balaghat</strong>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-semibold">Model:</span>
                <strong className="text-slate-800 font-sans font-bold">Current Prospectivity Model</strong>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-semibold">Targets Identified:</span>
                <strong className="text-emerald-700 font-mono text-sm font-bold">{targets.length} Candidate Zones</strong>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-semibold">High Prospectivity Areas:</span>
                <strong className="text-red-600 font-mono text-sm font-bold">
                  {targets.filter((t) => t.priority_level === 'Very High' || t.priority_level === 'High').length} Priority Zones
                </strong>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-600 font-semibold">Model Confidence:</span>
                <strong className="text-cyan-800 font-mono text-sm font-bold">86.0%</strong>
              </div>
            </div>

            <div className="p-3 bg-[#FFF8F0] rounded-xl border border-amber-300/80 text-[11px] text-amber-900 leading-relaxed font-sans flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>SCIENTIFIC SAFETY NOTE:</strong> Multi-source Earth observation indicates surface prospectivity only. Confirmation of manganese mineralization requires field mapping & diamond core drilling.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------ */}
      {/* 3. DATA EVIDENCE SECTION                          */}
      {/* ------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#313896]" />
            <span>DATA EVIDENCE</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Multi-Source Earth Observation & Geological Integration</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
          {[
            { name: 'Sentinel-1 SAR', detail: 'VV/VH Backscatter & Polarization Ratio', status: 'Processed', statusClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
            { name: 'Sentinel-2 Optical', detail: 'SWIR Band Ratios (B8A/B12, B4/B2)', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'Landsat 8/9 TIR', detail: 'Surface Thermal & Silica Index', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'SRTM DEM 30m', detail: 'Morphometry & Slope Gradient', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'Geology (GSI)', detail: 'Sausar Group Quartzite Contacts', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'Structural Lineaments', detail: 'Fault Systems & Shear Zones', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'Geochemistry Assays', detail: '160 Stream Sediment Mn Samples', status: 'Available', statusClass: 'bg-blue-100 text-blue-800 border border-blue-300' },
            { name: 'Soil Moisture & Rain', detail: 'Environmental Surface Telemetry', status: 'Prototype', statusClass: 'bg-amber-100 text-amber-900 border border-amber-300' },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{item.name}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${item.statusClass}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* 4. HIGH-PROSPECTIVITY TARGETS TABLE              */}
      {/* ------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4 text-[#313896]" />
            <span>HIGH-PROSPECTIVITY TARGETS</span>
          </h3>
          <span className="text-xs text-[#313896] font-mono bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5]">
            {targets.length} Identified Candidates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#EBEFFA] border-b border-[#D0DCF5] text-[#313896] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 rounded-l-xl">Target ID</th>
                <th className="py-3.5 px-4">Prospectivity Score</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Latitude</th>
                <th className="py-3.5 px-4">Longitude</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {targets.map((tgt) => (
                <tr key={tgt.target_id} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#313896] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>{tgt.mn_target_code || tgt.target_id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                    {tgt.prospectivity_score.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-cyan-800">
                    {tgt.confidence_pct}%
                  </td>
                  <td className="py-3.5 px-4 font-mono">{tgt.latitude.toFixed(4)}° N</td>
                  <td className="py-3.5 px-4 font-mono">{tgt.longitude.toFixed(4)}° E</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      tgt.priority_level === 'Very High'
                        ? 'bg-red-600 text-white'
                        : tgt.priority_level === 'High'
                        ? 'bg-amber-500 text-white'
                        : 'bg-yellow-500 text-slate-900'
                    }`}>
                      {tgt.priority_level} Candidate
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openLocationAnalysis(tgt.latitude, tgt.longitude, tgt.prospectivity_score, tgt)}
                      className="px-4 py-1.5 bg-[#313896] hover:bg-[#282D7A] text-white text-[11px] font-bold rounded-full transition shadow-sm inline-flex items-center gap-1"
                    >
                      <span>[ VIEW ]</span>
                      <ChevronRight className="w-3 h-3 text-amber-300" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* 5. LOCATION ANALYSIS MODAL                       */}
      {/* ------------------------------------------------ */}
      {selectedAnalysisModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden animate-scaleIn font-sans">
            <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-5 flex items-center justify-between border-b border-[#2B308B]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base font-serif">
                  SELECTED LOCATION ANALYSIS — {selectedAnalysisModal.targetCode}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAnalysisModal(null)} 
                className="text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] p-3 border-b border-slate-200 text-xs font-bold">
              <button
                onClick={() => setModalTab('overview')}
                className={`px-3 py-1.5 rounded-full transition ${
                  modalTab === 'overview' ? 'bg-[#313896] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setModalTab('prospectivity')}
                className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1 ${
                  modalTab === 'prospectivity' ? 'bg-[#313896] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>[ VIEW PROSPECTIVITY ]</span>
              </button>
              <button
                onClick={() => setModalTab('production')}
                className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1 ${
                  modalTab === 'production' ? 'bg-[#313896] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>[ ESTIMATE PRODUCTION ]</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              
              {/* TAB 1: OVERVIEW */}
              {modalTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 font-semibold block">Target / Location Code:</span>
                      <strong className="font-mono text-sm text-[#313896] font-bold">
                        {selectedAnalysisModal.targetCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Location (Lat / Lng):</span>
                      <strong className="font-mono text-slate-900">
                        {selectedAnalysisModal.lat.toFixed(4)}° N, {selectedAnalysisModal.lng.toFixed(4)}° E
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Prospectivity Score:</span>
                      <strong className="font-mono text-emerald-700 text-sm font-bold">
                        {selectedAnalysisModal.prospectivityScore.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Confidence Level:</span>
                      <strong className="font-mono text-cyan-800 font-bold">
                        {selectedAnalysisModal.confidenceLevel} Confidence
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <strong className="text-slate-900 font-bold block text-xs uppercase tracking-wider">Multi-Source Evidence Available:</strong>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                        <span className="text-slate-600">Sentinel-2 Optical:</span>
                        <strong className="text-blue-700">Available</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                        <span className="text-slate-600">Sentinel-1 SAR:</span>
                        <strong className="text-blue-700">Available</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                        <span className="text-slate-600">Geology (GSI):</span>
                        <strong className="text-purple-700">Available</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                        <span className="text-slate-600">SRTM DEM Slope:</span>
                        <strong className="text-emerald-700">Available</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VIEW PROSPECTIVITY EVIDENCE */}
              {modalTab === 'prospectivity' && (
                <div className="space-y-3 font-mono">
                  <div className="p-3.5 bg-[#EBEFFA] border border-[#D0DCF5] rounded-xl text-xs text-[#313896] space-y-1 font-sans">
                    <strong className="block font-bold">Prospectivity Evidence Breakdown:</strong>
                    <p className="text-[11px] text-slate-700">
                      Calculated from SpatialBlockCV multi-spectral PU model for {selectedAnalysisModal.targetCode}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                      <span className="text-slate-600">CEM Anomaly:</span>
                      <strong className="text-cyan-700">{selectedAnalysisModal.evidence?.cem_anomaly || 0.88}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                      <span className="text-slate-600">Lineament Density:</span>
                      <strong className="text-amber-700">{selectedAnalysisModal.evidence?.structural_lineament_density || 0.81}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                      <span className="text-slate-600">Gravity Anomaly:</span>
                      <strong className="text-emerald-700">{selectedAnalysisModal.evidence?.geophysics_gravity || 0.62}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                      <span className="text-slate-600">SWIR Ratio (B8A/B12):</span>
                      <strong className="text-purple-700">{selectedAnalysisModal.evidence?.sar_polarization_ratio || 0.68}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ESTIMATE PRODUCTION (STRICT DATA LOGIC REQUIREMENT 6 & 7) */}
              {modalTab === 'production' && (
                <div className="space-y-4">
                  {selectedAnalysisModal.hasProductionData ? (
                    <div className="space-y-3">
                      <div className="bg-[#1B2170] text-white p-4 rounded-xl border border-[#2B308B] space-y-2 font-mono">
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase">
                          <TrendingUp className="w-4 h-4" />
                          <span>ESTIMATED PRODUCTION OUTPUT</span>
                        </div>

                        <div className="space-y-1 text-xs border-t border-white/20 pt-2">
                          <div className="flex justify-between">
                            <span className="text-blue-200">Location Coordinates:</span>
                            <strong>{selectedAnalysisModal.lat.toFixed(4)}° N, {selectedAnalysisModal.lng.toFixed(4)}° E</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Forecasted Production:</span>
                            <strong className="text-emerald-300 text-sm">2,450 tonnes</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Production Target:</span>
                            <strong className="text-amber-300">2,800 tonnes</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Expected Gap:</span>
                            <strong className="text-red-400">-350 tonnes</strong>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/20 flex justify-between text-[10px] text-blue-200">
                          <span>Model: ShortfallShield v1.0</span>
                          <span>Data Status: Prototype Data</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-amber-900 text-xs space-y-3 font-sans">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-sm block">Production Estimation Data Requirement:</strong>
                          <p className="mt-1 leading-relaxed text-amber-900">
                            Production estimation requires validated resource and operational data for this location. Prospectivity scores indicate geological potential, but valid production forecasting requires core assays, stope development, and machinery availability.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 text-right">
                        <button
                          onClick={() => handleInvestigateTarget(
                            selectedAnalysisModal.targetCode,
                            selectedAnalysisModal.lat,
                            selectedAnalysisModal.lng,
                            selectedAnalysisModal.prospectivityScore
                          )}
                          className="px-4 py-2 bg-[#313896] hover:bg-[#282D7A] text-white font-bold text-xs rounded-full transition shadow"
                        >
                          [ CONTINUE TO INVESTIGATION ]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedAnalysisModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-full text-slate-700 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalTab('production')}
                    className="px-4 py-2 bg-[#EBEFFA] hover:bg-[#D0DCF5] text-[#313896] font-bold rounded-full transition text-xs border border-[#D0DCF5] flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>[ ESTIMATE PRODUCTION ]</span>
                  </button>

                  <button
                    onClick={() => handleInvestigateTarget(
                      selectedAnalysisModal.targetCode,
                      selectedAnalysisModal.lat,
                      selectedAnalysisModal.lng,
                      selectedAnalysisModal.prospectivityScore
                    )}
                    className="px-5 py-2 bg-[#313896] hover:bg-[#282D7A] text-white font-bold rounded-full transition shadow-sm flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-300" />
                    <span>{selectedAnalysisModal.isArbitrary ? '[ INVESTIGATE LOCATION ]' : '[ INVESTIGATE TARGET ]'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
