import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, 
  BarChart2, ShieldCheck, Database, Layers, Activity, RefreshCw, Zap
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { productionApi, workflowApi } from '../services/api';

interface ShortfallState {
  status: string;
  has_shortfall: boolean;
  shortfall_status: string;
  shortfall_id: string | null;
  forecast_id: string;
  target_id: string;
  mine_id: string;
  target_tonnes: number;
  forecast_tonnes: number;
  production_gap_tonnes: number;
  shortfall_tonnes: number;
  shortfall_percent: number;
  surplus_tonnes: number;
  created_at?: string;
}

export const ProductionShortfall: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const forecastIdParam = searchParams.get('forecast_id');
  const targetIdParam = searchParams.get('target_id');
  const mineIdParam = searchParams.get('mine_id');

  const [loading, setLoading] = useState<boolean>(true);
  const [dataMissingError, setDataMissingError] = useState<string | null>(null);
  
  const [forecastContext, setForecastContext] = useState<any>(null);
  const [shortfallEval, setShortfallEval] = useState<ShortfallState | null>(null);

  useEffect(() => {
    loadForecastAndEvaluateShortfall();
  }, [forecastIdParam, targetIdParam, mineIdParam]);

  const loadForecastAndEvaluateShortfall = async () => {
    setLoading(true);
    setDataMissingError(null);

    try {
      const wfRes = await workflowApi.getState();
      const wf = wfRes.data?.workflow || {};

      const activeForecastId = forecastIdParam || wf.forecastId || 'FCST-2026-001';
      const activeTargetId = targetIdParam || wf.targetId || 'MN-TGT-001';
      const activeMineId = mineIdParam || wf.mineId || 'MN-BAL-001';
      const activeLat = wf.latitude || 21.84;
      const activeLng = wf.longitude || 80.72;

      const fcstRes = await productionApi.forecastTonnes({
        latitude: activeLat,
        longitude: activeLng,
        target_id: activeTargetId,
        mine_id: activeMineId
      });

      const fcstData = fcstRes.data;

      if (!fcstData || fcstData.status === 'MAPPED_FAILED') {
        setDataMissingError('Unable to retrieve the selected production forecast. Mine/operational mapping is unavailable for this location.');
        setLoading(false);
        return;
      }

      const targetTonnes = fcstData.forecast_result?.target_tonnes;
      const forecastTonnes = fcstData.forecast_result?.forecast_tonnes;

      if (targetTonnes === undefined || targetTonnes === null || forecastTonnes === undefined || forecastTonnes === null || targetTonnes <= 0) {
        setDataMissingError('DATA NOT AVAILABLE — Target production or forecast tonnage is missing or unvalidated.');
        setLoading(false);
        return;
      }

      setForecastContext(fcstData);

      const sfRes = await productionApi.recordShortfall({
        forecast_id: activeForecastId,
        target_id: activeTargetId,
        mine_id: activeMineId,
        target_tonnes: targetTonnes,
        forecast_tonnes: forecastTonnes
      });

      const sfData: ShortfallState = sfRes.data;
      setShortfallEval(sfData);

      if (sfData.shortfall_id) {
        await workflowApi.updateState({
          shortfallId: sfData.shortfall_id,
          forecastId: activeForecastId,
          targetId: activeTargetId,
          mineId: activeMineId
        });
      }

      setLoading(false);
    } catch (err) {
      setDataMissingError('DATA NOT AVAILABLE — Failed to connect to forecast persistence server.');
      setLoading(false);
    }
  };

  const handleAnalyzeWhy = async () => {
    if (!shortfallEval || !shortfallEval.has_shortfall) return;

    try {
      await workflowApi.updateState({
        currentStage: 'shap',
        shortfallId: shortfallEval.shortfall_id,
        forecastId: shortfallEval.forecast_id,
        targetId: shortfallEval.target_id,
        mineId: shortfallEval.mine_id
      });
    } catch (err) {
      console.warn('Workflow state update notice:', err);
    }

    const params = new URLSearchParams();
    if (shortfallEval.forecast_id) params.set('forecast_id', shortfallEval.forecast_id);
    if (shortfallEval.shortfall_id) params.set('shortfall_id', shortfallEval.shortfall_id);
    if (shortfallEval.target_id) params.set('target_id', shortfallEval.target_id);
    if (shortfallEval.mine_id) params.set('mine_id', shortfallEval.mine_id);

    navigate(`/shortfall-analysis?${params.toString()}`);
  };

  const handleBackToEstimateProduction = () => {
    navigate('/production');
  };

  return (
    <div className="w-full bg-[#F8FAFC] text-slate-900 min-h-screen py-6 px-4 md:px-8 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="PAGE 3: PRODUCTION SHORTFALL — Production Target Assessment & Gap Analysis (Balaghat Belt)" 
      />

      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <BarChart2 className="w-4 h-4 text-amber-300" />
            <span>PAGE 3: PRODUCTION SHORTFALL</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
            PRODUCTION SHORTFALL
          </h1>
          <p className="text-xs text-blue-100/90 font-medium">
            Production Target Assessment & Deterministic Gap Evaluation
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-blue-100">
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Mine: {forecastContext?.mine_name || 'Balaghat Underground Mine'}
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Mine Type: {forecastContext?.mine_type || 'UNDERGROUND'}
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Target ID: {shortfallEval?.target_id || forecastContext?.target_id || 'MN-TGT-001'}
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20 font-bold text-amber-300">
              Forecast ID: {shortfallEval?.forecast_id || forecastContext?.forecast_id || 'FCST-2026-001'}
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-[#1B2170]/80 px-2.5 py-1 rounded-md border border-white/20">
              Forecast Period: {forecastContext?.forecast_result?.forecast_period || 'Next 7-Day Operational Horizon'}
            </span>
            <span className="text-white/40">•</span>
            <span className="bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40 font-bold">
              Data Status: Prototype Data
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={handleBackToEstimateProduction}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full border border-white/30 transition flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            <span>[ BACK TO ESTIMATE PRODUCTION ]</span>
          </button>
        </div>
      </div>

      {dataMissingError && (
        <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-xl text-red-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <strong className="font-bold text-sm block uppercase tracking-wide text-red-900">
                FORECAST DATA UNAVAILABLE
              </strong>
              <p className="mt-1 leading-relaxed text-red-800">{dataMissingError}</p>
            </div>
          </div>
          <button
            onClick={handleBackToEstimateProduction}
            className="px-4 py-2 bg-[#313896] hover:bg-[#282D7A] text-white font-bold text-xs rounded-full shadow"
          >
            [ BACK TO ESTIMATE PRODUCTION ]
          </button>
        </div>
      )}

      {!dataMissingError && shortfallEval && forecastContext && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#313896]" />
                <span>PRODUCTION ASSESSMENT</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Source of Truth: Persisted Page 2 Forecast ({shortfallEval.forecast_id})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-center">
              <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-sans font-semibold text-xs block">TARGET PRODUCTION</span>
                <strong className="text-2xl text-slate-900 font-bold block mt-1">
                  {shortfallEval.target_tonnes.toLocaleString()} tonnes
                </strong>
              </div>

              <div className="p-5 bg-[#EBEFFA] border border-[#D0DCF5] rounded-xl space-y-1">
                <span className="text-[#313896] font-sans font-semibold text-xs block">FORECAST PRODUCTION</span>
                <strong className="text-2xl text-[#313896] font-extrabold block mt-1">
                  {shortfallEval.forecast_tonnes.toLocaleString()} tonnes
                </strong>
              </div>

              <div className={`p-5 rounded-xl border space-y-1 ${
                shortfallEval.has_shortfall ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <span className="font-sans font-semibold text-xs block">PRODUCTION GAP</span>
                <strong className="text-2xl font-extrabold block mt-1">
                  {shortfallEval.production_gap_tonnes > 0 ? '+' : ''}
                  {shortfallEval.production_gap_tonnes.toLocaleString()} tonnes
                </strong>
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-200 space-y-4">
              <span className="font-bold text-xs text-[#313896] font-serif uppercase tracking-wider block border-b border-slate-200 pb-2">
                TARGET vs FORECAST TONNAGE COMPARISON VISUAL
              </span>

              {(() => {
                const maxVal = Math.max(shortfallEval.target_tonnes, shortfallEval.forecast_tonnes) * 1.15;
                const tgtPct = (shortfallEval.target_tonnes / maxVal) * 100;
                const fcstPct = (shortfallEval.forecast_tonnes / maxVal) * 100;

                return (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between font-sans">
                        <span className="font-bold text-slate-700">TARGET PRODUCTION:</span>
                        <strong className="text-slate-900">{shortfallEval.target_tonnes.toLocaleString()} tonnes</strong>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div className="bg-[#313896] h-full rounded-full transition-all duration-500" style={{ width: `${tgtPct}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-sans">
                        <span className="font-bold text-[#313896]">FORECAST PRODUCTION:</span>
                        <strong className="text-[#313896]">{shortfallEval.forecast_tonnes.toLocaleString()} tonnes</strong>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          shortfallEval.has_shortfall ? 'bg-amber-500' : 'bg-emerald-600'
                        }`} style={{ width: `${fcstPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {shortfallEval.has_shortfall ? (
              <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-xl text-red-900 text-xs space-y-3 font-sans shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="font-bold text-base block text-red-900 font-serif uppercase tracking-wide">
                        STATUS: POTENTIAL PRODUCTION SHORTFALL
                      </strong>
                      <p className="text-red-800 leading-relaxed text-xs">
                        Expected production falls short of required target by <strong>{shortfallEval.shortfall_tonnes} tonnes</strong> ({shortfallEval.shortfall_percent}% shortfall margin).
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-100 border border-red-300 text-red-900 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold text-right shrink-0">
                    SHORTFALL RECORD: {shortfallEval.shortfall_id}
                  </div>
                </div>

                <div className="pt-3 border-t border-red-200 flex items-center justify-between">
                  <span className="font-mono text-red-800 text-[11px]">
                    Shortfall Margin: {shortfallEval.shortfall_percent}% ({shortfallEval.shortfall_tonnes} t)
                  </span>

                  <button
                    onClick={handleAnalyzeWhy}
                    className="px-6 py-2.5 bg-[#313896] hover:bg-[#282D7A] text-white font-extrabold text-xs rounded-full shadow transition flex items-center gap-2 shrink-0 active:scale-95"
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>[ ANALYZE WHY ]</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-5 rounded-xl text-emerald-900 text-xs space-y-3 font-sans shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-base block text-emerald-900 font-serif uppercase tracking-wide">
                      STATUS: TARGET CURRENTLY ACHIEVABLE
                    </strong>
                    <p className="text-emerald-800 leading-relaxed text-xs">
                      Expected production meets or exceeds required target. Shortfall: <strong>0 tonnes</strong>.
                      {shortfallEval.surplus_tonnes > 0 && ` Expected Surplus: +${shortfallEval.surplus_tonnes} tonnes.`}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <span className="font-mono text-emerald-800 text-[11px]">
                    Shortfall: 0 tonnes | Status: On Target Production
                  </span>

                  <button
                    onClick={handleBackToEstimateProduction}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-full shadow transition"
                  >
                    [ VIEW FORECAST DETAILS ]
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#313896]" />
                  <span>FORECAST DETAILS & PROVENANCE</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Page 2 Audit Record</span>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Forecast ID:</span>
                  <strong className="font-mono text-[#313896] font-bold">{shortfallEval.forecast_id}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Model Name:</span>
                  <strong className="font-mono text-slate-900">{forecastContext.model_status?.model_name || 'HistGradientBoostingRegressor'}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Model Version:</span>
                  <strong className="font-mono text-slate-900">{forecastContext.model_status?.model_version || 'v2.1 (Tonnage Regression)'}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Forecast Period:</span>
                  <strong className="font-mono text-slate-900">{forecastContext.forecast_result?.forecast_period || 'Next 7-Day Operational Horizon'}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Target ID:</span>
                  <strong className="font-mono text-slate-900">{shortfallEval.target_id}</strong>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-600 font-semibold">Evaluated At:</span>
                  <strong className="font-mono text-slate-700">{shortfallEval.created_at || 'Just now'}</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#313896] font-serif uppercase tracking-wide flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#313896]" />
                  <span>RESOURCE & OPERATIONAL CONTEXT</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Mine Context</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Resource Tonnes</span>
                  <strong className="font-mono text-slate-900 font-bold">
                    {forecastContext.resource_context?.resource_tonnes?.toLocaleString() || '174,000'} t
                  </strong>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Mineable Tonnes</span>
                  <strong className="font-mono text-slate-900 font-bold">
                    {forecastContext.resource_context?.mineable_tonnes?.toLocaleString() || '145,000'} t
                  </strong>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Ready Block Tonnes</span>
                  <strong className="font-mono text-emerald-700 font-bold">
                    {forecastContext.resource_context?.ready_block_tonnes?.toLocaleString() || '62,000'} t
                  </strong>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Average Mn Grade</span>
                  <strong className="font-mono text-purple-700 font-bold">
                    {forecastContext.resource_context?.ore_grade_mn || 37.8}% Mn
                  </strong>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Equipment Availability</span>
                  <strong className="font-mono text-slate-900 font-bold">
                    {forecastContext.operational_summary?.excavation_avail_pct || 78}%
                  </strong>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">Equipment Downtime</span>
                  <strong className="font-mono text-red-600 font-bold">
                    {forecastContext.operational_summary?.downtime_hours || 15} hrs
                  </strong>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
            <button
              onClick={handleBackToEstimateProduction}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full border border-slate-300 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#313896]" />
              <span>[ BACK TO ESTIMATE PRODUCTION ]</span>
            </button>

            {shortfallEval.has_shortfall && (
              <button
                onClick={handleAnalyzeWhy}
                className="px-6 py-2.5 bg-[#313896] hover:bg-[#282D7A] text-white font-extrabold text-xs rounded-full shadow transition flex items-center gap-2 active:scale-95"
              >
                <span>[ ANALYZE WHY ]</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
