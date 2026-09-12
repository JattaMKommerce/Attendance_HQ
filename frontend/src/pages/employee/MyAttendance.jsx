import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  LogIn,
  LogOut,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyAttendance = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  const [todayData, setTodayData] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [historyRes, todayRes] = await Promise.all([
        employeePortalApi.getMyAttendance({ month: filters.month, year: filters.year }),
        employeePortalApi.getTodayAttendance()
      ]);

      if (historyRes.data?.success) {
        setRecords(historyRes.data.data?.records || []);
        setSummary(historyRes.data.data?.summary || null);
      }

      if (todayRes.data?.success) {
        setTodayData(todayRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setErrorMsg('Failed to load attendance records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [filters]);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await employeePortalApi.checkIn({ source: 'portal' });
      setSuccessMsg('Successfully clocked in!');
      await fetchAttendanceData();
    } catch (error) {
      console.error('Check-in failed:', error);
      setErrorMsg(error.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await employeePortalApi.checkOut({ source: 'portal' });
      setSuccessMsg('Successfully clocked out!');
      await fetchAttendanceData();
    } catch (error) {
      console.error('Check-out failed:', error);
      setErrorMsg(error.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatShortTime = (dStr) => {
    if (!dStr) return '--:--';
    const d = new Date(dStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            My Attendance
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Track your daily clock-ins, history, and working hours
          </p>
        </div>
        <button
          onClick={fetchAttendanceData}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications / Feedback */}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto'
      }}>
        <TabButton 
          active={activeTab === 'today'} 
          onClick={() => setActiveTab('today')}
          icon={Clock}
        >
          Today
        </TabButton>
        <TabButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={Calendar}
        >
          History
        </TabButton>
        <TabButton 
          active={activeTab === 'summary'} 
          onClick={() => setActiveTab('summary')}
          icon={TrendingUp}
        >
          Monthly Summary
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && (
        <TodayTab 
          data={todayData}
          actionLoading={actionLoading}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          calculateWorkingHours={calculateWorkingHours}
          formatShortTime={formatShortTime}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab 
          records={records}
          filters={filters}
          setFilters={setFilters}
          loading={loading}
          formatShortTime={formatShortTime}
        />
      )}

      {activeTab === 'summary' && (
        <SummaryTab 
          summary={summary}
          filters={filters}
          setFilters={setFilters}
        />
      )}
    </div>
  );
};

// Tab 1: Today
const TodayTab = ({ data, actionLoading, onCheckIn, onCheckOut, calculateWorkingHours, formatShortTime }) => {
  const isCheckedIn = (data?.status === 'checked_in' || data?.status === 'present') && !data?.check_out_time;
  const isCheckedOut = Boolean(data?.check_out_time);

  return (
    <div>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {isCheckedIn ? 'You are actively clocked in' : isCheckedOut ? 'Shift completed for today' : 'You have not checked in yet today'}
            </p>
          </div>
          
          <div>
            {!isCheckedIn && !isCheckedOut && (
              <button 
                onClick={onCheckIn}
                disabled={actionLoading}
                style={{
                  padding: '11px 20px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                <LogIn size={18} />
                {actionLoading ? 'Recording...' : 'Clock In Now'}
              </button>
            )}
            
            {isCheckedIn && (
              <button 
                onClick={onCheckOut}
                disabled={actionLoading}
                style={{
                  padding: '11px 20px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(239,68,68,0.2)'
                }}
              >
                <LogOut size={18} />
                {actionLoading ? 'Recording...' : 'Clock Out Now'}
              </button>
            )}

            {isCheckedOut && (
              <span style={{
                padding: '8px 14px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={16} /> Completed Today
              </span>
            )}
          </div>
        </div>

        {/* Time Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          <TimeCard 
            icon={LogIn}
            label="Check In Time"
            time={formatShortTime(data?.check_in_time)}
            color="#2563eb"
          />
          <TimeCard 
            icon={LogOut}
            label="Check Out Time"
            time={formatShortTime(data?.check_out_time)}
            color="#0891b2"
          />
          <TimeCard 
            icon={Clock}
            label="Recorded Duration"
            time={data?.work_duration_minutes ? `${Math.floor(data.work_duration_minutes / 60)}h ${data.work_duration_minutes % 60}m` : calculateWorkingHours(data?.check_in_time, data?.check_out_time)}
            color="#7c3aed"
          />
        </div>
      </div>
    </div>
  );
};

// Tab 2: History
const HistoryTab = ({ records, filters, setFilters, loading, formatShortTime }) => {
  return (
    <div>
      {/* Month Filter */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <Filter size={18} color="#64748b" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Filter Period:</span>
        <select 
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            color: '#1e293b'
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select 
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            color: '#1e293b'
          }}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading records...
        </div>
      ) : records.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <Calendar size={40} color="#94a3b8" style={{ marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b' }}>No Attendance Records</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            No recorded attendance found for the selected period.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (shown on smaller screens) */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {records.map((r) => (
              <div
                key={r.id || r.date}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                    {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Check In</div>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatShortTime(r.check_in_time)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Check Out</div>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatShortTime(r.check_out_time)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Hours</div>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>
                      {r.work_duration_minutes ? `${(r.work_duration_minutes / 60).toFixed(1)}h` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="desktop-only" style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Check In</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Check Out</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Working Hours</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id || r.date} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {formatShortTime(r.check_in_time)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {formatShortTime(r.check_out_time)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563eb' }}>
                      {r.work_duration_minutes ? `${(r.work_duration_minutes / 60).toFixed(1)} hrs` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {r.late_minutes > 0 ? `Late by ${r.late_minutes}m` : (r.notes || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// Tab 3: Summary
const SummaryTab = ({ summary, filters, setFilters }) => {
  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        No summary data available for this month.
      </div>
    );
  }

  return (
    <div>
      {/* Month Filter */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <Filter size={18} color="#64748b" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Filter Period:</span>
        <select 
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            color: '#1e293b'
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select 
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            color: '#1e293b'
          }}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <StatCard label="Present Days" value={summary.present} color="#16a34a" />
        <StatCard label="Absent Days" value={summary.absent} color="#dc2626" />
        <StatCard label="Half Days" value={summary.halfDay} color="#d97706" />
        <StatCard label="Late Arrivals" value={summary.late} color="#ea580c" />
        <StatCard label="Total Working Hours" value={`${summary.workingHours} hrs`} color="#2563eb" />
        <StatCard label="Daily Average" value={`${summary.averageHours} hrs`} color="#7c3aed" />
      </div>
    </div>
  );
};

// Sub-components
const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 16px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: active ? 600 : 500,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.15s'
    }}
  >
    <Icon size={16} />
    {children}
  </button>
);

const TimeCard = ({ icon: Icon, label, time, color }) => (
  <div style={{
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <Icon size={16} color={color} />
      <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{time}</div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{value}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const config = {
    present: { bg: '#dcfce7', color: '#16a34a', label: 'Present' },
    checked_in: { bg: '#dcfce7', color: '#16a34a', label: 'Checked In' },
    wfh: { bg: '#e0e7ff', color: '#4f46e5', label: 'WFH' },
    half_day: { bg: '#fef3c7', color: '#d97706', label: 'Half Day' },
    absent: { bg: '#fee2e2', color: '#dc2626', label: 'Absent' },
    leave: { bg: '#f1f5f9', color: '#64748b', label: 'On Leave' }
  };

  const style = config[s] || { bg: '#f1f5f9', color: '#64748b', label: s || 'Unknown' };

  return (
    <span style={{
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      backgroundColor: style.bg,
      color: style.color
    }}>
      {style.label}
    </span>
  );
};

export default MyAttendance;
