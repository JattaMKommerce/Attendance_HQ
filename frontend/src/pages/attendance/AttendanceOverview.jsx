import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, Search, AlertCircle, Clock, CheckSquare, 
  Users, CheckCircle, XCircle, Download, 
  Eye, Filter, X
} from 'lucide-react';
import { attendanceApi } from '../../services/attendanceApi';
import api from '../../services/api';
import AttendanceEmployeeDashboard from './AttendanceEmployeeDashboard';
import AttendanceIssuesView from './AttendanceIssuesView';
import './AttendanceDashboard.css';
import './Attendance.css';

const AttendanceOverview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewEmployeeId, setViewEmployeeId] = useState(null);

  // Sync query parameters when redirected from specific notification
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlSearch = searchParams.get('search');
    const urlDate = searchParams.get('date');
    const urlEmpId = searchParams.get('employeeId');

    if (urlStatus) setStatusFilter(urlStatus);
    if (urlSearch) setSearch(urlSearch);
    if (urlDate) setDate(urlDate);
    if (urlEmpId) setViewEmployeeId(Number(urlEmpId));
  }, [searchParams]);
  
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    missingPunches: 0,
    pendingRequests: 0
  });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'missing_checkout', 'correction', 'unapproved_absence'
  const [selectedIssue, setSelectedIssue] = useState(null);

  const exportToCSV = () => {
    if (tableData.length === 0) return;
    const headers = ['Employee ID', 'Name', 'Department', 'Shift', 'Check In', 'Check Out', 'Hours', 'Status'];
    const csvRows = [headers.join(',')];
    tableData.forEach(row => {
      const hours = row.work_duration_minutes ? `${Math.floor(row.work_duration_minutes/60)}h ${row.work_duration_minutes%60}m` : '';
      const cleanShift = row.shift_name ? row.shift_name.replace(/\s*\(.*?\)/, '') : '';
      const statusText = row.status === 'not_marked' ? 'No Record' : row.status;
      csvRows.push([
        row.employee_code,
        `${row.first_name} ${row.last_name}`,
        row.department_name || '',
        cleanShift,
        row.check_in_time || '',
        row.check_out_time || '',
        hours,
        statusText
      ].map(val => `"${val}"`).join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lookups for filters
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedShift, setSelectedShift] = useState(''); // Not currently used by backend query, but UI ready

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const overviewRes = await attendanceApi.getOverview(date, { department: selectedDepartment, shift: selectedShift });
      if (overviewRes.data && overviewRes.data.data) {
        setMetrics(overviewRes.data.data);
      } else if (overviewRes.data) {
        setMetrics(overviewRes.data);
      }

      const recordsRes = await attendanceApi.getRecords({ date, status: statusFilter, search, department: selectedDepartment, shift: selectedShift });
      if (recordsRes.data && recordsRes.data.data) {
        setTableData(recordsRes.data.data);
      } else if (Array.isArray(recordsRes.data)) {
        setTableData(recordsRes.data);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [shiftsRes, lookupsRes] = await Promise.all([
        attendanceApi.getShifts().catch(() => ({ data: { data: [] } })),
        api.get('/employees/lookups').then(res => res.data).catch(() => ({ data: { departments: [] } }))
      ]);
      
      if (shiftsRes.data && shiftsRes.data.data) {
        setShifts(shiftsRes.data.data);
      }
      if (lookupsRes.data && lookupsRes.data.departments) {
        setDepartments(lookupsRes.data.departments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [date, statusFilter, search, selectedDepartment]);

  const presentPct = metrics.totalEmployees ? ((metrics.present / metrics.totalEmployees) * 100).toFixed(1) : 0;
  const absentPct = metrics.totalEmployees ? ((metrics.absent / metrics.totalEmployees) * 100).toFixed(1) : 0;
  const latePct = metrics.totalEmployees ? ((metrics.late / metrics.totalEmployees) * 100).toFixed(1) : 0;
  const leavePct = metrics.totalEmployees ? ((metrics.onLeave / metrics.totalEmployees) * 100).toFixed(1) : 0;

  const issues = [
    { id: 'missing_checkout', title: 'Missing Check-out', desc: 'Employees forgot to check out', count: metrics.missingPunches, action: 'Review', type: 'danger', icon: AlertCircle },
    { id: 'correction', title: 'Attendance Correction Requests', desc: 'Employees requested changes', count: metrics.pendingRequests, action: 'Approve', type: 'primary', icon: CheckSquare },
    { id: 'unapproved_absence', title: 'Unapproved Absence', desc: 'No attendance / leave record', count: metrics.absent, action: 'Review', type: 'orange', icon: Users }
  ];

  const handleIssueClick = (issue) => {
    setSelectedIssue(issue);
    setActiveModal(issue.id);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedIssue(null);
  };

  const handleKpiClick = (status) => {
    setStatusFilter(status);
    const tableEl = document.querySelector('.att-table-panel');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (viewEmployeeId) {
    return (
      <div className="attendance-dashboard">
        <AttendanceEmployeeDashboard 
          employeeId={viewEmployeeId} 
          onBack={() => setViewEmployeeId(null)} 
        />
      </div>
    );
  }

  // If an issue is selected for review, show the full page AttendanceIssuesView
  if (activeModal) {
    return (
      <AttendanceIssuesView 
        activeTab={activeModal} 
        onBack={closeModal} 
      />
    );
  }

  return (
    <div className="attendance-dashboard">
      
      {/* Top Header */}
      <div className="att-header">
        <div>
          <h1 className="att-title">Attendance</h1>
        </div>
        <div className="att-header-actions">
          <div className="att-date-picker">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="att-date-input"
            />
          </div>
          <button className="att-export-btn" onClick={exportToCSV}>
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="att-kpi-row">
        <div className={`att-kpi-card clickable ${statusFilter === 'all' ? 'active-filter' : ''}`} onClick={() => handleKpiClick('all')}>
          <div className="att-kpi-icon bg-pink"><Users size={20} color="#ec4899" /></div>
          <div>
            <div className="att-kpi-label">Total Employees</div>
            <div className="att-kpi-value">{metrics.totalEmployees}</div>
          </div>
        </div>
        <div className={`att-kpi-card clickable ${statusFilter === 'present' ? 'active-filter' : ''}`} onClick={() => handleKpiClick('present')}>
          <div className="att-kpi-icon bg-green"><CheckCircle size={20} color="#10b981" /></div>
          <div>
            <div className="att-kpi-label">Present</div>
            <div className="att-kpi-value">{metrics.present}</div>
            <div className="att-kpi-pct text-green">{presentPct}%</div>
          </div>
        </div>
        <div className={`att-kpi-card clickable ${statusFilter === 'absent' ? 'active-filter' : ''}`} onClick={() => handleKpiClick('absent')}>
          <div className="att-kpi-icon bg-red"><XCircle size={20} color="#ef4444" /></div>
          <div>
            <div className="att-kpi-label">Absent</div>
            <div className="att-kpi-value">{metrics.absent}</div>
            <div className="att-kpi-pct text-red">{absentPct}%</div>
          </div>
        </div>
        <div className={`att-kpi-card clickable ${statusFilter === 'late' ? 'active-filter' : ''}`} onClick={() => handleKpiClick('late')}>
          <div className="att-kpi-icon bg-yellow"><Clock size={20} color="#f59e0b" /></div>
          <div>
            <div className="att-kpi-label">Late</div>
            <div className="att-kpi-value">{metrics.late}</div>
            <div className="att-kpi-pct text-yellow">{latePct}%</div>
          </div>
        </div>
        <div className={`att-kpi-card clickable ${statusFilter === 'leave' ? 'active-filter' : ''}`} onClick={() => handleKpiClick('leave')}>
          <div className="att-kpi-icon bg-purple" style={{ flexShrink: 0 }}><Calendar size={20} color="#8b5cf6" /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="att-kpi-label" style={{ whiteSpace: 'nowrap' }}>On Leave</div>
            <div className="att-kpi-value">{metrics.onLeave}</div>
            <div className="att-kpi-pct text-purple">{leavePct}%</div>
          </div>
        </div>
      </div>

      {/* Middle Panels */}
      <div className="att-middle-row">
        {/* Donut Chart Panel */}
        <div className="att-panel">
          <div className="att-panel-header">
            <h3>Attendance Breakdown</h3>
            <select className="att-dropdown" style={{border: '1px solid #e2e8f0', background: 'transparent'}}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
          <div className="att-chart-container">
            <div className="att-donut-wrapper">
              <svg viewBox="0 0 100 100" className="att-donut">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset={`${251.2 - (251.2 * (leavePct / 100))}`} transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset={`${251.2 - (251.2 * (absentPct / 100))}`} transform={`rotate(${-90 + (360 * (leavePct / 100))} 50 50)`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset={`${251.2 - (251.2 * (latePct / 100))}`} transform={`rotate(${-90 + (360 * ((Number(leavePct) + Number(absentPct)) / 100))} 50 50)`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset={`${251.2 - (251.2 * (presentPct / 100))}`} transform={`rotate(${-90 + (360 * ((Number(leavePct) + Number(absentPct) + Number(latePct)) / 100))} 50 50)`} />
              </svg>
              <div className="att-donut-center">
                <span className="att-donut-val">{presentPct}%</span>
                <span className="att-donut-lbl">Present</span>
              </div>
            </div>
            <div className="att-chart-legend">
              <div className="att-legend-item"><span className="dot dot-green"></span> Present <strong>{metrics.present} ({presentPct}%)</strong></div>
              <div className="att-legend-item"><span className="dot dot-yellow"></span> Late <strong>{metrics.late} ({latePct}%)</strong></div>
              <div className="att-legend-item"><span className="dot dot-red"></span> Absent <strong>{metrics.absent} ({absentPct}%)</strong></div>
              <div className="att-legend-item"><span className="dot dot-purple"></span> On Leave <strong>{metrics.onLeave} ({leavePct}%)</strong></div>
            </div>
          </div>
        </div>

        {/* Attendance Issues Panel */}
        <div className="att-panel">
          <div className="att-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Attendance Issues</h3>
            <button 
              onClick={() => handleIssueClick({ id: 'unapproved_absence' })}
              style={{ color: '#2563eb', background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              View All
            </button>
          </div>
          <div className="att-issues-list">
            {issues.map((issue, idx) => (
              <div className="att-issue-item" key={idx}>
                <div className="att-issue-left">
                  <issue.icon size={18} className={`icon-${issue.type}`} />
                  <div>
                    <h4>{issue.title}</h4>
                    <p>{issue.desc}</p>
                  </div>
                </div>
                <div className="att-issue-right">
                  <span className={`count count-${issue.type}`}>{issue.count}</span>
                  <button className={`btn-${issue.type}`} onClick={() => handleIssueClick(issue)}>
                    {issue.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="att-table-panel">
        <div className="att-table-toolbar">
          <h3>Employee Attendance</h3>
          <div className="att-table-filters">
            <div className="att-search">
              <Search size={16} />
              <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="att-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" /></th>
                <th>Employee</th>
                <th>
                  <select 
                    value={selectedDepartment} 
                    onChange={e => setSelectedDepartment(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontWeight: '600', color: '#64748b', outline: 'none', cursor: 'pointer', padding: 0, width: '110px', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </th>
                <th>
                  <select 
                    value={selectedShift} 
                    onChange={e => setSelectedShift(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontWeight: '600', color: '#64748b', outline: 'none', cursor: 'pointer', padding: 0, width: '75px', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Shift</option>
                    {shifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                  </select>
                </th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>
                  <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontWeight: '600', color: '#64748b', outline: 'none', cursor: 'pointer', padding: 0, width: '85px' }}
                  >
                    <option value="all">Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">On Leave</option>
                  </select>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{textAlign: 'center'}}>Loading data...</td></tr>
              ) : tableData.length === 0 ? (
                <tr><td colSpan="9" style={{textAlign: 'center'}}>No records found.</td></tr>
              ) : (
                tableData.map((row, idx) => {
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#64748b';
                  
                  if (row.status === 'present') { badgeBg = '#d1fae5'; badgeColor = '#10b981'; }
                  else if (row.status === 'late') { badgeBg = '#fef3c7'; badgeColor = '#d97706'; }
                  else if (row.status === 'absent') { badgeBg = '#fee2e2'; badgeColor = '#ef4444'; }
                  else if (row.status === 'not_marked') { badgeBg = '#f1f5f9'; badgeColor = '#64748b'; }
                  else if (row.status === 'leave') { badgeBg = '#ede9fe'; badgeColor = '#8b5cf6'; }

                  // Clean shift name by removing anything in parentheses (e.g. "(9 AM - 6 PM)")
                  const cleanShiftName = row.shift_name ? row.shift_name.replace(/\s*\(.*?\)/, '') : '—';

                  return (
                    <tr key={idx}>
                      <td><input type="checkbox" /></td>
                      <td>
                        <div className="att-emp-cell">
                          <div className="att-avatar bg-gray">
                            {row.first_name ? row.first_name.charAt(0) : 'U'}
                            {row.last_name ? row.last_name.charAt(0) : ''}
                          </div>
                          <div>
                            <div className="att-emp-name">{row.first_name} {row.last_name}</div>
                            <div className="att-emp-email">{row.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td>{row.department_name || '-'}</td>
                      <td>{cleanShiftName}</td>
                      <td>{row.check_in_time && <span className="status-dot bg-green"></span>} {row.check_in_time || '—'}</td>
                      <td>{row.check_out_time || '—'}</td>
                      <td>{row.work_duration_minutes ? `${Math.floor(row.work_duration_minutes/60)}h ${row.work_duration_minutes%60}m` : '—'}</td>
                      <td>
                        <span className="att-badge" style={{ backgroundColor: badgeBg, color: badgeColor }}>
                          {row.status === 'not_marked' ? 'No Record' : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button className="att-action-btn" onClick={() => setViewEmployeeId(row.employee_id)}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceOverview;
