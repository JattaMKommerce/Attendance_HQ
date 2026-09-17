import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Lock, Mail, ShieldAlert, KeyRound, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    
    if (result && (result.success || result === true)) {
      const loggedUser = result.user;
      if (loggedUser) {
        if (loggedUser.roles?.includes('SUPER_ADMIN')) {
          navigate('/platform/dashboard');
          return;
        }
        const isOnlyEmployee = loggedUser.roles?.includes('EMPLOYEE') && 
          !loggedUser.roles?.includes('ORG_ADMIN') && 
          !loggedUser.roles?.includes('HR_ADMIN') && 
          !loggedUser.roles?.includes('MANAGER') &&
          !loggedUser.roles?.includes('PAYROLL_MANAGER') &&
          !loggedUser.roles?.includes('FINANCE');

        if (isOnlyEmployee) {
          navigate('/app/employee/dashboard');
          return;
        }
        navigate('/app/dashboard');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="auth-page-container">
      {/* Top Left Brand Pill */}
      <div className="auth-brand-pill">
        <span className="brand-dot"></span>
        <span className="brand-text">Jatta M Kommerce</span>
      </div>

      {/* Corner Tagline matching reference typography */}
      <div className="auth-corner-tagline">
        <div className="corner-tagline-sans">Automate smarter.</div>
        <div className="corner-tagline-row">
          <span className="corner-tagline-serif">Work faster,</span>
          <span className="corner-tagline-jmk">with JMK.</span>
        </div>
      </div>

      {/* Centered Glassmorphic Login Box */}
      <div className="auth-glass-box">
        <div className="auth-header">
          <span className="auth-company-badge">Jatta M Kommerce</span>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            Enter your credentials to access your workspace
          </p>
        </div>

          {error && (
            <div className="auth-error-banner">
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Employee ID / Work Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Enter employee ID or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-actions-row">
              <label className="auth-remember-label">
                <input
                  type="checkbox"
                  className="auth-remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="auth-forgot-btn"
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <span className="auth-btn-inner">
                  Sign In <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div className="auth-footer-tag">
            JMK HRMS • Intelligent Workforce Management
          </div>
        </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="auth-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="var(--accent, #4f46e5)" />
                <h3 className="auth-modal-title">Forgot Password?</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close-btn"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="auth-modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
                For enterprise security, employee password resets are managed directly by your Human Resources and IT administration.
              </p>
              <div className="auth-info-box">
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#0f172a' }}>
                  Contact HR Support:
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  📧 Email: <strong>hr@jattamkommerce.com</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                  🏢 HR Desk: <strong>Ext. 104 / General Office</strong>
                </div>
              </div>
              <p style={{ margin: '14px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Once verified, your HR administrator will generate a secure temporary password for your account.
              </p>
            </div>
            <div className="auth-modal-footer">
              <button
                type="button"
                className="auth-modal-btn"
                onClick={() => setShowForgotModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
