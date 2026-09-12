import axios from 'axios';

const getBaseUrl = () => {
  // 1. Explicit environment variable takes highest precedence (Vite .env or build-time config)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. Running in browser
  if (typeof window !== 'undefined') {
    // If running inside native mobile container (Capacitor)
    const isCapacitor = window.location.protocol === 'capacitor:' || 
                        (window.location.hostname === 'localhost' && window.Capacitor);
    if (isCapacitor) {
      return 'https://api.jattamkommerce.com/api';
    }

    // In production web deployment, default to relative '/api' for reverse proxies / custom domains
    if (import.meta.env.PROD) {
      return '/api';
    }

    // Development mode fallback (connects to local backend on port 5001)
    if (window.location.hostname) {
      return `http://${window.location.hostname}:5001/api`;
    }
  }

  return 'http://localhost:5001/api';
};


const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
           throw new Error('No refresh token available');
        }

        const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken });
        
        if (res.data.success) {
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
