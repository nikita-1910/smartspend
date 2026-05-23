import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ss_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register: (data) => api.post('/api/auth/register', data),
  login: (email, password) => api.post('/api/auth/login', { email, password }),
};

export const transactions = {
  create: (data) => api.post('/api/transactions', data),
  update: (id, data) => api.put(`/api/transactions/${id}`, data),
  list: (from, to, page = 0, size = 500) =>
    api.get('/api/transactions', { params: { from, to, page, size } }),
  anomalies: (page = 0, size = 50) =>
    api.get('/api/transactions/anomalies', { params: { page, size } }),
  delete: (id) => api.delete(`/api/transactions/${id}`),
};

export const budgets = {
  create: (data) => api.post('/api/budgets', data),
  status: (monthYear) => api.get('/api/budgets/status', { params: { monthYear } }),
};

export const reports = {
  generate: (monthYear) => api.post('/api/reports/generate', null, { params: { monthYear } }),
  all: () => api.get('/api/reports'),
};

export const dashboard = {
  get: (month) => api.get('/api/dashboard', { params: { month } }),
};

export default api;
