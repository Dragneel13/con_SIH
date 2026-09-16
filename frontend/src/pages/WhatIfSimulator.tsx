import React, { useState, useEffect } from 'react';
import { 
  Sliders, Play, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert, 
  TrendingDown, ArrowRight, Zap, RefreshCw, Layers, History, Check, X, ShieldCheck
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';

interface ScenarioHistoryItem {
  id: string;
  timestamp: string;
  user: string;
  title: string;
  type: string;
  impact_mt: number;
  shortfall_mt: number;
  risk: string;
  best_recovery: string;
}

export const WhatIfSimulator: React.FC = () => {
  const [horizonDays, setHorizonDays] = useState<number>(7);
  
  // Form State
  const [scenarioType, setScenarioType] = useState<string>('EQUIPMENT_UNAVAILABLE');
  const [equipmentCode, setEquipmentCode] = useState<string>('E-17');
  const [equipmentAvailable, setEquipmentAvailable] = useState<boolean>(false);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [rainfallMm, setRainfallMm] = useState<number>(0);
  const [roadCondition, setRoadCondition] = useState<string>('GOOD');
  const [blockCode, setBlockCode] = useState<string>('');
  const [crusherCapacityPct, setCrusherCapacityPct] = useState<number>(100);

  // Result State
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<ScenarioHistoryItem[]>([]);
  const [appliedPlanMsg, setAppliedPlanMsg] = useState<string | null>(null);

  const runSimulation = (customPayload?: any) => {
    setLoading(true);

    const payload = customPayload || {
      scenario_name: equipmentCode && !equipmentAvailable ? `What if ${equipmentCode} is unavailable for ${durationDays} days?` : 'Custom Operational Scenario',
      scenario_type: scenarioType,
      equipment_code: equipmentCode,
      equipment_available: equipmentAvailable,
      duration_days: durationDays,
      rainfall_mm: rainfallMm,
      haul_road_condition: roadCondition,
      block_code: blockCode || null,
      crusher_capacity_pct: crusherCapacityPct,
      horizon_days: horizonDays
    };

    fetch('/api/whatif/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSimulationResult(data);

          // Add to History
          const newHistoryItem: ScenarioHistoryItem = {
            id: `SIM-${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: 'MOIL Planning Engineer',
            title: data.scenario_title,
            type: data.scenario_type,
            impact_mt: data.scenario.production_loss_delta_tonnes,
            shortfall_mt: data.scenario.expected_shortfall_tonnes,
            risk: data.scenario.risk_level,
            best_recovery: data.recovery_plans?.[0]?.plan_name || 'No Plan'
          };

          setHistory((prev) => [newHistoryItem, ...prev.slice(0, 4)]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Initial default scenario run ("What if E-17 is unavailable for 3 days?")
    runSimulation();
  }, [horizonDays]);

  const handlePresetE17 = () => {
    setScenarioType('EQUIPMENT_UNAVAILABLE');
    setEquipmentCode('E-17');
    setEquipmentAvailable(false);
    setDurationDays(3);
    setRainfallMm(0);
    setRoadCondition('GOOD');
    setBlockCode('');
    setCrusherCapacityPct(100);

    runSimulation({
      scenario_name: 'What if E-17 is unavailable for 3 days?',
      scenario_type: 'EQUIPMENT_UNAVAILABLE',
      equipment_code: 'E-17',
      equipment_available: false,
      duration_days: 3,
      horizon_days: horizonDays
    });
  };

  const handlePresetRainfall = () => {
    setScenarioType('RAINFALL');
    setRainfallMm(45);
    setEquipmentAvailable(true);
    setRoadCondition('POOR');
    runSimulation({
      scenario_name: 'What if rainfall increases by +45 mm/day?',
      scenario_type: 'RAINFALL',
      rainfall_mm: 45,
      haul_road_condition: 'POOR',
      horizon_days: horizonDays
    });
  };

  const handlePresetBlockB17 = () => {
    setScenarioType('BLOCK_UNAVAILABLE');
    setBlockCode('Block B-17');
    runSimulation({
      scenario_name: 'What if Block B-17 is unavailable?',
      scenario_type: 'BLOCK_UNAVAILABLE',
      block_code: 'Block B-17',
      horizon_days: horizonDays
    });
  };

  const handlePresetCrusher = () => {
    setScenarioType('CRUSHER_REDUCTION');
    setCrusherCapacityPct(70);
    runSimulation({
      scenario_name: 'What if Crusher capacity drops to 70%?',
      scenario_type: 'CRUSHER_REDUCTION',
      crusher_capacity_pct: 70,
      horizon_days: horizonDays
    });
  };

  const handleResetBaseline = () => {
    setScenarioType('EQUIPMENT_UNAVAILABLE');
    setEquipmentCode('E-17');
    setEquipmentAvailable(true);
    setDurationDays(0);
    setRainfallMm(0);
    setRoadCondition('GOOD');
    setBlockCode('');
    setCrusherCapacityPct(100);

    runSimulation({
      scenario_name: 'Baseline Mine State (No Modifications)',
      scenario_type: 'BASELINE',
      equipment_code: 'E-17',
      equipment_available: true,
      duration_days: 0,
      horizon_days: horizonDays
    });
  };

  const baseline = simulationResult?.baseline;
  const scenario = simulationResult?.scenario;
  const shapReasons = simulationResult?.shap_reasons || [];
  const recoveryPlans = simulationResult?.recovery_plans || [];
  const matrixMetrics = simulationResult?.comparison_matrix?.metrics || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="WHAT-IF OPERATIONAL SCENARIO SIMULATOR — Dynamic Non-Mutating Pipeline (ShortfallShield + SHAP + Prescriptive Optimizer)" 
      />

      {appliedPlanMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xl shadow flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-900">{appliedPlanMsg}</p>
          </div>
          <button onClick={() => setAppliedPlanMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="bg-[#0B192C] text-white p-6 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>OPERATIONAL SCENARIO ENGINE & IMPACT PREDICTOR</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            What-If Simulator (MineTwin + ShortfallShield)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate operational disruptions on an isolated copy of mine state and evaluate prescriptive recovery options
          </p>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-2 bg-[#0F172A] p-1.5 rounded-lg border border-slate-700">
          {[7, 15, 30].map((h) => (
            <button
              key={h}
              onClick={() => setHorizonDays(h)}
              className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition ${
                horizonDays === h
                  ? 'bg-amber-500 text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {h} Days
            </button>
          ))}
        </div>
      </div>

      {/* QUICK PRESETS BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0B192C] uppercase tracking-wider">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Quick Scenario Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={handlePresetE17}
            className="px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-900 font-bold rounded-lg hover:bg-blue-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>⚡ What if E-17 unavailable for 3 days?</span>
          </button>
          <button
            onClick={handlePresetRainfall}
            className="px-3 py-1.5 bg-cyan-50 border border-cyan-300 text-cyan-900 font-bold rounded-lg hover:bg-cyan-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>🌧️ Rainfall +45mm & Poor Haul Road</span>
          </button>
          <button
            onClick={handlePresetBlockB17}
            className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 font-bold rounded-lg hover:bg-amber-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚧 Block B-17 Unserviceable</span>
          </button>
          <button
            onClick={handlePresetCrusher}
            className="px-3 py-1.5 bg-purple-50 border border-purple-300 text-purple-900 font-bold rounded-lg hover:bg-purple-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>🏭 Crusher Capacity @ 70%</span>
          </button>
          <button
            onClick={handleResetBaseline}
            className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-lg hover:bg-slate-200 transition shadow-sm flex items-center gap-1 ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset to Baseline</span>
          </button>
        </div>
      </div>

      {/* SCENARIO INPUT FORM */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-2">
          Configure Operational Scenario Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Equipment Outage */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-bold text-slate-700 block">Target Equipment</label>
            <select
              value={equipmentCode}
              onChange={(e) => setEquipmentCode(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-slate-800"
            >
              <option value="E-17">E-17 (Dump Truck 20T)</option>
              <option value="LHD-02">LHD-02 (Load Haul Dump)</option>
              <option value="EX-104">EX-104 (Hydraulic Excavator)</option>
              <option value="DR-05">DR-05 (Production Drill Rig)</option>
            </select>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-semibold">Equipment Status:</span>
              <button
                type="button"
                onClick={() => setEquipmentAvailable(!equipmentAvailable)}
                className={`px-2.5 py-1 rounded text-[11px] font-extrabold ${
                  equipmentAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {equipmentAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
              </button>
            </div>

            {!equipmentAvailable && (
              <div className="pt-1 space-y-1">
                <label className="text-[11px] text-slate-600 font-semibold block">Outage Duration (Days):</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Environmental Factors */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-bold text-slate-700 block">Monsoon Rainfall Increase</label>
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
              <span className="font-mono font-bold text-blue-900 shrink-0">+{rainfallMm} mm</span>
            </div>

            <label className="font-bold text-slate-700 block pt-2">Haul Road Condition</label>
            <select
              value={roadCondition}
              onChange={(e) => setRoadCondition(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-slate-800"
            >
              <option value="GOOD">GOOD (Normal Haulage)</option>
              <option value="FAIR">FAIR (+10% Cycle Time)</option>
              <option value="POOR">POOR (+25% Cycle Time)</option>
            </select>
          </div>

          {/* Block Readiness */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-bold text-slate-700 block">Specific Block Disruption</label>
            <select
              value={blockCode}
              onChange={(e) => setBlockCode(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-slate-800"
            >
              <option value="">None (All Blocks Active)</option>
              <option value="Block B-17">Block B-17 (Set Unserviceable)</option>
              <option value="Block B-12">Block B-12 (Set Unserviceable)</option>
              <option value="Block B-09">Block B-09 (Set Unserviceable)</option>
              <option value="Block B-22">Block B-22 (Set Unserviceable)</option>
            </select>

            <p className="text-[10px] text-slate-500 pt-2">
              * Sets target block readiness score to 0% due to unexpected roof sloughing or seismic activity.
            </p>
          </div>

          {/* Crusher Capacity */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-bold text-slate-700 block">Crusher Throughput Limit</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={crusherCapacityPct}
                onChange={(e) => setCrusherCapacityPct(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-purple-900 shrink-0">{crusherCapacityPct}%</span>
            </div>
            <p className="text-[10px] text-slate-500 pt-2">
              * Max daily crusher throughput = {(1200 * (crusherCapacityPct / 100)).toFixed(0)} MT/day.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={() => runSimulation()}
            disabled={loading}
            className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#0B192C] text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-amber-400 fill-amber-400" />}
            <span>RUN WHAT-IF SIMULATION</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: BASELINE VS SCENARIO COMPARISON METRICS */}
      {baseline && scenario && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#0B192C] font-serif flex items-center gap-2">
            <span>Simulation Results: Baseline vs Scenario ({horizonDays}-Day Horizon)</span>
            <span className="text-xs font-normal text-slate-500 font-mono">({simulationResult?.scenario_title})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BASELINE CARD */}
            <div className="bg-white rounded-xl border border-slate-300 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-500">BASELINE STATE</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                  ORIGINAL
                </span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Target Output:</span>
                  <strong className="text-slate-900">{baseline.target_production_tonnes} MT</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Predicted Production:</span>
                  <strong className="text-blue-900">{baseline.predicted_production_tonnes} MT</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Expected Shortfall:</span>
                  <strong className="text-red-600">-{baseline.expected_shortfall_tonnes} MT</strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-sans">
                  <span className="text-slate-600 font-semibold">Shortfall Risk:</span>
                  <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2 py-0.5 rounded">
                    {baseline.risk_level} ({baseline.shortfall_probability_pct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* SCENARIO CARD */}
            <div className="bg-red-50/60 rounded-xl border border-red-300 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-red-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-red-900">SIMULATED SCENARIO</span>
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {scenario.risk_level}
                </span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Target Output:</span>
                  <strong className="text-slate-900">{scenario.target_production_tonnes} MT</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">New Forecast:</span>
                  <strong className="text-red-900 font-extrabold">{scenario.predicted_production_tonnes} MT</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">New Shortfall:</span>
                  <strong className="text-red-600 font-extrabold">-{scenario.expected_shortfall_tonnes} MT</strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-red-200 font-sans">
                  <span className="text-slate-700 font-semibold">Impact Loss:</span>
                  <strong className="text-red-700 font-mono font-extrabold text-sm">
                    -{scenario.production_loss_delta_tonnes} MT
                  </strong>
                </div>
              </div>
            </div>

            {/* RECOVERY POTENTIAL CARD */}
            <div className="bg-emerald-50/60 rounded-xl border border-emerald-300 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">POST-RECOVERY POTENTIAL</span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  OPTIMIZED
                </span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Best Plan Recovery:</span>
                  <strong className="text-emerald-700 font-extrabold">
                    +{recoveryPlans[0]?.expected_recovery_tonnes || 0} MT
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Remaining Shortfall:</span>
                  <strong className="text-amber-700 font-bold">
                    {recoveryPlans[0]?.remaining_shortfall_tonnes || 0} MT
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-200 font-sans">
                  <span className="text-slate-700 font-semibold">Post-Recovery Risk:</span>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded">
                    LOW / ACCEPTABLE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SHAP EXPLANATION OF SCENARIO IMPACT */}
      {shapReasons.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-700 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-sm text-white">
              SHAP Impact Breakdown for Scenario ({simulationResult?.scenario_title})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {shapReasons.map((reason: any, idx: number) => (
              <div key={idx} className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                  <span className="font-bold text-cyan-300 block">{reason.feature}</span>
                  <span className="text-[11px] text-slate-400">{reason.description}</span>
                </div>
                <span className="font-mono font-extrabold text-red-400 text-sm ml-3 shrink-0">
                  {reason.impact_mt} MT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: RECALCULATED PRESCRIPTIVE RECOVERY PLANS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-3 flex items-center justify-between">
          <span>Evaluated Recovery Plans for Scenario State</span>
          <span className="text-xs text-slate-500 font-mono">MILP Optimizer Active</span>
        </h2>

        {recoveryPlans.length === 0 ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-800 text-xs font-bold">
            No feasible recovery plan found under this severe scenario condition.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recoveryPlans.map((plan: any) => (
              <div key={plan.plan_id} className="bg-slate-50 rounded-xl border border-slate-300 p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-sm text-[#0B192C]">{plan.plan_name}</span>
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded">
                      {plan.feasibility}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Corrective Actions:</span>
                    {plan.actions.map((act: any, aIdx: number) => (
                      <div key={aIdx} className="p-2 bg-white rounded border border-slate-200 text-slate-700 space-y-0.5">
                        <div className="font-bold text-[#1E3A8A] flex justify-between">
                          <span>{act.action_type}</span>
                          <span className="text-emerald-700 font-mono">+{act.impact_tonnes} MT</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{act.details}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-blue-950 text-white rounded-lg space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Expected Recovery:</span>
                      <strong className="text-emerald-400 font-bold">+{plan.expected_recovery_tonnes} MT</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Remaining Gap:</span>
                      <strong className="text-amber-400 font-bold">{plan.remaining_shortfall_tonnes} MT</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setAppliedPlanMsg(`Recovery Plan '${plan.plan_name}' applied to scenario dispatch queue!`)}
                  className="w-full py-2 bg-[#1E3A8A] hover:bg-[#0B192C] text-white font-bold text-xs rounded-lg transition shadow"
                >
                  Apply Scenario Plan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 6: SUMMARY COMPARISON TABLE */}
      {matrixMetrics.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-2">
            Scenario Comparison Matrix (Baseline vs Scenario vs Post-Recovery)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[#0B192C] font-bold">
                  <th className="p-3">Operational Metric</th>
                  <th className="p-3">Baseline</th>
                  <th className="p-3 text-red-700">Simulated Scenario</th>
                  <th className="p-3 text-emerald-700">Post-Recovery Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {matrixMetrics.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-bold text-slate-800">{row.metric}</td>
                    <td className="p-3 font-bold text-slate-700">{row.baseline}</td>
                    <td className="p-3 font-bold text-red-600">{row.scenario}</td>
                    <td className="p-3 font-bold text-emerald-700">{row.post_recovery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 7: SCENARIO HISTORY */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="font-serif font-bold text-sm text-[#0B192C]">Scenario History Log</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">{history.length} Saved Run(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-2.5">Run ID</th>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Scenario Title</th>
                  <th className="p-2.5">Impact</th>
                  <th className="p-2.5">Risk</th>
                  <th className="p-2.5">Best Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-blue-900">{h.id}</td>
                    <td className="p-2.5 text-slate-500">{h.timestamp}</td>
                    <td className="p-2.5 font-sans font-semibold text-slate-800">{h.title}</td>
                    <td className="p-2.5 text-red-600 font-bold">-{h.impact_mt} MT</td>
                    <td className="p-2.5 font-extrabold text-amber-700">{h.risk}</td>
                    <td className="p-2.5 font-sans text-slate-700">{h.best_recovery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
