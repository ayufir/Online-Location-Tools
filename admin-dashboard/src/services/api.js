import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('solartrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 auto-logout
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('solartrack_refresh');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        localStorage.setItem('solartrack_token', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    const msg = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Employees ────────────────────────────────────────────────────────────
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getLive: () => api.get('/employees/live'),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  toggleTracking: (id, enable) => api.put(`/employees/${id}/tracking`, { enable }),
  setTarget: (id, data) => api.put(`/location/target/${id}`, data),
  clearTarget: (id) => api.delete(`/location/target/${id}`),
  approveTask: (empId, taskId) => api.put(`/location/task/${empId}/${taskId}/approve`),
  getContacts: (id) => api.get(`/employees/${id}/contacts`),
  getGallery: (id) => api.get(`/employees/${id}/gallery`),
  getSms: (id) => api.get(`/employees/${id}/sms`),
};

export const assetAPI = {
  getAssets: () => api.get('/assets'),
  createAsset: (data) => api.post('/assets', data),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
};

// ─── Location ─────────────────────────────────────────────────────────────
export const locationAPI = {
  getLive: () => api.get('/location/live'),
  getHistory: (id, params) => api.get(`/location/history/${id}`, { params }),
  getSession: (sessionId) => api.get(`/location/session/${sessionId}`),
};

export default api;
