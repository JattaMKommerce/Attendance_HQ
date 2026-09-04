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
  Filter
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyAttendance = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    today: null,
    records: [],
    summary: null
  });
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [checkInOut, setCheckInOut] = useState({
    loading: false,
    todayStatus: null
  });

  useEffect(() => {
    fetchAttendanceData();
  }, [filters]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // In production, fetch from API:
      // const [records, summary] = await Promise.all([
      //   employeePortalApi.getMyAttendance(filters),
      //   employeePortalApi.getMyAttendanceSummary(filters.month, filters.year)
      // ]);
      
      // Mock data
      const mockData = {
        today: {
          date: new Date().toISOString().split('T')[0],
          status: null, // 'present', 'absent', 'half_day', null
          checkIn: null,
          checkOut: null
        },
        records: generateMockRecords(),
        summary: {
          totalDays: 22,
          present: 18,
          absent: 2,
          halfDay: 1,
          late: 3,
          workingHours: 162.5,
          averageHours: 9.0
        }
      };
      
      setAttendanceData(mockData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckInOut({ ...checkInOut, loading: true });
      
      // await employeePortalApi.checkIn({ timestamp: new Date().toISOString() });
      
      const now = new Date();
      setAttendanceData(prev => ({
        ...prev,
        today: {
          ...prev.today,
          checkIn: now.toISOString(),
          status: 'present'
        }
      }));
      
      setCheckInOut({ loading: false, todayStatus: 'checked_in' });
    } catch (error) {
      console.error('Check-in failed:', error);
      setCheckInOut({ ...checkInOut, loading: false });
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckInOut({ ...checkInOut, loading: true });
      
      // await employeePortalApi.checkOut({ timestamp: new Date().toISOString() });
      
      const now = new Date();
      setAttendanceData(prev => ({
        ...prev,
        today: {
          ...prev.today,
          checkOut: now.toISOString()
        }
      }));
      
      setCheckInOut({ loading: false, todayStatus: 'checked_out' });
    } catch (error) {
      console.error('Check-out failed:', error);
      setCheckInOut({ ...checkInOut, loading: false });
    }
  };

  const handleDownloadReport = () => {
    // In production: download attendance report
    alert('Download functionality will be connected to backend API');
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-description">Track your attendance and working hours</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleDownloadReport}>
            <Download size={16} />
            Download Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)'
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
          Summary
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && (
        <TodayTab 
          data={attendanceData.today}
          checkInOut={checkInOut}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          calculateWorkingHours={calculateWorkingHours}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab 
          records={attendanceData.records}
          filters={filters}
          setFilters={setFilters}
          calculateWorkingHours={calculateWorkingHours}
          loading={loading}
        />
      )}

      {activeTab === 'summary' && (
        <SummaryTab 
          summary={attendanceData.summary}
          filters={filters}
          setFilters={setFilters}
        />
      )}
    </div>
  );
};

// Tab Components
const TodayTab = ({ data, checkInOut, onCheckIn, onCheckOut, calculateWorkingHours }) => {
  const hasCheckedIn = data?.checkIn || checkInOut.todayStatus === 'checked_in';
  const hasCheckedOut = data?.checkOut || checkInOut.todayStatus === 'checked_out';

  return (
    <div>
      {/* Check In/Out Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {hasCheckedIn ? 'You are checked in' : 'You haven\'t checked in yet'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {!hasCheckedIn && (
                <button 
                  className="btn btn-success"
                  onClick={onCheckIn}
                  disabled={checkInOut.loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogIn size={18} />
                  {checkInOut.loading ? 'Processing...' : 'Check In'}
                </button>
              )}
              
              {hasCheckedIn && !hasCheckedOut && (
                <button 
                  className="btn btn-secondary"
                  onClick={onCheckOut}
                  disabled={checkInOut.loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogOut size={18} />
                  {checkInOut.loading ? 'Processing...' : 'Check Out'}
                </button>
              )}
            </div>
          </div>

          {/* Time Display */}
          {hasCheckedIn && (
            <div style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <TimeCard 
                icon={LogIn}
                label="Check In"
                time={data?.checkIn ? new Date(data.checkIn).toLocaleTimeString() : new Date().toLocaleTimeString()}
                color="var(--success-text)"
              />
              
              {hasCheckedOut && (
                <>
                  <TimeCard 
                    icon={LogOut}
                    label="Check Out"
                    time={data?.checkOut ? new Date(data.checkOut).toLocaleTimeString() : new Date().toLocaleTimeString()}
                    color="var(--info-text)"
                  />
                  <TimeCard 
                    icon={Clock}
                    label="Working Hours"
                    time={calculateWorkingHours(data?.checkIn, data?.checkOut)}
                    color="var(--accent-hover)"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: 'var(--success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={24} color="var(--success-text)" />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  This Month
                </p>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>18 Days</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: 'var(--info-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={24} color="var(--info-text)" />
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Avg. Hours/Day
                </p>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>9.0 hrs</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryTab = ({ records, filters, setFilters, calculateWorkingHours, loading }) => {
  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <select 
            className="input-control"
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
            style={{ width: '150px' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            className="input-control"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            style={{ width: '120px' }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <Calendar size={48} className="empty-state-icon" />
                      <h3 className="empty-state-title">No attendance records</h3>
                      <p className="empty-state-desc">No attendance data found for the selected period.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td>
                      <StatusBadge status={record.status} />
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {record.checkIn || '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {record.checkOut || '-'}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {record.workingHours || '-'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {record.remarks || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryTab = ({ summary, filters, setFilters }) => {
  if (!summary) return null;

  const attendancePercentage = ((summary.present / summary.totalDays) * 100).toFixed(1);

  return (
    <div>
      {/* Month Filter */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}>
          <span style={{ fontWeight: 500 }}>Viewing:</span>
          <select 
            className="input-control"
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
            style={{ width: '150px' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            className="input-control"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            style={{ width: '120px' }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard 
          icon={Calendar}
          label="Total Working Days"
          value={summary.totalDays}
          color="var(--accent-hover)"
        />
        <StatCard 
          icon={CheckCircle}
          label="Days Present"
          value={summary.present}
          color="var(--success-text)"
        />
        <StatCard 
          icon={XCircle}
          label="Days Absent"
          value={summary.absent}
          color="var(--danger)"
        />
        <StatCard 
          icon={AlertCircle}
          label="Half Days"
          value={summary.halfDay}
          color="var(--warning-text)"
        />
      </div>

      {/* Detailed Stats */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Metrics</h3>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500 }}>Attendance Rate</span>
              <span style={{ fontWeight: 600, color: 'var(--success-text)' }}>{attendancePercentage}%</span>
            </div>
            <div style={{ 
              height: '8px', 
              backgroundColor: 'var(--bg-surface-hover)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${attendancePercentage}%`, 
                height: '100%', 
                backgroundColor: 'var(--success-text)',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            <MetricRow label="Total Working Hours" value={`${summary.workingHours} hrs`} />
            <MetricRow label="Average Hours/Day" value={`${summary.averageHours} hrs`} />
            <MetricRow label="Late Arrivals" value={summary.late} />
            <MetricRow label="On-Time Rate" value={`${(((summary.present - summary.late) / summary.present) * 100).toFixed(1)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 20px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid var(--accent-hover)' : '2px solid transparent',
      color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
      fontWeight: active ? 600 : 400,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    }}
  >
    <Icon size={18} />
    {children}
  </button>
);

const TimeCard = ({ icon: Icon, label, time, color }) => (
  <div style={{
    padding: '16px',
    backgroundColor: 'var(--bg-surface-hover)',
    borderRadius: '8px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <Icon size={16} color={color} />
      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: 600, color }}>{time}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    present: { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Present' },
    absent: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Absent' },
    half_day: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Half Day' },
    leave: { bg: 'var(--info-bg)', color: 'var(--info-text)', label: 'On Leave' },
    holiday: { bg: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', label: 'Holiday' }
  };

  const style = config[status] || config.absent;

  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: style.bg,
      color: style.color
    }}>
      {style.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card">
    <div className="card-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
        <div>
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {label}
          </p>
          <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{value}</h3>
        </div>
      </div>
    </div>
  </div>
);

const MetricRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

// Mock data generator
const generateMockRecords = () => {
  const records = [];
  const today = new Date();
  
  for (let i = 20; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
    
    const statuses = ['present', 'present', 'present', 'present', 'absent'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    records.push({
      date: date.toISOString().split('T')[0],
      status,
      checkIn: status === 'present' ? '09:15 AM' : null,
      checkOut: status === 'present' ? '06:30 PM' : null,
      workingHours: status === 'present' ? '9h 15m' : null,
      remarks: status === 'absent' ? 'Unplanned absence' : ''
    });
  }
  
  return records;
};

export default MyAttendance;
