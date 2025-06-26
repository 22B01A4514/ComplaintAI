import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  sendOTP: (email) => api.post('/auth/send-otp', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Complaints API
export const complaintsAPI = {
  getAllComplaints: (filters = {}) => api.get('/complaints', { params: filters }),
  getComplaint: (id) => api.get(`/complaints/${id}`),
  createComplaint: (complaintData) => api.post('/complaints', complaintData),
  updateComplaint: (id, updates) => api.put(`/complaints/${id}`, updates),
  deleteComplaint: (id) => api.delete(`/complaints/${id}`),
  voteComplaint: (id, action) => api.post(`/complaints/${id}/vote`, { action }),
  getComplaintUpdates: (id) => api.get(`/complaints/${id}/updates`),
  addComplaintUpdate: (id, update) => api.post(`/complaints/${id}/updates`, update),
};

// Departments API
export const departmentsAPI = {
  getAllDepartments: () => api.get('/departments'),
  getDepartment: (id) => api.get(`/departments/${id}`),
  updateDepartmentPerformance: (id, performance) => api.put(`/departments/${id}/performance`, performance),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getCategoryBreakdown: () => api.get('/analytics/categories'),
  getTrends: (period = '30d') => api.get(`/analytics/trends?period=${period}`),
  getDepartmentPerformance: () => api.get('/analytics/departments'),
  getLocationClusters: () => api.get('/analytics/locations'),
};

export default api;