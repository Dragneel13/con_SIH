import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  Layers, 
  MapPin, 
  TrendingUp, 
  Settings, 
  Brain, 
  Target, 
  FileText, 
  Info,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { workflowApi } from '../services/api';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleLaunchWorkflow = async (targetLink: string) => {
    try {
      await workflowApi.initialize({ mineId: 'MN-BAL-001', targetId: 'MN-TGT-001' });
    } catch (err) {
      console.warn('Failed to initialize workflow state on backend:', err);
    }
    const separator = targetLink.includes('?') ? '&' : '?';
    navigate(`${targetLink}${separator}mine_id=MN-BAL-001&target_id=MN-TGT-001`);
  };

  const heroSlides = [
    {
      title: "MOIL MnVision 360 — Space-to-Mine Intelligence Platform",
      subtitle: "Empowering India's Core Manganese Industry with Space-to-Mine Satellite & Geological Intelligence",
      tagline: "A Miniratna Category-I PSU under Ministry of Steel, Govt. of India",
      cta: "Explore GIS Prospectivity Map",
      link: "/exploration",
      // Custom SVG vector render matching MOIL Underground Miners (Screenshot 1)
      renderGraphic: (
        <div className="w-full h-full bg-gradient-to-r from-slate-950 via-[#002855] to-slate-950 flex flex-col justify-end p-8 md:p-12 relative overflow-hidden">
          {/* Background Underground Mining Tunnel Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-20" />
          
          {/* Underground Mining Tunnel Silhouette Renders */}
          <div className="absolute right-6 bottom-4 opacity-30 flex items-end gap-3 pointer-events-none">
            <div className="w-24 h-48 bg-amber-600/40 rounded-t-full border-t-2 border-amber-400" />
            <div className="w-32 h-64 bg-blue-900/40 rounded-t-full border-t-2 border-blue-400" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-3 text-white">
            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Adding Strength to Steel</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold font-serif leading-tight text-white">
              Underground & Opencast Manganese Exploration AI
            </h2>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-light">
              Fusing Sentinel-2 multi-spectral indices, Sentinel-1 SAR backscatter, SRTM DEM morphometry, and GSI Sausar Group geology into explainable prospectivity models.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Precision Diamond Core Drill Target Selection",
      subtitle: "SpatialBlockCV XGBoost Prospectivity Mapping clipped to Balaghat Manganese Belt (EPSG:4326)",
      tagline: "Balaghat Manganese Belt • Madhya Pradesh",
      cta: "View Drill Targets Queue",
      link: "/drill-planning",
      renderGraphic: (
        <div className="w-full h-full bg-gradient-to-r from-[#060D18] via-[#002855] to-[#060D18] flex flex-col justify-end p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3 text-white">
            <div className="inline-flex items-center gap-2 bg-emerald-400 text-slate-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>Watershed Target Extractor</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold font-serif leading-tight text-white">
              AI Candidate Target Polygon Extraction
            </h2>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-light">
              Multi-criteria ranking combining probability scores, structural lineaments, and accessibility metrics for exploratory diamond core drilling.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "MineTwin 3D Block Model & ShortfallShield",
      subtitle: "30-60-90 Day Production Output Forecasting & Machinery Telemetry Anomaly Detection",
      tagline: "MOIL Balaghat, Ukwa & Bharweli Operations",
      cta: "View Production Dashboard",
      link: "/production",
      renderGraphic: (
        <div className="w-full h-full bg-gradient-to-r from-[#002855] via-[#0B192C] to-[#002855] flex flex-col justify-end p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3 text-white">
            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>ShortfallShield Early Warning</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold font-serif leading-tight text-white">
              Mine Operations & Machine Telemetry AI
            </h2>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-light">
              Isolation Forest anomaly detection on heavy excavators, dump trucks, and crushers paired with Google OR-Tools multi-objective decision optimization.
            </p>
          </div>
        </div>
      )
    }
  ];

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* 1. HERO CAROUSEL BANNER (Screenshot 1 & 2 Rounded Image Slider) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <div className="relative rounded-[28px] border border-slate-300 shadow-xl overflow-hidden min-h-[340px] md:min-h-[380px] flex flex-col justify-between">
          {/* Slide Graphic */}
          <div className="absolute inset-0 w-full h-full">
            {heroSlides[currentSlide].renderGraphic}
          </div>

          {/* Side Carousel Navigation Buttons (Matching Screenshot 1 Side Arrows) */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-20"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-20"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom Action Bar */}
          <div className="relative z-20 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
            <button
              onClick={() => handleLaunchWorkflow(heroSlides[currentSlide].link)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-full shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <span>{heroSlides[currentSlide].cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Slide Dots */}
            <div className="flex items-center gap-2 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentSlide ? 'bg-amber-400 w-7' : 'bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEEP ROYAL BLUE SCROLLING TICKER BAR (Matching Screenshot 1 & 2 Ticker) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="bg-[#203480] text-white py-2.5 px-6 rounded-full flex items-center gap-3 text-xs font-semibold shadow-md overflow-hidden border border-blue-900">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 flex-shrink-0 uppercase text-[11px]">
            <ChevronsRight className="w-4 h-4 text-amber-300" />
            <span>ANNOUNCEMENTS</span>
          </div>
          <div className="truncate text-[11px] text-slate-100 font-sans tracking-wide">
            <span className="text-amber-300">&gt;&gt;</span> Availability of Manganese Ore is available on MOIL's Customer Portal and has also been communicated to customers
            <span className="mx-4 text-blue-300">|</span>
            <span className="text-amber-300">&gt;&gt;</span> Recruitment Advertisement for the post of Chief General Manager (Personnel) (E-08)
            <span className="mx-4 text-blue-300">|</span>
            <span className="text-amber-300">&gt;&gt;</span> MOIL MnVision 360 Space-to-Mine Platform deployed for Balaghat Manganese Belt (2026)
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI STATISTICS GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-[#003366] font-serif psu-section-title">
            MOIL Balaghat Operational & Exploration Summary
          </h2>
          <PrototypeBadge type="badge" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Active MOIL Mines"
            value={3}
            unit="Mines"
            subtitle="Balaghat, Ukwa, Bharweli"
            icon={<Building2 className="w-5 h-5" />}
            status="ok"
          />
          <KPICard
            title="Total Ore Reserves"
            value="12.4"
            unit="Million Tonnes"
            subtitle="Proven & Probable"
            icon={<Layers className="w-5 h-5" />}
            status="ok"
          />
          <KPICard
            title="High Prospectivity Area"
            value="142.8"
            unit="sq km"
            subtitle="Prob > 0.75 Target Zone"
            icon={<MapPin className="w-5 h-5" />}
            status="ok"
          />
          <KPICard
            title="Daily Production Target"
            value="1,420"
            unit="TPD"
            subtitle="Target: 1,500 TPD (94.6%)"
            trend="up"
            trendValue="+3.2%"
            icon={<TrendingUp className="w-5 h-5" />}
            status="ok"
            isPrototype
          />
          <KPICard
            title="Machinery Availability"
            value="94.2%"
            unit="Operational"
            subtitle="Heavy Equipment Fleet"
            trend="up"
            trendValue="+1.8%"
            icon={<Settings className="w-5 h-5" />}
            status="ok"
            isPrototype
          />
        </div>
      </div>

      {/* 4. FEATURED PLATFORM MODULES GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-4 pt-2">
        <h2 className="text-base font-bold text-[#003366] font-serif psu-section-title">
          MnVision 360 Featured Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Module 1: Exploration GIS */}
          <NavLink to="/exploration" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-[#003366] hover:shadow-md transition-all group space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#003366] group-hover:text-[#003366] flex items-center justify-between">
              <span>Exploration GIS & Prospectivity</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#003366]" />
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Interactive MapLibre canvas displaying XGBoost prospectivity rasters, spatial uncertainty, lithology, lineaments, and known occurrences.
            </p>
          </NavLink>

          {/* Module 2: Drill Target AI */}
          <NavLink to="/drill-planning" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-[#003366] hover:shadow-md transition-all group space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#003366] group-hover:text-[#003366] flex items-center justify-between">
              <span>Drill Target AI Extractor</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#003366]" />
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Watershed spatial polygon extraction ranking top exploratory drill targets by probability, accessibility, and structural support.
            </p>
          </NavLink>

          {/* Module 3: MineTwin */}
          <NavLink to="/mine-twin" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-[#003366] hover:shadow-md transition-all group space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#003366] group-hover:text-[#003366] flex items-center justify-between">
              <span>MineTwin 3D Block Model</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#003366]" />
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              3D/2D Mine block model viewer with dynamic Block Readiness Matrix considering permits, rock quality (RQD), and geotechnical risk.
            </p>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
