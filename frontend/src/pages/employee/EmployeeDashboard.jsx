import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, Clock, FileText, Folder, Users, Megaphone, 
  CheckCircle, ChevronRight, AlertCircle, LogIn, LogOut,
  Sparkles, Gift, ArrowRight
} from 'lucide-react';
import { EmployeeContext } from '../../context/EmployeeContext';
import AiCommandBar from '../../components/ai/AiCommandBar';

export default function EmployeeDashboard() {
  const { 
    todayAttendance, 
    leaveBalance, 
    shift, 
    nextHoliday, 
    announcements, 
    checkIn, 
    checkOut, 
    loading, 
    refreshAttendance 
  } = useContext(EmployeeContext);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
      
      {/* Shift & Date Info Bar */}
      <div style={{ padding: '0 20px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        {shift && (
          <div style={{ fontSize: '12px', padding: '3px 8px', backgroundColor: '#e2e8f0', borderRadius: '6px', color: '#334155', fontWeight: '600' }}>
            Shift: {shift.name || 'General'} ({shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)})
          </div>
        )}
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

      {/* Prominent AI Command Bar */}
      <div style={{ padding: '0 20px', marginBottom: '16px' }}>
        <AiCommandBar />
      </div>

      {/* Hero Attendance Card */}
      <div style={{ padding: '0 20px', marginBottom: '20px' }}>
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
                {isCheckedIn ? 'Time Elapsed Today' : isCheckedOut ? 'Total Working Hours' : 'Shift Target: 9h'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em', color: isCheckedIn ? '#f8fafc' : '#0f172a' }}>
                {isCheckedIn ? getElapsedDuration() : isCheckedOut ? `${todayAttendance.total_hours || 0} hrs` : '-- : -- : --'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: isCheckedIn ? '#94a3b8' : '#64748b' }}>
                Check-in: <strong style={{ color: isCheckedIn ? '#f1f5f9' : '#1e293b' }}>{formatShortTime(todayAttendance?.check_in_time)}</strong>
              </div>
              {isCheckedOut && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Check-out: <strong style={{ color: '#1e293b' }}>{formatShortTime(todayAttendance?.check_out_time)}</strong>
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
        </div>
      </div>

      {/* Leave Balances Quick Row */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
            Leave Balances
          </h3>
          <NavLink to="/app/employee/leave/apply" style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
            Apply Leave &rarr;
          </NavLink>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
          {leaveBalance && leaveBalance.length > 0 ? (
            leaveBalance.map((lb) => (
              <div
                key={lb.leave_type_id || lb.name}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>
                  {lb.available_days != null 
                    ? lb.available_days 
                    : (lb.remaining != null 
                        ? lb.remaining 
                        : Math.max(0, (parseFloat(lb.total_days || lb.allocated || 0) - parseFloat(lb.used_days || lb.used || 0))))}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginTop: '2px' }}>
                  {lb.code || lb.name}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Available
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              Standard Leave Balances (Casual, Sick, Earned)
            </div>
          )}
        </div>
      </div>

      {/* Grid Quick Actions */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: '0 0 12px 0' }}>
          Quick Services
        </h3>
        <div className="grid-container">
          <NavLink to="/app/employee/leave" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
              <Calendar size={22} />
            </div>
            <span className="grid-item-text">My Leave</span>
          </NavLink>

          <NavLink to="/app/employee/attendance" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
              <Clock size={22} />
            </div>
            <span className="grid-item-text">Attendance</span>
          </NavLink>

          <NavLink to="/app/employee/payslips" className="grid-item">
            <div className="grid-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
              <FileText size={22} />
            </div>
            <span className="grid-item-text">Payslips</span>
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
        </div>
      </div>

      {/* Next Upcoming Holiday */}
      {nextHoliday && (
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '14px 16px'
          }}>
            <div style={{ backgroundColor: '#dbeafe', color: '#2563eb', padding: '10px', borderRadius: '10px' }}>
              <Gift size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#2563eb' }}>
                Upcoming Holiday
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                {nextHoliday.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {new Date(nextHoliday.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
            Recent Announcements
          </h3>
          <NavLink to="/app/employee/announcements" style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
            View All &rarr;
          </NavLink>
        </div>

        {announcements && announcements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="mobile-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px' }}>
                <div style={{ width: '38px', height: '38px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{a.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    {a.content?.slice(0, 110)}{a.content?.length > 110 ? '...' : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mobile-card" style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8' }}>
            No recent announcements.
          </div>
        )}
      </div>

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
