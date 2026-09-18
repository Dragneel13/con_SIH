import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, 
  Layers, Wrench, Cpu, RefreshCw, Info, Check, CheckSquare, Square
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { productionApi, workflowApi } from '../services/api';

interface CandidateAction {
  action_id: string;
  action_name: string;
  category: string;
  triggering_factor: string;
  observed_value: string;
  shap_impact: string;
  purpose: string;
  required_resource: string;
  applicable_mine_type: string;
  status: string;
  is_compatible: boolean;
}

interface FactorSummary {
  feature: string;
  feature_name: string;
  category: string;
  observed_value: string;
  shap_value: number;
  direction: string;
  diagnostic_note: string;
}

interface CorrectiveActionsResponse {
  status: string;
  message?: string;
  forecast_id: string;
  shortfall_id: string;
  target_id: string;
  mine_id: string;
  mine_type: string;
  target_tonnes: number;
  forecast_tonnes: number;
  shortfall_tonnes: number;
  shortfall_percent: number;
  top_contributing_factors: FactorSummary[];
  candidate_actions: CandidateAction[];
  data_honesty_label?: string;
}

export const CorrectiveActions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const forecastIdParam = searchParams.get('forecast_id');
  const shortfallIdParam = searchParams.get('shortfall_id');
  const targetIdParam = searchParams.get('target_id');
  const mineIdParam = searchParams.get('mine_id');

  const [loading, setLoading] = useState<boolean>(true);
  const [actionsData, setActionsData] = useState<CorrectiveActionsResponse | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);

  useEffect(() => {
    loadCorrectiveActions();
  }, [forecastIdParam, shortfallIdParam, targetIdParam, mineIdParam]);

  const loadCorrectiveActions = async () => {
    setLoading(true);

    try {
      const wfRes = await workflowApi.getState();
      const wf = wfRes.data?.workflow || {};

      const activeForecastId = forecastIdParam || wf.forecastId || 'FCST-2026-001';
      const activeShortfallId = shortfallIdParam || wf.shortfallId || 'SF-2026-001';
      const activeTargetId = targetIdParam || wf.targetId || 'MN-TGT-001';
      const activeMineId = mineIdParam || wf.mineId || 'MN-BAL-001';

      const res = await productionApi.getCorrectiveActions({
        forecast_id: activeForecastId,
        shortfall_id: activeShortfallId,
        target_id: activeTargetId,
        mine_id: activeMineId,
        mine_type: wf.mineType || 'UNDERGROUND'
      });

      if (res.data) {
        setActionsData(res.data);
        // Pre-select initial candidate actions if present
        if (wf.actionIds && wf.actionIds.length > 0) {
          setSelectedActionIds(wf.actionIds);
        } else if (res.data.candidate_actions?.length > 0) {
          setSelectedActionIds(res.data.candidate_actions.map((a: CandidateAction) => a.action_id));
        }
      }
    } catch (err) {
      console.error("Failed to load corrective actions:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionSelection = (actionId: string) => {
    setSelectedActionIds(prev => {
      const next = prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId];

      // Update workflow state asynchronously
      workflowApi.updateState({ actionIds: next }).catch(e => {
        console.warn("Workflow state update error:", e);
      });

      return next;
    });
  };

  const handleBackToAnalyzeWhy = () => {
    const params = new URLSearchParams();
    if (actionsData?.forecast_id) params.set('forecast_id', actionsData.forecast_id);
    if (actionsData?.shortfall_id) params.set('shortfall_id', actionsData.shortfall_id);
    if (actionsData?.target_id) params.set('target_id', actionsData.target_id);
    if (actionsData?.mine_id) params.set('mine_id', actionsData.mine_id);
    navigate(`/shortfall-analysis?${params.toString()}`);
  };

  const handleContinueToOptimization = async () => {
    try {
      await workflowApi.updateState({
        currentStage: 'optimization',
        actionIds: selectedActionIds,
        forecastId: actionsData?.forecast_id,
        shortfallId: actionsData?.shortfall_id
      });
    } catch (e) {
      console.warn("Failed to update workflow state to optimization:", e);
    }

    const params = new URLSearchParams();
    if (actionsData?.forecast_id) params.set('forecast_id', actionsData.forecast_id);
    if (actionsData?.shortfall_id) params.set('shortfall_id', actionsData.shortfall_id);
    if (actionsData?.target_id) params.set('target_id', actionsData.target_id);
    if (actionsData?.mine_id) params.set('mine_id', actionsData.mine_id);
    if (selectedActionIds.length > 0) params.set('action_ids', selectedActionIds.join(','));
    navigate(`/optimization?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center max-w-md">
          <RefreshCw className="w-10 h-10 text-[#1B2170] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Mapping Corrective Action Candidates</h3>
          <p className="text-xs text-slate-500 mt-2">
            Evaluating domain rule matrix on top SHAP model-contributing factors...
          </p>
        </div>
      </div>
    );
  }

  // Handle Edge Cases (Cases 2, 3, 4)
  if (!actionsData || actionsData.status !== 'CORRECTIVE_ACTIONS_READY') {
    const statusMsg = actionsData?.message || "Corrective action candidates could not be evaluated.";
    const statusType = actionsData?.status || "UNKNOWN_ERROR";

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
        {/* Breadcrumb Bar */}
        <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-6 text-xs text-slate-600 font-medium">
          <span>Home</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Analyze Why</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span className="font-semibold text-[#1B2170]">Corrective Actions</span>
        </div>

        <div className="max-w-7xl mx-auto w-full p-6">
          <div className="bg-white rounded-lg border border-amber-200 shadow-sm p-8 text-center max-w-2xl mx-auto my-12">
            {statusType === 'NO_ACTIVE_PRODUCTION_SHORTFALL' ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold text-slate-900 tracking-wide uppercase">
              {statusType === 'NO_ACTIVE_PRODUCTION_SHORTFALL' ? 'NO ACTIVE PRODUCTION SHORTFALL' : (
                statusType === 'CORRECTIVE_ACTION_ANALYSIS_UNAVAILABLE' ? 'CORRECTIVE ACTION ANALYSIS UNAVAILABLE' : 'NO STRUCTURED ACTION MAPPING AVAILABLE'
              )}
            </h2>
            <p className="text-sm text-slate-600 mt-3 bg-amber-50 p-4 rounded border border-amber-200 text-left">
              {statusMsg}
            </p>

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleBackToAnalyzeWhy}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                RETURN TO ANALYZE WHY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    forecast_id, shortfall_id, mine_id, target_id, mine_type,
    target_tonnes, forecast_tonnes, shortfall_tonnes, shortfall_percent,
    top_contributing_factors, candidate_actions, data_honesty_label
  } = actionsData;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* 1. Breadcrumb Bar */}
      <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-6 text-xs text-slate-600 font-medium flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>Home</span> <span className="text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="text-slate-400">&gt;</span>
          <span>Analyze Why</span> <span className="text-slate-400">&gt;</span>
          <span className="font-bold text-[#1B2170]">Corrective Actions</span>
        </div>
        <PrototypeBadge type="inline" message={data_honesty_label || "PROTOTYPE SIMULATION DATA — MOIL Sensor Calibration Pending"} />
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">

        {/* 2. Page Header & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                PAGE 5 — ACTION RECOMMENDATION LAYER
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Mine Type: {mine_type}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#1B2170] tracking-tight uppercase mt-1">
              CORRECTIVE ACTIONS
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Structured Operational Response Candidates Mapped to Model-Contributing Factors
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToAnalyzeWhy}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO ANALYZE WHY
            </button>
            <button
              onClick={handleContinueToOptimization}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
            >
              CONTINUE TO OPTIMIZATION
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
            <span className="font-semibold text-white">{mine_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Coordinates</span>
            <span className="font-semibold text-white">21.84°N, 80.72°E</span>
          </div>
        </div>

        {/* 4. Shortfall Summary Metric Row */}
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selected Actions</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#1B2170]">{selectedActionIds.length}</span>
              <span className="text-xs font-bold text-slate-500">of {candidate_actions.length}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Staged for optimization analysis</span>
          </div>
        </div>

        {/* 5. Model-Contributing Factors Carryover from Page 4 */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#1B2170]" />
              MODEL-CONTRIBUTING FACTORS (CARRIED FROM PAGE 4)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Top {top_contributing_factors.length} SHAP Triggers
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {top_contributing_factors.map((factor, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{factor.feature_name}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                    {factor.category}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-slate-600 font-mono">
                  <span>Input: <strong>{factor.observed_value}</strong></span>
                  <span className={factor.shap_value < 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {factor.shap_value < 0 ? `-${Math.abs(factor.shap_value)} t` : `+${factor.shap_value} t`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Potential Corrective Actions Main Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#1B2170]" />
                POTENTIAL CORRECTIVE ACTIONS (CANDIDATE RESPONSES)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured candidate response options derived from domain rules matching top model-contributing factors
              </p>
            </div>

            <div className="bg-amber-50 text-amber-900 border border-amber-200 text-xs px-3 py-1.5 rounded flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Select candidate actions to stage for Page 6 optimization analysis</span>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidate_actions.map((action, idx) => {
              const isSelected = selectedActionIds.includes(action.action_id);

              return (
                <div 
                  key={idx}
                  className={`border rounded-lg p-5 space-y-3 transition-all ${
                    isSelected 
                      ? 'bg-blue-50/50 border-[#1B2170] shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded">
                          {action.action_id}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                          {action.category}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                          {action.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {action.action_name}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleActionSelection(action.action_id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                        isSelected 
                          ? 'bg-[#1B2170] text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>{isSelected ? 'SELECTED' : 'SELECT'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 font-sans">Triggering Factor:</span>
                      <strong className="text-slate-900">{action.triggering_factor} ({action.observed_value})</strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 font-sans">Model Impact:</span>
                      <strong className="text-red-600">{action.shap_impact}</strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 font-sans">Required Resource:</span>
                      <strong className="text-slate-800">{action.required_resource}</strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500 font-sans">Applicability:</span>
                      <strong className="text-slate-800">{action.applicable_mine_type} MINES</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Operational Purpose:</strong> {action.purpose}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

        {/* 7. Bottom CTA Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={handleBackToAnalyzeWhy}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO ANALYZE WHY
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {selectedActionIds.length} candidate action(s) selected
            </span>
            <button
              onClick={handleContinueToOptimization}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
            >
              CONTINUE TO OPTIMIZATION
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CorrectiveActions;
