import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  BarChart2, ArrowLeft, ArrowRight, ShieldAlert, AlertTriangle, 
  CheckCircle2, Info, Layers, Cpu, Database, Activity, RefreshCw, ChevronDown, ChevronUp, HelpCircle
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { productionApi, workflowApi } from '../services/api';

interface AttributionItem {
  feature: string;
  feature_name: string;
  category: string;
  observed_value: string;
  raw_value: number;
  shap_value: number;
  direction: 'LOWERED' | 'RAISED' | 'NEUTRAL';
  direction_label: string;
  pct_impact: number;
  unit: string;
  operational_interpretation: string;
  diagnostic_note: string;
}

interface CategoryBreakdown {
  category: string;
  negative_impact_tonnes: number;
  positive_impact_tonnes: number;
  feature_count: number;
  pct_of_shortfall: number;
}

interface ExplanationResponse {
  status: string;
  message?: string;
  forecast_id: string;
  shortfall_id: string;
  mine_id: string;
  target_id: string;
  model_used: string;
  model_version: string;
  selection_basis: string;
  base_expected_tonnes: number;
  target_tonnes: number;
  forecast_tonnes: number;
  shortfall_tonnes: number;
  shortfall_percent: number;
  top_contributing_factors: AttributionItem[];
  category_breakdown: CategoryBreakdown[];
  all_attributions: AttributionItem[];
  data_honesty_label?: string;
}

export const ShortfallAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const forecastIdParam = searchParams.get('forecast_id');
  const shortfallIdParam = searchParams.get('shortfall_id');
  const targetIdParam = searchParams.get('target_id');
  const mineIdParam = searchParams.get('mine_id');

  const [loading, setLoading] = useState<boolean>(true);
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [explanationData, setExplanationData] = useState<ExplanationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'top5' | 'categories'>('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflowAndExplanation();
  }, [forecastIdParam, shortfallIdParam, targetIdParam, mineIdParam]);

  const loadWorkflowAndExplanation = async () => {
    setLoading(true);

    try {
      const wfRes = await workflowApi.getState();
      const wf = wfRes.data?.workflow || {};
      setWorkflowState(wf);

      const activeForecastId = forecastIdParam || wf.forecastId || 'FCST-2026-001';
      const activeShortfallId = shortfallIdParam || wf.shortfallId || 'SF-2026-001';
      const activeTargetId = targetIdParam || wf.targetId || 'MN-TGT-001';
      const activeMineId = mineIdParam || wf.mineId || 'MN-BAL-001';

      const expRes = await productionApi.explainShortfall({
        forecast_id: activeForecastId,
        shortfall_id: activeShortfallId,
        target_id: activeTargetId,
        mine_id: activeMineId
      });

      if (expRes.data) {
        setExplanationData(expRes.data);
      }
    } catch (err) {
      console.error("Failed to load SHAP explanation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToShortfall = () => {
    const params = new URLSearchParams();
    if (explanationData?.forecast_id) params.set('forecast_id', explanationData.forecast_id);
    if (explanationData?.target_id) params.set('target_id', explanationData.target_id);
    if (explanationData?.mine_id) params.set('mine_id', explanationData.mine_id);
    navigate(`/shortfall?${params.toString()}`);
  };

  const handleContinueToCorrectiveActions = async () => {
    try {
      await workflowApi.updateState({
        currentStage: 'corrective-actions',
        forecastId: explanationData?.forecast_id,
        shortfallId: explanationData?.shortfall_id
      });
    } catch (e) {
      console.warn("Failed to update workflow state to corrective-actions:", e);
    }

    const params = new URLSearchParams();
    if (explanationData?.forecast_id) params.set('forecast_id', explanationData.forecast_id);
    if (explanationData?.shortfall_id) params.set('shortfall_id', explanationData.shortfall_id);
    if (explanationData?.target_id) params.set('target_id', explanationData.target_id);
    if (explanationData?.mine_id) params.set('mine_id', explanationData.mine_id);
    navigate(`/corrective-actions?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center max-w-md">
          <RefreshCw className="w-10 h-10 text-[#1B2170] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Calculating Model Feature Attributions</h3>
          <p className="text-xs text-slate-500 mt-2">
            Evaluating Tree SHAP values on operations_regression_model.joblib for input forecast context...
          </p>
        </div>
      </div>
    );
  }

  // Handle Failure States (Cases 2, 3, 4)
  if (!explanationData || explanationData.status !== 'EXPLANATION_SUCCESS') {
    const statusMsg = explanationData?.message || "Model explanation could not be loaded.";
    const statusType = explanationData?.status || "UNKNOWN_ERROR";

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
        {/* Breadcrumb Bar */}
        <div className="bg-slate-100 border-b border-slate-200 py-2 px-6 text-xs text-slate-600 font-medium">
          <span>Home</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span className="font-semibold text-[#1B2170]">Analyze Why</span>
        </div>

        <div className="max-w-7xl mx-auto w-full p-6">
          <div className="bg-white rounded-lg border border-red-200 shadow-sm p-8 text-center max-w-2xl mx-auto my-12">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 tracking-wide uppercase">
              {statusType === 'MODEL_EXPLANATION_UNAVAILABLE' ? 'MODEL EXPLANATION UNAVAILABLE' : 'INSUFFICIENT DATA FOR EXPLANATION'}
            </h2>
            <p className="text-sm text-slate-600 mt-3 bg-amber-50 p-4 rounded border border-amber-200 text-left">
              {statusMsg}
            </p>

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleBackToShortfall}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                RETURN TO PRODUCTION SHORTFALL
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    forecast_id, shortfall_id, mine_id, target_id, model_used, model_version,
    selection_basis, base_expected_tonnes, target_tonnes, forecast_tonnes,
    shortfall_tonnes, shortfall_percent, top_contributing_factors, category_breakdown,
    all_attributions, data_honesty_label
  } = explanationData;

  // Max absolute SHAP value for scaling bar widths
  const maxAbsShap = Math.max(...all_attributions.map(a => absShap(a.shap_value)), 1.0);

  function absShap(val: number) { return Math.abs(val); }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* 1. Breadcrumb Bar */}
      <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-6 text-xs text-slate-600 font-medium flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>Home</span> <span className="text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="text-slate-400">&gt;</span>
          <span className="font-bold text-[#1B2170]">Analyze Why</span>
        </div>
        <PrototypeBadge type="inline" message={data_honesty_label || "PROTOTYPE SIMULATION DATA — MOIL Sensor Calibration Pending"} />
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        
        {/* 2. Page Header & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                PAGE 4 — MODEL EXPLAINABILITY LAYER
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Model: {model_used} ({model_version})
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#1B2170] tracking-tight uppercase mt-1">
              ANALYZE WHY — PRODUCTION SHORTFALL DIAGNOSTICS
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Model Feature Attribution & Diagnostic Root Cause Decomposition using Tree SHAP Explainer
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToShortfall}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO SHORTFALL
            </button>
            <button
              onClick={handleContinueToCorrectiveActions}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
            >
              CONTINUE TO CORRECTIVE ACTIONS
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Compact Context Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs bg-slate-800 text-slate-200 p-3.5 rounded-lg border border-slate-700 shadow-sm font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Active Mine</span>
            <span className="font-bold text-amber-400">{mine_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Target ID</span>
            <span className="font-semibold text-white">{target_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Forecast ID</span>
            <span className="font-semibold text-white">{forecast_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Shortfall ID</span>
            <span className="font-semibold text-red-400">{shortfall_id || "NOT_APPLICABLE"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Mine Type</span>
            <span className="font-semibold text-white">UNDERGROUND</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Coordinates</span>
            <span className="font-semibold text-white">21.84°N, 80.72°E</span>
          </div>
        </div>

        {/* 4. Shortfall Summary Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-slate-600">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Production</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900">{target_tonnes.toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-slate-500">tonnes</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Ex-ante required output</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Forecast Production</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-700">{forecast_tonnes.toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-slate-500">tonnes</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Tonnage regression model forecast</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-red-600">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">Production Shortfall</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-red-600">-{shortfall_tonnes.toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-red-600">tonnes</span>
            </div>
            <span className="text-[11px] text-red-600 font-semibold mt-1 block">Shortfall: {shortfall_percent}% below target</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-[#1B2170]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Model Baseline</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#1B2170]">{base_expected_tonnes.toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-slate-500">tonnes</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Base expected value ($E[f(x)]$)</span>
          </div>
        </div>

        {/* 5. Main SHAP Visualization Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#1B2170]" />
                MODEL CONTRIBUTING FACTORS (TREE SHAP ATTRIBUTION)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quantifies how observed feature inputs shifted predicted production relative to model baseline
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-200 p-0.5 rounded text-xs font-medium">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded transition-all ${activeTab === 'all' ? 'bg-[#1B2170] text-white font-bold shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
              >
                All 28 Features
              </button>
              <button
                onClick={() => setActiveTab('top5')}
                className={`px-3 py-1.5 rounded transition-all ${activeTab === 'top5' ? 'bg-[#1B2170] text-white font-bold shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
              >
                Top 5 Drivers
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-3 py-1.5 rounded transition-all ${activeTab === 'categories' ? 'bg-[#1B2170] text-white font-bold shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
              >
                Category Summary
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Disclaimer & Terminology Alert */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Interpretation Guidance:</span> SHAP values reflect statistical contributions to the model's numerical forecast. Negative values (<span className="text-red-700 font-bold">red</span>) indicate features associated with lower predicted tonnage, while positive values (<span className="text-emerald-700 font-bold">green</span>) supported higher predicted tonnage. Terminology reflects model feature influence, not verified physical causality.
              </div>
            </div>

            {/* View Tab 1 & 2: Diverging Horizontal Bar Chart */}
            {(activeTab === 'all' || activeTab === 'top5') && (
              <div className="space-y-3">
                <div className="grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase pb-2 border-b border-slate-200 px-2">
                  <div className="col-span-4">Feature & Operational Category</div>
                  <div className="col-span-2 text-right">Observed Input</div>
                  <div className="col-span-4 text-center">Model Attribution (Impact Tonnes)</div>
                  <div className="col-span-2 text-right">SHAP Impact (t)</div>
                </div>

                {(activeTab === 'top5' ? top_contributing_factors : all_attributions).map((item, idx) => {
                  const barPct = Math.min(100, (absShap(item.shap_value) / maxAbsShap) * 100);
                  const isNegative = item.shap_value < 0;

                  return (
                    <div key={idx} className="grid grid-cols-12 items-center gap-2 p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors text-xs">
                      {/* Feature Name & Category */}
                      <div className="col-span-4">
                        <div className="font-bold text-slate-800">{item.feature_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.2 rounded border border-slate-200">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.feature}</span>
                        </div>
                      </div>

                      {/* Observed Value */}
                      <div className="col-span-2 text-right font-mono font-semibold text-slate-700">
                        {item.observed_value}
                      </div>

                      {/* Diverging Bar Graphic */}
                      <div className="col-span-4 px-3">
                        <div className="relative h-5 w-full bg-slate-100 rounded overflow-hidden flex items-center border border-slate-200">
                          {/* Center Baseline divider */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 z-10"></div>

                          {isNegative ? (
                            /* Negative Bar extending left from center */
                            <div 
                              className="absolute right-1/2 h-full bg-red-500 rounded-l transition-all duration-300 flex items-center justify-start pl-1 text-[10px] text-white font-bold font-mono"
                              style={{ width: `${barPct / 2}%` }}
                            >
                              {barPct > 20 && `-${absShap(item.shap_value).toFixed(1)}t`}
                            </div>
                          ) : (
                            /* Positive Bar extending right from center */
                            <div 
                              className="absolute left-1/2 h-full bg-emerald-500 rounded-r transition-all duration-300 flex items-center justify-end pr-1 text-[10px] text-white font-bold font-mono"
                              style={{ width: `${barPct / 2}%` }}
                            >
                              {barPct > 20 && `+${item.shap_value.toFixed(1)}t`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SHAP Impact Tonnes & Badge */}
                      <div className="col-span-2 text-right">
                        <span className={`font-mono font-bold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isNegative ? `-${absShap(item.shap_value).toFixed(1)} t` : `+${item.shap_value.toFixed(1)} t`}
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.pct_impact}% of shortfall
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Tab 3: Category Summary Breakdown */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {category_breakdown.map((cat, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-xs text-[#1B2170] uppercase">{cat.category}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                        {cat.feature_count} features
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Lowered Production:</span>
                        <span className="font-bold text-red-600">-{cat.negative_impact_tonnes} t</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Supported Production:</span>
                        <span className="font-bold text-emerald-600">+{cat.positive_impact_tonnes} t</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-sans">% Shortfall Impact:</span>
                        <span className="font-bold text-slate-900">{cat.pct_of_shortfall}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* 6. Top 5 Contributing Factors Operational Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#1B2170]" />
              TOP 5 MODEL CONTRIBUTING FACTORS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strongest model feature attributions influencing the predicted production shortfall
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Operational Category</th>
                  <th className="py-3 px-4">Model Feature</th>
                  <th className="py-3 px-4">Observed Value</th>
                  <th className="py-3 px-4 text-right">Model Contribution</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Operational Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {top_contributing_factors.map((factor, idx) => {
                  const isNegative = factor.shap_value < 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                          {factor.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {factor.feature_name}
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{factor.feature}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {factor.observed_value}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={isNegative ? 'text-red-600' : 'text-emerald-600'}>
                          {isNegative ? `-${absShap(factor.shap_value).toFixed(1)} t` : `+${factor.shap_value.toFixed(1)} t`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isNegative ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isNegative ? '↓ Lowered Production' : '↑ Supported Production'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {factor.diagnostic_note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Actionable Diagnostic Synthesis */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#1B2170] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1B2170]" />
            MODEL DIAGNOSTIC SYNTHESIS
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded border border-slate-200">
            Tree SHAP evaluation confirms that the predicted production shortfall of <span className="font-bold text-red-600">-{shortfall_tonnes} tonnes ({shortfall_percent}%)</span> is primarily influenced by <span className="font-bold text-slate-900">{top_contributing_factors[0]?.feature_name}</span> ({top_contributing_factors[0]?.observed_value}) and <span className="font-bold text-slate-900">{top_contributing_factors[1]?.feature_name}</span> ({top_contributing_factors[1]?.observed_value}). Together, these operational factors account for the majority of the negative model attributions.
          </p>
        </div>

        {/* 8. Bottom CTA Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={handleBackToShortfall}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO PRODUCTION SHORTFALL
          </button>

          <button
            onClick={handleContinueToCorrectiveActions}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
          >
            CONTINUE TO CORRECTIVE ACTIONS
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShortfallAnalysis;
