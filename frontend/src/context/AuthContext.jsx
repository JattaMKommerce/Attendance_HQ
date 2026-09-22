import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            setUser(res.data.data.user);
          }
        } catch (err) {
          // Invalid or expired session - clear stale tokens cleanly
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
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
        const { user, accessToken, refreshToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(user);
        return { success: true, user };
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

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
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
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
