import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, Activity, 
  Layers, RefreshCw, X, ShieldAlert, BarChart2, Check, ArrowLeft, Clock, Lock, FileText, UserCheck
} from 'lucide-react';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { useAuth } from '../context/AuthContext';
import { workflowApi, decisionsApi, securityApi } from '../services/api';

interface DecisionSnapshot {
  decision_id: string;
  workflow_chain: any;
  authoritative_metrics: any;
  decision_status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'DISPATCHED';
  executive_notes: string;
  actor: {
    username: string;
    role: string;
    email?: string;
  };
  timestamp: string;
  is_immutable: boolean;
}

export const DecisionCenter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Workflow Context
  const targetId = searchParams.get('target_id') || 'MN-TGT-001';
  const mineId = searchParams.get('mine_id') || 'MN-BAL-001';
  const mineType = searchParams.get('mine_type') || 'Underground';
  const forecastId = searchParams.get('forecast_id') || 'FCST-2026-48B5';
  const shortfallId = searchParams.get('shortfall_id') || 'SF-2026-48B5';
  const parentScenarioId = searchParams.get('scenario_id') || 'SCN-2026-48B5';
  const whatifScenarioId = searchParams.get('whatif_scenario_id') || 'SCN-2026-W001';

  // State
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [decisionHistory, setDecisionHistory] = useState<DecisionSnapshot[]>([]);
  const [decisionStatus, setDecisionStatus] = useState<'APPROVED' | 'REJECTED' | 'DISPATCHED'>('APPROVED');
  const [executiveNotes, setExecutiveNotes] = useState<string>(
    'Executive sign-off granted by Balaghat Operations Director. Optimized stope recovery plan approved for immediate field dispatch.'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load backend workflow state & audit logs (Zero ML/Optimization calls)
  const loadData = () => {
    setLoading(true);
    
    Promise.all([
      workflowApi.getState().catch(() => null),
      securityApi.getAuditLogs({ limit: 15 }).catch(() => null),
      decisionsApi.getHistory().catch(() => null),
    ]).then(([wfRes, auditRes, histRes]) => {
      if (wfRes && wfRes.data && wfRes.data.workflow) {
        setWorkflowState(wfRes.data.workflow);
      }
      if (auditRes && auditRes.data) {
        setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : []);
      }
      if (histRes && histRes.data && histRes.data.decisions) {
        setDecisionHistory(histRes.data.decisions);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit Executive Decision Sign-off
  const handleSignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Send references ONLY (backend derives actor and retrieves authoritative metrics)
      const res = await decisionsApi.signoff({
        parent_scenario_id: parentScenarioId,
        whatif_scenario_id: whatifScenarioId,
        forecast_id: forecastId,
        shortfall_id: shortfallId,
        target_id: targetId,
        mine_id: mineId,
        decision_status: decisionStatus,
        executive_notes: executiveNotes
      });

      if (res.data && res.data.status === 'SUCCESS') {
        setSuccessMsg(
          `Executive Decision ${res.data.decision_id} successfully recorded with status [${decisionStatus}]. Committed to security audit log.`
        );
        loadData(); // Refresh history and audit stream
      } else {
        setErrorMsg('Failed to record decision sign-off.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Decision sign-off failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToWhatIf = () => {
    const params = new URLSearchParams();
    params.set('mine_id', mineId);
    params.set('target_id', targetId);
    params.set('forecast_id', forecastId);
    params.set('shortfall_id', shortfallId);
    params.set('scenario_id', parentScenarioId);
    params.set('whatif_scenario_id', whatifScenarioId);
    params.set('mine_type', mineType);
    navigate(`/what-if?${params.toString()}`);
  };

  const wf = workflowState || {};
  const currentActorName = user?.full_name || user?.username || 'ops_manager';
  const currentActorRole = user?.role || 'Operations Manager';

  // Derive metrics dynamically from latest decision snapshot or backend workflow state
  const latestDecision = decisionHistory.length > 0 ? decisionHistory[0] : null;
  const metrics = latestDecision?.authoritative_metrics || wf?.authoritative_metrics || {
    target_production_tonnes: wf?.targetTonnes ?? null,
    baseline_forecast_tonnes: wf?.forecastTonnes ?? null,
    baseline_shortfall_tonnes: wf?.shortfallTonnes ?? null,
    optimized_expected_production_tonnes: wf?.optimizedTonnes ?? null,
    whatif_predicted_production_tonnes: wf?.whatifPredictedTonnes ?? null,
    remaining_shortfall_tonnes: wf?.remainingShortfallTonnes ?? null,
  };

  const formatMetricVal = (val: number | null | undefined, suffix: string = ' t') => {
    if (val === null || val === undefined || isNaN(val)) return 'NOT AVAILABLE';
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      {/* 11-Stage Workflow Navigator */}
      <WorkflowStepper activeStep={11} targetId={targetId} />

      {/* Success / Error Notification Banners */}
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-900">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
            <p className="text-xs font-bold text-red-900">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 hover:text-red-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#2B308B] to-[#1B2170] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>STAGE 11 — EXECUTIVE GOVERNANCE & DECISION SIGN-OFF</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            DECISION & GOVERNANCE CENTER
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Immutable executive decision sign-off, end-to-end workflow evidence traceability, and security audit log
          </p>
        </div>

        {/* Context Strip Badge */}
        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 text-xs font-mono space-y-1 shrink-0">
          <div className="text-amber-300 font-bold">Decision ID: {wf.decisionId || 'DEC-PENDING'}</div>
          <div className="text-blue-100 text-[11px]">Active Target: {targetId}</div>
          <div className="text-blue-100 text-[11px]">Mine: {mineId} ({mineType})</div>
        </div>
      </div>

      {/* SECTION 1: AUTHORITATIVE METRIC SUMMARY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 font-sans text-xs">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TARGET PRODUCTION</span>
          <div className="text-lg font-extrabold text-slate-900 font-mono">
            {formatMetricVal(metrics.target_production_tonnes)}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Monthly Target</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">BASELINE FORECAST (PAGE 2)</span>
          <div className="text-lg font-extrabold text-[#1B2170] font-mono">
            {formatMetricVal(metrics.baseline_forecast_tonnes)}
          </div>
          <span className="text-[10px] text-red-600 font-mono font-bold">
            Deficit: {metrics.baseline_shortfall_tonnes != null ? `-${formatMetricVal(metrics.baseline_shortfall_tonnes)}` : 'NOT AVAILABLE'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PAGE 6 OPTIMIZED PLAN</span>
          <div className="text-lg font-extrabold text-blue-900 font-mono">
            {formatMetricVal(metrics.optimized_expected_production_tonnes)}
          </div>
          <span className="text-[10px] text-emerald-700 font-mono font-bold">Scenario: {parentScenarioId}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PAGE 7 WHAT-IF RESULT</span>
          <div className="text-lg font-extrabold text-purple-900 font-mono">
            {formatMetricVal(metrics.whatif_predicted_production_tonnes)}
          </div>
          <span className="text-[10px] text-emerald-700 font-mono font-bold">Scenario: {whatifScenarioId}</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-sm space-y-1 text-emerald-950">
          <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-800">REMAINING SHORTFALL</span>
          <div className="text-lg font-extrabold font-mono text-emerald-700">
            {formatMetricVal(metrics.remaining_shortfall_tonnes)}
          </div>
          <span className="text-[10px] font-bold font-mono text-emerald-800">
            {metrics.remaining_shortfall_tonnes === 0 ? '100% Target Met' : 'Shortfall Tracking'}
          </span>
        </div>
      </div>

      {/* SECTION 2: END-TO-END WORKFLOW TRACEABILITY CHAIN */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#1B2170] font-serif border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>End-to-End Workflow Evidence & Traceability Chain</span>
          <span className="text-xs font-mono text-[#1B2170] bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5]">Audit Verifiable</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">1. Target ID</span>
            <strong className="text-[#1B2170]">{targetId}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">2. Investigation ID</span>
            <strong className="text-[#1B2170]">{wf.investigationId || 'INV-2026-001'}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">3. Resource ID</span>
            <strong className="text-[#1B2170]">{wf.resourceId || 'RES-BAL-001'}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">4. Baseline Forecast ID</span>
            <strong className="text-[#1B2170]">{forecastId}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">5. Shortfall Alert ID</span>
            <strong className="text-red-700">{shortfallId}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">6. Corrective Actions</span>
            <strong className="text-slate-800 font-sans">2 Actions Selected</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">7. MILP Scenario ID</span>
            <strong className="text-blue-900">{parentScenarioId}</strong>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-sans block font-bold">8. What-If Scenario ID</span>
            <strong className="text-purple-900">{whatifScenarioId}</strong>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 col-span-2">
            <span className="text-[10px] text-emerald-800 font-sans block font-bold">9. Decision ID</span>
            <strong className="text-emerald-900">{wf.decisionId || 'DEC-2026-W88'} (Immutable)</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: EXECUTIVE SIGN-OFF FORM */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4 font-sans">
          <h2 className="text-base font-bold text-[#1B2170] font-serif border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Executive Decision & Dispatch Sign-Off</span>
            <UserCheck className="w-5 h-5 text-[#1B2170]" />
          </h2>

          {/* Authenticated Actor Display (Backend Derived) */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B2170] text-amber-300 font-bold flex items-center justify-center text-xs">
                {currentActorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-slate-900 block">{currentActorName}</span>
                <span className="text-[11px] text-slate-600 font-medium">Role: <strong className="text-[#1B2170]">{currentActorRole}</strong></span>
              </div>
            </div>
            <span className="bg-white border border-blue-300 text-blue-900 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold">
              Authenticated JWT Actor
            </span>
          </div>

          <form onSubmit={handleSignoff} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Decision Sign-Off Status *</label>
              <select
                value={decisionStatus}
                onChange={(e) => setDecisionStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                <option value="APPROVED">APPROVED (Formal Executive Approval)</option>
                <option value="DISPATCHED">DISPATCHED (Committed to Mine Dispatch Queue)</option>
                <option value="REJECTED">REJECTED (Operational Plan Declined)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Executive Operational Justification & Dispatch Notes *</label>
              <textarea
                rows={4}
                required
                value={executiveNotes}
                onChange={(e) => setExecutiveNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-3 bg-[#1B2170] hover:bg-[#121650] text-white font-bold text-xs rounded-full transition shadow-md flex items-center gap-2 border border-amber-400/40 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-amber-300" />}
                <span>RECORD EXECUTIVE DECISION & DISPATCH</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: RECENT DECISION SNAPSHOTS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4 font-sans">
          <h3 className="text-base font-bold text-[#1B2170] font-serif border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Recorded Decision Snapshots</span>
            <Lock className="w-4 h-4 text-slate-500" />
          </h3>

          <div className="space-y-3">
            {decisionHistory.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                No executive decisions recorded in current session yet.
              </div>
            ) : (
              decisionHistory.map((dec) => (
                <div key={dec.decision_id} className="p-3.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1B2170]">{dec.decision_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dec.decision_status === 'APPROVED' || dec.decision_status === 'DISPATCHED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dec.decision_status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-sans">
                    Actor: <strong>{dec.actor.username}</strong> ({dec.actor.role})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(dec.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: LIVE SECURITY & OPERATIONAL AUDIT STREAM */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-[#1B2170] font-serif flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1B2170]" />
            <span>Security & Operational Audit Stream (Live Event Log)</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">{auditLogs.length} Event(s) Loaded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Resource</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-50">
                  <td className="p-2.5 text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2.5 font-bold text-slate-900">{log.username}</td>
                  <td className="p-2.5 text-slate-600 font-sans">{log.role}</td>
                  <td className="p-2.5 font-bold text-[#1B2170]">{log.action}</td>
                  <td className="p-2.5 text-slate-600 truncate max-w-[150px]">{log.resource}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600 font-sans max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="pt-4 flex justify-between items-center border-t border-slate-200 font-sans">
        <button
          onClick={handleBackToWhatIf}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>BACK TO WHAT-IF SIMULATOR (PAGE 7)</span>
        </button>

        <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-300 font-bold">
          ✓ END-TO-END WORKFLOW COMPLETED & AUDITED
        </span>
      </div>
    </div>
  );
};
