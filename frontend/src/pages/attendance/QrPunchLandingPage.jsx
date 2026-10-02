import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import employeePortalApi from '../../services/employeePortalApi';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Smartphone, 
  Download, 
  LogIn, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import './QrPunchLandingPage.css';

export default function QrPunchLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const qrCodeParam = searchParams.get('code') || 'JMK-ATT-HQ-1';
  const orgParam = searchParams.get('org') || '1';
  const locationParam = searchParams.get('location') || 'Main Office HQ';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punching, setPunching] = useState(false);
  const [punchSuccess, setPunchSuccess] = useState(null);
  const [punchError, setPunchError] = useState(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance if user is logged in
  useEffect(() => {
    if (user) {
      setLoadingStatus(true);
      employeePortalApi.getTodayAttendance()
        .then(res => {
          setTodayAttendance(res.data?.attendance || res.data || null);
        })
        .catch(err => {
          console.warn('Could not fetch attendance:', err);
        })
        .finally(() => setLoadingStatus(false));
    }
  }, [user]);

  const isCheckedIn = !!(todayAttendance && todayAttendance.check_in_time);
  const isCheckedOut = !!(todayAttendance && todayAttendance.check_out_time);

  const handlePunch = async () => {
    if (punching) return;
    setPunching(true);
    setPunchError(null);

    const punchType = isCheckedIn ? 'check-out' : 'check-in';

    try {
      const payload = {
        source: 'qr_web',
        qr_code: qrCodeParam,
        timestamp: new Date().toISOString()
      };

      let res;
      if (isCheckedIn) {
        res = await employeePortalApi.checkOut(payload);
      } else {
        res = await employeePortalApi.checkIn(payload);
      }

      const punchTimeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setPunchSuccess({
        type: punchType,
        time: punchTimeStr,
        location: locationParam,
        message: res.data?.message || (punchType === 'check-out' ? 'Clocked out successfully!' : 'Clocked in successfully!')
      });

      // Update state
      if (isCheckedIn) {
        setTodayAttendance(prev => ({ ...prev, check_out_time: new Date().toISOString() }));
      } else {
        setTodayAttendance({ check_in_time: new Date().toISOString() });
      }

    } catch (err) {
      console.error('Web QR Punch Error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to record attendance. Please try again.';
      setPunchError(msg);
    } finally {
      setPunching(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="qr-landing-page">
      <div className="qr-landing-container">
        
        {/* Header Office Standee Card */}
        <div className="qr-landing-header">
          <div className="qr-landing-logo-badge">
            <Building2 size={32} />
          </div>
          <div className="qr-landing-tag">
            <span className="qr-landing-tag-dot" />
            Verified Office Attendance Standee
          </div>
          <h1 className="qr-landing-title">Jatta M Kommerce HRMS</h1>
          <div className="qr-landing-location">
            <MapPin size={14} color="#64748b" />
            <span>{locationParam} · Standee ID: {qrCodeParam}</span>
          </div>
        </div>

        {/* If user is logged in, show instant Punch Card */}
        {user ? (
          punchSuccess ? (
            <div className="qr-punch-success-card">
              <div className="qr-success-icon-wrap">
                <CheckCircle2 size={40} />
              </div>
              <h3>{punchSuccess.type === 'check-out' ? 'Clocked Out Successfully!' : 'Clocked In Successfully!'}</h3>
              <div className="qr-success-time-badge">
                {punchSuccess.time} · {punchSuccess.location}
              </div>
              <p>Your attendance has been recorded and verified by the office standee.</p>
              <Link to="/app/employee/dashboard" className="btn-qr-login" style={{ background: '#16a34a', color: '#ffffff', border: 'none' }}>
                Go to Employee Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="qr-punch-card">
              {/* Employee profile strip */}
              <div className="qr-user-strip">
                <div className="qr-user-avatar">
                  {user.first_name ? user.first_name[0] : (user.name ? user.name[0] : 'U')}
                </div>
                <div className="qr-user-info">
                  <div className="qr-user-name">{user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.name || user.email}</div>
                  <div className="qr-user-role">{user.job_title || user.designation || 'Employee'}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Logged In
                </div>
              </div>

              {/* Live clock display */}
              <div className="qr-time-display">{formattedTime}</div>
              <div className="qr-date-display">{formattedDate}</div>

              {punchError && (
                <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px', background: '#fef2f2', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{punchError}</span>
                </div>
              )}

              {/* Action Button */}
              {isCheckedOut ? (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>
                  ✓ You have already clocked out for today. See you tomorrow!
                </div>
              ) : (
                <button 
                  className={`btn-punch-action ${isCheckedIn ? 'btn-punch-out' : 'btn-punch-in'}`}
                  onClick={handlePunch}
                  disabled={punching}
                >
                  {punching ? (
                    <>
                      <Loader2 size={20} className="spin" />
                      <span>Recording Punch...</span>
                    </>
                  ) : isCheckedIn ? (
                    <>
                      <Clock size={20} />
                      <span>Clock Out Now</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Clock In Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )
        ) : null}

        {/* Big Nykaa-style Mobile App Download Card */}
        <div className="qr-app-promo-card">
          <div className="qr-promo-highlight">
            <Smartphone size={13} />
            <span>Recommended for Daily Attendance</span>
          </div>
          <h3>Download JMK HRMS App</h3>
          <p>
            Get instant 1-tap QR attendance, salary slips, leave applications, and live company updates on your Android phone.
          </p>
          <a 
            href="/jmk-hrms.apk" 
            download="jmk-hrms.apk" 
            className="btn-qr-download-app"
          >
            <Download size={20} />
            <span>Download Official Mobile App (APK)</span>
          </a>
          <div className="qr-download-subtext">
            ✓ Fast direct download • Verified production APK
          </div>
        </div>

        {/* Secondary: Web Login Option for employees who scanned via browser */}
        {!user && (
          <div className="qr-web-login-card">
            <h4>Already have an account?</h4>
            <p>Log in with your company email & password to punch attendance directly in your browser.</p>
            <Link 
              to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="btn-qr-login"
            >
              <LogIn size={16} />
              <span>Log In to Clock In</span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="qr-landing-footer">
          <ShieldCheck size={14} color="#16a34a" />
          <span>Jatta M Kommerce HRMS Official Standee System</span>
        </div>

      </div>
    </div>
  );
}
