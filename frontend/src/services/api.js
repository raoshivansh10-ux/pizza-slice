import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let tokenProvider = null;

export const setAuthTokenProvider = (provider) => {
  tokenProvider = provider;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies (token / admin_token) with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Clerk session token when available
api.interceptors.request.use(async (config) => {
  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to retrieve Clerk auth token for request:', err);
    }
  }
  return config;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

