import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/attendanceApi';
import * as employeeApi from '../../services/employeeApi';
import { ChevronRight, Calendar, Search, AlertCircle, Clock, CheckSquare } from 'lucide-react';

const AttendanceOverview = ({ setActiveTab }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState('');
  const [search, setSearch] = useState('');
  
  const [metrics, setMetrics] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    missingPunches: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
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

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getOverview({
        date,
        department,
        shift,
        search
      });
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance overview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [date, department, shift]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOverview();
  };

  if (loading) {
    return <div className="loading-state">Loading overview data...</div>;
  }

  return (
    <div className="attendance-overview" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 12px' }}>
            <Calendar size={16} color="#6b7280" />
            <input 
              type="date" 
              style={{ border: 'none', background: 'transparent', padding: '8px', outline: 'none', fontSize: '14px', color: '#374151' }}
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <select 
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', background: '#f9fafb', outline: 'none', color: '#374151' }}
            value={department} 
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select 
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', background: '#f9fafb', outline: 'none', color: '#374151' }}
            value={shift} 
            onChange={(e) => setShift(e.target.value)}
          >
            <option value="">All Shifts</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0 12px', width: '250px' }}>
          <Search size={16} color="#6b7280" />
          <input 
            type="text" 
            style={{ border: 'none', background: 'transparent', padding: '8px', outline: 'none', fontSize: '14px', width: '100%', color: '#374151' }}
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchOverview()}
            placeholder="Search Name or ID..."
          />
        </div>
      </div>

      {/* Attention Required Cards */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#374151', fontWeight: 600 }}>Action Required</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div 
            onClick={() => setActiveTab('records')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
                <AlertCircle size={20} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Missing Punches</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.missingPunches}</div>
              </div>
            </div>
            <ChevronRight size={20} color="#d1d5db" />
          </div>

          <div 
            onClick={() => setActiveTab('records')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
                <Clock size={20} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Late Arrivals</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.late}</div>
              </div>
            </div>
            <ChevronRight size={20} color="#d1d5db" />
          </div>

          <div 
            onClick={() => setActiveTab('regularization')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
                <CheckSquare size={20} color="#2563eb" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Pending Requests</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.pendingRequests}</div>
              </div>
            </div>
            <ChevronRight size={20} color="#d1d5db" />
          </div>
        </div>
      </div>

      {/* Unified Metrics Strip */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#374151', fontWeight: 600 }}>Daily Overview</h3>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div onClick={() => setActiveTab('records')} style={{ flex: 1, padding: '20px', cursor: 'pointer', '&:hover': { background: '#f9fafb' } }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>Total Employees</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.total}</div>
          </div>
          <div style={{ width: '1px', background: '#e5e7eb' }}></div>
          
          <div onClick={() => setActiveTab('records')} style={{ flex: 1, padding: '20px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>Present</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.present}</div>
          </div>
          <div style={{ width: '1px', background: '#e5e7eb' }}></div>
          
          <div onClick={() => setActiveTab('records')} style={{ flex: 1, padding: '20px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>Absent</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.absent}</div>
          </div>
          <div style={{ width: '1px', background: '#e5e7eb' }}></div>
          
          <div onClick={() => setActiveTab('records')} style={{ flex: 1, padding: '20px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>On Leave</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', lineHeight: '1' }}>{metrics.onLeave}</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AttendanceOverview;
