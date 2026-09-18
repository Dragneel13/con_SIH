import React, { useState, useEffect } from 'react';
import { Target, MapPin, CheckCircle2, ChevronRight, Award, ShieldAlert, Sparkles, Activity, Layers, ArrowRight } from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { Link, useNavigate } from 'react-router-dom';
import { workflowApi } from '../services/api';

interface DrillTargetItem {
  id: string;
  target_id: string;
  name: string;
  rank: number;
  priority_level: string;
  prospectivity_score: number;
  confidence_pct: number;
  applicability: 'HIGH' | 'MEDIUM' | 'LOW';
  area_sqkm: number;
  latitude: number;
  longitude: number;
  predicted_grade: string;
  geology_match: string;
  recommended_action: string;
  evidence: Record<string, number>;
  scientific_safety_note: string;
}

export const DrillPlanning: React.FC = () => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<DrillTargetItem[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('Target-1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/targets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          setTargets(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleProceedToFieldSurvey = async (targetId: string) => {
    try {
      await workflowApi.updateState({
        currentStage: 'validate',
        targetId,
        investigationId: `INV-2026-${targetId.replace('Target-', '00')}`
      });
    } catch (e) {
      console.warn('Failed to update workflow state:', e);
    }
    navigate(`/field-survey?target_id=${targetId}`);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Very High':
        return 'bg-red-600 text-white font-bold px-2.5 py-0.5 rounded text-xs';
      case 'High':
        return 'bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded text-xs';
      case 'Medium':
        return 'bg-yellow-500 text-slate-900 font-bold px-2.5 py-0.5 rounded text-xs';
      default:
        return 'bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded text-xs';
    }
  };

  const getApplicabilityBadge = (app: string) => {
    switch (app) {
      case 'HIGH':
        return <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded text-[11px]">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded text-[11px]">MEDIUM</span>;
      default:
        return <span className="text-red-700 bg-red-100 font-bold px-2 py-0.5 rounded text-[11px]">LOW (OOD)</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="CLOSED-LOOP EXPLORATION & TARGET HANDOFF — Target ID persistence from MnExplore AI → Field Survey → Drilling → Assays → Ground Truth" 
      />

      {/* Closed-Loop Workflow Visualizer Pipeline Header */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/20 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-300" />
              <span>DrillTarget AI & Closed-Loop Exploration</span>
            </h1>
            <p className="text-xs text-blue-100/90 mt-0.5">
              Ranked candidate target queue with persistent Target ID handoff across field survey & core drilling
            </p>
          </div>
          <div className="bg-[#1B2170]/80 backdrop-blur-sm border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-mono text-cyan-200 shadow-inner">
            Persistent Target ID Sync: ACTIVE
          </div>
        </div>

        {/* 6-Step Closed Loop Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs pt-1 font-mono">
          <div className="p-2.5 bg-white text-[#313896] border border-white rounded-full font-bold shadow-sm">
            1. MnExplore AI
          </div>
          <div className="p-2.5 bg-[#1B2170]/70 border border-white/20 rounded-full text-blue-100">
            2. Field Survey
          </div>
          <div className="p-2.5 bg-[#1B2170]/70 border border-white/20 rounded-full text-blue-100">
            3. Core Drilling
          </div>
          <div className="p-2.5 bg-[#1B2170]/70 border border-white/20 rounded-full text-blue-100">
            4. Lab Assay
          </div>
          <div className="p-2.5 bg-[#1B2170]/70 border border-white/20 rounded-full text-blue-100">
            5. Ground Truth
          </div>
          <div className="p-2.5 bg-[#1B2170]/70 border border-white/20 rounded-full text-blue-100">
            6. Controlled Retrain
          </div>
        </div>
      </div>

      {/* Target Handoff Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-[#313896] font-serif flex items-center gap-2">
            <span>Ranked Exploration Targets (Balaghat Manganese Belt)</span>
          </h2>
          <span className="text-xs text-[#313896] font-mono bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5]">5 Verified Candidates</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#EBEFFA] border-b border-[#D0DCF5] text-[#313896] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-3 rounded-l-xl">Rank</th>
                <th className="py-3.5 px-3">Persistent Target ID</th>
                <th className="py-3.5 px-3">PU Score</th>
                <th className="py-3.5 px-3">Confidence</th>
                <th className="py-3.5 px-3">Applicability</th>
                <th className="py-3.5 px-3">Area</th>
                <th className="py-3.5 px-3">Coordinates</th>
                <th className="py-3.5 px-3">Priority</th>
                <th className="py-3.5 px-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {targets.map((target) => (
                <tr key={target.target_id} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-3.5 px-3 font-mono font-bold text-[#313896]">#{target.rank}</td>
                  <td className="py-3.5 px-3 font-bold text-[#313896] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-mono">{target.target_id}</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-700">
                    {(target.prospectivity_score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-3 font-mono text-cyan-800 font-semibold">
                    {target.confidence_pct}%
                  </td>
                  <td className="py-3.5 px-3">{getApplicabilityBadge(target.applicability)}</td>
                  <td className="py-3.5 px-3 font-mono">{target.area_sqkm} km²</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">
                    {target.latitude}° N, {target.longitude}° E
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={getPriorityBadge(target.priority_level)}>
                      {target.priority_level}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <Link
                      to={`/exploration/${target.target_id}`}
                      className="px-3 py-1.5 bg-[#313896] text-white rounded-full text-[11px] font-bold hover:bg-[#282D7A] transition inline-flex items-center gap-1 shadow-sm"
                    >
                      <span>Analyze Target</span>
                      <ChevronRight className="w-3 h-3 text-amber-300" />
                    </Link>
                    <button
                      onClick={() => handleProceedToFieldSurvey(target.target_id)}
                      className="px-3 py-1.5 bg-[#313896] text-white rounded-full text-[11px] font-bold hover:bg-[#282D7A] transition inline-flex items-center gap-1 shadow-sm"
                    >
                      <span>Field Survey</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scientific Safety Disclaimer */}
        <div className="p-3.5 bg-[#FFF8F0] rounded-xl border border-amber-300/80 text-amber-900 text-xs flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>SCIENTIFIC SAFETY MANDATE:</strong> Priority exploration target — Requires field validation & diamond core drilling confirmation.
          </span>
        </div>
      </div>
    </div>
  );
};
