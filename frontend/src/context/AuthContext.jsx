import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Pre-load saved user from localStorage for instant, persistent login on launch
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            const userData = res.data.data.user;
            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
          }
        } catch (err) {
          // If 401, attempt silent refresh before clearing credentials
          if (err.response?.status === 401 && refreshToken) {
            try {
              const refreshRes = await api.post('/auth/refresh', { refreshToken });
              if (refreshRes.data?.success) {
                const newAccessToken = refreshRes.data.data.accessToken;
                localStorage.setItem('accessToken', newAccessToken);
                const retryRes = await api.get('/auth/me');
                if (retryRes.data?.success) {
                  const userData = retryRes.data.data.user;
                  setUser(userData);
                  localStorage.setItem('currentUser', JSON.stringify(userData));
                  setLoading(false);
                  return;
                }
              }
            } catch (refreshErr) {
              console.warn('Session refresh failed:', refreshErr?.message);
              // Only clear if refresh token is genuinely invalid or revoked
              if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('currentUser');
                setUser(null);
              }
            }
          } else if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            setUser(null);
          }
          // Note: If error was a network error (offline, phone booting up), we preserve the saved user!
        }
      } else {
        localStorage.removeItem('currentUser');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    const cleanIdentifier = (identifier || '').trim();
    try {
      const res = await api.post('/auth/login', { 
        email: cleanIdentifier, 
        identifier: cleanIdentifier, 
        password 
      });
      if (res.data?.success) {
        const { user: userData, accessToken, refreshToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      let msg = err.response?.data?.message;
      if (!msg) {
        if (err.message === 'Network Error') {
          msg = 'Unable to reach the HRMS server. Please check your network connection or verify server is active.';
        } else if (err.code === 'ECONNABORTED') {
          msg = 'Login request timed out. Please try again.';
        } else {
          msg = err.message || 'Login failed. Please check your credentials.';
        }
      }
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const registerOrganization = async ({ orgName, email, password, firstName, lastName }) => {
    setError(null);
    try {
      const res = await api.post('/auth/register-organization', {
        orgName,
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app-gradient, #f0f4f9)',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif"
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3px solid rgba(37, 99, 235, 0.15)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'authSpin 0.75s linear infinite'
        }} />
        <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, registerOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};
