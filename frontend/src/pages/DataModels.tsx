import React from 'react';
import { Database, CheckCircle2, XCircle, AlertTriangle, Layers, Info, ShieldCheck } from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { FIXTURE_DATA_SOURCES } from '../services/fixtures';

export const DataModels: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <PrototypeBadge 
        type="banner" 
        isReal={true}
        message="MOIL DATA REGISTRY — Real Geospatial Datasets Integrated (GSI Geology, Sentinel-1/2, SRTM DEM, 160 Geochem Samples) + Synthetic Telemetry (SIH Sandbox)" 
      />

      {/* Page Title Header */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Database className="w-4 h-4 text-amber-300" />
            <span>MOIL DATA GOVERNANCE & MODEL REGISTRY</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            Geospatial Dataset Availability & ML Model Registry
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Dynamic data source registry tracking dataset readiness, feature availability, and ML model versioning.
          </p>
        </div>
        <div className="bg-[#1B2170]/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-xs font-mono border border-white/20 shadow-inner">
          <p className="text-blue-200 text-[10px] uppercase font-bold">Data Completeness Score</p>
          <p className="text-lg font-extrabold text-emerald-300">100% (10/10 Loaded)</p>
        </div>
      </div>

      {/* Dataset Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#313896] font-serif border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>Dataset Availability Matrix</span>
          <span className="text-xs font-mono text-[#313896] bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5]">{FIXTURE_DATA_SOURCES.length} Registered Sources</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#EBEFFA] border-b border-[#D0DCF5] text-[#313896] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 rounded-l-xl">Dataset Name</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Data Type</th>
                <th className="py-3.5 px-4">Coverage & Res</th>
                <th className="py-3.5 px-4">License / Category</th>
                <th className="py-3.5 px-4 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {FIXTURE_DATA_SOURCES.map((ds, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition">
                  <td className="py-3.5 px-4 font-bold text-[#313896] font-serif">{ds.dataset_name}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-semibold">{ds.provider}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">{ds.data_type}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{ds.resolution}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      ds.license.includes('Real') || ds.license.includes('Open') ? 'bg-[#EBEFFA] text-[#313896] border border-[#D0DCF5]' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {ds.license}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold">
                    {ds.status === 'AVAILABLE' ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> AVAILABLE
                      </span>
                    ) : ds.status === 'SYNTHETIC' ? (
                      <span className="text-amber-800 flex items-center gap-1 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> SYNTHETIC ML
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <XCircle className="w-3.5 h-3.5 text-slate-400" /> UNAVAILABLE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
