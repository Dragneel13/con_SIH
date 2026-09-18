import axios from 'axios';
import { Mine, MineBlock, DrillTarget, ShortfallPrediction, Recommendation, DataSource } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

// Automatically attach Authorization Bearer token from localStorage to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const healthApi = {
  check: () => axios.get('/health'),
};

export const minesApi = {
  list: () => api.get<Mine[]>('/mines'),
  getById: (id: string) => api.get<Mine>(`/mines/${id}`),
  getBlocks: (id: string) => api.get<MineBlock[]>(`/mines/${id}/blocks`),
};

export const explorationApi = {
  getProspectivity: () => api.get('/exploration/prospectivity'),
  getOccurrences: () => api.get('/exploration/occurrences'),
  getDataSources: () => api.get<any>('/exploration/data-sources'),
  predictProspectivity: (data: any) => api.post('/exploration/predict', data),
};

export const targetsApi = {
  list: () => api.get<DrillTarget[]>('/targets'),
  getById: (id: string) => api.get<DrillTarget>(`/targets/${id}`),
  getExplain: (id: string) => api.get(`/targets/${id}/explain`),
};

export const productionApi = {
  getSummary: () => api.get('/production'),
  getForecast: () => api.get('/production/forecast'),
  getShortfall: () => api.get<ShortfallPrediction[]>('/production/shortfall'),
  getBottlenecks: () => api.get('/production/bottlenecks'),
  predictShortfall: (data: any) => api.post('/production/predict-shortfall', data),
  forecastTonnes: (data: any) => api.post('/production/forecast-tonnes', data),
  recordShortfall: (data: any) => api.post('/production/record-shortfall', data),
  explainShortfall: (data: any) => api.post('/production/explain-shortfall', data),
  getCorrectiveActions: (data: any) => api.post('/production/corrective-actions', data),
  runOptimization: (data: any) => api.post('/optimizer/optimize', data),
  runWhatIfSimulation: (data: any) => api.post('/whatif/simulate', data),
};

export const whatifApi = {
  simulate: (data: any) => api.post('/whatif/simulate', data),
  getBaseline: () => api.get('/whatif/baseline'),
};

export const equipmentApi = {
  list: () => api.get('/equipment'),
  getAnomalies: () => api.get('/equipment/anomalies'),
};

export const blocksApi = {
  list: () => api.get<MineBlock[]>('/blocks'),
  getReadiness: () => api.get('/blocks/readiness'),
};

export const recommendationsApi = {
  list: () => api.get<Recommendation[]>('/recommendations'),
  approve: (id: string) => api.post(`/recommendations/${id}/approve`),
  reject: (id: string) => api.post(`/recommendations/${id}/reject`),
};

export const workflowApi = {
  getState: () => api.get('/workflow/state'),
  updateState: (data: any) => api.post('/workflow/state', data),
  initialize: (data?: any) => api.post('/workflow/initialize', data || {}),
};

export const decisionsApi = {
  signoff: (data: any) => api.post('/decisions/signoff', data),
  getHistory: () => api.get('/decisions/history'),
  getById: (id: string) => api.get(`/decisions/${id}`),
};

export const securityApi = {
  getStatus: () => api.get('/security/status'),
  getAuditLogs: (params?: any) => api.get('/security/audit-logs', { params }),
};
