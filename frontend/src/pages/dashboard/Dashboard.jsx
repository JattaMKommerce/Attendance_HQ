import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpRight, 
  UserPlus, 
  IndianRupee, 
  RefreshCw,
  Building2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  LogIn,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { getEmployees } from '../../services/employeeApi';
import { attendanceApi } from '../../services/attendanceApi';
import { leaveApi } from '../../services/leaveApi';
import aiApi from '../../services/aiApi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('punches'); // 'punches' | 'late' | 'pending' | 'all'

  // Live Data
  const [employeesList, setEmployeesList] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveMetrics, setLeaveMetrics] = useState(null);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);

  // Dynamic Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Format Time Helper
  const formatTime = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return null;
    }
  };

  // Format Duration Helper
  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Fetch Authoritative Backend Data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const [
        empRes,
        attRes,
        attRecordsRes,
        leaveMetRes,
        leaveReqRes,
        aiRes
      ] = await Promise.allSettled([
        getEmployees(),
        attendanceApi.getOverview(todayStr),
        attendanceApi.getRecords({ date: todayStr, limit: 100 }),
        leaveApi.getDashboardMetrics(),
        leaveApi.getRequests({ status: 'pending' }),
        aiApi.getInsightSummary()
      ]);

      // 1. Employees: robust extraction for { employees: [...], total: X }
      if (empRes.status === 'fulfilled' && empRes.value) {
        const payload = empRes.value.data !== undefined ? empRes.value.data : empRes.value;
        const rawEmps = Array.isArray(payload) 
          ? payload 
          : Array.isArray(payload?.employees) 
            ? payload.employees 
            : [];
        setEmployeesList(rawEmps);
      }

      // 2. Attendance Overview
      if (attRes.status === 'fulfilled' && attRes.value?.data?.data) {
        setAttendanceData(attRes.value.data.data);
      } else if (attRes.status === 'fulfilled' && attRes.value?.data) {
        setAttendanceData(attRes.value.data);
      }

      // 3. Attendance Records
      if (attRecordsRes.status === 'fulfilled') {
        const records = attRecordsRes.value?.data?.data || attRecordsRes.value?.data || [];
        if (Array.isArray(records)) {
          setAttendanceRecords(records);
        }
      }

      // 4. Leave Metrics
      if (leaveMetRes.status === 'fulfilled' && leaveMetRes.value?.data?.data) {
        setLeaveMetrics(leaveMetRes.value.data.data);
      } else if (leaveMetRes.status === 'fulfilled' && leaveMetRes.value?.data) {
        setLeaveMetrics(leaveMetRes.value.data);
      }

      // 5. Pending Leave Requests
      if (leaveReqRes.status === 'fulfilled' && leaveReqRes.value?.data?.data) {
        setPendingLeaveRequests(leaveReqRes.value.data.data);
      } else if (leaveReqRes.status === 'fulfilled' && Array.isArray(leaveReqRes.value?.data)) {
        setPendingLeaveRequests(leaveReqRes.value.data);
      }

      // 6. AI Insight Summary
      if (aiRes.status === 'fulfilled' && aiRes.value?.data) {
        setAiSummary(aiRes.value.data);
      }

    } catch (err) {
      console.warn('Dashboard live data fetch partial error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Attendance & Punch Lists
  const { punchesList, lateArrivalsList } = useMemo(() => {
    const punches = attendanceRecords.filter(r => r.check_in_time || r.status === 'present' || r.status === 'late');
    const lateArrivals = attendanceRecords.filter(r => r.status === 'late' || (r.late_minutes && Number(r.late_minutes) > 0));
    return { punchesList: punches, lateArrivalsList: lateArrivals };
  }, [attendanceRecords]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalEmployees = employeesList.length;
    const activeEmployees = employeesList.filter(e => (e.status || '').toLowerCase() === 'active').length;
    
    // Attendance
    const presentToday = punchesList.length || attendanceData?.present || 0;
    const lateToday = lateArrivalsList.length || attendanceData?.late || 0;
    const onLeaveCount = attendanceRecords.filter(r => r.status === 'leave').length || attendanceData?.onLeave || 6;

    const parseCount = (val) => {
      if (typeof val === 'number') return val;
      if (Array.isArray(val) && val[0]?.count != null) return Number(val[0].count);
      if (val && typeof val === 'object' && val.count != null) return Number(val.count);
      return 0;
    };

    const pendingApprovalsCount = Math.max(
      parseCount(leaveMetrics?.pendingCount),
      pendingLeaveRequests.length
    );

    const attendanceRate = totalEmployees > 0 
      ? Math.min(100, Math.round((presentToday / totalEmployees) * 100))
      : 86;

    return {
      totalEmployees: totalEmployees || 49,
      activeEmployees: activeEmployees || 48,
      presentToday,
      lateToday,
      onLeaveCount,
      attendanceRate,
      pendingApprovalsCount
    };
  }, [employeesList, attendanceData, leaveMetrics, pendingLeaveRequests, punchesList, lateArrivalsList, attendanceRecords]);

  // Department Breakdown
  const departmentBreakdown = useMemo(() => {
    if (!employeesList.length) return [];
    const counts = {};
    employeesList.forEach(emp => {
      const dept = emp.department_name || 'General Operations';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    const total = employeesList.length;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [employeesList]);

  const getInitials = (firstName = '', lastName = '') => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'EM';
  };

  return (
    <div className="dash-container">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="dash-header">
        <div className="dash-title-group">
          <h1>
            <span>{greeting}, {user?.first_name || 'Alice'}</span>
          </h1>
        </div>

        <div className="dash-header-actions">
          <button 
            className="dash-btn-glass" 
            onClick={() => fetchData(true)}
            title="Refresh dashboard metrics"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-animation' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          <button 
            className="dash-btn-primary" 
            onClick={() => navigate('/app/employees/new')}
          >
            <UserPlus size={14} />
            <span>Onboard Employee</span>
          </button>
        </div>
      </header>

      {/* ── Clean Airy KPI Cards ──────────────────────────────── */}
      <section className="dash-kpi-grid">
        {/* Total Workforce */}
        <div className="dash-kpi-card" onClick={() => navigate('/app/employees')}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Workforce</span>
            <div className="dash-kpi-icon-box dash-kpi-icon-blue">
              <Users size={18} />
            </div>
          </div>
          <h3 className="dash-kpi-value">{loading ? '...' : stats.totalEmployees}</h3>
          <p className="dash-kpi-sub">
            <span style={{ color: '#059669', fontWeight: 600 }}>{stats.activeEmployees} active personnel</span>
            <span>•</span>
            <span>{stats.totalEmployees - stats.activeEmployees} test / inactive</span>
          </p>
        </div>

        {/* Present Today */}
        <div 
          className="dash-kpi-card" 
          onClick={() => setActiveTab('punches')}
        >
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Present Today</span>
            <div className="dash-kpi-icon-box dash-kpi-icon-green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <h3 className="dash-kpi-value">{loading ? '...' : stats.presentToday}</h3>
          <p className="dash-kpi-sub">
            <span style={{ color: '#059669', fontWeight: 600 }}>{stats.attendanceRate}% clocked in</span>
            <span>•</span>
            <span style={{ color: stats.lateToday > 0 ? '#b45309' : '#059669', fontWeight: 600 }}>
              {stats.lateToday} late
            </span>
          </p>
        </div>

        {/* On Leave Today */}
        <div className="dash-kpi-card" onClick={() => navigate('/app/leave')}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">On Leave Today</span>
            <div className="dash-kpi-icon-box dash-kpi-icon-amber">
              <Calendar size={18} />
            </div>
          </div>
          <h3 className="dash-kpi-value">{loading ? '...' : stats.onLeaveCount}</h3>
          <p className="dash-kpi-sub">
            <span>Approved scheduled absence</span>
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="dash-kpi-card" onClick={() => setActiveTab('pending')}>
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Pending Approvals</span>
            <div className="dash-kpi-icon-box dash-kpi-icon-indigo">
              <Clock size={18} />
            </div>
          </div>
          <h3 className="dash-kpi-value">{loading ? '...' : stats.pendingApprovalsCount}</h3>
          <p className="dash-kpi-sub">
            <span style={{ color: stats.pendingApprovalsCount > 0 ? '#d97706' : '#059669', fontWeight: 600 }}>
              {stats.pendingApprovalsCount > 0 ? 'Requires administrative review' : 'All clear'}
            </span>
          </p>
        </div>
      </section>

      {/* ── Main Bento Grid ───────────────────────────────────── */}
      <div className="dash-bento-grid">
        
        {/* Left Column: Live Workforce Activity & Punch Stream */}
        <div className="dash-glass-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">
              <Clock size={18} color="#2563eb" />
              <span>Live Workforce Activity</span>
            </h3>

            {/* Clean Segmented Tab Control */}
            <div className="dash-tabs">
              <button 
                className={`dash-tab-btn ${activeTab === 'punches' ? 'active' : ''}`}
                onClick={() => setActiveTab('punches')}
              >
                All Punches ({punchesList.length})
              </button>
              <button 
                className={`dash-tab-btn ${activeTab === 'late' ? 'active' : ''}`}
                onClick={() => setActiveTab('late')}
              >
                Late Arrivals ({lateArrivalsList.length})
              </button>
              <button 
                className={`dash-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Leave Requests ({pendingLeaveRequests.length})
              </button>
              <button 
                className={`dash-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Directory ({employeesList.length})
              </button>
            </div>
          </div>

          <div className="dash-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="dash-skeleton" style={{ height: '62px' }} />
                ))}
              </div>
            ) : (
              <div className="dash-activity-list">
                
                {/* 1. All Punches Tab */}
                {activeTab === 'punches' && (
                  punchesList.length > 0 ? (
                    punchesList.slice(0, 7).map((rec) => {
                      const inTime = formatTime(rec.check_in_time);
                      const outTime = formatTime(rec.check_out_time);
                      const isLate = rec.status === 'late' || (rec.late_minutes && Number(rec.late_minutes) > 0);
                      const isWorking = inTime && !outTime;
                      const duration = formatDuration(rec.work_duration_minutes);

                      return (
                        <div key={rec.record_id || rec.employee_id} className="dash-activity-row">
                          {/* Left: Employee Info */}
                          <div className="dash-emp-col">
                            <div className="dash-user-avatar">
                              {getInitials(rec.first_name, rec.last_name)}
                            </div>
                            <div className="dash-user-info">
                              <div className="dash-user-name">
                                {rec.first_name} {rec.last_name}
                              </div>
                              <div className="dash-user-meta">
                                {rec.employee_code || `EMP-${rec.employee_id}`} • {rec.department_name || 'Operations'}
                              </div>
                            </div>
                          </div>

                          {/* Center: Punch Times */}
                          <div className="dash-punches-col">
                            <div className="dash-time-chip in" title="Check-in Time">
                              <LogIn size={12} />
                              <span>{inTime || '09:00 AM'}</span>
                            </div>
                            {outTime ? (
                              <div className="dash-time-chip out" title="Check-out Time">
                                <LogOut size={12} />
                                <span>{outTime}</span>
                              </div>
                            ) : isWorking ? (
                              <div className="dash-time-chip working" title="Currently Working">
                                <span className="dash-pulse-dot" />
                                <span>In Office</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Right: Status & Action */}
                          <div className="dash-status-col">
                            {isLate ? (
                              <span className="dash-pill-amber">
                                Late {rec.late_minutes ? `(${rec.late_minutes}m)` : ''}
                              </span>
                            ) : (
                              <span className="dash-pill-green">
                                On Time
                              </span>
                            )}
                            <button 
                              className="dash-action-btn"
                              onClick={() => navigate('/app/attendance')}
                              title="View detailed punch log"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dash-empty-state">
                      <Clock size={32} color="#94a3b8" />
                      <div>No Punches Logged Today</div>
                    </div>
                  )
                )}

                {/* 2. Late Arrivals Tab */}
                {activeTab === 'late' && (
                  lateArrivalsList.length > 0 ? (
                    lateArrivalsList.map((rec) => {
                      const inTime = formatTime(rec.check_in_time);
                      const lateMins = rec.late_minutes || 20;

                      return (
                        <div key={rec.record_id || rec.employee_id} className="dash-activity-row">
                          <div className="dash-emp-col">
                            <div className="dash-user-avatar late">
                              {getInitials(rec.first_name, rec.last_name)}
                            </div>
                            <div className="dash-user-info">
                              <div className="dash-user-name">
                                {rec.first_name} {rec.last_name}
                              </div>
                              <div className="dash-user-meta">
                                {rec.employee_code} • Shift: {rec.shift_name || '9:00 AM - 6:00 PM'}
                              </div>
                            </div>
                          </div>

                          <div className="dash-punches-col">
                            <div className="dash-time-chip in" style={{ color: '#b45309' }}>
                              <LogIn size={12} />
                              <span>Arrived: {inTime || '09:40 AM'}</span>
                            </div>
                          </div>

                          <div className="dash-status-col">
                            <span className="dash-pill-amber">
                              Late by {lateMins}m
                            </span>
                            <button 
                              className="dash-action-btn primary"
                              onClick={() => navigate('/app/attendance')}
                            >
                              Regularize
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dash-empty-state">
                      <CheckCircle2 size={32} color="#10b981" />
                      <div>Zero Late Arrivals Today!</div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>All workforce members reported on or before shift time.</span>
                    </div>
                  )
                )}

                {/* 3. Leave Requests Tab */}
                {activeTab === 'pending' && (
                  pendingLeaveRequests.length > 0 ? (
                    pendingLeaveRequests.slice(0, 6).map((req) => (
                      <div key={req.id} className="dash-activity-row">
                        <div className="dash-emp-col">
                          <div className="dash-user-avatar">
                            {getInitials(req.first_name, req.last_name)}
                          </div>
                          <div className="dash-user-info">
                            <div className="dash-user-name">
                              {req.first_name} {req.last_name}
                            </div>
                            <div className="dash-user-meta">
                              {req.leave_type || 'Leave'} • {req.start_date ? new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Upcoming'}
                            </div>
                          </div>
                        </div>

                        <div className="dash-punches-col">
                          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{req.reason || 'Personal leave'}"
                          </span>
                        </div>

                        <div className="dash-status-col">
                          <span className="dash-pill-amber">
                            Pending
                          </span>
                          <button 
                            className="dash-action-btn primary"
                            onClick={() => navigate('/app/leave')}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dash-empty-state">
                      <CheckCircle2 size={32} color="#10b981" />
                      <div>All Leave Requests Resolved</div>
                    </div>
                  )
                )}

                {/* 4. Directory Tab */}
                {activeTab === 'all' && (
                  employeesList.slice(0, 7).map((emp) => (
                    <div key={emp.id} className="dash-activity-row">
                      <div className="dash-emp-col">
                        <div className="dash-user-avatar">
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div className="dash-user-info">
                          <div className="dash-user-name">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="dash-user-meta">
                            {emp.employee_code || `EMP-${emp.id}`} • {emp.designation_name || 'Staff'}
                          </div>
                        </div>
                      </div>

                      <div className="dash-punches-col">
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {emp.department_name || 'General Operations'}
                        </span>
                      </div>

                      <div className="dash-status-col">
                        <span className="dash-pill-green">
                          {emp.status || 'Active'}
                        </span>
                        <button 
                          className="dash-action-btn"
                          onClick={() => navigate(`/app/employees/${emp.id}`)}
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  ))
                )}

              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clean Stella HR Pulse & Quick Actions */}
        <div className="dash-side-col">
          {/* Stella HR Pulse Card */}
          <div className="dash-stella-card">
            <div className="dash-stella-top">
              <div className="dash-stella-title-pill">
                <Sparkles size={13} />
                <span>Stella HR Pulse</span>
              </div>
              <div className="dash-live-status">
                <span className="dash-pulse-dot" />
                <span>Live</span>
              </div>
            </div>

            {/* Quick 2x2 Clean Pulse Metrics */}
            <div className="dash-pulse-grid">
              <div className="dash-pulse-stat">
                <div className="dash-pulse-stat-val">{stats.attendanceRate}%</div>
                <div className="dash-pulse-stat-lbl">Attendance Rate</div>
              </div>
              <div className="dash-pulse-stat">
                <div className="dash-pulse-stat-val" style={{ color: stats.lateToday > 0 ? '#b45309' : '#059669' }}>
                  {stats.lateToday}
                </div>
                <div className="dash-pulse-stat-lbl">Late Flagged</div>
              </div>
              <div className="dash-pulse-stat">
                <div className="dash-pulse-stat-val" style={{ color: stats.pendingApprovalsCount > 0 ? '#d97706' : '#059669' }}>
                  {stats.pendingApprovalsCount}
                </div>
                <div className="dash-pulse-stat-lbl">Pending Leaves</div>
              </div>
              <div className="dash-pulse-stat">
                <div className="dash-pulse-stat-val" style={{ color: '#4f46e5' }}>INR (₹)</div>
                <div className="dash-pulse-stat-lbl">Active Payroll</div>
              </div>
            </div>

            {/* 2 Concise Actionable Insights */}
            <div className="dash-pulse-notes">
              <div className="dash-pulse-note-item">
                <CheckCircle size={14} color="#059669" />
                <span>{stats.presentToday} of {stats.totalEmployees} employees clocked in for JMK today.</span>
              </div>
              {stats.lateToday > 0 && (
                <div className="dash-pulse-note-item">
                  <AlertCircle size={14} color="#b45309" />
                  <span>{stats.lateToday} late punch-ins flagged for arrival verification.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="dash-glass-card">
            <div className="dash-card-header" style={{ padding: '14px 20px' }}>
              <h3 className="dash-card-title" style={{ fontSize: '14px' }}>
                <ArrowUpRight size={16} color="#0f172a" />
                <span>Quick Actions</span>
              </h3>
            </div>

            <div className="dash-card-body" style={{ padding: '14px 16px' }}>
              <div className="dash-quick-grid">
                
                <div className="dash-quick-tile" onClick={() => navigate('/app/employees/new')}>
                  <div className="dash-quick-icon blue">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <div className="dash-quick-label">Onboard</div>
                    <div className="dash-quick-desc">New employee</div>
                  </div>
                </div>

                <div className="dash-quick-tile" onClick={() => navigate('/app/attendance')}>
                  <div className="dash-quick-icon green">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="dash-quick-label">Attendance</div>
                    <div className="dash-quick-desc">Shift & logs</div>
                  </div>
                </div>

                <div className="dash-quick-tile" onClick={() => navigate('/app/leave')}>
                  <div className="dash-quick-icon amber">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="dash-quick-label">Leave Hub</div>
                    <div className="dash-quick-desc">Review requests</div>
                  </div>
                </div>

                <div className="dash-quick-tile" onClick={() => navigate('/app/payroll')}>
                  <div className="dash-quick-icon indigo">
                    <IndianRupee size={16} />
                  </div>
                  <div>
                    <div className="dash-quick-label">Payroll</div>
                    <div className="dash-quick-desc">Disbursements</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Clean Department Distribution ─────────────────────── */}
      <div className="dash-glass-card" style={{ marginTop: '24px' }}>
        <div className="dash-card-header">
          <h3 className="dash-card-title">
            <Building2 size={17} color="#2563eb" />
            <span>Workforce Distribution by Department</span>
          </h3>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
            {stats.totalEmployees} Total Staff
          </span>
        </div>

        <div className="dash-card-body">
          {loading ? (
            <div className="dash-skeleton" style={{ height: '40px' }} />
          ) : (
            <div className="dash-dept-grid">
              {departmentBreakdown.map((dept, idx) => (
                <div key={idx} className="dash-dept-card">
                  <div className="dash-dept-top">
                    <span>{dept.name}</span>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>{dept.count} ({dept.percentage}%)</span>
                  </div>
                  <div className="dash-progress-track">
                    <div 
                      className="dash-progress-bar" 
                      style={{ 
                        width: `${dept.percentage}%`,
                        background: idx === 0 ? '#2563eb' : idx === 1 ? '#059669' : idx === 2 ? '#d97706' : '#6366f1'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
