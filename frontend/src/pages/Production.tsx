import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShieldAlert, Activity, Zap, ArrowRight, X, AlertTriangle, 
  CheckCircle2, Clock, BarChart2, ShieldCheck, Sparkles, Layers
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';

interface HorizonForecast {
  horizon_days: number;
  target_production_tonnes: number;
  predicted_production_tonnes: number;
  expected_tonnes_short: number;
  shortfall_probability: number;
  shortfall_percentage: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  shap: Array<{
    feature: string;
    label: string;
    contribution_tonnes: number;
    pct_impact: number;
  }>;
}

export const Production: React.FC = () => {
  const navigate = useNavigate();
  const [selectedHorizon, setSelectedHorizon] = useState<'7_day' | '15_day' | '30_day'>('7_day');
  const [shortfallData, setShortfallData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shortfallshield')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setShortfallData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const forecasts = shortfallData?.horizons || {
    '7_day': {
      horizon_days: 7,
      target_production_tonnes: 2800.0,
      predicted_production_tonnes: 2450.0,
      expected_tonnes_short: 350.0,
      shortfall_probability: 0.685,
      shortfall_percentage: 68.5,
      risk_level: 'MEDIUM',
      shap: [
        { feature: 'equip_downtime_hours', label: 'Equipment Downtime (EX-104 Haul Truck)', contribution_tonnes: 165.0, pct_impact: 24.5 },
        { feature: 'block_readiness_score', label: 'Block Readiness Delay (Block B-09 & B-18)', contribution_tonnes: 110.0, pct_impact: 19.2 },
        { feature: 'rainfall_soil_moisture', label: 'Monsoon Rainfall & Haul Road Slurry', contribution_tonnes: 45.0, pct_impact: 14.0 },
        { feature: 'crusher_capacity', label: 'Primary Jaw Crusher Bottleneck', contribution_tonnes: 20.0, pct_impact: 11.2 },
        { feature: 'development_stope_delay', label: 'Level 3 West Stope Development Delay', contribution_tonnes: 10.0, pct_impact: 9.1 }
      ]
    },
    '15_day': {
      horizon_days: 15,
      target_production_tonnes: 6000.0,
      predicted_production_tonnes: 5120.0,
      expected_tonnes_short: 880.0,
      shortfall_probability: 0.742,
      shortfall_percentage: 74.2,
      risk_level: 'HIGH',
      shap: [
        { feature: 'equip_downtime_hours', label: 'Equipment Downtime (EX-104 Haul Truck)', contribution_tonnes: 410.0, pct_impact: 26.0 },
        { feature: 'block_readiness_score', label: 'Block Readiness Delay (Block B-09 & B-18)', contribution_tonnes: 260.0, pct_impact: 21.0 },
        { feature: 'rainfall_soil_moisture', label: 'Monsoon Rainfall & Haul Road Slurry', contribution_tonnes: 120.0, pct_impact: 15.0 },
        { feature: 'crusher_capacity', label: 'Primary Jaw Crusher Bottleneck', contribution_tonnes: 60.0, pct_impact: 10.5 },
        { feature: 'development_stope_delay', label: 'Level 3 West Stope Development Delay', contribution_tonnes: 30.0, pct_impact: 8.5 }
      ]
    },
    '30_day': {
      horizon_days: 30,
      target_production_tonnes: 12000.0,
      predicted_production_tonnes: 9840.0,
      expected_tonnes_short: 2160.0,
      shortfall_probability: 0.810,
      shortfall_percentage: 81.0,
      risk_level: 'HIGH',
      shap: [
        { feature: 'equip_downtime_hours', label: 'Equipment Downtime (EX-104 Haul Truck)', contribution_tonnes: 980.0, pct_impact: 28.0 },
        { feature: 'block_readiness_score', label: 'Block Readiness Delay (Block B-09 & B-18)', contribution_tonnes: 620.0, pct_impact: 22.5 },
        { feature: 'rainfall_soil_moisture', label: 'Monsoon Rainfall & Haul Road Slurry', contribution_tonnes: 320.0, pct_impact: 16.0 },
        { feature: 'crusher_capacity', label: 'Primary Jaw Crusher Bottleneck', contribution_tonnes: 140.0, pct_impact: 10.0 },
        { feature: 'development_stope_delay', label: 'Level 3 West Stope Development Delay', contribution_tonnes: 100.0, pct_impact: 8.0 }
      ]
    }
  };

  const currentForecast: HorizonForecast = forecasts[selectedHorizon];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return <span className="bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded text-xs">HIGH RISK 🔴</span>;
      case 'MEDIUM':
        return <span className="bg-amber-500 text-slate-900 font-extrabold px-2.5 py-0.5 rounded text-xs">MEDIUM RISK 🟡</span>;
      default:
        return <span className="bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded text-xs">LOW RISK 🟢</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="PROTOTYPE SIMULATION DATA — MOIL ShortfallShield Multi-Horizon Shortfall Forecasting & SHAP Root Cause Analysis" 
      />

      {/* Page Title Header */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-amber-300" />
            <span>OPERATIONAL INTELLIGENCE & SHORTFALLSHIELD</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            ShortfallShield: 7 / 15 / 30 Day Production Shortfall Forecasting
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            RandomForest / XGBoost time-split model taking MineTwin block readiness & equipment telemetry inputs
          </p>
        </div>

        {/* Horizon Tabs Bar */}
        <div className="flex items-center gap-2 bg-[#1B2170]/80 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-inner">
          {(['7_day', '15_day', '30_day'] as const).map((hKey) => {
            const hNum = hKey === '7_day' ? 7 : hKey === '15_day' ? 15 : 30;
            return (
              <button
                key={hKey}
                onClick={() => setSelectedHorizon(hKey)}
                className={`px-4 py-1.5 rounded-full font-bold text-xs transition ${
                  selectedHorizon === hKey
                    ? 'bg-white text-[#313896] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {hNum} Days Forecast
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Horizon Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key: '7_day', title: '7-Day Forecast', data: forecasts['7_day'] },
          { key: '15_day', title: '15-Day Forecast', data: forecasts['15_day'] },
          { key: '30_day', title: '30-Day Forecast', data: forecasts['30_day'] }
        ].map(({ key, title, data }) => {
          const isSelected = selectedHorizon === key;
          return (
            <div
              key={key}
              onClick={() => setSelectedHorizon(key as any)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition-all ${
                isSelected
                  ? 'bg-white border-[#313896] ring-2 ring-[#313896] shadow-md'
                  : 'bg-white border-slate-200 hover:border-[#313896]/50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-serif font-bold text-base text-[#313896]">
                  {title}
                </span>
                {getRiskBadge(data.risk_level)}
              </div>

              <div className="mt-4 space-y-2.5 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Output:</span>
                  <strong className="font-mono text-slate-900">{data.target_production_tonnes.toLocaleString()} MT</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Predicted Output:</span>
                  <strong className="font-mono text-[#313896] font-bold">{data.predicted_production_tonnes.toLocaleString()} MT</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Shortfall:</span>
                  <strong className="font-mono text-red-600 font-bold">-{data.expected_tonnes_short.toLocaleString()} MT</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Shortfall Probability:</span>
                  <strong className="font-mono text-amber-700 font-bold">{data.shortfall_percentage}%</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SHAP Root Cause Breakdown Panel (Why is Production at Risk?) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#313896] uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>SHAP MODEL ATTRITION EXPLAINER ({currentForecast.horizon_days}-DAY HORIZON)</span>
            </div>
            <h2 className="text-xl font-bold text-[#313896] font-serif mt-1">
              Why is Production at Risk? ({currentForecast.expected_tonnes_short} MT Expected Deficit)
            </h2>
          </div>
          
          {/* Action Button: Generate Prescriptive Recovery Plan -> Navigates to /decision-center */}
          <Link
            to="/decision-center"
            className="px-6 py-2.5 bg-[#313896] hover:bg-[#282D7A] text-white font-bold text-xs rounded-full transition shadow-sm flex items-center gap-2 shrink-0"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Generate Prescriptive Recovery Plan</span>
          </Link>
        </div>

        {/* Tree SHAP Feature Contribution Bars */}
        <div className="space-y-4">
          {currentForecast.shap.map((shapItem, idx) => (
            <div key={idx} className="p-4 bg-[#F8FAFC] border border-slate-200/80 rounded-xl space-y-2 text-xs font-sans">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#313896] text-xs">{shapItem.label}</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-red-700 font-bold">-{shapItem.contribution_tonnes} MT</span>
                  <span className="bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded-full text-[11px]">
                    +{shapItem.pct_impact}% SHAP
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#313896] transition-all duration-500" 
                  style={{ width: `${Math.min(100, shapItem.pct_impact * 3.5)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 bg-[#EBEFFA] border border-[#D0DCF5] rounded-xl text-xs text-[#313896] font-mono flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#313896] shrink-0" />
          <span>SHAP feature contributions generated by TreeExplainer on operational & environmental telemetry features.</span>
        </div>
      </div>
    </div>
  );
};
