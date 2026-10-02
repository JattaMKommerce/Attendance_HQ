import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Eye, EyeOff, CheckCircle, AlertCircle, 
  ArrowRight, Building2, KeyRound, Mail, Sparkles, RefreshCw 
} from 'lucide-react';
import api from '../../services/api';
import '../../styles/components.css';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get('token');

  // Input states
  const [activeTab, setActiveTab] = useState(tokenParam ? 'token' : 'temp'); // 'temp' | 'token'
  const [manualToken, setManualToken] = useState(tokenParam || '');
  const [identifier, setIdentifier] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Password setup states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTemp, setShowTemp] = useState(false);

  // Flow states
  const [verifying, setVerifying] = useState(!!tokenParam);
  const [accountData, setAccountData] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [activated, setActivated] = useState(false);

  // Automatically verify if token param is present in URL
  useEffect(() => {
    if (tokenParam) {
      handleVerifyToken(tokenParam);
    }
  }, [tokenParam]);

  const handleVerifyToken = async (tok) => {
    const raw = (tok || manualToken).trim();
    if (!raw) {
      setVerifyError('Please enter the activation token or paste the link from your email.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await api.get(`/auth/verify-activation?token=${encodeURIComponent(raw)}`);
      if (res.data?.success) {
        setAccountData(res.data.data);
        setManualToken(raw);
      } else {
        setVerifyError(res.data?.message || 'Invalid or expired activation link.');
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid or expired activation code. Please check your invitation email.');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCredentials = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !tempPassword) {
      setVerifyError('Please provide your Employee ID or Email and Temporary Password.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await api.post('/auth/verify-activation', {
        identifier: identifier.trim(),
        tempPassword
      });

      if (res.data?.success) {
        setAccountData(res.data.data);
      } else {
        setVerifyError(res.data?.message || 'Verification failed.');
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Temporary password does not match. Please verify your invitation email.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { password };

      if (manualToken) {
        payload.token = manualToken;
      } else if (identifier && tempPassword) {
        payload.identifier = identifier.trim();
        payload.tempPassword = tempPassword;
      }

      const res = await api.post('/auth/activate-account', payload);

      if (res.data?.success) {
        setActivated(true);
      } else {
        setSubmitError(res.data?.message || 'Failed to activate account.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to set password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 12px 30px -6px rgba(0, 0, 0, 0.08), 0 8px 12px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Brand Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          padding: '28px 24px',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            borderRadius: '14px',
            marginBottom: '10px'
          }}>
            <Building2 size={26} color="#ffffff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
            Jatta M Kommerce HRMS
          </h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '13px' }}>
            Employee Account Activation & Password Setup
          </p>
        </div>

        <div style={{ padding: '28px 24px' }}>
          
          {/* STEP 1: Verifying Spinner */}
          {verifying && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Validating employee activation credentials...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* STEP 2: Activated Success State */}
          {!verifying && activated && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle size={36} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Account Successfully Activated!
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                Your permanent password has been configured. You can now log in to the mobile app or web portal anytime.
              </p>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '24px'
              }}>
                <div style={{ marginBottom: '6px' }}><strong>Employee:</strong> {accountData?.first_name} {accountData?.last_name}</div>
                <div style={{ marginBottom: '6px' }}><strong>Employee ID:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{accountData?.employee_code}</span></div>
                <div><strong>Login Email:</strong> {accountData?.email}</div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              >
                Log In to Workspace <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 3: Initial Verification Form (When no valid accountData yet) */}
          {!verifying && !activated && !accountData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Activate Your Account
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Enter your credentials from the onboarding email received from HR.
                </p>
              </div>

              {/* Tabs: Temporary Password vs Activation Token */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '3px',
                marginBottom: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => { setActiveTab('temp'); setVerifyError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'temp' ? '#ffffff' : 'transparent',
                    color: activeTab === 'temp' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'temp' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Temporary Password
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('token'); setVerifyError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'token' ? '#ffffff' : 'transparent',
                    color: activeTab === 'token' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'token' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Activation Token / Link
                </button>
              </div>

              {verifyError && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Mode A: Temporary Password from Email */}
              {activeTab === 'temp' && (
                <form onSubmit={handleVerifyCredentials}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Official Email or Employee ID *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. employee@acme.com or EMP-001"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Temporary Password (from Email) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showTemp ? 'text' : 'password'}
                        className="input-control"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="Enter temporary password from email"
                        required
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTemp(!showTemp)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {showTemp ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}
                  >
                    Verify & Set Permanent Password <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* Mode B: Manual Activation Token / Link */}
              {activeTab === 'token' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Activation Code or Link *
                    </label>
                    <textarea
                      className="input-control"
                      rows={3}
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste activation code or full link from your invitation email"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', resize: 'none' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyToken(manualToken)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}
                  >
                    Verify Activation Token <ArrowRight size={16} />
                  </button>
                </div>
              )}

              <div style={{ marginTop: '22px', textAlign: 'center' }}>
                <Link to="/login" style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                  &larr; Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* STEP 4: Permanent Password Setup Form (Account verified) */}
          {!verifying && !activated && accountData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '10px',
                  border: '1px solid #bfdbfe'
                }}>
                  {accountData.employee_code ? `Employee ID: ${accountData.employee_code}` : 'Verified Employee'}
                </span>
                <h2 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                  Welcome, {accountData.first_name || 'Employee'}!
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Please create your confidential permanent password to activate your HRMS account for <strong>{accountData.email}</strong>.
                </p>
              </div>

              {submitError && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '18px'
                }}>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitNewPassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    <Lock size={14} /> New Permanent Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    <ShieldCheck size={14} /> Confirm Permanent Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="input-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password match feedback */}
                {password && confirmPassword && (
                  <div style={{
                    fontSize: '12px',
                    marginBottom: '16px',
                    color: password === confirmPassword ? '#16a34a' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {password === confirmPassword ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || password.length < 8 || password !== confirmPassword}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
                >
                  {submitting ? 'Setting Password...' : 'Save Password & Activate Account'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
