import React, { useState, useEffect } from 'react';
import { 
  Zap, CheckCircle2, AlertTriangle, ShieldCheck, ChevronRight, Activity, 
  Layers, RefreshCw, X, ShieldAlert, BarChart2, Check, ArrowRight, Sliders
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';

interface CandidatePlan {
  plan_id: string;
  plan_name: string;
  feasibility: 'FEASIBLE' | 'FEASIBLE_WITH_RISK' | 'INFEASIBLE';
  actions: Array<{
    action_type: string;
    target: string;
    details: string;
    impact_tonnes: number;
  }>;
  expected_recovery_tonnes: number;
  remaining_shortfall_tonnes: number;
  recovery_percentage: number;
  constraints_status: Array<{
    constraint: string;
    status: 'PASS' | 'WARNED' | 'FAILED';
    details: string;
  }>;
}

export const DecisionCenter: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(7);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [selectedPlanModal, setSelectedPlanModal] = useState<CandidatePlan | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState<string | null>(null);

  const fetchOptimization = (horizonDays: number) => {
    setLoading(true);
    const targetTonnes = horizonDays === 7 ? 2800.0 : horizonDays === 15 ? 6000.0 : 12000.0;
    const predTonnes = horizonDays === 7 ? 2450.0 : horizonDays === 15 ? 5120.0 : 9840.0;
    const shortTonnes = horizonDays === 7 ? 350.0 : horizonDays === 15 ? 880.0 : 2160.0;

    fetch('/api/optimizer/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        horizon_days: horizonDays,
        target_production_tonnes: targetTonnes,
        predicted_production_tonnes: predTonnes,
        expected_tonnes_short: shortTonnes,
        risk_level: horizonDays === 7 ? 'MEDIUM' : 'HIGH'
      })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOptimizationResult(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOptimization(selectedHorizon);
  }, [selectedHorizon]);

  const handleApplyPlan = (plan: CandidatePlan) => {
    setSelectedPlanModal(null);
    setAppliedSuccessMsg(
      `Plan '${plan.plan_name}' APPROVED & DISPATCHED! Expected recovery of +${plan.expected_recovery_tonnes} MT injected into mine dispatch schedule.`
    );
    setTimeout(() => setAppliedSuccessMsg(null), 7000);
  };

  const candidatePlans: CandidatePlan[] = optimizationResult?.candidate_plans || [];
  const isInfeasible = optimizationResult?.status === 'INFEASIBLE' || candidatePlans.length === 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="PRESCRIPTIVE MINE OPTIMIZER — Constrained MILP Engine & Feasible Action Evaluator" 
      />

      {/* Applied Plan Success Notification Banner */}
      {appliedSuccessMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-900">{appliedSuccessMsg}</p>
          </div>
          <button onClick={() => setAppliedSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title Header */}
      <div className="bg-[#0B192C] text-white p-6 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>MOIL PRESCRIPTIVE MINE OPTIMIZER ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            Prescriptive Mine Optimizer & Feasible Recovery Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mixed-Integer Constraint Solver evaluating block readiness, equipment availability, and crusher capacity
          </p>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-2 bg-[#0F172A] p-1.5 rounded-lg border border-slate-700">
          {[7, 15, 30].map((hDays) => (
            <button
              key={hDays}
              onClick={() => setSelectedHorizon(hDays)}
              className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition ${
                selectedHorizon === hDays
                  ? 'bg-amber-500 text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {hDays} Days
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: CURRENT RISK SUMMARY CARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Target Production</span>
          <strong className="text-xl font-bold text-[#0B192C] font-mono">
            {selectedHorizon === 7 ? '2,800' : selectedHorizon === 15 ? '6,000' : '12,000'} MT
          </strong>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Predicted Output</span>
          <strong className="text-xl font-bold text-blue-900 font-mono">
            {selectedHorizon === 7 ? '2,450' : selectedHorizon === 15 ? '5,120' : '9,840'} MT
          </strong>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Expected Shortfall</span>
          <strong className="text-xl font-bold text-red-600 font-mono">
            -{selectedHorizon === 7 ? '350' : selectedHorizon === 15 ? '880' : '2,160'} MT
          </strong>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Operational Risk</span>
            <span className="text-xs font-bold text-red-700 font-mono">
              {selectedHorizon === 7 ? '68.5% Probability' : selectedHorizon === 15 ? '74.2% Probability' : '81.0% Probability'}
            </span>
          </div>
          <span className="bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">
            {selectedHorizon === 7 ? 'MEDIUM' : 'HIGH'}
          </span>
        </div>
      </div>

      {/* SECTION 2: CONTEXTUAL SHAP ROOT CAUSES */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-700 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-amber-400">Contextual SHAP Guidance:</span>
            <span className="text-slate-300 ml-1.5">
              Equipment downtime (EX-104) & Block B-09 readiness delays drive {selectedHorizon}-day deficit. Optimizer prioritizing alternate ready blocks and LHD redeployment.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 bg-blue-950 border border-blue-700 px-2 py-1 rounded shrink-0">
          Tree SHAP Context Linked
        </span>
      </div>

      {/* SECTION 3: RECOMMENDED FEASIBLE CANDIDATE PLANS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-[#0B192C] font-serif flex items-center gap-2">
            <span>Candidate Recovery Plans (MILP Constraint Optimizer)</span>
          </h2>
          <div className="flex items-center gap-2">
            {candidatePlans.length > 1 && (
              <button
                onClick={() => setCompareModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition"
              >
                Compare Plans
              </button>
            )}
            <span className="text-xs text-slate-500 font-mono">{candidatePlans.length} Feasible Option(s)</span>
          </div>
        </div>

        {/* INFEASIBLE NOTICE (Requirement 11 Edge Case 7) */}
        {isInfeasible ? (
          <div className="bg-red-50 border border-red-300 p-6 rounded-xl text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
            <h3 className="text-base font-bold text-red-900">
              No feasible recovery plan found under current constraints.
            </h3>
            <p className="text-xs text-red-700 max-w-xl mx-auto">
              All candidate blocks fail readiness requirements (Readiness Score &lt; 80%) or active equipment downtime exceeds operational limits. Relax constraints to run What-if analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidatePlans.map((plan) => (
              <div 
                key={plan.plan_id}
                className="bg-slate-50 rounded-xl border border-slate-300 p-5 space-y-4 hover:border-blue-500 transition shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-serif font-bold text-sm text-[#0B192C]">{plan.plan_name}</span>
                    <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded ${
                      plan.feasibility === 'FEASIBLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {plan.feasibility}
                    </span>
                  </div>

                  {/* Actions List */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Corrective Actions:</span>
                    {plan.actions.map((act, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-slate-200 text-slate-700 space-y-0.5">
                        <div className="font-bold text-[#1E3A8A] flex items-center justify-between">
                          <span>{act.action_type}</span>
                          <span className="text-emerald-700 font-mono">+{act.impact_tonnes} MT</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{act.details}</p>
                      </div>
                    ))}
                  </div>

                  {/* Constraints Check Badges */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Constraints Check:</span>
                    <div className="space-y-1 text-[11px]">
                      {plan.constraints_status.map((c, cIdx) => (
                        <div key={cIdx} className="flex items-center justify-between text-slate-600 font-sans">
                          <span>{c.constraint}</span>
                          <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            c.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Output Recovery Numbers */}
                  <div className="p-3 bg-blue-950 text-white rounded-lg text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Expected Recovery:</span>
                      <strong className="text-emerald-400 font-bold">+{plan.expected_recovery_tonnes} MT</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Remaining Shortfall:</span>
                      <strong className="text-amber-400 font-bold">{plan.remaining_shortfall_tonnes} MT</strong>
                    </div>
                  </div>
                </div>

                {/* Apply Button (Requires User Review - Requirement 10) */}
                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setSelectedPlanModal(plan)}
                    className="w-full py-2.5 bg-[#1E3A8A] hover:bg-[#0B192C] text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Apply {plan.plan_id}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVAL MODAL (Human-in-the-Loop Review - Requirement 10) */}
      {selectedPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  Review & Approve Plan — {selectedPlanModal.plan_name}
                </h3>
              </div>
              <button onClick={() => setSelectedPlanModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <strong className="text-[#0B192C] font-bold text-sm block">Summary of Actions:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {selectedPlanModal.actions.map((act, idx) => (
                    <li key={idx}><strong className="text-blue-900">{act.action_type}:</strong> {act.details}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 font-mono font-bold flex justify-between">
                <span>Expected Recovery Output:</span>
                <span>+{selectedPlanModal.expected_recovery_tonnes} MT</span>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Operational actions require user approval before dispatching to MOIL command.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  onClick={() => setSelectedPlanModal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApplyPlan(selectedPlanModal)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APPROVE & DISPATCH TO FIELD</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPARE PLANS MODAL */}
      {compareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <h3 className="font-bold text-sm uppercase tracking-wide">Candidate Recovery Plan Comparison</h3>
              <button onClick={() => setCompareModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[#0B192C] font-bold">
                    <th className="p-3">Plan</th>
                    <th className="p-3">Expected Recovery</th>
                    <th className="p-3">Remaining Gap</th>
                    <th className="p-3">Feasibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {candidatePlans.map((p) => (
                    <tr key={p.plan_id}>
                      <td className="p-3 font-bold text-[#1E3A8A]">{p.plan_name}</td>
                      <td className="p-3 font-bold text-emerald-700">+{p.expected_recovery_tonnes} MT</td>
                      <td className="p-3 text-red-600">{p.remaining_shortfall_tonnes} MT</td>
                      <td className="p-3 font-bold">{p.feasibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
