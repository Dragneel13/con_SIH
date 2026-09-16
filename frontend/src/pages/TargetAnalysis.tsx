import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Target, ShieldCheck, CheckCircle2, Info, ChevronRight, 
  Activity, Layers, MapPin, AlertTriangle, ShieldAlert, Sparkles, FileText
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';

export const TargetAnalysis: React.FC = () => {
  const { targetId } = useParams<{ targetId: string }>();
  const activeTargetId = targetId || 'Target-1';
  const [targetData, setTargetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/targets/${activeTargetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setTargetData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTargetId]);

  const target = targetData || {
    target_id: activeTargetId,
    name: `Target ${activeTargetId}`,
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
    scientific_safety_note: 'Priority exploration target - Requires field validation.'
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="DRILLTARGET AI & MULTI-SOURCE EVIDENCE SUMMARY — Target ID Persistent Handoff" 
      />

      <Link to="/drill-planning" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A] hover:underline">
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Drill Target Queue</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white p-6 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Target className="w-4 h-4 text-amber-400" />
            <span>PERSISTENT TARGET ID: {target.target_id}</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1 flex items-center gap-3">
            <span>Target Analysis & Drilling Recommendation</span>
            <span className="text-xs font-sans font-semibold bg-red-900/80 text-red-300 border border-red-700 px-2.5 py-0.5 rounded-full">
              {target.priority_level} Priority
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Multi-source geospatial evidence summary & structural lineament analysis for diamond core site selection
          </p>
        </div>
        <div className="bg-[#0F172A] p-3.5 rounded-lg border border-slate-700 text-xs font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">PU Score:</span>
            <strong className="text-emerald-400 font-bold">{(target.prospectivity_score * 100).toFixed(1)}%</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Confidence:</span>
            <strong className="text-cyan-300 font-bold">{target.confidence_pct}%</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Applicability:</span>
            <strong className="text-blue-400 font-bold">{target.applicability}</strong>
          </div>
        </div>
      </div>

      {/* Scientific Safety Warning Banner */}
      <div className="bg-amber-950/80 border border-amber-700 p-4 rounded-xl text-amber-200 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-white font-bold text-sm">Scientific Safety Disclaimer & Workflow Mandate</strong>
          <p>
            {target.scientific_safety_note || "Priority exploration target — Requires field validation."} Remote sensing surface spectral anomalies & SAR lineaments indicate potential structural controls only; underground manganese ore must be confirmed via field mapping and diamond core drilling.
          </p>
        </div>
      </div>

      {/* 4 Multi-Source Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spectral Evidence */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E3A8A] border-b pb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Spectral Evidence</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">CEM FIR</span>
          </div>
          <div className="space-y-1 text-xs text-slate-700 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-500">CEM Target Abundance:</span>
              <strong className="font-mono text-cyan-700">{target.evidence?.cem_anomaly || 0.88}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SWIR Ratio (B8A/B12):</span>
              <strong className="font-mono">{target.evidence?.sar_polarization_ratio || 0.68}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vegetation Index (NDVI):</span>
              <strong className="font-mono">0.68</strong>
            </div>
          </div>
        </div>

        {/* Geophysical Evidence */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E3A8A] border-b pb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Geophysics & DEM</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Gravity</span>
          </div>
          <div className="space-y-1 text-xs text-slate-700 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-500">Gravity Anomaly:</span>
              <strong className="font-mono text-emerald-700">{target.evidence?.geophysics_gravity || 0.62} mGal</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SRTM Slope Gradient:</span>
              <strong className="font-mono">{target.evidence?.dem_slope_deg || 12.6}°</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Terrain Elevation:</span>
              <strong className="font-mono">350 m ASL</strong>
            </div>
          </div>
        </div>

        {/* Geological Context */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E3A8A] border-b pb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Geology & Lineaments</span>
            </span>
            <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">GSI Sausar</span>
          </div>
          <div className="space-y-1 text-xs text-slate-700 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-500">Formation:</span>
              <strong className="font-sans truncate text-purple-900">{target.geology_match}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lineament Density:</span>
              <strong className="font-mono text-amber-700">{target.evidence?.structural_lineament_density || 0.81}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Host Rock:</span>
              <strong className="font-sans">Mansar Quartzite</strong>
            </div>
          </div>
        </div>

        {/* Known Occurrences & Geochemistry */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E3A8A] border-b pb-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Geochemistry</span>
            </span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Assays</span>
          </div>
          <div className="space-y-1 text-xs text-slate-700 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-500">Stream Mn (ppm):</span>
              <strong className="font-mono text-purple-700">{target.evidence?.geochemistry_mn_ppm || 2840} ppm</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Predicted Ore Grade:</span>
              <strong className="font-mono text-amber-700">{target.predicted_grade}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Control Distance:</span>
              <strong className="font-mono">0.8 km</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Target Handoff & Drilling Recommendation Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-3 flex items-center justify-between">
          <span>Drilling Recommendation & Handoff Action Plan</span>
          <span className="text-xs text-slate-500 font-mono">Target ID: {target.target_id}</span>
        </h3>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <strong className="text-sm font-bold text-[#0B192C] font-serif block">Recommended Field Action:</strong>
          <p className="text-slate-700 leading-relaxed font-sans">
            {target.recommended_action} Execute 120m diamond core drilling inclined at -90° to confirm pyrolusite ore bed continuity across the Mansar quartzitic contact.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
          <Link
            to={`/field-survey?target_id=${target.target_id}`}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition shadow flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Open Field Survey PWA</span>
          </Link>
          <Link
            to="/drill-planning"
            className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-[#0B192C] text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-2"
          >
            <span>Return to Drill Queue</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};
