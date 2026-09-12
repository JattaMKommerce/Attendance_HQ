import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Lock, Mail, ShieldAlert, KeyRound, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import '../../styles/variables.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('employee@acme.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const handleQuickFill = (type) => {
    if (type === 'employee') {
      setIdentifier('employee@acme.com');
      setPassword('password123');
    } else if (type === 'admin') {
      setIdentifier('admin@acme.com');
      setPassword('password123');
    } else if (type === 'superadmin') {
      setIdentifier('superadmin@hrms.com');
      setPassword('password123');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>Jatta M Kommerce</div>
          <h1 style={styles.title}>JMK HRMS</h1>
          <p style={styles.subtitle}>Welcome Back! Sign in to access your portal</p>
        </div>

        {error && (
          <div style={styles.error}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Employee ID / Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="text"
                style={styles.input}
                placeholder="e.g. EMP-004 or employee@acme.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={styles.forgotLink}
              >
                Forgot Password?
              </button>
            </div>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Sign In <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div style={styles.quickAccess}>
          <div style={styles.quickTitle}>Quick Demo Switcher:</div>
          <div style={styles.quickButtons}>
            <button type="button" onClick={() => handleQuickFill('employee')} style={styles.quickBtn}>
              Employee
            </button>
            <button type="button" onClick={() => handleQuickFill('admin')} style={styles.quickBtn}>
              HR Admin
            </button>
            <button type="button" onClick={() => handleQuickFill('superadmin')} style={styles.quickBtn}>
              Super Admin
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={styles.modalOverlay} onClick={() => setShowForgotModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="var(--accent, #4f46e5)" />
                <h3 style={styles.modalTitle}>Forgot Password?</h3>
              </div>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary, #334155)' }}>
                For security reasons, employee password resets are managed directly by your Human Resources and IT administration.
              </p>
              <div style={styles.infoBox}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#1e293b' }}>
                  Contact HR Support:
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  📧 Email: <strong>hr@jattamkommerce.com</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                  🏢 HR Desk: <strong>Ext. 104 / General Office</strong>
                </div>
              </div>
              <p style={{ margin: '14px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                Once verified, your HR administrator will generate a secure temporary password for your account.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.modalButton}
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

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px 16px',
    backgroundColor: '#0f172a',
    background: 'radial-gradient(ellipse at top, #1e293b, #0f172a)'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    padding: '36px 32px',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    marginBottom: '10px'
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '26px',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94a3b8',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 40px 11px 38px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '12px',
    fontWeight: 500,
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'none'
  },
  button: {
    marginTop: '6px',
    padding: '12px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px'
  },
  quickAccess: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  quickTitle: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '10px',
    fontWeight: 500
  },
  quickButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  quickBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '12px',
    color: '#334155',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '18px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 600,
    color: '#0f172a'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '20px'
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '12px 16px',
    borderLeft: '4px solid #2563eb'
  },
  modalFooter: {
    padding: '14px 20px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  modalButton: {
    padding: '9px 18px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  }
};

export default Login;
