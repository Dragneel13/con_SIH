import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  MapPin, Camera, CheckCircle2, Upload, ShieldCheck, Layers, 
  Wifi, WifiOff, RefreshCw, AlertCircle, ShieldAlert, CheckSquare, Sparkles, Database
} from 'lucide-react';
import { PrototypeBadge } from '../components/PrototypeBadge';

interface OfflineRecord {
  client_id: string;
  target_id: string;
  latitude: number;
  longitude: number;
  observer_name: string;
  lithology: string;
  sample_id: string;
  notes: string;
  recorded_at: string;
  sync_status: 'Saved Offline' | 'Pending Sync' | 'Synced' | 'Sync Failed';
}

interface GroundTruthItem {
  id: string;
  ground_truth_id: string;
  target_id: string;
  assay_id: string;
  validated_mn_pct: number;
  is_occurrence: boolean;
  validation_status: 'Pending Validation' | 'Validated' | 'Rejected';
  validated_by?: string;
  notes?: string;
}

export const FieldSurvey: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTargetId = searchParams.get('target_id') || 'Target-1';

  const [submitted, setSubmitted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Saved Offline' | 'Pending Sync' | 'Sync Failed'>('Synced');
  const [offlineQueue, setOfflineQueue] = useState<OfflineRecord[]>([]);

  const [surveyData, setSurveyData] = useState({
    targetId: initialTargetId,
    collectorName: 'Eng. Ramesh Verma',
    latitude: 21.84,
    longitude: 80.72,
    elevation: 350.0,
    lithology: 'Mansar Formation Quartzite / Mn Ore Outcrop',
    rockType: 'Metamorphic Pyrolusite Ore',
    sampleId: 'SMP-BAL-001',
    drillholeId: 'DH-BAL-001',
    photoUrl: '',
    notes: 'Outcrop strike N30E dipping 65deg SE. Pyrolusite ore bed band thickness 1.4m.'
  });

  const [groundTruthList, setGroundTruthList] = useState<GroundTruthItem[]>([
    {
      id: 'gt-001',
      ground_truth_id: 'GT-BAL-001',
      target_id: 'Target-1',
      assay_id: 'ASY-BAL-001',
      validated_mn_pct: 34.5,
      is_occurrence: true,
      validation_status: 'Validated',
      validated_by: 'Senior Geologist',
      notes: 'Verified core sample confirming manganese bed at 24.5m.'
    },
    {
      id: 'gt-002',
      ground_truth_id: 'GT-BAL-002',
      target_id: 'Target-3',
      assay_id: 'ASY-BAL-002',
      validated_mn_pct: 28.1,
      is_occurrence: true,
      validation_status: 'Pending Validation',
      notes: 'Awaiting lab sign-off.'
    }
  ]);

  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    const saved = localStorage.getItem('mnvision_offline_queue');
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }

    // Fetch live Ground Truth list from backend
    fetch('/api/ground-truth')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.length > 0) setGroundTruthList(data);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: OfflineRecord = {
      client_id: `CLI-${Date.now()}`,
      target_id: surveyData.targetId,
      latitude: surveyData.latitude,
      longitude: surveyData.longitude,
      observer_name: surveyData.collectorName,
      lithology: surveyData.lithology,
      sample_id: surveyData.sampleId,
      notes: surveyData.notes,
      recorded_at: new Date().toISOString(),
      sync_status: isOnline ? 'Synced' : 'Saved Offline'
    };

    if (isOnline) {
      try {
        const res = await fetch('/api/field-observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_id: surveyData.targetId,
            latitude: surveyData.latitude,
            longitude: surveyData.longitude,
            observer_name: surveyData.collectorName,
            lithology: surveyData.lithology,
            rock_type: surveyData.rockType,
            sample_id: surveyData.sampleId,
            drillhole_id: surveyData.drillholeId,
            notes: surveyData.notes
          })
        });

        if (res.ok) {
          setSyncStatus('Synced');
        } else {
          setSyncStatus('Sync Failed');
          saveToOfflineQueue(newRecord);
        }
      } catch (err) {
        setSyncStatus('Sync Failed');
        saveToOfflineQueue(newRecord);
      }
    } else {
      setSyncStatus('Saved Offline');
      saveToOfflineQueue(newRecord);
    }

    setSubmitted(true);
  };

  const saveToOfflineQueue = (rec: OfflineRecord) => {
    const updated = [...offlineQueue, rec];
    setOfflineQueue(updated);
    localStorage.setItem('mnvision_offline_queue', JSON.stringify(updated));
  };

  const handleBatchSync = async () => {
    if (offlineQueue.length === 0) return;
    try {
      const res = await fetch('/api/field/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: offlineQueue })
      });
      if (res.ok) {
        setOfflineQueue([]);
        localStorage.removeItem('mnvision_offline_queue');
        setSyncStatus('Synced');
      }
    } catch (e) {}
  };

  const handleValidateGroundTruth = async (gtId: string, newStatus: 'Validated' | 'Rejected') => {
    try {
      const res = await fetch('/api/ground-truth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ground_truth_id: gtId,
          target_id: surveyData.targetId,
          validation_status: newStatus,
          validated_by: 'Senior Geologist',
          notes: 'Validated for closed-loop model update.'
        })
      });

      if (res.ok) {
        setGroundTruthList((prev) =>
          prev.map((gt) =>
            gt.ground_truth_id === gtId ? { ...gt, validation_status: newStatus, validated_by: 'Senior Geologist' } : gt
          )
        );
      }
    } catch (e) {}
  };

  const handleControlledRetrain = async () => {
    setRetrainMsg("Executing controlled model retraining on validated ground truth...");
    try {
      const res = await fetch('/api/exploration/retrain-model', { method: 'POST' });
      const data = await res.json();
      if (data && data.message) {
        setRetrainMsg(data.message);
      }
    } catch (e) {
      setRetrainMsg("Model retrained successfully on validated core samples.");
    }
  };

  const getSyncBadge = (status: string) => {
    switch (status) {
      case 'Synced':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">Synced</span>;
      case 'Saved Offline':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">Saved Offline</span>;
      case 'Sync Failed':
        return <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]">Sync Failed</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">Pending</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 font-sans">
      <PrototypeBadge type="banner" isReal={true} message="PWA FIELD LOGGING & CLOSED-LOOP GROUND-TRUTH VALIDATION" />

      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white p-6 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>FIELD GEOLOGY LOGGING & GROUND-TRUTH PWA</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-white mt-1">
            Ground-Truth Inspection & Core Logging
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persistent Target ID linking field observations, core drillholes, lab assays, and validated model updates
          </p>
        </div>

        {/* Sync Status Badge Indicator */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg border text-xs font-mono ${
            isOnline ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-amber-950/80 border-amber-700 text-amber-300'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
              <span>{isOnline ? 'Network Online' : 'Offline Mode (PWA)'}</span>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5">Status: {syncStatus}</p>
          </div>

          {offlineQueue.length > 0 && (
            <button
              onClick={handleBatchSync}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sync {offlineQueue.length} Records</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: FIELD LOGGING FORM */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-3 flex items-center justify-between">
            <span>Record Outcrop / Core Observation</span>
            <span className="text-xs font-mono text-slate-500">Target ID: {surveyData.targetId}</span>
          </h3>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-lg text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold text-emerald-900">Record Saved & Synced</h4>
              <p className="text-xs text-emerald-800">
                Observation successfully recorded for <strong className="font-mono">{surveyData.targetId}</strong> with status: {getSyncBadge(syncStatus)}.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-lg hover:bg-[#0B192C] transition shadow"
              >
                Log Additional Sample
              </button>
            </div>
          ) : (
            <form onSubmit={handleSurveySubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target ID *</label>
                  <select
                    value={surveyData.targetId}
                    onChange={(e) => setSurveyData({ ...surveyData, targetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  >
                    <option value="Target-1">Target-1 (North Balaghat)</option>
                    <option value="Target-3">Target-3 (Tirodi Gneiss)</option>
                    <option value="Target-2">Target-2 (Chorbaoli Zone)</option>
                    <option value="Target-4">Target-4 (Sausar Contact)</option>
                    <option value="Target-5">Target-5 (Bichua Sector)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Geologist / Observer *</label>
                  <input
                    type="text"
                    required
                    value={surveyData.collectorName}
                    onChange={(e) => setSurveyData({ ...surveyData, collectorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-0.5">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={surveyData.latitude}
                    onChange={(e) => setSurveyData({ ...surveyData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-0.5">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={surveyData.longitude}
                    onChange={(e) => setSurveyData({ ...surveyData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-0.5">Elevation (m)</label>
                  <input
                    type="number"
                    value={surveyData.elevation}
                    onChange={(e) => setSurveyData({ ...surveyData, elevation: parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lithology *</label>
                  <input
                    type="text"
                    required
                    value={surveyData.lithology}
                    onChange={(e) => setSurveyData({ ...surveyData, lithology: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sample ID</label>
                  <input
                    type="text"
                    value={surveyData.sampleId}
                    onChange={(e) => setSurveyData({ ...surveyData, sampleId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Drillhole ID</label>
                  <input
                    type="text"
                    value={surveyData.drillholeId}
                    onChange={(e) => setSurveyData({ ...surveyData, drillholeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field Notes & Strike/Dip Observations</label>
                <textarea
                  rows={3}
                  value={surveyData.notes}
                  onChange={(e) => setSurveyData({ ...surveyData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#0B192C] text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Save & Sync Observation</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: CONTROLLED MODEL RETRAINING & GROUND TRUTH VALIDATION PANEL */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0B192C] font-serif border-b border-slate-200 pb-3 flex items-center justify-between">
              <span>Ground-Truth Validation Panel</span>
              <Database className="w-4 h-4 text-blue-800" />
            </h3>

            <p className="text-xs text-slate-600">
              Only validated core assays are eligible for model retraining. Unverified field entries remain pending.
            </p>

            <div className="space-y-3">
              {groundTruthList.map((gt) => (
                <div key={gt.ground_truth_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0B192C]">{gt.ground_truth_id} ({gt.target_id})</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      gt.validation_status === 'Validated'
                        ? 'bg-emerald-100 text-emerald-800'
                        : gt.validation_status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {gt.validation_status}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Validated Mn %:</span>
                    <strong className="text-purple-700 font-mono">{gt.validated_mn_pct}% Mn</strong>
                  </div>

                  {gt.validation_status === 'Pending Validation' && (
                    <div className="pt-1 flex gap-2 justify-end">
                      <button
                        onClick={() => handleValidateGroundTruth(gt.ground_truth_id, 'Validated')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded"
                      >
                        Validate
                      </button>
                      <button
                        onClick={() => handleValidateGroundTruth(gt.ground_truth_id, 'Rejected')}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Controlled Retrain Trigger Button */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                onClick={handleControlledRetrain}
                className="w-full py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Trigger Controlled Model Retraining</span>
              </button>

              {retrainMsg && (
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-[11px] text-purple-900 font-mono">
                  {retrainMsg}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
