import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = () => {
  // 1. Explicit environment variable takes highest precedence (Vite .env or build-time config)
  if (import.meta.env.VITE_API_URL) {
    const customUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return customUrl.endsWith('/api') ? customUrl : `${customUrl}/api`;
  }

  // 2. Running inside native mobile container (Capacitor Android / iOS APK)
  // Most reliable check: Capacitor.isNativePlatform() returns true only when running inside a native wrapper
  const isNativeApp = 
    (typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) ||
    (typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined' && 
     typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !window.location.port);

  if (isNativeApp) {
    return 'https://hrms.jattamkommerce.com/api';
  }

  // 3. Running in browser
  if (typeof window !== 'undefined') {
    // In production web deployment, default to relative '/api' for reverse proxies / custom domains
    if (import.meta.env.PROD) {
      return '/api';
    }

    // Development mode fallback (connects to local backend on port 5001)
    if (window.location.hostname) {
      return `http://${window.location.hostname}:5001/api`;
    }
  }

  return '/api';
};

export const getServerBaseUrl = () => {
  const apiBase = getApiBaseUrl();
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
};

/**
 * Returns a fully qualified or clean relative URL for static uploaded assets (photos, documents)
 * Works consistently across dev, production SPA reverse proxy, and custom domains.
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (
    filePath.startsWith('blob:') || 
    filePath.startsWith('data:') || 
    filePath.startsWith('http://') || 
    filePath.startsWith('https://')
  ) {
    return filePath;
  }
  let cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  // Route uploads through /api/uploads/ so Passenger/Node.js reliably handles it in cPanel
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = `api/${cleanPath}`;
  }
  const serverBase = getServerBaseUrl();
  return serverBase ? `${serverBase}/${cleanPath}` : `/${cleanPath}`;
};

export const getBaseUrl = getApiBaseUrl;

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
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
  // When posting FormData (e.g. social uploads, profile photos), remove Content-Type so browser sets boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not intercept login/logout/refresh endpoints themselves
    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                           requestUrl.includes('/auth/refresh') ||
                           requestUrl.includes('/auth/logout');

    // If 401 and not already retried and not an auth management endpoint
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
           throw new Error('No refresh token available');
        }

        const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken });
        
        if (res.data?.success) {
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login if not already there
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
