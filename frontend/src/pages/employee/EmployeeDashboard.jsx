import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, Clock, FileText, Folder, Users, Megaphone, 
  CheckCircle, AlertCircle, LogIn, LogOut, User, QrCode
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { EmployeeContext } from '../../context/EmployeeContext';
import QrAttendanceScannerModal from '../../components/attendance/QrAttendanceScannerModal';

export default function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const { 
    todayAttendance, 
    shift, 
    checkIn, 
    checkOut, 
    loading, 
    refreshAttendance 
  } = useContext(EmployeeContext);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showQrScanner, setShowQrScanner] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatShortTime = (dStr) => {
    if (!dStr) return '--:--';
    const d = new Date(dStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const status = todayAttendance?.status || 'absent';
  const isCheckedIn = (status === 'checked_in' || status === 'present') && !todayAttendance?.check_out_time;
  const isCheckedOut = Boolean(todayAttendance?.check_out_time);

  // Elapsed time calculation
  const getElapsedDuration = () => {
    if (!todayAttendance?.check_in_time) return null;
    const start = new Date(todayAttendance.check_in_time);
    const end = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : currentTime;
    const diffMs = Math.max(0, end - start);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffHrs.toString().padStart(2, '0')}h ${diffMins.toString().padStart(2, '0')}m ${diffSecs.toString().padStart(2, '0')}s`;
  };

  const shiftTimeString = shift?.start_time && shift?.end_time 
    ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`
    : '09:00 - 18:00';

  const handleAttendanceAction = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      if (isCheckedIn) {
        await checkOut('mobile');
        setFeedback({ type: 'success', message: 'Successfully clocked out. Have a wonderful evening!' });
      } else if (!isCheckedOut) {
        await checkIn('mobile');
        setFeedback({ type: 'success', message: 'Successfully clocked in. Welcome!' });
      }
      await refreshAttendance();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Attendance action failed. Please try again.' 
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <span>Loading employee portal...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      
      {/* Clean Date Header (No duplicate greeting overwriting) */}
      <div style={{ padding: '12px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          margin: '0 20px 14px',
          padding: '12px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Hero Attendance Card (Workable Clock In / Clock Out with Condensed Shift Timing) */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{
          backgroundColor: isCheckedIn ? '#0f172a' : '#ffffff',
          color: isCheckedIn ? '#ffffff' : '#0f172a',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid',
          borderColor: isCheckedIn ? '#1e293b' : '#e2e8f0',
          boxShadow: isCheckedIn ? '0 10px 25px -5px rgba(15, 23, 42, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em',
                backgroundColor: isCheckedIn ? 'rgba(34, 197, 94, 0.2)' : isCheckedOut ? '#e0e7ff' : '#f1f5f9',
                color: isCheckedIn ? '#4ade80' : isCheckedOut ? '#4338ca' : '#64748b'
              }}>
                {isCheckedIn ? '● Active Shift' : isCheckedOut ? '✓ Shift Complete' : '○ Not Checked In'}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: isCheckedIn ? '#94a3b8' : '#64748b' }}>
              {formatTime(currentTime)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: isCheckedIn ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                {isCheckedIn 
                  ? 'Time Elapsed Today' 
                  : isCheckedOut 
                    ? 'Total Working Hours' 
                    : `Shift: ${shift?.name || 'General'}`}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', color: isCheckedIn ? '#f8fafc' : '#0f172a' }}>
                {isCheckedIn 
                  ? getElapsedDuration() 
                  : isCheckedOut 
                    ? (todayAttendance?.work_duration_minutes ? `${(todayAttendance.work_duration_minutes / 60).toFixed(1)} hrs` : 'Completed') 
                    : shiftTimeString}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              {todayAttendance?.check_in_time ? (
                <div style={{ fontSize: '12px', color: isCheckedIn ? '#94a3b8' : '#64748b' }}>
                  Check-in: <strong style={{ color: isCheckedIn ? '#f1f5f9' : '#1e293b' }}>{formatShortTime(todayAttendance.check_in_time)}</strong>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Target: <strong>9h</strong>
                </div>
              )}
              {todayAttendance?.check_out_time && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Check-out: <strong style={{ color: '#1e293b' }}>{formatShortTime(todayAttendance.check_out_time)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          {!isCheckedOut ? (
            <button
              onClick={handleAttendanceAction}
              disabled={actionLoading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: isCheckedIn ? '#ef4444' : '#2563eb',
                color: '#ffffff',
                boxShadow: isCheckedIn ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              {actionLoading ? (
                <span>Recording...</span>
              ) : isCheckedIn ? (
                <>
                  <LogOut size={18} />
                  <span>Clock Out</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Clock In Now</span>
                </>
              )}
            </button>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: '500'
            }}>
              Attendance recorded for today. See you next shift!
            </div>
          )}

          {/* Contactless Office QR Scanner Action */}
          {!isCheckedOut && (
            <button
              type="button"
              onClick={() => setShowQrScanner(true)}
              disabled={actionLoading}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '11px',
                borderRadius: '10px',
                border: isCheckedIn ? '1px solid #475569' : '1px solid #93c5fd',
                fontWeight: '600',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: isCheckedIn ? '#1e293b' : '#eff6ff',
                color: isCheckedIn ? '#f8fafc' : '#2563eb',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <QrCode size={17} color={isCheckedIn ? '#60a5fa' : '#2563eb'} />
              <span>{isCheckedIn ? 'Scan Office QR to Clock Out' : 'Scan Office QR to Clock In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Quick Services (Unique Features, No Repetition from Bottom Nav Bar) */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: '0 0 12px 0' }}>
          Quick Services
        </h3>
        <div className="grid-container">
          <NavLink to="/app/employee/payslips" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
              <FileText size={22} />
            </div>
            <span className="grid-item-text">Payslips</span>
          </NavLink>

          <NavLink to="/app/employee/leave" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
              <Calendar size={22} />
            </div>
            <span className="grid-item-text">My Leave</span>
          </NavLink>

          <NavLink to="/app/employee/documents" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Folder size={22} />
            </div>
            <span className="grid-item-text">Documents</span>
          </NavLink>

          <NavLink to="/app/employee/directory" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <Users size={22} />
            </div>
            <span className="grid-item-text">Directory</span>
          </NavLink>

          <NavLink to="/app/employee/announcements" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
              <Megaphone size={22} />
            </div>
            <span className="grid-item-text">Notices</span>
          </NavLink>

          <NavLink to="/app/employee/profile" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <User size={22} />
            </div>
            <span className="grid-item-text">My Profile</span>
          </NavLink>
        </div>
      </div>

      {/* Office QR Camera Scanner Modal */}
      <QrAttendanceScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        isCheckedIn={isCheckedIn}
        isCheckedOut={isCheckedOut}
        onSuccess={async () => {
          await refreshAttendance();
          setFeedback({
            type: 'success',
            message: isCheckedIn ? 'Clocked out successfully via Office QR!' : 'Clocked in successfully via Office QR!'
          });
        }}
        employee={user}
      />

      {/* Quick CSS */}
      <style>{`
        .spinner {
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
