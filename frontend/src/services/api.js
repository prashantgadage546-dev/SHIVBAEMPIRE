// =============================================================
// SHIVBAEMPIRE — Axios API Client
// Automatically attaches X-Collector-Id header for active collector
// =============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — attach token and active collector ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shivba_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const collectorId = localStorage.getItem('shivba_active_collector') || '1';
    config.headers['X-Collector-Id'] = collectorId;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
