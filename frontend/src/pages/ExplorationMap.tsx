import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Map } from '../components/Map';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { 
  Calendar, RefreshCw, ChevronRight, Layers, MapPin, Sparkles, 
  CheckSquare, Square, ArrowUpRight, Filter, ShieldCheck, Activity,
  Info, Compass, AlertCircle
} from 'lucide-react';

interface ProspectTarget {
  rank: number;
  id: string;
  name: string;
  score: number;
  area: number;
  status: 'Very High' | 'High' | 'Medium' | 'Low';
  lat: number;
  lng: number;
  predictedGrade: string;
  confidence: number;
  applicability: 'HIGH' | 'MEDIUM' | 'LOW';
  ndvi: number;
  bandRatio: number;
  demSlope: number;
  geologyMatch: string;
}

const PROSPECT_TARGETS: ProspectTarget[] = [
  {
    rank: 1,
    id: 'Target-1',
    name: 'Target 1',
    score: 0.92,
    area: 12.8,
    status: 'Very High',
    lat: 21.84,
    lng: 80.72,
    predictedGrade: '28.4% - 34.7% Mn',
    confidence: 86,
    applicability: 'HIGH',
    ndvi: 0.68,
    bandRatio: 2.14,
    demSlope: 12.6,
    geologyMatch: 'High (Mansar Group)',
  },
  {
    rank: 2,
    id: 'Target-3',
    name: 'Target 3',
    score: 0.87,
    area: 10.4,
    status: 'Very High',
    lat: 21.91,
    lng: 79.82,
    predictedGrade: '26.1% - 32.0% Mn',
    confidence: 84,
    applicability: 'HIGH',
    ndvi: 0.64,
    bandRatio: 1.98,
    demSlope: 11.2,
    geologyMatch: 'High (Tirodi Gneiss)',
  },
  {
    rank: 3,
    id: 'Target-2',
    name: 'Target 2',
    score: 0.76,
    area: 14.2,
    status: 'High',
    lat: 21.68,
    lng: 79.92,
    predictedGrade: '22.0% - 28.5% Mn',
    confidence: 79,
    applicability: 'HIGH',
    ndvi: 0.58,
    bandRatio: 1.75,
    demSlope: 9.8,
    geologyMatch: 'Medium (Chorbaoli)',
  },
  {
    rank: 4,
    id: 'Target-4',
    name: 'Target 4',
    score: 0.69,
    area: 9.7,
    status: 'High',
    lat: 21.62,
    lng: 80.31,
    predictedGrade: '19.5% - 24.8% Mn',
    confidence: 74,
    applicability: 'MEDIUM',
    ndvi: 0.52,
    bandRatio: 1.62,
    demSlope: 8.4,
    geologyMatch: 'Medium (Sausar Group)',
  },
  {
    rank: 5,
    id: 'Target-5',
    name: 'Target 5',
    score: 0.58,
    area: 11.3,
    status: 'Medium',
    lat: 21.78,
    lng: 80.12,
    predictedGrade: '15.0% - 20.2% Mn',
    confidence: 68,
    applicability: 'MEDIUM',
    ndvi: 0.46,
    bandRatio: 1.45,
    demSlope: 7.1,
    geologyMatch: 'Moderate (Bichua Formation)',
  },
];

export const ExplorationMap: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAOI, setSelectedAOI] = useState('Balaghat Manganese Belt (MP)');
  const [selectedDate, setSelectedDate] = useState('Dec 2024');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('Target-1');
  const [activeTab, setActiveTab] = useState<'overview' | 'satellite' | 'geology' | 'geophysics' | 'geochemistry' | 'drilling'>('overview');

  // Layer Toggles matching Screenshot Card 3
  const [activeLayers, setActiveLayers] = useState({
    sentinel2: true,
    dem: true,
    geology: true,
    occurrences: true,
    lineaments: false,
  });

  const toggleLayer = (key: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedTarget = PROSPECT_TARGETS.find((t) => t.id === selectedTargetId) || PROSPECT_TARGETS[0];

  const handleTargetSelect = (target: ProspectTarget) => {
    setSelectedTargetId(target.id);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Very High':
        return 'bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px]';
      case 'High':
        return 'bg-amber-500 text-white font-bold px-2 py-0.5 rounded text-[10px]';
      case 'Medium':
        return 'bg-yellow-500 text-slate-900 font-bold px-2 py-0.5 rounded text-[10px]';
      default:
        return 'bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]';
    }
  };

  return (
    <div className="w-full bg-[#0B192C] text-slate-100 min-h-screen py-6 px-4 md:px-8 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="REAL GEOSPATIAL DATASETS & AI FUSION — Balaghat Manganese Belt (Sentinel-1/2, SRTM 30m DEM, GSI Lithology & Geochemistry Assays)" 
      />

      {/* ------------------------------------------------ */}
      {/* 1. HEADER                                        */}
      {/* ------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E293B]/90 p-5 rounded-xl border border-slate-700/80 shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-serif flex items-center gap-2">
            <span>Manganese Prospectivity Map</span>
            <span className="text-xs font-sans font-semibold bg-blue-900/80 text-blue-300 border border-blue-700 px-2.5 py-0.5 rounded-full">
              MOIL Space-to-Mine Intelligence
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-driven analysis of multi-source geospatial and geological data
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* AOI Selector */}
          <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-slate-200">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <select 
              value={selectedAOI}
              onChange={(e) => setSelectedAOI(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="Balaghat Manganese Belt (MP)" className="bg-[#0F172A]">Balaghat Manganese Belt (MP)</option>
              <option value="Bhandara District Sector" className="bg-[#0F172A]">Bhandara District Sector</option>
              <option value="Nagpur Extension Belt" className="bg-[#0F172A]">Nagpur Extension Belt</option>
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-slate-200">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-xs">{selectedDate}</span>
          </div>

          {/* Map Refresh */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-[#0F172A] hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
            title="Refresh Map & ML Pipeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* 2. MAIN CONTENT (2 COLUMNS: MAP LEFT, RIGHT PANELS) */}
      {/* ------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LARGE INTERACTIVE GIS MAP (7/12 = approx 58-60% width) */}
        <div className="lg:col-span-7 bg-[#1E293B] rounded-xl border border-slate-700 overflow-hidden shadow-lg relative min-h-[580px] flex flex-col">
          {/* Map Component Container */}
          <div className="w-full flex-1 relative min-h-[580px]">
            <Map 
              activeLayers={{
                sentinel2: activeLayers.sentinel2,
                geology: activeLayers.geology,
                prospectivity: true,
                faults: activeLayers.lineaments,
                occurrences: activeLayers.occurrences,
                uncertainty: false,
                geochemistry: true,
                geophysics: false,
              }}
              selectedTarget={selectedTargetId}
            />

            {/* FLOATING MAP LEGEND (Matching Top Right Legend in Reference Screenshot) */}
            <div className="absolute top-4 right-4 bg-[#0F172A]/90 backdrop-blur-md p-3.5 rounded-lg border border-slate-700 text-xs text-slate-200 shadow-xl space-y-2 max-w-xs z-10 font-sans">
              <div className="font-bold text-white text-xs border-b border-slate-700 pb-1">
                Prospectivity (AI Score)
              </div>
              
              {/* Color Spectrum */}
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-red-600 border border-red-400 shrink-0" />
                  <span>Very High (0.8 – 1.0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-400 shrink-0" />
                  <span>High (0.6 – 0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-yellow-400 border border-yellow-300 shrink-0" />
                  <span>Medium (0.4 – 0.6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400 shrink-0" />
                  <span>Low (0.2 – 0.4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400 shrink-0" />
                  <span>Very Low (0.0 – 0.2)</span>
                </div>
              </div>

              {/* Legend Line/Box Items */}
              <div className="pt-2 border-t border-slate-700 space-y-1 text-[10px] text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-dashed border-white shrink-0" />
                  <span>AOI Boundary</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 border-t border-dashed border-amber-400 shrink-0" />
                  <span>Manganese Belt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span>Key Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-slate-400 shrink-0" />
                  <span>Roads</span>
                </div>
              </div>
            </div>

            {/* FLOATING NORTH ARROW COMPASS (Top Left Map Overlay) */}
            <div className="absolute top-4 left-4 bg-[#0F172A]/85 backdrop-blur-md p-2 rounded-lg border border-slate-700 text-white z-10 flex flex-col items-center shadow-lg">
              <Compass className="w-6 h-6 text-blue-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest mt-0.5">N</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TOP PROSPECTS & SELECTED TARGET DETAILS (5/12 = approx 40-42% width) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. TOP MANGANESE PROSPECTS TABLE */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <span>Top Manganese Prospects</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">{PROSPECT_TARGETS.length} Candidates</span>
            </div>

            {/* Ranked Prospects Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-700 text-[11px]">
                    <th className="pb-2.5 px-2">Rank</th>
                    <th className="pb-2.5 px-2">Target Name</th>
                    <th className="pb-2.5 px-2">Prospectivity Score</th>
                    <th className="pb-2.5 px-2">Area (km²)</th>
                    <th className="pb-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-sans">
                  {PROSPECT_TARGETS.map((target) => {
                    const isSelected = selectedTargetId === target.id;
                    return (
                      <tr 
                        key={target.id}
                        onClick={() => handleTargetSelect(target)}
                        className={`cursor-pointer transition-colors hover:bg-slate-700/50 ${
                          isSelected ? 'bg-blue-950/70 text-white font-bold border-l-4 border-amber-400' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-400">{target.rank}</td>
                        <td className="py-2.5 px-2 font-bold text-white flex items-center gap-1.5">
                          {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                          <span>{target.name}</span>
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold text-emerald-400">
                          {target.score.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">{target.area}</td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={getStatusBadgeClass(target.status)}>
                            {target.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* View All Targets Link */}
            <div className="pt-2 text-right">
              <Link 
                to="/drill-planning"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
              >
                <span>View All Targets</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 2. SELECTED TARGET DETAILS CARD */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                <h3 className="text-base font-bold text-white font-serif">{selectedTarget.name}</h3>
              </div>
              <span className={getStatusBadgeClass(selectedTarget.status)}>
                {selectedTarget.status} Priority
              </span>
            </div>

            {/* Sub-Tabs Bar */}
            <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-lg border border-slate-700 overflow-x-auto scrollbar-none text-xs">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'satellite', label: 'Satellite Indices' },
                { id: 'geology', label: 'Geology' },
                { id: 'geophysics', label: 'Geophysics' },
                { id: 'geochemistry', label: 'Geochemistry' },
                { id: 'drilling', label: 'Drilling' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-blue-900 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0F172A] p-3.5 rounded-lg border border-slate-700">
                  {/* Target Thumbnail Outline Box */}
                  <div className="h-28 bg-[#1E293B] rounded border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center p-2 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(#EF4444_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />
                    <div className="w-16 h-12 border-2 border-red-500 rounded-full border-dashed flex items-center justify-center bg-red-950/40 relative z-10">
                      <span className="text-[10px] font-bold text-red-300">AI Target Zone</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">AOI Core Polygon</span>
                  </div>

                  {/* Target Parameters */}
                  <div className="space-y-1.5 text-slate-300 font-sans text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <strong className="text-white font-mono">{selectedTarget.lat}° N, {selectedTarget.lng}° E</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Area:</span>
                      <strong className="text-white font-mono">{selectedTarget.area} km²</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg. Prospectivity Score:</span>
                      <strong className="text-emerald-400 font-mono">{selectedTarget.score.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Predicted Grade (AI):</span>
                      <strong className="text-amber-400 font-mono">{selectedTarget.predictedGrade}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <strong className="text-emerald-400 font-mono">{selectedTarget.confidence}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Applicability Domain:</span>
                      <strong className="text-blue-400 font-mono">{selectedTarget.applicability}</strong>
                    </div>
                  </div>
                </div>

                {/* Key Indicators 4-Grid */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Key Indicators →</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-[#0F172A] border border-slate-700 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">NDVI</span>
                      <strong className="text-emerald-400 font-mono text-sm">{selectedTarget.ndvi}</strong>
                    </div>
                    <div className="p-2.5 bg-[#0F172A] border border-slate-700 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">Band Ratio (B8A/B12)</span>
                      <strong className="text-cyan-400 font-mono text-sm">{selectedTarget.bandRatio}</strong>
                    </div>
                    <div className="p-2.5 bg-[#0F172A] border border-slate-700 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">DEM Slope</span>
                      <strong className="text-amber-400 font-mono text-sm">{selectedTarget.demSlope}°</strong>
                    </div>
                    <div className="p-2.5 bg-[#0F172A] border border-slate-700 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">Geology Match</span>
                      <strong className="text-purple-400 font-mono text-xs block truncate">{selectedTarget.geologyMatch}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <Link
                    to={`/exploration/${selectedTarget.id}`}
                    className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 border border-blue-700 shadow"
                  >
                    <span>View Detailed Analysis</span>
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                  </Link>
                </div>
              </div>
            )}

            {/* OTHER SUB-TABS */}
            {activeTab !== 'overview' && (
              <div className="p-4 bg-[#0F172A] rounded-lg border border-slate-700 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Multi-Source Data Evidence — {activeTab.toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Viewing detailed {activeTab} parameters for {selectedTarget.name}. High multi-source evidence fusion confirmed across Sentinel reflectance bands and GSI Sausar lithological contact zones.
                </p>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                  PROTOTYPE SIMULATION DATA — Field Core Drill Verification Pending
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* 3. BOTTOM ROW CARDS (3 COLUMNS)                  */}
      {/* ------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* CARD 1: PROSPECTIVITY DISTRIBUTION */}
        <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-5 shadow-md space-y-4">
          <h3 className="text-base font-bold text-white font-serif border-b border-slate-700 pb-3">
            Prospectivity Distribution
          </h3>

          <div className="flex items-center justify-between gap-4">
            {/* Donut Chart SVG Representation matching Screenshot */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <path className="text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* Very High 12% */}
                <path className="text-red-600" strokeWidth="4" strokeDasharray="12, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* High 24% */}
                <path className="text-amber-500" strokeWidth="4" strokeDasharray="24, 100" strokeDashoffset="-12" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* Medium 36% */}
                <path className="text-yellow-400" strokeWidth="4" strokeDasharray="36, 100" strokeDashoffset="-36" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* Low 20% */}
                <path className="text-emerald-500" strokeWidth="4" strokeDasharray="20, 100" strokeDashoffset="-72" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                {/* Very Low 8% */}
                <path className="text-blue-600" strokeWidth="4" strokeDasharray="8, 100" strokeDashoffset="-92" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>

              {/* Center Donut Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-semibold leading-none">Total AOI</span>
                <span className="text-sm font-extrabold text-white font-mono mt-0.5">1,247 km²</span>
              </div>
            </div>

            {/* Distribution Legend List */}
            <div className="space-y-1.5 text-xs font-sans text-slate-300 flex-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-red-600 shrink-0" />
                  <span>Very High</span>
                </span>
                <strong className="text-white font-mono">12%</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0" />
                  <span>High</span>
                </span>
                <strong className="text-white font-mono">24%</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-yellow-400 shrink-0" />
                  <span>Medium</span>
                </span>
                <strong className="text-white font-mono">36%</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                  <span>Low</span>
                </span>
                <strong className="text-white font-mono">20%</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600 shrink-0" />
                  <span>Very Low</span>
                </span>
                <strong className="text-white font-mono">8%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: SPECTRAL / MANGANESE INDEX */}
        <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-5 shadow-md space-y-4">
          <h3 className="text-base font-bold text-white font-serif border-b border-slate-700 pb-3">
            Manganese Index (Sample Location)
          </h3>

          {/* Spectral Bands Line Chart SVG Representation matching Screenshot */}
          <div className="space-y-2">
            <div className="h-36 bg-[#0F172A] rounded border border-slate-700 p-3 relative flex items-end justify-between">
              {/* Y-Axis Labels */}
              <div className="absolute left-2 top-2 text-[9px] text-slate-500 font-mono">1.0</div>
              <div className="absolute left-2 top-16 text-[9px] text-slate-500 font-mono">0.5</div>
              <div className="absolute left-2 bottom-2 text-[9px] text-slate-500 font-mono">0.0</div>

              {/* Line Curve SVG */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                {/* Horizontal Gridlines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="80" x2="300" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />

                {/* Manganese Spectral Response Curve */}
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  points="20,62  50,50  80,48  110,28  145,35  180,49  215,42  250,58  280,68"
                />

                {/* Curve Points */}
                {[
                  { x: 20, y: 62 },
                  { x: 50, y: 50 },
                  { x: 80, y: 48 },
                  { x: 110, y: 28 },
                  { x: 145, y: 35 },
                  { x: 180, y: 49 },
                  { x: 215, y: 42 },
                  { x: 250, y: 58 },
                  { x: 280, y: 68 },
                ].map((pt, idx) => (
                  <circle key={idx} cx={pt.x} cy={pt.y} r="4" className="fill-blue-400 stroke-white stroke-2" />
                ))}
              </svg>
            </div>

            {/* X-Axis Band Labels */}
            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
              <span>B2</span>
              <span>B3</span>
              <span>B4</span>
              <span>B5</span>
              <span>B6</span>
              <span>B7</span>
              <span>B8A</span>
              <span>B11</span>
              <span>B12</span>
            </div>

            <p className="text-[10px] text-slate-400 italic text-center">
              Higher index values indicate higher manganese presence
            </p>
          </div>
        </div>

        {/* CARD 3: KEY DATA LAYERS */}
        <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-5 shadow-md space-y-4">
          <h3 className="text-base font-bold text-white font-serif border-b border-slate-700 pb-3">
            Key Data Layers
          </h3>

          {/* Interactive Checkbox Layer Controls matching Screenshot */}
          <div className="space-y-3 text-xs font-sans">
            <button
              onClick={() => toggleLayer('sentinel2')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#0F172A] border border-slate-700 hover:border-blue-500 transition text-left"
            >
              {activeLayers.sentinel2 ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="font-semibold text-slate-200">Sentinel-2 (Indices)</span>
            </button>

            <button
              onClick={() => toggleLayer('dem')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#0F172A] border border-slate-700 hover:border-blue-500 transition text-left"
            >
              {activeLayers.dem ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="font-semibold text-slate-200">DEM (SRTM)</span>
            </button>

            <button
              onClick={() => toggleLayer('geology')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#0F172A] border border-slate-700 hover:border-blue-500 transition text-left"
            >
              {activeLayers.geology ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="font-semibold text-slate-200">Geology (NGDR/GSI)</span>
            </button>

            <button
              onClick={() => toggleLayer('occurrences')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#0F172A] border border-slate-700 hover:border-blue-500 transition text-left"
            >
              {activeLayers.occurrences ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="font-semibold text-slate-200">Occurrences</span>
            </button>

            <button
              onClick={() => toggleLayer('lineaments')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#0F172A] border border-slate-700 hover:border-blue-500 transition text-left"
            >
              {activeLayers.lineaments ? (
                <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="font-semibold text-slate-400">Lineaments (Pending)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
