/**
 * Employee Dashboard
 *
 * The connected workspace entry point. Reads exclusively from EmployeeContext
 * so all data is loaded once and shared across the portal.
 *
 * Sections:
 *   1. Greeting + date/time ticker
 *   2. Today's attendance card (check-in / check-out)
 *   3. Quick-action strip
 *   4. Stat row: shift, leave balance, next holiday, latest payslip
 *   5. AI-first proactive insights panel
 *   6. Pending requests + recent notifications (two-column)
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, LogOut, Clock, Umbrella, DollarSign, Calendar,
  ChevronRight, Bell, Sparkles, AlertTriangle, CheckCircle2,
  Info, ArrowRight, Sun, Coffee, Moon, ClipboardList,
  TrendingUp, User, FileText, MessageSquare, Briefcase,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useEmployee } from '../../context/EmployeeContext';
import '../../styles/employee-portal.css';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (isoStr) =>
  isoStr
    ? new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

const fmtMins = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const greetingText = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Sun };
  if (h < 17) return { text: 'Good afternoon', Icon: Coffee };
  return { text: 'Good evening', Icon: Moon };
};

const TODAY = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

// ─── Attendance status display map ──────────────────────────────────────────
const ATTENDANCE_CONFIG = {
  checked_in:  { label: 'Checked In',  color: 'var(--success-text)', bg: 'var(--success-bg)' },
  checked_out: { label: 'Checked Out', color: 'var(--info-text)',    bg: 'var(--info-bg)'    },
  absent:      { label: 'Absent',      color: 'var(--danger-text)',  bg: 'var(--danger-bg)'  },
  leave:       { label: 'On Leave',    color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  null:        { label: 'Not Marked',  color: 'var(--text-secondary)', bg: 'var(--bg-surface-hover)' },
};

// ─── Component ───────────────────────────────────────────────────────────────
const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const {
    todayAttendance, leaveBalance, shift, nextHoliday,
    latestPayslip, notifications, pendingRequestsCount,
    loading, checkIn, checkOut,
  } = useEmployee();

  const [checkingIn,  setCheckingIn]  = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [actionMsg,   setActionMsg]   = useState(null);
  const [now, setNow] = useState(new Date());

  // Live clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    const result = await checkIn();
    setCheckingIn(false);
    setActionMsg({ type: 'success', text: `Checked in at ${fmt(result.time)}` });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    const result = await checkOut();
    setCheckingOut(false);
    setActionMsg({ type: 'success', text: `Checked out at ${fmt(result.time)}` });
    setTimeout(() => setActionMsg(null), 4000);
  };

  if (loading) {
    return (
      <div className="ep-page" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Loading your workspace…
        </div>
      </div>
    );
  }

  const attStatus     = todayAttendance?.status ?? null;
  const attConfig     = ATTENDANCE_CONFIG[attStatus] ?? ATTENDANCE_CONFIG.null;
  const canCheckIn    = !attStatus || attStatus === 'checked_out';
  const canCheckOut   = attStatus === 'checked_in';
  const totalLeave    = leaveBalance.reduce((s, b) => s + b.balance, 0);
  const { text: greet, Icon: GreetIcon } = greetingText();

  // Build AI insights list
  const insights = buildInsights({ todayAttendance, notifications, pendingRequestsCount, nextHoliday, latestPayslip });
  const unreadNotifs = notifications.filter(n => !n.isRead).slice(0, 5);

  return (
    <div className="ep-page">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="ep-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="ep-page-title" style={{ fontSize: 24 }}>
            <GreetIcon size={22} style={{ marginRight: 8, color: 'var(--accent-hover)', verticalAlign: 'middle' }} />
            {greet}, {user?.first_name}
          </h1>
          <p className="ep-page-sub">{TODAY}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {shift?.name ?? 'Shift not assigned'}
            {shift && ` · ${shift.startTime} – ${shift.endTime}`}
          </div>
        </div>
      </div>

      {/* ── Action feedback ───────────────────────────────────────────── */}
      {actionMsg && (
        <div className={`ep-alert ep-alert-${actionMsg.type}`} style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          {actionMsg.text}
        </div>
      )}

      {/* ── Today's Attendance card ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, borderLeft: `3px solid ${attConfig.color}` }}>
        <div className="card-body" style={{ padding: '18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

            {/* Times */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <AttendanceTime icon={LogIn} label="Check In" time={fmt(todayAttendance?.checkInTime)} />
              <AttendanceTime icon={LogOut} label="Check Out" time={fmt(todayAttendance?.checkOutTime)} />
              <AttendanceTime
                icon={Clock}
                label="Duration"
                time={fmtMins(todayAttendance?.workDurationMinutes)}
              />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Status
                </div>
                <span
                  className="ep-badge"
                  style={{ backgroundColor: attConfig.bg, color: attConfig.color }}
                >
                  {attConfig.label}
                </span>
                {todayAttendance?.isLate && (
                  <span className="ep-badge ep-badge-warning" style={{ marginLeft: 6 }}>
                    Late {todayAttendance.lateMinutes}m
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {canCheckIn && (
                <button
                  className="btn btn-primary"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  style={{ gap: 8 }}
                >
                  <LogIn size={16} />
                  {checkingIn ? 'Checking in…' : 'Check In'}
                </button>
              )}
              {canCheckOut && (
                <button
                  className="btn btn-secondary"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  style={{ gap: 8 }}
                >
                  <LogOut size={16} />
                  {checkingOut ? 'Checking out…' : 'Check Out'}
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/app/employee/attendance')}
                style={{ gap: 6, fontSize: 13 }}
              >
                View History <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <QuickAction icon={Umbrella}      label="Apply Leave"      onClick={() => navigate('/app/employee/leave')}          accent />
        <QuickAction icon={ClipboardList} label="My Requests"      onClick={() => navigate('/app/employee/requests')}               />
        <QuickAction icon={Calendar}      label="View Roster"      onClick={() => navigate('/app/employee/roster')}                  />
        <QuickAction icon={DollarSign}    label="Latest Payslip"   onClick={() => navigate('/app/employee/payslips')}                />
        <QuickAction icon={FileText}      label="My Documents"     onClick={() => navigate('/app/employee/documents')}               />
        <QuickAction icon={MessageSquare} label="AI Assistant"     onClick={() => navigate('/app/employee/ai')}                      />
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="ep-stat-grid" style={{ marginBottom: 24 }}>
        {/* Shift */}
        <div className="ep-stat-card clickable" onClick={() => navigate('/app/employee/roster')}>
          <div className="ep-stat-icon" style={{ background: 'var(--accent-soft)' }}>
            <Briefcase size={22} color="var(--accent-hover)" />
          </div>
          <div>
            <p className="ep-stat-label">Today's Shift</p>
            <p className="ep-stat-value" style={{ fontSize: 18 }}>{shift?.name ?? 'N/A'}</p>
            <p className="ep-stat-detail">
              {shift ? `${shift.startTime} – ${shift.endTime}` : 'Not assigned'}
            </p>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="ep-stat-card clickable" onClick={() => navigate('/app/employee/leave')}>
          <div className="ep-stat-icon" style={{ background: 'var(--info-bg)' }}>
            <Umbrella size={22} color="var(--info-text)" />
          </div>
          <div>
            <p className="ep-stat-label">Leave Balance</p>
            <p className="ep-stat-value">{totalLeave}</p>
            <p className="ep-stat-detail">days remaining across all types</p>
          </div>
        </div>

        {/* Next Holiday */}
        <div className="ep-stat-card clickable" onClick={() => navigate('/app/employee/calendar')}>
          <div className="ep-stat-icon" style={{ background: 'var(--success-bg)' }}>
            <Calendar size={22} color="var(--success-text)" />
          </div>
          <div>
            <p className="ep-stat-label">Next Holiday</p>
            <p className="ep-stat-value" style={{ fontSize: 16 }}>{nextHoliday?.name ?? 'None'}</p>
            <p className="ep-stat-detail">
              {nextHoliday
                ? `${nextHoliday.dayName} · ${nextHoliday.daysAway === 0 ? 'Today' : nextHoliday.daysAway === 1 ? 'Tomorrow' : `In ${nextHoliday.daysAway} days`}`
                : 'No holidays upcoming'}
            </p>
          </div>
        </div>

        {/* Latest Payslip */}
        <div className="ep-stat-card clickable" onClick={() => navigate('/app/employee/payslips')}>
          <div className="ep-stat-icon" style={{ background: 'var(--warning-bg)' }}>
            <DollarSign size={22} color="var(--warning-text)" />
          </div>
          <div>
            <p className="ep-stat-label">Latest Payslip</p>
            {latestPayslip ? (
              <>
                <p className="ep-stat-value" style={{ fontSize: 18 }}>
                  ₹{Number(latestPayslip.net_pay).toLocaleString('en-IN')}
                </p>
                <p className="ep-stat-detail">{latestPayslip.run_month} {latestPayslip.run_year}</p>
              </>
            ) : (
              <>
                <p className="ep-stat-value" style={{ fontSize: 18, color: 'var(--text-muted)' }}>—</p>
                <p className="ep-stat-detail">No payslips yet</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main two-col: AI insights + Notifications ─────────────────── */}
      <div className="ep-two-col" style={{ gap: 20 }}>

        {/* AI Insights */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--accent-hover)" /> Insights & Reminders
            </h3>
          </div>
          <div className="card-body" style={{ padding: '8px 0' }}>
            {insights.length === 0 ? (
              <div className="ep-empty" style={{ padding: '24px 16px' }}>
                <CheckCircle2 size={32} className="ep-empty-icon" />
                <p className="ep-empty-title">All clear</p>
                <p className="ep-empty-desc">No pending actions or alerts for you today.</p>
              </div>
            ) : (
              insights.map((ins, i) => (
                <InsightRow key={i} insight={ins} navigate={navigate} />
              ))
            )}
          </div>
        </div>

        {/* Notifications + Leave Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent notifications */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} /> Notifications
                {unreadNotifs.length > 0 && (
                  <span className="ep-badge ep-badge-accent" style={{ marginLeft: 4 }}>
                    {unreadNotifs.length} new
                  </span>
                )}
              </h3>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '4px 8px' }}
                onClick={() => navigate('/app/employee/notifications')}
              >
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ padding: 0 }}>
              {unreadNotifs.length === 0 ? (
                <div className="ep-empty" style={{ padding: '20px 16px' }}>
                  <p className="ep-empty-desc">No new notifications.</p>
                </div>
              ) : (
                unreadNotifs.map(n => (
                  <NotifPreviewRow key={n.id} notif={n} navigate={navigate} />
                ))
              )}
            </div>
          </div>

          {/* Leave balance mini */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} /> Leave Balance
              </h3>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '4px 8px' }}
                onClick={() => navigate('/app/employee/leave')}
              >
                Apply leave <ChevronRight size={14} />
              </button>
            </div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              {leaveBalance.map((lb) => (
                <LeaveBalanceRow key={lb.id} item={lb} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AttendanceTime = ({ icon: Icon, label, time }) => (
  <div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 700 }}>
      <Icon size={15} color="var(--text-muted)" />
      {time}
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, accent }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 16px',
      borderRadius: 'var(--radius-md)',
      border: accent ? 'none' : '1px solid var(--border)',
      background: accent ? 'var(--accent)' : 'var(--bg-surface)',
      color: accent ? '#fff' : 'var(--text-primary)',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background 0.15s, box-shadow 0.15s',
      boxShadow: accent ? 'var(--shadow-sm)' : 'none',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = accent ? 'var(--accent-hover)' : 'var(--bg-surface-hover)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = accent ? 'var(--accent)' : 'var(--bg-surface)';
    }}
  >
    <Icon size={16} />
    {label}
  </button>
);

const InsightRow = ({ insight, navigate }) => {
  const iconMap = {
    warning: <AlertTriangle size={16} color="var(--warning-text)" />,
    info:    <Info size={16} color="var(--info-text)" />,
    success: <CheckCircle2 size={16} color="var(--success-text)" />,
    action:  <ArrowRight size={16} color="var(--accent-hover)" />,
  };
  const bgMap = {
    warning: 'var(--warning-bg)',
    info:    'var(--info-bg)',
    success: 'var(--success-bg)',
    action:  'var(--accent-soft)',
  };

  return (
    <div
      onClick={insight.link ? () => navigate(insight.link) : undefined}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: insight.link ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (insight.link) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: bgMap[insight.type],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {iconMap[insight.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{insight.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{insight.body}</div>
      </div>
      {insight.link && <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />}
    </div>
  );
};

const NotifPreviewRow = ({ notif, navigate }) => {
  const typeIconMap = {
    leave:   <Umbrella size={14} color="var(--info-text)" />,
    payslip: <DollarSign size={14} color="var(--success-text)" />,
    shift:   <Calendar size={14} color="var(--warning-text)" />,
    default: <Bell size={14} color="var(--accent-hover)" />,
  };
  const icon = typeIconMap[notif.type] ?? typeIconMap.default;

  const relTime = (isoStr) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  return (
    <div
      className="ep-notif-item unread"
      onClick={() => notif.actionUrl && navigate(notif.actionUrl)}
      style={{ padding: '12px 20px', display: 'flex', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div
        className="ep-notif-icon"
        style={{ background: 'var(--accent-soft)', width: 32, height: 32 }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ep-notif-title" style={{ fontSize: 13 }}>{notif.title}</div>
        <div className="ep-notif-time">{relTime(notif.createdAt)}</div>
      </div>
    </div>
  );
};

const LeaveBalanceRow = ({ item }) => {
  const pct = item.allocated > 0 ? (item.balance / item.allocated) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong>{item.balance}</strong> / {item.allocated} days
        </span>
      </div>
      <div className="ep-progress">
        <div
          className="ep-progress-fill"
          style={{ width: `${pct}%`, background: item.color ?? 'var(--accent-hover)' }}
        />
      </div>
    </div>
  );
};

// ─── Build AI insights from context data ──────────────────────────────────────
function buildInsights({ todayAttendance, notifications, pendingRequestsCount, nextHoliday, latestPayslip }) {
  const list = [];

  // 1. Missed checkout yesterday
  if (todayAttendance?.status === null) {
    list.push({
      type: 'warning',
      title: 'Attendance not marked',
      body: "You haven't checked in today. Remember to mark your attendance.",
      link: '/app/employee/attendance',
    });
  }

  // 2. Pending leave requests
  if (pendingRequestsCount > 0) {
    list.push({
      type: 'info',
      title: `${pendingRequestsCount} pending request${pendingRequestsCount > 1 ? 's' : ''}`,
      body: 'You have requests awaiting approval from your manager.',
      link: '/app/employee/requests',
    });
  }

  // 3. New payslip notification
  const payslipNotif = notifications.find(n => n.type === 'payslip' && !n.isRead);
  if (payslipNotif) {
    list.push({
      type: 'action',
      title: 'New payslip available',
      body: payslipNotif.message,
      link: '/app/employee/payslips',
    });
  }

  // 4. Holiday coming up soon
  if (nextHoliday && nextHoliday.daysAway !== null && nextHoliday.daysAway <= 7 && nextHoliday.daysAway > 0) {
    list.push({
      type: 'success',
      title: `${nextHoliday.name} in ${nextHoliday.daysAway} day${nextHoliday.daysAway > 1 ? 's' : ''}`,
      body: `${nextHoliday.dayName}, ${new Date(nextHoliday.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`,
      link: '/app/employee/calendar',
    });
  }

  // 5. Unread notifications
  const unread = notifications.filter(n => !n.isRead && n.type !== 'payslip').length;
  if (unread > 0) {
    list.push({
      type: 'info',
      title: `${unread} unread notification${unread > 1 ? 's' : ''}`,
      body: 'Tap to view all messages from HR and your manager.',
      link: '/app/employee/notifications',
    });
  }

  return list.slice(0, 5); // max 5 insights
}

export default EmployeeDashboard;
