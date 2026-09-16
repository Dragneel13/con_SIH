import React from 'react';
import { Settings, ShieldCheck, AlertCircle, ChevronRight, Activity, Wrench } from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';
import { FIXTURE_EQUIPMENT } from '../services/fixtures';

export const Equipment: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <PrototypeBadge type="banner" message="PROTOTYPE SIMULATION DATA — Heavy Machinery Telemetry & Isolation Forest Anomaly Detection" />

      {/* Page Title Header */}
      <div className="bg-gradient-to-r from-[#1B2170] via-[#313896] to-[#3B42A6] text-white p-6 rounded-2xl border border-[#2B308B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Settings className="w-4 h-4 text-amber-300" />
            <span>MOIL HEAVY MACHINERY FLEET TELEMETRY</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            Machinery Anomaly Detection & Predictive Maintenance
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Isolation Forest anomaly detection on dump trucks, hydraulic shovels, drill rigs, and crushers.
          </p>
        </div>
        <div className="bg-[#1B2170]/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-xs font-mono border border-white/20 shadow-inner">
          <p className="text-blue-200 text-[10px] uppercase font-bold">Fleet Availability</p>
          <p className="text-lg font-extrabold text-white">94.2% Operational</p>
        </div>
      </div>

      {/* Fleet Telemetry Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#313896] font-serif border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>Active Equipment Telemetry & Maintenance Queue</span>
          <span className="text-xs font-mono text-[#313896] bg-[#EBEFFA] px-2.5 py-1 rounded-full border border-[#D0DCF5]">Isolation Forest Model v1.0</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIXTURE_EQUIPMENT.map((eq) => (
            <div key={eq.id} className="p-5 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-3 hover:border-[#313896] transition-colors shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#313896] font-serif">{eq.equipment_code}</h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase">{eq.equipment_type} ({eq.model_name})</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  eq.anomaly_level === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {eq.anomaly_level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-slate-200/80 font-mono">
                <div>Status: <strong className="text-slate-900">{eq.status}</strong></div>
                <div>Availability: <strong className="text-emerald-700">{eq.availability_pct}%</strong></div>
                <div>Anomaly Score: <strong>{eq.anomaly_score.toFixed(2)}</strong></div>
                <div>Capacity: <strong>{eq.capacity_value} {eq.capacity_unit}</strong></div>
              </div>

              <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Manufacturer: <strong className="text-slate-800">{eq.manufacturer || 'MOIL Fleet'}</strong></span>
                <span className="text-[#313896] font-bold hover:underline cursor-pointer">Dispatch Ticket →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
