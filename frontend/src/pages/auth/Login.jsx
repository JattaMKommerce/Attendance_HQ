import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Lock, Mail, ShieldAlert, KeyRound, X, ArrowRight, ArrowLeft, 
  Eye, EyeOff, Building2, User, CheckCircle2, Sparkles, Info
} from 'lucide-react';
import './Login.css';

const Login = ({ defaultMode }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, registerOrganization, error: authError } = useContext(AuthContext);

  // Determine mode from prop, pathname, or query param
  const urlMode = searchParams.get('mode') || (location.pathname === '/signup' ? 'signup' : 'signin');
  const [mode, setMode] = useState(defaultMode || urlMode);

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Sign Up State
  const [orgName, setOrgName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Update mode when URL or route changes
  useEffect(() => {
    if (urlMode) {
      setMode(urlMode);
    }
  }, [urlMode, location.pathname]);

  // Clear errors when toggling modes
  useEffect(() => {
    setFormError('');
    setSuccessMessage('');
  }, [mode]);

  // Calculate password strength
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '#e2e8f0' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, text: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 50, text: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 75, text: 'Good', color: '#3b82f6' };
    return { score: 100, text: 'Strong', color: '#10b981' };
  };

  const passStrength = getPasswordStrength(regPassword);

  // Quick fill helper for testing demo credentials
  const fillDemoCredentials = (role) => {
    if (role === 'admin') {
      setIdentifier('hrms@jattamkommerce.com');
      setPassword('hrms.jmk123');
    } else {
      setIdentifier('EMP-001');
      setPassword('hrms.jmk123');
    }
    setFormError('');
  };

  // Handle Sign In submission
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setFormError('Please provide your Employee ID/Email and password');
      return;
    }

    setFormError('');
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
    } else {
      setFormError(result?.message || 'Login failed. Please verify your credentials.');
    }
  };

  // Handle Sign Up submission
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword) {
      setFormError('All fields are required to register your organization');
      return;
    }

    if (regPassword.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }

    if (!agreeTerms) {
      setFormError('Please accept the Terms of Service to continue');
      return;
    }

    setFormError('');
    setLoading(true);

    try {
      const res = await registerOrganization({
        orgName: orgName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail.trim(),
        password: regPassword
      });
      setLoading(false);

      if (res && res.success) {
        setSuccessMessage('🎉 Organization registered successfully! You can now sign in.');
        // Prefill email in login form and switch mode after short delay
        setIdentifier(regEmail.trim());
        setPassword('');
        setTimeout(() => {
          setMode('signin');
        }, 1800);
      } else {
        setFormError(res?.message || 'Organization registration failed. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setFormError(err.message || 'An unexpected error occurred during registration.');
    }
  };

  return (
    <div className="auth-page-container">
      {/* Top Bar - Clean minimal back button on web browser */}
      <div className="auth-top-bar" style={{ justifyContent: 'flex-end' }}>
        {typeof window !== 'undefined' && !window.Capacitor && window.location.hostname !== 'localhost' && (
          <Link to="/" className="auth-back-to-site-btn">
            <ArrowLeft size={16} />
            <span>Back to Website</span>
          </Link>
        )}
      </div>

      {/* Centered Glassmorphic Auth Box */}
      <div className={`auth-glass-box ${mode === 'signup' ? 'auth-glass-box-signup' : ''}`}>
        
        {/* Auth Mode Tabs (Sign In / Sign Up) */}
        <div className="auth-tabs-container">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Register Org
          </button>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h2 className="auth-title">
            {mode === 'signin' ? 'Welcome Back' : 'Create Organization'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'signin'
              ? 'Enter your credentials to access your workspace'
              : 'Launch your HRMS workspace for your team'}
          </p>
        </div>

        {/* Error Banner */}
        {(formError || authError) && (
          <div className="auth-error-banner">
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{formError || authError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="auth-success-banner">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Employee ID / Work Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. employee@acme.com or EMP-101"
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
                  placeholder="Enter your password"
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
                  Sign In to Workspace <ArrowRight size={16} />
                </span>
              )}
            </button>

            {/* Quick Fill Buttons for Super Admin and Employee */}
            <div className="auth-quick-access">
              <div className="auth-quick-chips">
                <button
                  type="button"
                  className="auth-quick-chip"
                  onClick={() => fillDemoCredentials('admin')}
                  title="Super Admin Access"
                >
                  <Sparkles size={13} /> Super Admin
                </button>
                <button
                  type="button"
                  className="auth-quick-chip"
                  onClick={() => fillDemoCredentials('employee')}
                  title="Employee Portal Access"
                >
                  <User size={13} /> Employee
                </button>
              </div>
            </div>

            {/* Bottom Links */}
            <div className="auth-switch-footer">
              <span>Have an activation token?</span>
              <Link to="/activate" className="auth-switch-link">
                Activate Account
              </Link>
            </div>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Organization / Company Name</label>
              <div className="auth-input-wrapper">
                <Building2 size={18} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Acme Corporation"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-name-grid">
              <div className="auth-input-group">
                <label className="auth-label">Admin First Name</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Last Name</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Work Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="admin@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Master Password (min 8 characters)</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Create a strong password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="auth-eye-btn"
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {regPassword && (
                <div className="auth-strength-container">
                  <div className="auth-strength-bar">
                    <div 
                      className="auth-strength-fill"
                      style={{ 
                        width: `${passStrength.score}%`, 
                        backgroundColor: passStrength.color 
                      }} 
                    />
                  </div>
                  <span className="auth-strength-text" style={{ color: passStrength.color }}>
                    Strength: {passStrength.text}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-terms-row">
              <label className="auth-remember-label">
                <input
                  type="checkbox"
                  className="auth-remember-checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span style={{ fontSize: '12.5px', color: '#475569' }}>
                  I agree to the JMK HRMS Terms of Service & Privacy Policy
                </span>
              </label>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Registering Organization...</span>
              ) : (
                <span className="auth-btn-inner">
                  Create Organization Account <ArrowRight size={16} />
                </span>
              )}
            </button>

            <div className="auth-switch-footer">
              <span>Already registered your organization?</span>
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => setMode('signin')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer-tag">
          JMK HRMS • Intelligent Workforce & Attendance Operating System
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="auth-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="#2563eb" />
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
                  📧 Email: <strong>hr.jattamkommerce@gmail.com</strong>
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
