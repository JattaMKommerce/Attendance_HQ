import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/attendanceApi';
import * as employeeApi from '../../services/employeeApi';

const AttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [deptRes, shiftRes] = await Promise.all([
          employeeApi.getLookups(),
          attendanceApi.getShifts()
        ]);
        if (deptRes.success) setDepartments(deptRes.data.departments || []);
        if (shiftRes.data.success) setShifts(shiftRes.data.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLookups();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const filters = {
        date,
        search,
        departmentId: department,
        shiftId: shift,
        status,
        limit,
        offset: (page - 1) * limit
      };
      
      const res = await attendanceApi.getRecords(filters);
      if (res.data.success) {
        setRecords(res.data.data);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleReset = () => {
    setDate('');
    setSearch('');
    setDepartment('');
    setShift('');
    setStatus('');
    setPage(1);
    setTimeout(fetchRecords, 0);
  };

  return (
    <div className="attendance-records">
      <div className="section-header">
        <h2>Attendance Records</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>
          This section provides a detailed daily log of all employee check-ins, check-outs, and total hours worked. Use this to audit daily attendance, verify late arrivals, and review detailed timelines for payroll or compliance.
        </p>
      </div>

      <form className="filter-bar" onSubmit={handleSearch}>
        <input 
          type="text" 
          className="form-input" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search Employee..."
        />
        <select 
          className="form-input" 
          value={department} 
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select 
          className="form-input" 
          value={shift} 
          onChange={(e) => setShift(e.target.value)}
        >
          <option value="">All Shifts</option>
          {shifts.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select 
          className="form-input" 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="half_day">Half Day</option>
          <option value="leave">On Leave</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Search</button>
        <button type="button" onClick={handleReset} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clear Filters</button>
      </form>

      {loading ? (
        <p>Loading records...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px' }}>Employee</th>
                <th style={{ padding: '12px 8px' }}>Department</th>
                <th style={{ padding: '12px 8px' }}>Shift</th>
                <th style={{ padding: '12px 8px' }}>In</th>
                <th style={{ padding: '12px 8px' }}>Out</th>
                <th style={{ padding: '12px 8px' }}>Hours</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <strong>{record.first_name} {record.last_name}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{record.employee_code}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{record.department_name || 'N/A'}</td>
                  <td style={{ padding: '12px 8px' }}>{record.shift_name || 'N/A'}</td>
                  <td style={{ padding: '12px 8px' }}>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}</td>
                  <td style={{ padding: '12px 8px' }}>{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}</td>
                  <td style={{ padding: '12px 8px' }}>
                    {record.work_duration_minutes > 0 ? (record.work_duration_minutes / 60).toFixed(1) + 'h' : '-'}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      background: record.status === 'present' ? '#d1fae5' : record.status === 'absent' ? '#fee2e2' : '#fef3c7',
                      color: record.status === 'present' ? '#065f46' : record.status === 'absent' ? '#991b1b' : '#92400e'
                    }}>
                      {record.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button style={{ padding: '4px 8px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {records.length} of {total}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button 
                disabled={page * limit >= total} 
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', cursor: page * limit >= total ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecords;
