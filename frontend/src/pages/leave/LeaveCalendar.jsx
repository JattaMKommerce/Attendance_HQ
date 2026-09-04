import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';

const LeaveCalendar = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // We'll show a simple 2-week view for now
  const [startDate, setStartDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchCalendar();
  }, [startDate]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 14);
      const sDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const eDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      
      const res = await leaveApi.getCalendarLeaves(sDate, eDate);
      if (res.data.success) {
        setLeaves(res.data.data);
      }

      // Fetch active holidays
      const holRes = await leaveApi.getHolidays({ year: startDate.getFullYear() });
      if (holRes.data.success) {
        setHolidays(holRes.data.data.filter(h => h.is_active));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysArray = () => {
    const arr = [];
    const dt = new Date(startDate);
    for (let i = 0; i < 14; i++) {
      arr.push(new Date(dt));
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };

  const days = getDaysArray();

  const handlePrev = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNext = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const isLeaveOnDate = (leave, dateStr) => {
    const s = leave.start_date.split('T')[0];
    const e = leave.end_date.split('T')[0];
    return dateStr >= s && dateStr <= e;
  };

  return (
    <div className="leave-calendar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Capacity Planner</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePrev} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>&lt; Prev</button>
          <button onClick={handleNext} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>Next &gt;</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading calendar...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <table className="leave-table" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '150px', background: '#f9fafb', position: 'sticky', left: 0, zIndex: 1, borderRight: '1px solid #e5e7eb' }}>Employee</th>
                {days.map((d, i) => {
                  const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const holiday = holidays.find(h => h.holiday_date.startsWith(dStr));
                  return (
                    <th key={i} style={{ width: '70px', textAlign: 'center', fontSize: '12px', background: holiday ? '#fef2f2' : 'transparent' }}>
                      <div style={{ color: '#6b7280', fontWeight: 400 }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div>{d.getDate()}</div>
                      {holiday && (
                        <div style={{ fontSize: '10px', color: '#dc2626', background: '#fee2e2', borderRadius: '4px', padding: '2px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={holiday.name}>
                          {holiday.name}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {leaves.length > 0 ? leaves.map(leave => (
                <tr key={leave.id}>
                  <td style={{ position: 'sticky', left: 0, background: '#fff', borderRight: '1px solid #e5e7eb', zIndex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{leave.first_name} {leave.last_name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{leave.department_name}</div>
                  </td>
                  {days.map((d, i) => {
                    const dStr = d.toISOString().split('T')[0];
                    const active = isLeaveOnDate(leave, dStr);
                    return (
                      <td key={i} style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid #f3f4f6' }}>
                        {active && (
                          <div style={{ 
                            height: '24px', 
                            background: leave.color_code, 
                            opacity: 0.8,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    No approved leaves in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendar;
