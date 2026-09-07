import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight, Clock, Umbrella, FileText, Mail, CheckSquare } from 'lucide-react';
import { attendanceApi } from '../../services/attendanceApi';
import { getEmployeeById } from '../../services/employeeApi';
import api from '../../services/api';
import EmployeeIdCard from '../../components/EmployeeIdCard';

const AttendanceEmployeeDashboard = ({ employeeId, onBack }) => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [idCardUrl, setIdCardUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markData, setMarkData] = useState({ date: today.toISOString().split('T')[0], status: 'present', checkInTime: '09:00', checkOutTime: '18:00' });
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeDetails();
    }
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(employeeId);
      if (res.success) {
        setEmployee(res.data);
        fetchIdCard(res.data.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIdCard = (empId) => {
    api.get(`/employees/${empId}/id-card`, { responseType: 'blob' })
      .then(res => {
        if (res.data.size < 500 || (res.data.type && res.data.type.includes('json'))) {
          setIdCardUrl('error');
        } else {
          const url = URL.createObjectURL(res.data);
          setIdCardUrl(url);
        }
      })
      .catch(err => {
        setIdCardUrl('error');
      });
  };

  useEffect(() => {
    if (employee?.id) {
      fetchHistory();
    }
  }, [employee?.id, currentMonth, currentYear]);

  const fetchHistory = () => {
    setLoadingHistory(true);
    const monthStr = (currentMonth + 1).toString().padStart(2, '0');
    attendanceApi.getEmployeeHistory(employee.id, { year: currentYear.toString(), month: monthStr })
      .then(res => {
        if (res.data?.success) {
          setHistoryData(res.data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingHistory(false));
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleMarkAttendance = () => {
    setShowMarkModal(true);
  };

  const submitMarkAttendance = async () => {
    if (!employee) return;
    try {
      setLoadingHistory(true);
      setShowMarkModal(false);
      let duration = 0;
      if ((markData.status === 'present' || markData.status === 'late' || markData.status === 'half_day') && markData.checkInTime && markData.checkOutTime) {
         const [inH, inM] = markData.checkInTime.split(':').map(Number);
         const [outH, outM] = markData.checkOutTime.split(':').map(Number);
         duration = (outH * 60 + outM) - (inH * 60 + inM);
      }
      
      await attendanceApi.addManualRecord({
        employeeId: employee.id,
        date: markData.date,
        status: markData.status,
        checkInTime: (markData.status === 'present' || markData.status === 'late' || markData.status === 'half_day') ? `${markData.date} ${markData.checkInTime}:00` : null,
        checkOutTime: (markData.status === 'present' || markData.status === 'late' || markData.status === 'half_day') ? `${markData.date} ${markData.checkOutTime}:00` : null,
        workDurationMinutes: duration > 0 ? duration : 0
      });
      fetchHistory();
    } catch (err) {
      console.error('Failed to mark attendance', err);
      setLoadingHistory(false);
    }
  };

  const handleApplyLeave = () => {
    setMarkData({ date: today.toISOString().split('T')[0], status: 'leave', checkInTime: '09:00', checkOutTime: '18:00' });
    setShowMarkModal(true);
  };

  // Process History Data for Calendar and Stats
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  
  let stats = { present: 0, absent: 0, halfDay: 0, wfh: 0, leave: 0, holiday: 0 };
  const logsList = [];
  
  const calendarDays = [];
  // Empty slots before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ empty: true, key: `empty-${i}` });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dDate = new Date(currentYear, currentMonth, i);
    const dateStr = `${currentYear}-${(currentMonth+1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    const record = historyData.find(r => {
      if (!r.date) return false;
      const dbDate = new Date(r.date);
      return dbDate.getFullYear() === currentYear && dbDate.getMonth() === currentMonth && dbDate.getDate() === i;
    });
    
    let status = record ? record.status : null;
    let isToday = dDate.toDateString() === today.toDateString();
    
    // Increment stats only if a record explicitly exists
    if (status === 'present') stats.present++;
    else if (status === 'late') { stats.present++; /* count late as present for total */ }
    else if (status === 'absent') stats.absent++;
    else if (status === 'leave') stats.leave++;
    else if (status === 'half_day') stats.halfDay++;
    else if (status === 'wfh') stats.wfh++;
    else if (status === 'holiday') stats.holiday++;

    if (record) {
       logsList.push({ ...record, dateObj: dDate, computedStatus: status });
    }

    calendarDays.push({
      date: i,
      status: status,
      isToday,
      key: `day-${i}`
    });
  }

  const attendanceRate = daysInMonth > 0 ? ((stats.present / (daysInMonth - stats.holiday)) * 100).toFixed(1) : 0;
  // Make sure it doesn't exceed 100 or drop below 0 in weird edge cases
  const displayRate = isNaN(attendanceRate) || attendanceRate < 0 ? 0 : Math.min(attendanceRate, 100);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const joinDate = employee?.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const isFutureMonth = new Date(currentYear, currentMonth, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const handleViewPayslip = () => {
    if (isFutureMonth) {
      alert("No payslip available for future months.");
      return;
    }
    setShowPayslipModal(true);
  };

  if (loading || !employee) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="overview-grid" style={{ marginTop: '-12px' }}>
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
         <button className="btn btn-secondary" onClick={onBack} style={{ padding: '4px 8px', fontSize: '12px' }}><ChevronLeft size={14} /> Back</button>
         <h2 style={{ margin: 0, fontSize: '18px' }}>{employee.first_name} {employee.last_name}'s Attendance</h2>
      </div>

      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="profile-widget" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="widget-header" style={{ padding: '12px 16px 0', marginBottom: 0 }}>
            <h3 className="widget-title" style={{ fontSize: '14px', margin: 0 }}>Employee ID Card</h3>
          </div>
          <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center' }}>
            <EmployeeIdCard employee={employee} />
          </div>
        </div>

        <div className="profile-widget">
          <div className="widget-header"><h3 className="widget-title">Work Schedule</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Office (Mon - Fri)</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>09:00 AM - 06:00 PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="profile-widget" style={{ flex: 1 }}>
          <div className="widget-header" style={{ marginBottom: '20px' }}>
            <h3 className="widget-title">Attendance Calendar</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="icon-btn" style={{ border: '1px solid #e2e8f0' }} onClick={prevMonth}><ChevronLeft size={16} /></button>
              <div style={{ padding: '4px 16px', fontWeight: 600 }}>{monthNames[currentMonth]} {currentYear}</div>
              <button className="icon-btn" style={{ border: '1px solid #e2e8f0' }} onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={goToToday}>Today</button>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 500, marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-present"></span> Present</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-absent"></span> Absent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-half-day"></span> Half Day</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-wfh"></span> Work From Home</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-leave"></span> Leave</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="calendar-dot dot-holiday"></span> Holiday</div>
          </div>

          <div className="calendar-widget">
            <div className="calendar-header-row">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div className="calendar-days-grid">
              {calendarDays.map((day) => (
                <div key={day.key} className={`calendar-day ${day.empty ? 'empty' : ''} ${day.isToday ? 'today' : ''}`}>
                  {!day.empty && day.date}
                  {!day.empty && day.status && (
                    <div className={`calendar-dot dot-${day.status.replace('_', '-')}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="profile-widget">
          <div className="widget-header">
            <h3 className="widget-title">Attendance Summary ({monthNames[currentMonth].slice(0, 3)} {currentYear})</h3>
            <select className="input-control" style={{ width: 'auto', padding: '4px 24px 4px 12px', fontSize: '12px', minHeight: 'unset', height: '28px', borderRadius: '6px' }}>
              <option>This Month</option>
              <option>Previous Month</option>
              <option>This Week</option>
              <option>Today</option>
            </select>
          </div>
          
          <div className="att-summary-grid">
            <div className="att-stat-box present">
              <div className="att-stat-val">{stats.present}</div>
              <div className="att-stat-label">Present</div>
            </div>
            <div className="att-stat-box absent">
              <div className="att-stat-val">{stats.absent}</div>
              <div className="att-stat-label">Absent</div>
            </div>
            <div className="att-stat-box half-day">
              <div className="att-stat-val">{stats.halfDay}</div>
              <div className="att-stat-label">Half Day</div>
            </div>
            <div className="att-stat-box wfh">
              <div className="att-stat-val">{stats.wfh}</div>
              <div className="att-stat-label">Work from Home</div>
            </div>
            <div className="att-stat-box leave">
              <div className="att-stat-val">{stats.leave}</div>
              <div className="att-stat-label">On Leave</div>
            </div>
            <div className="att-stat-box holiday">
              <div className="att-stat-val">{stats.holiday}</div>
              <div className="att-stat-label">Holidays</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Total Working Days</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{daysInMonth - stats.holiday}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Attendance Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{displayRate}%</div>
            </div>
          </div>
        </div>

        <div className="profile-widget">
          <div className="widget-header">
            <h3 className="widget-title">Recent Attendance Logs</h3>
          </div>
          {logsList.length > 0 ? (
            <table className="recent-logs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logsList.reverse().slice(0, 5).map(log => (
                  <tr key={log.id}>
                    <td>{log.dateObj.getDate()} {monthNames[log.dateObj.getMonth()].slice(0, 3)} {log.dateObj.getFullYear()}</td>
                    <td>{log.dateObj.toLocaleString('default', { weekday: 'short' })}</td>
                    <td>{log.check_in_time || '—'}</td>
                    <td>{log.check_out_time || '—'}</td>
                    <td>{log.work_duration_minutes ? `${Math.floor(log.work_duration_minutes/60)}h ${log.work_duration_minutes%60}m` : '—'}</td>
                    <td>
                      <span className={`status-pill active`} style={{ background: log.computedStatus === 'present' ? '#d1fae5' : log.computedStatus === 'late' ? '#fef3c7' : '#fee2e2', color: log.computedStatus === 'present' ? '#10b981' : log.computedStatus === 'late' ? '#d97706' : '#ef4444' }}>
                        {log.computedStatus ? log.computedStatus.charAt(0).toUpperCase() + log.computedStatus.slice(1) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recent logs found.</div>
          )}
        </div>

        <div className="profile-widget">
          <div className="widget-header">
            <h3 className="widget-title">Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
             <button className="quick-action-btn" onClick={handleMarkAttendance}><CheckSquare size={20} /> Mark Attendance</button>
             <button className="quick-action-btn" onClick={handleApplyLeave}><Umbrella size={20} /> Apply Leave</button>
             <button className="quick-action-btn" onClick={handleViewPayslip}><FileText size={20} /> View Payslips</button>
             <button className="quick-action-btn"><Mail size={20} /> Send Email</button>
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <div className="modal-overlay" onClick={() => setShowMarkModal(false)} style={{ zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Mark/Edit Attendance</h2>
              <button className="icon-btn" onClick={() => setShowMarkModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Date</label>
                <input type="date" className="input-control" value={markData.date} onChange={e => setMarkData({...markData, date: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input-control" value={markData.status} onChange={e => setMarkData({...markData, status: e.target.value})}>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="late">Late</option>
                  <option value="leave">On Leave</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              {(markData.status === 'present' || markData.status === 'half_day' || markData.status === 'late') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Check In</label>
                    <input type="time" className="input-control" value={markData.checkInTime} onChange={e => setMarkData({...markData, checkInTime: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Check Out</label>
                    <input type="time" className="input-control" value={markData.checkOutTime} onChange={e => setMarkData({...markData, checkOutTime: e.target.value})} />
                  </div>
                </div>
              )}
              <div className="modal-actions-row" style={{ marginTop: '24px' }}>
                <button className="btn btn-secondary" onClick={() => setShowMarkModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitMarkAttendance}>Save Record</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && (
        <div className="modal-overlay" onClick={() => setShowPayslipModal(false)} style={{ zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '0' }}>
            <div className="modal-header" style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>Payslip - {monthNames[currentMonth]} {currentYear}</h2>
                <div style={{ color: '#64748b', fontSize: '13px' }}>{employee?.first_name} {employee?.last_name} | {employee?.designation_name}</div>
              </div>
              <button className="icon-btn" onClick={() => setShowPayslipModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                     <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Total Working Days</div>
                     <div style={{ fontWeight: 600 }}>{daysInMonth} days</div>
                  </div>
                  <div>
                     <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>LWP (Leave Without Pay)</div>
                     <div style={{ fontWeight: 600 }}>{stats.absent} days</div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                   {/* Earnings Placeholder */}
                   <div>
                     <h4 style={{ margin: '0 0 12px', fontSize: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Earnings</h4>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: '#475569' }}>Basic Salary</span>
                        <span style={{ fontWeight: 500 }}>₹45,000</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: '#475569' }}>HRA</span>
                        <span style={{ fontWeight: 500 }}>₹15,000</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: '#475569' }}>Special Allowance</span>
                        <span style={{ fontWeight: 500 }}>₹10,000</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontWeight: 600 }}>
                        <span>Total Earnings</span>
                        <span style={{ color: '#10b981' }}>₹70,000</span>
                     </div>
                   </div>

                   {/* Deductions Placeholder */}
                   <div>
                     <h4 style={{ margin: '0 0 12px', fontSize: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Deductions</h4>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: '#475569' }}>PF</span>
                        <span style={{ fontWeight: 500 }}>₹1,800</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: '#475569' }}>Professional Tax</span>
                        <span style={{ fontWeight: 500 }}>₹200</span>
                     </div>
                     {stats.absent > 0 && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                          <span style={{ color: '#ef4444' }}>Unpaid Leave ({stats.absent}d)</span>
                          <span style={{ fontWeight: 500, color: '#ef4444' }}>₹{(stats.absent * 2333).toFixed(0)}</span>
                       </div>
                     )}
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontWeight: 600 }}>
                        <span>Total Deductions</span>
                        <span style={{ color: '#ef4444' }}>₹{2000 + (stats.absent * 2333)}</span>
                     </div>
                   </div>
                </div>

                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '16px', fontWeight: 600 }}>Net Payable</span>
                   <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>₹{(70000 - 2000 - (stats.absent * 2333)).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setShowPayslipModal(false)}>Close</button>
                <button className="btn btn-primary"><Download size={16} /> Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceEmployeeDashboard;
