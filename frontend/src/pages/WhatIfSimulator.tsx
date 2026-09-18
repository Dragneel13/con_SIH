import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sliders, Play, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, 
  TrendingDown, ArrowRight, Zap, RefreshCw, Layers, History, Check, X, ShieldCheck, ArrowLeft, Info
} from 'lucide-react';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { workflowApi, productionApi } from '../services/api';

interface ScenarioHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  delta_mt: number;
  whatif_production_mt: number;
  shortfall_mt: number;
  risk: string;
}

export const WhatIfSimulator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Workflow Context Carryover (Zero manual re-entry)
  const targetId = searchParams.get('target_id') || 'MN-TGT-001';
  const mineId = searchParams.get('mine_id') || 'MN-BAL-001';
  const forecastId = searchParams.get('forecast_id') || 'FCST-2026-48B5';
  const shortfallId = searchParams.get('shortfall_id') || 'SF-2026-48B5';
  const parentScenarioId = searchParams.get('scenario_id') || 'SCN-2026-48B5';
  const mineType = searchParams.get('mine_type') || 'Underground';
  
  const targetTonnes = parseFloat(searchParams.get('target_tonnes') || '2800.0');
  const baselineForecastTonnes = parseFloat(searchParams.get('forecast_tonnes') || '2450.0');
  const baselineShortfallTonnes = parseFloat(searchParams.get('shortfall_tonnes') || '350.0');
  const optimizedExpectedTonnes = parseFloat(searchParams.get('optimized_tonnes') || '2760.0');

  const [horizonDays, setHorizonDays] = useState<number>(7);
  
  // Controlled Scenario Inputs (Defaults match Baseline State)
  const [equipmentCode, setEquipmentCode] = useState<string>('E-17');
  const [equipmentAvailable, setEquipmentAvailable] = useState<boolean>(true);
  const [downtimeHours, setDowntimeHours] = useState<number>(4.0);
  const [rainfallMm, setRainfallMm] = useState<number>(12.0);
  const [roadCondition, setRoadCondition] = useState<string>('GOOD');
  const [blastingDelayHours, setBlastingDelayHours] = useState<number>(0.0);
  const [developmentDelayDays, setDevelopmentDelayDays] = useState<number>(0.0);
  const [blockCode, setBlockCode] = useState<string>('');
  const [blockAvailable, setBlockAvailable] = useState<boolean>(true);
  const [crusherCapacityPct, setCrusherCapacityPct] = useState<number>(100.0);

  // Result & UI State
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<ScenarioHistoryItem[]>([]);

  // 2. Execute Simulation with Relative Delta Engine
  const runSimulation = (customPayload?: any) => {
    setLoading(true);

    const payload = customPayload || {
      parent_scenario_id: parentScenarioId,
      forecast_id: forecastId,
      shortfall_id: shortfallId,
      mine_id: mineId,
      mine_type: mineType,
      target_production_tonnes: targetTonnes,
      baseline_forecast_tonnes: baselineForecastTonnes,
      baseline_shortfall_tonnes: baselineShortfallTonnes,
      scenario_name: equipmentCode && !equipmentAvailable ? `What if ${equipmentCode} is unavailable?` : 'Custom Operational Scenario',
      scenario_type: 'CUSTOM_SIMULATION',
      equipment_code: equipmentCode,
      equipment_available: equipmentAvailable,
      downtime_hours: downtimeHours,
      rainfall_mm: rainfallMm,
      haul_road_condition: roadCondition,
      blasting_delay_hours: blastingDelayHours,
      development_delay_days: developmentDelayDays,
      block_code: blockCode || null,
      block_available: blockAvailable,
      crusher_capacity_pct: crusherCapacityPct,
      horizon_days: horizonDays
    };

    productionApi.runWhatIfSimulation(payload)
      .then((res) => {
        const data = res.data;
        if (data && data.status === 'SUCCESS') {
          setSimulationResult(data);
          
          // Add to Saved Scenario Log
          const newHistoryItem: ScenarioHistoryItem = {
            id: data.whatif_scenario_id || `SCN-2026-W${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: data.scenario_title || 'Custom Operational Scenario',
            delta_mt: data.scenario.production_delta_tonnes,
            whatif_production_mt: data.scenario.predicted_production_tonnes,
            shortfall_mt: data.scenario.expected_shortfall_tonnes,
            risk: data.scenario.risk_level
          };

          setHistory((prev) => [newHistoryItem, ...prev.slice(0, 4)]);
          
          workflowApi.updateState({
            currentStage: 'whatif',
            whatifScenarioId: data.whatif_scenario_id,
            parentScenarioId
          }).catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    runSimulation();
  }, [horizonDays]);

  // Preset Handlers
  const handlePresetImprovement = () => {
    setEquipmentCode('EX-104');
    setEquipmentAvailable(true); // Restore EX-104 from MAINTENANCE
    setDowntimeHours(5.0); // Reduce downtime from 28h to 5h
    setRainfallMm(12.0);
    setRoadCondition('GOOD');
    setBlastingDelayHours(0);
    setDevelopmentDelayDays(0);
    setBlockCode('');
    setCrusherCapacityPct(100);

    runSimulation({
      parent_scenario_id: parentScenarioId,
      forecast_id: forecastId,
      shortfall_id: shortfallId,
      target_production_tonnes: targetTonnes,
      baseline_forecast_tonnes: baselineForecastTonnes,
      baseline_shortfall_tonnes: baselineShortfallTonnes,
      scenario_name: 'Operational Improvement: Restore EX-104 & Reduce Downtime',
      equipment_code: 'EX-104',
      equipment_available: true,
      downtime_hours: 5.0,
      horizon_days: horizonDays
    });
  };

  const handlePresetDeterioration = () => {
    setEquipmentCode('E-17');
    setEquipmentAvailable(false); // Force E-17 offline
    setDowntimeHours(35.0);
    setRoadCondition('POOR');
    setRainfallMm(45.0);

    runSimulation({
      parent_scenario_id: parentScenarioId,
      forecast_id: forecastId,
      shortfall_id: shortfallId,
      target_production_tonnes: targetTonnes,
      baseline_forecast_tonnes: baselineForecastTonnes,
      baseline_shortfall_tonnes: baselineShortfallTonnes,
      scenario_name: 'Operational Deterioration: E-17 Outage & Heavy Rainfall (+45mm)',
      equipment_code: 'E-17',
      equipment_available: false,
      downtime_hours: 35.0,
      rainfall_mm: 45.0,
      haul_road_condition: 'POOR',
      horizon_days: horizonDays
    });
  };

  const handleResetBaseline = () => {
    setEquipmentCode('E-17');
    setEquipmentAvailable(true);
    setDowntimeHours(4.0);
    setRainfallMm(12.0);
    setRoadCondition('GOOD');
    setBlastingDelayHours(0.0);
    setDevelopmentDelayDays(0.0);
    setBlockCode('');
    setBlockAvailable(true);
    setCrusherCapacityPct(100.0);

    runSimulation({
      parent_scenario_id: parentScenarioId,
      forecast_id: forecastId,
      shortfall_id: shortfallId,
      target_production_tonnes: targetTonnes,
      baseline_forecast_tonnes: baselineForecastTonnes,
      baseline_shortfall_tonnes: baselineShortfallTonnes,
      scenario_name: 'Workflow Baseline State (No Modifications)',
      equipment_code: 'E-17',
      equipment_available: true,
      downtime_hours: 4.0,
      rainfall_mm: 12.0,
      haul_road_condition: 'GOOD',
      blasting_delay_hours: 0.0,
      development_delay_days: 0.0,
      crusher_capacity_pct: 100.0,
      horizon_days: horizonDays
    });
  };

  // Navigations
  const handleBackToOptimization = () => {
    const params = new URLSearchParams();
    params.set('mine_id', mineId);
    params.set('target_id', targetId);
    params.set('forecast_id', forecastId);
    params.set('shortfall_id', shortfallId);
    params.set('mine_type', mineType);
    params.set('target_tonnes', targetTonnes.toString());
    params.set('forecast_tonnes', baselineForecastTonnes.toString());
    params.set('shortfall_tonnes', baselineShortfallTonnes.toString());
    navigate(`/optimization?${params.toString()}`);
  };

  const handleContinueToDecision = () => {
    const params = new URLSearchParams();
    params.set('whatif_scenario_id', simulationResult?.whatif_scenario_id || 'SCN-2026-W001');
    params.set('scenario_id', parentScenarioId);
    params.set('forecast_id', forecastId);
    params.set('shortfall_id', shortfallId);
    params.set('target_id', targetId);
    params.set('mine_id', mineId);
    params.set('mine_type', mineType);
    navigate(`/decisions?${params.toString()}`);
  };

  const baseline = simulationResult?.baseline;
  const scenario = simulationResult?.scenario;
  const shapReasons = simulationResult?.shap_reasons || [];
  const matrixMetrics = simulationResult?.comparison_matrix?.metrics || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      {/* 11-Stage Workflow Navigator */}
      <WorkflowStepper activeStep={10} targetId={targetId} />

      {/* Mandatory Prototype Simulation Disclosure Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-xl shadow-sm text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>PROTOTYPE OPERATIONAL SIMULATION ESTIMATES (DOMAIN RULE ASSUMPTIONS)</span>
        </div>
        <p className="text-amber-800 text-[11px] leading-relaxed">
          Simulation results are model-based rule estimates for interactive decision support and do not replace field validation, engineering review, safety procedures, or operational authorization.
        </p>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#2B308B] to-[#1B2170] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>STAGE 10 — INTERACTIVE WHAT-IF SCENARIO SIMULATION</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            WHAT-IF SIMULATION
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Evaluate expected production changes relative to authoritative workflow baseline by adjusting operational assumptions
          </p>
        </div>

        {/* Context Strip Badge */}
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 text-xs font-mono space-y-1 shrink-0">
          <div className="text-amber-300 font-bold">Mine: {mineId} ({mineType})</div>
          <div className="text-blue-100 text-[11px]">Forecast ID: {forecastId}</div>
          <div className="text-blue-100 text-[11px]">Parent Scenario: {parentScenarioId}</div>
        </div>
      </div>

      {/* QUICK PRESETS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1B2170] uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Scenario Presets:</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">Horizon: {horizonDays} Days</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={handlePresetImprovement}
            className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-lg hover:bg-emerald-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>📈 Improvement: Restore EX-104 & Downtime to 5h (+Impact)</span>
          </button>
          <button
            onClick={handlePresetDeterioration}
            className="px-3.5 py-1.5 bg-red-50 border border-red-300 text-red-900 font-bold rounded-lg hover:bg-red-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>📉 Deterioration: E-17 Outage + Heavy Rain (+45mm)</span>
          </button>
          <button
            onClick={handleResetBaseline}
            className="px-3.5 py-1.5 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-lg hover:bg-slate-200 transition shadow-sm flex items-center gap-1 ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset to Baseline</span>
          </button>
        </div>
      </div>

      {/* SCENARIO INPUT CONTROLS PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-[#1B2170] font-serif">
            Controlled Operational Variables (Relative to Baseline)
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Baseline Forecast: {baselineForecastTonnes} t
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          
          {/* CONTROL 1 & 2: Equipment Code, Availability, Downtime */}
          <div className="space-y-2 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80">
            <label className="font-bold text-slate-700 block">Target Equipment</label>
            <select
              value={equipmentCode}
              onChange={(e) => setEquipmentCode(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="E-17">E-17 (Dump Truck 20T - Baseline 4h)</option>
              <option value="LHD-02">LHD-02 (Load Haul Dump - Baseline 2h)</option>
              <option value="EX-104">EX-104 (Hydraulic Excavator - Baseline MAINT 28h)</option>
              <option value="DR-05">DR-05 (Production Drill Rig - Baseline 6h)</option>
            </select>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-semibold">Equipment Status:</span>
              <button
                type="button"
                onClick={() => setEquipmentAvailable(!equipmentAvailable)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition ${
                  equipmentAvailable ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {equipmentAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
              </button>
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                <span>Downtime Hours:</span>
                <span className="font-mono text-slate-900 font-bold">{downtimeHours} hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(Number(e.target.value))}
                className="w-full accent-[#1B2170] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block text-right font-mono">Baseline EX-104: 28h | E-17: 4h</span>
            </div>
          </div>

          {/* CONTROL 3 & 4: Monsoon Rainfall & Haul Road Condition */}
          <div className="space-y-2 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80">
            <label className="font-bold text-slate-700 block">Monsoon Rainfall Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-blue-900 shrink-0">{rainfallMm} mm</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">Baseline: 12.0 mm/day</span>

            <label className="font-bold text-slate-700 block pt-2">Haul Road Condition</label>
            <select
              value={roadCondition}
              onChange={(e) => setRoadCondition(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="GOOD">GOOD (Normal Haulage - Baseline)</option>
              <option value="FAIR">FAIR (Slight Delay: -45t)</option>
              <option value="POOR">POOR (Heavy Sloughing: -110t)</option>
            </select>
          </div>

          {/* CONTROL 5 & 6: Blasting & Development Delays */}
          <div className="space-y-2 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80">
            <label className="font-bold text-slate-700 block">Blasting Clearance Delay</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={blastingDelayHours}
                onChange={(e) => setBlastingDelayHours(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-900 shrink-0">{blastingDelayHours} hrs</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">Baseline: 0.0 hrs</span>

            <label className="font-bold text-slate-700 block pt-2">Face Advancement Delay</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={developmentDelayDays}
                onChange={(e) => setDevelopmentDelayDays(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-purple-900 shrink-0">{developmentDelayDays} days</span>
            </div>
          </div>

          {/* CONTROL 7 & 8: Ore Block Unserviceability & Crusher Capacity */}
          <div className="space-y-2 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80">
            <label className="font-bold text-slate-700 block">Target Ore Block Status</label>
            <select
              value={blockCode}
              onChange={(e) => setBlockCode(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="">None (All Blocks Standard)</option>
              <option value="Block B-17">Block B-17 (Baseline 86% Readiness)</option>
              <option value="Block B-12">Block B-12 (Baseline 88.5% Readiness)</option>
              <option value="Block B-09">Block B-09 (Baseline DEV 68%)</option>
              <option value="Block B-22">Block B-22 (Baseline RESERVE 92%)</option>
            </select>

            {blockCode && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 font-semibold">Block Service Status:</span>
                <button
                  type="button"
                  onClick={() => setBlockAvailable(!blockAvailable)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    blockAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {blockAvailable ? 'ACTIVE SERVICE' : 'UNSERVICEABLE'}
                </button>
              </div>
            )}

            <label className="font-bold text-slate-700 block pt-2">Crusher Throughput Limit</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={crusherCapacityPct}
                onChange={(e) => setCrusherCapacityPct(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-indigo-900 shrink-0">{crusherCapacityPct}%</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">Baseline: 100% (1,200 t/day)</span>
          </div>

        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={handleResetBaseline}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Reset Controls to Baseline</span>
          </button>

          <button
            onClick={() => runSimulation()}
            disabled={loading}
            className="w-full sm:w-auto px-7 py-2.5 bg-[#1B2170] hover:bg-[#121650] text-white font-bold text-xs rounded-full transition shadow-md flex items-center justify-center gap-2 border border-amber-400/40 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-amber-300 fill-amber-300" />}
            <span>RUN WHAT-IF SIMULATION</span>
          </button>
        </div>
      </div>

      {/* RESULTS & COMPARISON SECTION */}
      {baseline && scenario && (
        <div className="space-y-6">
          
          {/* COMPARISON METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* CARD 1: TARGET PRODUCTION */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-1 shadow-sm font-sans">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TARGET PRODUCTION</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono">{scenario.target_production_tonnes} t</div>
              <span className="text-[10px] text-slate-400 font-mono">Authoritative Monthly Target</span>
            </div>

            {/* CARD 2: WORKFLOW BASELINE FORECAST */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-1 shadow-sm font-sans">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">BASELINE FORECAST (PAGE 2)</span>
              <div className="text-xl font-extrabold text-[#1B2170] font-mono">{baseline.predicted_production_tonnes} t</div>
              <span className="text-[10px] text-red-600 font-mono font-bold">Shortfall: -{baseline.expected_shortfall_tonnes} t</span>
            </div>

            {/* CARD 3: PAGE 6 OPTIMIZED SCENARIO */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-1 shadow-sm font-sans">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PAGE 6 OPTIMIZED PLAN</span>
              <div className="text-xl font-extrabold text-blue-900 font-mono">{optimizedExpectedTonnes} t</div>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">Scenario ID: {parentScenarioId}</span>
            </div>

            {/* CARD 4: WHAT-IF SIMULATED RESULT */}
            <div className={`rounded-2xl border p-4 space-y-1 shadow-sm font-sans ${
              scenario.production_delta_tonnes >= 0 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-red-50 border-red-300 text-red-950'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider">WHAT-IF SIMULATION</span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                  scenario.production_delta_tonnes >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                }`}>
                  {scenario.production_delta_tonnes >= 0 ? 'IMPROVEMENT' : 'DETERIORATION'}
                </span>
              </div>
              <div className="text-xl font-extrabold font-mono">{scenario.predicted_production_tonnes} t</div>
              <div className="text-[11px] font-mono font-bold flex justify-between">
                <span>Delta: {scenario.production_delta_tonnes >= 0 ? '+' : ''}{scenario.production_delta_tonnes} t</span>
                <span>Shortfall: {scenario.expected_shortfall_tonnes} t</span>
              </div>
            </div>

          </div>

          {/* VISUAL PRODUCTION BAR COMPARISON GRAPHIC */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#1B2170] font-serif flex items-center justify-between">
              <span>Production Recovery Comparison Visualizer</span>
              <span className="text-xs font-mono text-slate-500">Target Goal: {targetTonnes} t</span>
            </h3>

            <div className="space-y-3 font-sans text-xs">
              {/* Bar 1: Target Production */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Target Production</span>
                  <span className="font-mono font-bold">{targetTonnes} t (100%)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-slate-800 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Bar 2: Baseline Forecast */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Baseline Forecast (Page 2)</span>
                  <span className="font-mono font-bold">{baselineForecastTonnes} t ({(baselineForecastTonnes / targetTonnes * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-[#1B2170] h-full rounded-full" style={{ width: `${(baselineForecastTonnes / targetTonnes * 100)}%` }} />
                </div>
              </div>

              {/* Bar 3: Page 6 Optimized Scenario */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Page 6 Feasible Recovery Plan</span>
                  <span className="font-mono font-bold">{optimizedExpectedTonnes} t ({(optimizedExpectedTonnes / targetTonnes * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(optimizedExpectedTonnes / targetTonnes * 100)}%` }} />
                </div>
              </div>

              {/* Bar 4: Simulated What-If Scenario */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Simulated What-If Scenario ({simulationResult?.whatif_scenario_id})</span>
                  <span className="font-mono font-bold">{scenario.predicted_production_tonnes} t ({(scenario.predicted_production_tonnes / targetTonnes * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      scenario.production_delta_tonnes >= 0 ? 'bg-emerald-600' : 'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min(100, (scenario.predicted_production_tonnes / targetTonnes * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RELATIVE DELTA SHAP IMPACT BREAKDOWN */}
          {shapReasons.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-white">
                  Relative Delta Impact Breakdown for Scenario ({simulationResult?.whatif_scenario_id})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {shapReasons.map((reason: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-cyan-300 block">{reason.feature}</span>
                      <span className="text-[11px] text-slate-400">{reason.description}</span>
                    </div>
                    <span className={`font-mono font-extrabold text-sm ml-3 shrink-0 ${
                      reason.impact_mt >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {reason.impact_mt >= 0 ? '+' : ''}{reason.impact_mt} t
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SAVED SCENARIO HISTORY LOG */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <h3 className="font-serif font-bold text-sm text-[#1B2170]">What-If Simulation Run Log</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">{history.length} Saved Scenario(s)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Scenario ID</th>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Scenario Title</th>
                      <th className="p-2.5">Production Delta</th>
                      <th className="p-2.5">What-If Forecast</th>
                      <th className="p-2.5">Shortfall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-[#1B2170]">{h.id}</td>
                        <td className="p-2.5 text-slate-500">{h.timestamp}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-800">{h.title}</td>
                        <td className={`p-2.5 font-bold ${h.delta_mt >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {h.delta_mt >= 0 ? '+' : ''}{h.delta_mt} t
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{h.whatif_production_mt} t</td>
                        <td className="p-2.5 text-red-600 font-bold">{h.shortfall_mt} t</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGE NAVIGATION CONTROLS */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <button
              onClick={handleBackToOptimization}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>BACK TO OPTIMIZATION (PAGE 6)</span>
            </button>

            <button
              onClick={handleContinueToDecision}
              className="w-full sm:w-auto px-7 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-full transition shadow-md flex items-center justify-center gap-2 border border-amber-300/40"
            >
              <span>CONTINUE TO DECISION CENTER (PAGE 8)</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
