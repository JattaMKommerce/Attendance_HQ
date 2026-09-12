import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, Building2, Smartphone } from 'lucide-react';
import api from '../../services/api';
import '../../styles/components.css';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [accountData, setAccountData] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerifyError('No activation token found in the link. Please check your invitation email.');
        setVerifying(false);
        return;
      }

      try {
        const res = await api.get(`/auth/verify-activation?token=${encodeURIComponent(token)}`);
        if (res.data.success) {
          setAccountData(res.data.data);
        } else {
          setVerifyError(res.data.message || 'Invalid or expired activation link.');
        }
      } catch (err) {
        setVerifyError(err.response?.data?.message || 'Invalid or expired activation link.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
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
      const res = await api.post('/auth/activate-account', {
        token,
        password
      });

      if (res.data.success) {
        setActivated(true);
      } else {
        setSubmitError(res.data.message || 'Failed to activate account.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to activate account. Please try again or request a new invite.');
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
      fontFamily: 'inherit'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Brand Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          padding: '32px 24px',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            marginBottom: '12px'
          }}>
            <Building2 size={28} color="#ffffff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px' }}>
            Jatta M Kommerce
          </h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '13px' }}>
            HRMS Employee Onboarding & Account Activation
          </p>
        </div>

        <div style={{ padding: '32px 24px' }}>
          {/* 1. Verifying State */}
          {verifying && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ color: '#64748b', fontSize: '15px' }}>Validating secure activation link...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* 2. Verification Error State */}
          {!verifying && verifyError && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <AlertCircle size={32} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                Activation Link Invalid
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
                {verifyError}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
                  Proceed to Login
                </Link>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Need help? Contact your organization administrator or HR department.
                </span>
              </div>
            </div>
          )}

          {/* 3. Success / Activated State */}
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
                marginBottom: '16px'
              }}>
                <CheckCircle size={36} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Account Successfully Activated!
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                Your permanent confidential password has been set. Your HRMS account is now fully <strong>ACTIVE</strong>.
              </p>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '24px'
              }}>
                <div style={{ marginBottom: '4px' }}><strong>Employee:</strong> {accountData?.first_name} {accountData?.last_name}</div>
                <div style={{ marginBottom: '4px' }}><strong>Employee ID:</strong> <span style={{ color: '#2563eb', fontWeight: 600 }}>{accountData?.employee_code}</span></div>
                <div><strong>Login Email:</strong> {accountData?.email}</div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              >
                Log In to HRMS Portal <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* 4. Active Setup Form */}
          {!verifying && !verifyError && !activated && accountData && (
            <div>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  border: '1px solid #bfdbfe'
                }}>
                  Employee ID: {accountData.employee_code}
                </span>
                <h2 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>
                  Welcome, {accountData.first_name}!
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Please create your permanent confidential password to activate your HRMS account for <strong>{accountData.email}</strong>.
                </p>
              </div>

              {submitError && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '20px'
                }}>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '20px' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px'
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
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
                >
                  {submitting ? 'Activating Account...' : 'Set Password & Activate'}
                </button>
              </form>

              <div style={{
                marginTop: '24px',
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <Smartphone size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }} />
                <span>
                  <strong>Mobile Friendly:</strong> Access your attendance, payslips, and apply for leaves directly from your mobile device browser after activation.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
