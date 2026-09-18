import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  BarChart2, ArrowLeft, ArrowRight, ShieldAlert, AlertTriangle, 
  CheckCircle2, Layers, Cpu, Database, Activity, RefreshCw, Zap, Sliders, Check
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { productionApi, workflowApi } from '../services/api';

interface ActionItem {
  action_id: string;
  action_type: string;
  target: string;
  details: string;
  impact_tonnes: number;
}

interface ConstraintItem {
  constraint: string;
  status: string;
  details: string;
}

interface PlanScenario {
  plan_id: string;
  plan_name: string;
  feasibility: string;
  ranking_criterion: string;
  actions: ActionItem[];
  expected_recovery_tonnes: number;
  optimized_expected_production_tonnes: number;
  remaining_shortfall_tonnes: number;
  recovery_percentage: number;
  constraints_status: ConstraintItem[];
}

interface ActiveConstraintInfo {
  constraint_name: string;
  status: string;
  threshold_rule: string;
  available_capacity: string;
  utilized_capacity: string;
  remaining_capacity: string;
}

interface OptimizationResponse {
  status: string;
  message?: string;
  scenario_id?: string;
  forecast_id: string;
  shortfall_id: string;
  target_id?: string;
  mine_id: string;
  mine_type: string;
  objective_description?: string;
  target_tonnes: number;
  baseline_forecast_tonnes: number;
  baseline_shortfall_tonnes: number;
  optimized_expected_production_tonnes: number;
  expected_production_recovery_tonnes: number;
  remaining_shortfall_tonnes: number;
  selected_action_ids: string[];
  candidate_plans: PlanScenario[];
  active_constraints: ActiveConstraintInfo[];
  data_honesty_label?: string;
}

export const Optimization: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const forecastIdParam = searchParams.get('forecast_id');
  const shortfallIdParam = searchParams.get('shortfall_id');
  const targetIdParam = searchParams.get('target_id');
  const mineIdParam = searchParams.get('mine_id');

  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [optData, setOptData] = useState<OptimizationResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('Plan-A');

  useEffect(() => {
    loadContextAndRunInitialOptimization();
  }, [forecastIdParam, shortfallIdParam, targetIdParam, mineIdParam]);

  const loadContextAndRunInitialOptimization = async () => {
    setLoading(true);

    try {
      const wfRes = await workflowApi.getState();
      const wf = wfRes.data?.workflow || {};

      const activeForecastId = forecastIdParam || wf.forecastId || 'FCST-2026-001';
      const activeShortfallId = shortfallIdParam || wf.shortfallId || 'SF-2026-001';
      const activeTargetId = targetIdParam || wf.targetId || 'MN-TGT-001';
      const activeMineId = mineIdParam || wf.mineId || 'MN-BAL-001';
      const activeActions = wf.actionIds || ['ACT-EQ-001', 'ACT-BLK-001'];

      const res = await productionApi.runOptimization({
        forecast_id: activeForecastId,
        shortfall_id: activeShortfallId,
        target_id: activeTargetId,
        mine_id: activeMineId,
        mine_type: wf.mineType || 'UNDERGROUND',
        target_production_tonnes: 2800.0,
        predicted_production_tonnes: 2450.0,
        expected_tonnes_short: 350.0,
        selected_action_ids: activeActions
      });

      if (res.data) {
        setOptData(res.data);
        if (res.data.scenario_id) {
          workflowApi.updateState({ scenarioId: res.data.scenario_id }).catch(e => console.warn(e));
        }
      }
    } catch (err) {
      console.error("Failed to execute optimization:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimizationClick = async () => {
    setOptimizing(true);
    try {
      const wfRes = await workflowApi.getState();
      const wf = wfRes.data?.workflow || {};

      const res = await productionApi.runOptimization({
        forecast_id: optData?.forecast_id || wf.forecastId,
        shortfall_id: optData?.shortfall_id || wf.shortfallId,
        target_id: optData?.target_id || wf.targetId,
        mine_id: optData?.mine_id || wf.mineId,
        mine_type: optData?.mine_type || wf.mineType,
        target_production_tonnes: optData?.target_tonnes || 2800.0,
        predicted_production_tonnes: optData?.baseline_forecast_tonnes || 2450.0,
        expected_tonnes_short: optData?.baseline_shortfall_tonnes || 350.0,
        selected_action_ids: optData?.selected_action_ids || wf.actionIds
      });

      if (res.data) {
        setOptData(res.data);
        if (res.data.scenario_id) {
          await workflowApi.updateState({ scenarioId: res.data.scenario_id });
        }
      }
    } catch (err) {
      console.error("Optimization execution error:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleBackToCorrectiveActions = () => {
    const params = new URLSearchParams();
    if (optData?.forecast_id) params.set('forecast_id', optData.forecast_id);
    if (optData?.shortfall_id) params.set('shortfall_id', optData.shortfall_id);
    if (optData?.mine_id) params.set('mine_id', optData.mine_id);
    navigate(`/corrective-actions?${params.toString()}`);
  };

  const handleContinueToWhatIf = async () => {
    try {
      await workflowApi.updateState({
        currentStage: 'what-if',
        scenarioId: optData?.scenario_id,
        forecastId: optData?.forecast_id,
        shortfallId: optData?.shortfall_id
      });
    } catch (e) {
      console.warn("Failed to update workflow state to what-if:", e);
    }

    const params = new URLSearchParams();
    if (optData?.scenario_id) params.set('scenario_id', optData.scenario_id);
    if (optData?.forecast_id) params.set('forecast_id', optData.forecast_id);
    if (optData?.shortfall_id) params.set('shortfall_id', optData.shortfall_id);
    if (optData?.target_id) params.set('target_id', optData.target_id);
    if (optData?.mine_id) params.set('mine_id', optData.mine_id);
    if (optData?.target_tonnes) params.set('target_tonnes', optData.target_tonnes.toString());
    if (optData?.baseline_forecast_tonnes) params.set('forecast_tonnes', optData.baseline_forecast_tonnes.toString());
    if (optData?.baseline_shortfall_tonnes) params.set('shortfall_tonnes', optData.baseline_shortfall_tonnes.toString());
    if (optData?.optimized_expected_production_tonnes) params.set('optimized_tonnes', optData.optimized_expected_production_tonnes.toString());
    navigate(`/what-if?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center max-w-md">
          <RefreshCw className="w-10 h-10 text-[#1B2170] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Solving MILP Mathematical Optimization</h3>
          <p className="text-xs text-slate-500 mt-2">
            Evaluating candidate corrective action combinations under equipment availability and crusher capacity constraints...
          </p>
        </div>
      </div>
    );
  }

  // Handle Edge Cases (Infeasible / Missing Data / No Shortfall)
  if (!optData || optData.status !== 'OPTIMIZED') {
    const statusMsg = optData?.message || "Optimization scenario could not be computed.";
    const statusType = optData?.status || "UNKNOWN_ERROR";

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
        {/* Breadcrumb Bar */}
        <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-6 text-xs text-slate-600 font-medium">
          <span>Home</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Analyze Why</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span>Corrective Actions</span> <span className="mx-1 text-slate-400">&gt;</span>
          <span className="font-semibold text-[#1B2170]">Optimization</span>
        </div>

        <div className="max-w-7xl mx-auto w-full p-6">
          <div className="bg-white rounded-lg border border-red-200 shadow-sm p-8 text-center max-w-2xl mx-auto my-12">
            {statusType === 'NO_ACTIVE_PRODUCTION_SHORTFALL' ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold text-slate-900 tracking-wide uppercase">
              {statusType === 'NO_ACTIVE_PRODUCTION_SHORTFALL' ? 'NO ACTIVE PRODUCTION SHORTFALL' : (
                statusType === 'INFEASIBLE' ? 'NO FEASIBLE OPTIMIZATION SCENARIO' : 'INSUFFICIENT DATA FOR OPTIMIZATION'
              )}
            </h2>
            <p className="text-sm text-slate-600 mt-3 bg-amber-50 p-4 rounded border border-amber-200 text-left font-sans">
              {statusMsg}
            </p>

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleBackToCorrectiveActions}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                RETURN TO CORRECTIVE ACTIONS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    scenario_id, forecast_id, shortfall_id, mine_id, mine_type,
    objective_description, target_tonnes, baseline_forecast_tonnes,
    baseline_shortfall_tonnes, optimized_expected_production_tonnes,
    expected_production_recovery_tonnes, remaining_shortfall_tonnes,
    selected_action_ids, candidate_plans, active_constraints, data_honesty_label
  } = optData;

  const activePlan: PlanScenario | undefined = candidate_plans.find(p => p.plan_id === selectedPlanId) || candidate_plans[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* 1. Breadcrumb Bar */}
      <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-6 text-xs text-slate-600 font-medium flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>Home</span> <span className="text-slate-400">&gt;</span>
          <span>Estimate Production</span> <span className="text-slate-400">&gt;</span>
          <span>Production Shortfall</span> <span className="text-slate-400">&gt;</span>
          <span>Analyze Why</span> <span className="text-slate-400">&gt;</span>
          <span>Corrective Actions</span> <span className="text-slate-400">&gt;</span>
          <span className="font-bold text-[#1B2170]">Optimization</span>
        </div>
        <PrototypeBadge type="inline" message={data_honesty_label || "PROTOTYPE SIMULATION DATA — MOIL Sensor Calibration Pending"} />
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">

        {/* 2. Page Header & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300 uppercase tracking-wider">
                PAGE 6 — MATHEMATICAL OPTIMIZATION LAYER
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Scenario ID: {scenario_id}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#1B2170] tracking-tight uppercase mt-1">
              OPTIMIZATION — FEASIBLE PRODUCTION RECOVERY
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {objective_description || "Maximize expected production recovery under active operational constraints"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToCorrectiveActions}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO CORRECTIVE ACTIONS
            </button>
            <button
              onClick={handleContinueToWhatIf}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
            >
              CONTINUE TO WHAT-IF
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Compact Context Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs bg-slate-800 text-slate-200 p-3.5 rounded-lg border border-slate-700 shadow-sm font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Active Mine</span>
            <span className="font-bold text-amber-400">{mine_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Mine Type</span>
            <span className="font-semibold text-white">{mine_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Forecast ID</span>
            <span className="font-semibold text-white">{forecast_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Shortfall ID</span>
            <span className="font-semibold text-red-400">{shortfall_id || "SF-2026-001"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Scenario ID</span>
            <span className="font-bold text-emerald-400">{scenario_id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Status</span>
            <span className="font-bold text-emerald-400">FEASIBLE (OPTIMIZED)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Solver</span>
            <span className="font-semibold text-white">Scipy MILP / LP</span>
          </div>
        </div>

        {/* 4. Optimization Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Target Production</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{target_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-slate-400 block">Ex-ante required</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Baseline Forecast</span>
            <span className="text-xl font-black text-amber-700 mt-1 block">{baseline_forecast_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-slate-400 block">Page 2 forecast</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-red-600 uppercase block">Baseline Shortfall</span>
            <span className="text-xl font-black text-red-600 mt-1 block">-{baseline_shortfall_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-red-500 block">Initial shortfall gap</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Optimized Production</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">{optimized_expected_production_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-emerald-700 font-semibold block">Post-optimization expected</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Expected Recovery</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">+{expected_production_recovery_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-emerald-700 font-semibold block">{((expected_production_recovery_tonnes / baseline_shortfall_tonnes) * 100).toFixed(1)}% shortfall recovery</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Remaining Gap</span>
            <span className="text-xl font-black text-slate-700 mt-1 block">{remaining_shortfall_tonnes.toLocaleString()} t</span>
            <span className="text-[10px] text-slate-400 block">Uncovered shortfall</span>
          </div>
        </div>

        {/* 5. Selected Actions Carryover & Execution Control */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1B2170]" />
                SELECTED CORRECTIVE ACTIONS & OPTIMIZER CONTROL
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Staged candidate actions passed from Page 5 for MILP constraint evaluation
              </p>
            </div>

            <button
              onClick={handleRunOptimizationClick}
              disabled={optimizing}
              className="flex items-center gap-2 px-5 py-2 bg-[#1B2170] hover:bg-[#151a5c] text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
              <span>{optimizing ? 'SOLVING OPTIMIZATION...' : 'RUN MATHEMATICAL OPTIMIZATION'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {selected_action_ids.map((actId, idx) => (
              <span key={idx} className="bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{actId}</span>
                <span className="text-[10px] text-slate-500 font-normal">(STAGED FOR OPTIMIZATION)</span>
              </span>
            ))}
          </div>
        </div>

        {/* 6. Production Comparison Visualizer */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#1B2170]" />
            PRODUCTION TRAJECTORY COMPARISON (BASELINE VS OPTIMIZED VS TARGET)
          </h2>

          <div className="space-y-4">
            {/* Target Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Target Production</span>
                <span className="font-mono">{target_tonnes.toLocaleString()} tonnes</span>
              </div>
              <div className="h-6 w-full bg-slate-100 rounded overflow-hidden relative border border-slate-200">
                <div className="h-full bg-slate-700 w-full flex items-center justify-end pr-2 text-white font-mono text-xs font-bold">
                  100% Target ({target_tonnes} t)
                </div>
              </div>
            </div>

            {/* Baseline Forecast Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Baseline Forecast (Page 2)</span>
                <span className="font-mono text-amber-700">{baseline_forecast_tonnes.toLocaleString()} tonnes ({((baseline_forecast_tonnes/target_tonnes)*100).toFixed(1)}%)</span>
              </div>
              <div className="h-6 w-full bg-slate-100 rounded overflow-hidden relative border border-slate-200">
                <div 
                  className="h-full bg-amber-500 flex items-center justify-end pr-2 text-white font-mono text-xs font-bold"
                  style={{ width: `${(baseline_forecast_tonnes / target_tonnes) * 100}%` }}
                >
                  {baseline_forecast_tonnes} t
                </div>
              </div>
            </div>

            {/* Optimized Expected Production Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Optimized Expected Production (Page 6 MILP Scenario)</span>
                <span className="font-mono text-emerald-700">{optimized_expected_production_tonnes.toLocaleString()} tonnes ({((optimized_expected_production_tonnes/target_tonnes)*100).toFixed(1)}%)</span>
              </div>
              <div className="h-6 w-full bg-slate-100 rounded overflow-hidden relative border border-slate-200">
                <div 
                  className="h-full bg-emerald-600 flex items-center justify-end pr-2 text-white font-mono text-xs font-bold transition-all duration-500"
                  style={{ width: `${(optimized_expected_production_tonnes / target_tonnes) * 100}%` }}
                >
                  +{expected_production_recovery_tonnes} t recovery ({optimized_expected_production_tonnes} t)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Feasible Optimization Scenario Cards */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#1B2170]" />
                FEASIBLE OPTIMIZATION SCENARIOS (EVALUATED BY MILP ENGINE)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scenarios evaluated under objective function: Maximize Expected Production Recovery
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Scenario Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-3">
              {candidate_plans.map((plan, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPlanId(plan.plan_id)}
                  className={`px-4 py-2 text-xs font-bold rounded transition-all ${
                    selectedPlanId === plan.plan_id
                      ? 'bg-[#1B2170] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  {plan.plan_id}: {plan.plan_name.split(':')[1] || plan.plan_name}
                </button>
              ))}
            </div>

            {/* Active Plan Detail View */}
            {activePlan && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] bg-[#1B2170] text-white font-mono font-bold px-2 py-0.5 rounded">
                      {activePlan.plan_id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {activePlan.plan_name}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      Ordering Criterion: {activePlan.ranking_criterion}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-500 block">Expected Production</span>
                    <span className="text-xl font-black text-emerald-700">
                      {activePlan.optimized_expected_production_tonnes} t
                    </span>
                    <span className="text-[11px] text-emerald-600 block">
                      (+{activePlan.expected_recovery_tonnes} t recovery / {activePlan.recovery_percentage}% gap filled)
                    </span>
                  </div>
                </div>

                {/* Actions in Active Plan */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Included Operational Actions ({activePlan.actions?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {activePlan.actions?.map((act: ActionItem, aIdx: number) => (
                      <div key={aIdx} className="bg-white p-3 rounded border border-slate-200 flex items-start justify-between text-xs font-sans">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800">{act.details}</span>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                            <span>Action ID: {act.action_id || `ACT-00${aIdx+1}`}</span>
                            <span>Target: {act.target}</span>
                            <span>Type: {act.action_type}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 shrink-0">
                          +{act.impact_tonnes} t
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* 8. Active Constraints Transparency Panel */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#1B2170] uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#1B2170]" />
              OPTIMIZATION CONSTRAINTS TRANSPARENCY
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active operational thresholds and throughput boundaries evaluated during optimization
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <th className="py-3 px-4">Constraint Name</th>
                  <th className="py-3 px-4">Threshold Rule</th>
                  <th className="py-3 px-4">Available Capacity</th>
                  <th className="py-3 px-4">Utilized Capacity</th>
                  <th className="py-3 px-4">Remaining Capacity</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {active_constraints.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.constraint_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.threshold_rule}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{c.available_capacity}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{c.utilized_capacity}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{c.remaining_capacity}</td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. Bottom CTA Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={handleBackToCorrectiveActions}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO CORRECTIVE ACTIONS
          </button>

          <button
            onClick={handleContinueToWhatIf}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1B2170] text-white text-xs font-bold rounded hover:bg-[#151a5c] transition-colors shadow-sm"
          >
            CONTINUE TO WHAT-IF
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default Optimization;
