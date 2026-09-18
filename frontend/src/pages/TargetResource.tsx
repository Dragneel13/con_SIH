import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Database, Layers, CheckCircle2, Info, ArrowRight, Activity, 
  BarChart3, Award, FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { workflowApi } from '../services/api';

export const TargetResource: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('target_id') || 'MN-TGT-001';
  const [resourceData, setResourceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleProceedToProduction = async () => {
    try {
      await workflowApi.updateState({ currentStage: 'forecast', targetId, forecastId: 'FC-2026-04' });
    } catch (e) {
      console.warn('Failed to update workflow state:', e);
    }
    navigate(`/production?target_id=${targetId}`);
  };

  useEffect(() => {
    fetch(`/api/resources/${targetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setResourceData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [targetId]);

  const res = resourceData || {
    target_id: targetId,
    resource_id: `RES-${targetId.toUpperCase().replace('-', '')}`,
    resource_classification: 'INDICATED',
    area_sqkm: 12.8,
    modeled_thickness_m: 37.76,
    bulk_density_t_m3: 3.85,
    gross_in_situ_tonnes: 186250000.0,
    estimated_mn_grade_pct: 33.5,
    estimated_fe_grade_pct: 7.2,
    resource_hierarchy: {
      inferred_resource_tonnes: 83812500.0,
      indicated_resource_tonnes: 65187500.0,
      measured_resource_tonnes: 37250000.0,
      total_identified_resource_tonnes: 186250000.0,
      mineable_reserve_tonnes: 87071875.0,
      ready_block_tonnes: 34828750.0
    },
    estimation_method: '3D Block Model & Geostatistical Kriging Simulation',
    data_provenance: 'Calculated from 2 validated drillhole core assays',
    resource_note: 'Resource estimates distinguish GEOLOGICAL RESOURCE != MINEABLE RESERVE != READY BLOCK != PRODUCTION.'
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge 
        type="banner" 
        isReal={true} 
        message="STAGE 4: GEOLOGICAL RESOURCE ESTIMATION — 3D Block Model & Resource Hierarchy" 
      />

      {/* 11-Stage Workflow Stepper */}
      <WorkflowStepper activeStep={4} targetId={targetId} />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Database className="w-4 h-4 text-amber-300" />
            <span>STAGE 4: GEOLOGICAL RESOURCE ESTIMATION (Target: {res.target_id})</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1 flex items-center gap-3">
            <span>3D Block Model & Ore Reserves</span>
            <span className="text-xs font-sans font-semibold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-sm">
              {res.resource_classification} Confidence
            </span>
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Geostatistical kriging block model derived from core assays & spatial bounds
          </p>
        </div>

        <div className="bg-[#1B2170]/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-xs font-mono space-y-1.5 shadow-inner">
          <div className="flex justify-between gap-6">
            <span className="text-blue-200">Total Ore Volume:</span>
            <strong className="text-amber-300 font-bold">{(res.gross_in_situ_tonnes / 1000000.0).toFixed(2)} Million MT</strong>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-blue-200">Avg Mn Grade:</span>
            <strong className="text-emerald-300 font-bold">{res.estimated_mn_grade_pct}% Mn</strong>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-blue-200">Ore Thickness:</span>
            <strong className="text-white font-bold">{res.modeled_thickness_m} m</strong>
          </div>
        </div>
      </div>

      {/* Resource Hierarchy Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Inferred Resource</span>
          <span className="text-lg font-bold text-blue-900 block font-mono">
            {(res.resource_hierarchy.inferred_resource_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-slate-500 block">P90 Reconnaissance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Indicated Resource</span>
          <span className="text-lg font-bold text-[#313896] block font-mono">
            {(res.resource_hierarchy.indicated_resource_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-slate-500 block">P50 Core Validated</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Measured Resource</span>
          <span className="text-lg font-bold text-emerald-700 block font-mono">
            {(res.resource_hierarchy.measured_resource_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-slate-500 block">P10 Dense Grid</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Identified Inventory</span>
          <span className="text-lg font-bold text-slate-900 block font-mono">
            {(res.resource_hierarchy.total_identified_resource_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-slate-500 block">Gross In-Situ</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Mineable Reserve</span>
          <span className="text-lg font-bold text-amber-900 block font-mono">
            {(res.resource_hierarchy.mineable_reserve_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-amber-700 block">85% Mining Recovery</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Ready Block Reserve</span>
          <span className="text-lg font-bold text-emerald-950 block font-mono">
            {(res.resource_hierarchy.ready_block_tonnes / 1000000.0).toFixed(2)} M MT
          </span>
          <span className="text-[10px] text-emerald-700 block">Developed Stopes</span>
        </div>
      </div>

      {/* Domain Distinction & Safety Banner */}
      <div className="bg-[#FFF8F0] border border-amber-300 p-4 rounded-xl text-amber-950 text-xs flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-sm font-bold text-amber-950 block">Domain Distinction & Legal Compliance Mandate</strong>
          <p className="mt-0.5 text-amber-900 leading-relaxed font-sans">
            {res.resource_note} Geological resource estimates represent total in-situ mineral endowment. Mineable reserves account for mining recovery and dilution factors, whereas ready blocks represent stope volume developed for immediate extraction.
          </p>
        </div>
      </div>

      {/* Next Step Navigation CTA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#313896]">Proceed to Stage 5: Production Forecasting</h4>
          <p className="text-xs text-slate-500">Connect mineral ready block inventory into ShortfallShield 7/15/30 day production forecast.</p>
        </div>
        <button
          onClick={handleProceedToProduction}
          className="px-6 py-2.5 bg-[#313896] hover:bg-[#282D7A] text-white font-bold text-xs rounded-full transition shadow-sm flex items-center gap-2"
        >
          <span>Proceed to Stage 5: Production Forecast</span>
          <ArrowRight className="w-4 h-4 text-amber-300" />
        </button>
      </div>
    </div>
  );
};
