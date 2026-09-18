import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Compass, Search, CheckCircle2, Database, TrendingUp, AlertTriangle, 
  Layers, Wrench, Cpu, Sliders, ShieldCheck, ChevronRight, ChevronLeft, ArrowRight
} from 'lucide-react';

export interface WorkflowStage {
  step: number;
  id: string;
  name: string;
  shortName: string;
  path: string;
  icon: any;
  description: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  { step: 1, id: 'explore', name: 'Stage 1: Explore', shortName: '1. Explore', path: '/exploration', icon: Compass, description: 'Multi-source geospatial PU prospectivity modeling' },
  { step: 2, id: 'investigate', name: 'Stage 2: Investigate', shortName: '2. Investigate', path: '/exploration/Target-1', icon: Search, description: 'CEM spectral target anomaly & structural lineaments' },
  { step: 3, id: 'validate', name: 'Stage 3: Validate', shortName: '3. Validate', path: '/field-survey', icon: CheckCircle2, description: 'Ground-truth field logging & diamond core assays' },
  { step: 4, id: 'resource', name: 'Stage 4: Resource Est.', shortName: '4. Resource', path: '/target-resource', icon: Database, description: '3D block model tonnage & JORC resource classification' },
  { step: 5, id: 'forecast', name: 'Stage 5: Production Forecast', shortName: '5. Forecast', path: '/production', icon: TrendingUp, description: 'ShortfallShield 7, 15, and 30 day production forecast' },
  { step: 6, id: 'shortfall', name: 'Stage 6: Shortfall Detection', shortName: '6. Shortfall', path: '/mine-twin', icon: AlertTriangle, description: 'MineTwin telemetry & production gap monitoring' },
  { step: 7, id: 'rootcause', name: 'Stage 7: Root-Cause SHAP', shortName: '7. Root Cause', path: '/mine-twin', icon: Layers, description: 'Tree SHAP operational attribution & feature drivers' },
  { step: 8, id: 'corrective', name: 'Stage 8: Corrective Actions', shortName: '8. Actions', path: '/decisions', icon: Wrench, description: 'Action candidate generation & block readiness check' },
  { step: 9, id: 'optimization', name: 'Stage 9: Optimization', shortName: '9. Optimize', path: '/decisions', icon: Cpu, description: 'Prescriptive Mine Optimizer MILP recovery plans' },
  { step: 10, id: 'whatif', name: 'Stage 10: What-If Simulation', shortName: '10. What-If', path: '/what-if', icon: Sliders, description: 'Isolated scenario simulator & comparison matrix' },
  { step: 11, id: 'decision', name: 'Stage 11: Decision & Feedback', shortName: '11. Decision', path: '/decisions', icon: ShieldCheck, description: 'Executive sign-off, audit trail & ML retraining loop' },
];

export const WorkflowStepper: React.FC<{ activeStep?: number; targetId?: string }> = ({ activeStep, targetId = 'MN-TGT-001' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect current active step from path if not explicitly provided
  const currentStep = activeStep || (() => {
    const path = location.pathname;
    if (path.includes('/what-if')) return 10;
    if (path.includes('/decisions')) return 9;
    if (path.includes('/mine-twin')) return 6;
    if (path.includes('/production')) return 5;
    if (path.includes('/field-survey')) return 3;
    if (path.includes('/target-resource') || path.includes('/resources')) return 4;
    if (path.includes('/exploration/') && path !== '/exploration') return 2;
    if (path.includes('/exploration')) return 1;
    return 1;
  })();

  const activeStage = WORKFLOW_STAGES.find(s => s.step === currentStep) || WORKFLOW_STAGES[0];
  const prevStage = currentStep > 1 ? WORKFLOW_STAGES.find(s => s.step === currentStep - 1) : null;
  const nextStage = currentStep < 11 ? WORKFLOW_STAGES.find(s => s.step === currentStep + 1) : null;

  const navigateToStage = (stage: WorkflowStage) => {
    let targetPath = stage.path;
    if (stage.step === 2) {
      targetPath = `/exploration/${targetId}`;
    }
    // Append target_id to retain context across stages
    const separator = targetPath.includes('?') ? '&' : '?';
    navigate(`${targetPath}${separator}target_id=${targetId}`);
  };

  return (
    <div className="w-full bg-[#1B2170] text-white p-4 rounded-2xl border border-[#2B308B] shadow-md space-y-3 font-sans">
      {/* Header Info Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-blue-400/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-sm">
            {currentStep}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              <span>MnVision 360 Decision Support System</span>
              <span className="text-white/40">•</span>
              <span className="text-blue-200">Target: {targetId}</span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{activeStage.name}</span>
              <span className="text-xs font-normal text-blue-200 hidden sm:inline">— {activeStage.description}</span>
            </h2>
          </div>
        </div>

        {/* Next / Previous Quick Nav Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {prevStage && (
            <button
              onClick={() => navigateToStage(prevStage)}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition flex items-center gap-1 border border-white/15"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Back</span>
            </button>
          )}

          {nextStage && (
            <button
              onClick={() => navigateToStage(nextStage)}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Proceed to {nextStage.shortName}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 11-Stage Horizontal Stepper Nodes */}
      <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-blue-400/30">
        <div className="flex items-center gap-1.5 min-w-max">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = stage.step === currentStep;
            const isCompleted = stage.step < currentStep;

            return (
              <button
                key={stage.step}
                onClick={() => navigateToStage(stage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                  isActive
                    ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold shadow-md scale-105'
                    : isCompleted
                    ? 'bg-blue-900/60 text-emerald-300 border-emerald-500/40 hover:bg-blue-800'
                    : 'bg-white/5 text-blue-200 border-white/10 hover:bg-white/15 hover:text-white'
                }`}
                title={stage.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-400' : 'text-amber-300'}`} />
                <span>{stage.shortName}</span>
                {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
