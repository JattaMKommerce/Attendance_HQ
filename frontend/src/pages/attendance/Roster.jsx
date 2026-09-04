import React, { useState, useEffect } from 'react';
import { rosterApi } from '../../services/rosterApi';
import { attendanceApi } from '../../services/attendanceApi';
import * as employeeApi from '../../services/employeeApi';

const Roster = () => {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Lookups
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  // Filters
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('week'); // 'day', 'week', 'month'
  const [baseDate, setBaseDate] = useState(new Date());
  
  const [page, setPage] = useState(1);
  const limit = 50;

  // Calculate Date Range
  const getDateRange = () => {
    const start = new Date(baseDate);
    const end = new Date(baseDate);
    
    if (view === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start.setDate(diff);
      end.setDate(diff + 6);
    } else if (view === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }
    return { 
      startDate: start.toISOString().split('T')[0], 
      endDate: end.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateRange();

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

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await rosterApi.getRoster({
        startDate,
        endDate,
        departmentId,
        search,
        limit,
        offset: (page - 1) * limit
      });
      if (res.data.success) {
        setEmployees(res.data.data);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch roster', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [baseDate, view, page, departmentId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRoster();
  };

  const shiftAbbr = (shiftId, isWo) => {
    if (isWo) return 'WO';
    const s = shifts.find(x => x.id === shiftId);
    if (!s) return '-';
    // Simplified abbreviation (first char)
    return s.name.charAt(0).toUpperCase();
  };

  // Generate headers for grid
  const getDatesArray = () => {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };
  const datesArray = getDatesArray();

  // Modals state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  return (
    <div className="attendance-roster">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <form className="filter-bar" style={{ margin: 0 }} onSubmit={handleSearch}>
          <input 
            type="text" 
            className="form-input" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search Employee..."
          />
          <select 
            className="form-input" 
            value={departmentId} 
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="form-input" value={view} onChange={(e) => setView(e.target.value)}>
            <option value="day">Day View</option>
            <option value="week">Week View</option>
            <option value="month">Month View</option>
          </select>
          <input 
            type="date" 
            className="form-input" 
            value={baseDate.toISOString().split('T')[0]} 
            onChange={(e) => setBaseDate(new Date(e.target.value))} 
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Filter</button>
        </form>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowBulkAssign(true)} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Bulk Assign</button>
          <button onClick={() => setShowPublish(true)} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Publish Roster</button>
        </div>
      </div>

      {loading ? (
        <p>Loading roster...</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#f9fafb', zIndex: 1, borderRight: '1px solid #e5e7eb' }}>Employee</th>
                {datesArray.map(d => (
                  <th key={d.toISOString()} style={{ padding: '12px 8px', textAlign: 'center', minWidth: '40px', fontSize: '13px' }}>
                    <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div>{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                // Group employees by department
                Object.entries(
                  employees.reduce((acc, emp) => {
                    const dept = emp.department_name || 'Unassigned';
                    if (!acc[dept]) acc[dept] = [];
                    acc[dept].push(emp);
                    return acc;
                  }, {})
                ).map(([deptName, deptEmployees]) => (
                  <React.Fragment key={deptName}>
                    {/* Department Header Row */}
                    <tr style={{ background: '#f3f4f6' }}>
                      <td colSpan={datesArray.length + 1} style={{ padding: '8px 16px', fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                        {deptName}
                      </td>
                    </tr>
                    {/* Employee Rows */}
                    {deptEmployees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#fff', zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                          <strong>{emp.first_name} {emp.last_name}</strong>
                        </td>
                        {datesArray.map(d => {
                          const dateStr = d.toISOString().split('T')[0];
                          const roster = emp.roster.find(r => r.roster_date.split('T')[0] === dateStr);
                          const isPublished = roster?.status === 'published';
                          return (
                            <td key={dateStr} style={{ padding: '8px', textAlign: 'center', background: isPublished ? '#f0fdf4' : (roster ? '#eff6ff' : '#fff') }}>
                              <div title={roster ? (roster.is_week_off ? 'Week Off' : roster.shift_name) : 'Not assigned'} style={{
                                display: 'inline-block',
                                width: '32px',
                                height: '32px',
                                lineHeight: '32px',
                                borderRadius: '4px',
                                background: roster ? (roster.is_week_off ? '#f3f4f6' : '#dbeafe') : 'transparent',
                                color: roster ? (roster.is_week_off ? '#6b7280' : '#1e40af') : '#d1d5db',
                                fontWeight: roster ? 'bold' : 'normal',
                                fontSize: '14px',
                                cursor: 'pointer'
                              }}>
                                {roster ? shiftAbbr(roster.shift_id, roster.is_week_off) : '-'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={datesArray.length + 1} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {employees.length} of {total}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn">Previous</button>
              <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="btn">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Basic legend */}
      <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#eff6ff', border: '1px solid #dbeafe' }}></div> Draft
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f0fdf4', border: '1px solid #dcfce3' }}></div> Published
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>WO:</strong> Week Off
        </div>
      </div>

      {showBulkAssign && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Bulk Assign Shift</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              const payload = {
                employeeIds: employees.map(emp => emp.id), // Simplified for now: applies to all visible filtered employees
                startDate: form.startDate.value,
                endDate: form.endDate.value,
                isWeekOff: form.shift.value === 'WO',
                shiftId: form.shift.value !== 'WO' ? form.shift.value : null
              };
              try {
                await rosterApi.bulkAssign(payload);
                alert('Bulk assigned successfully');
                setShowBulkAssign(false);
                fetchRoster();
              } catch (err) {
                alert('Failed to bulk assign');
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>This will apply the selected shift to all <strong>{employees.length}</strong> currently filtered employees.</p>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Start Date</label>
                  <input required name="startDate" type="date" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue={startDate} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>End Date</label>
                  <input required name="endDate" type="date" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue={endDate} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Shift</label>
                <select required name="shift" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Select Shift...</option>
                  <option value="WO">Week Off (WO)</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowBulkAssign(false)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPublish && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Publish Roster</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                employeeIds: employees.map(emp => emp.id),
                startDate,
                endDate
              };
              try {
                await rosterApi.publishRoster(payload);
                alert('Published successfully');
                setShowPublish(false);
                fetchRoster();
              } catch (err) {
                alert('Failed to publish');
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>This will publish all draft shifts for the <strong>{employees.length}</strong> currently filtered employees from <strong>{startDate}</strong> to <strong>{endDate}</strong>.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPublish(false)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Roster;
