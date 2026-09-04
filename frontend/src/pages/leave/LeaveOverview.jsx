import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';
import { Users, FileText, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

const LeaveOverview = ({ setActiveTab }) => {
  const [metrics, setMetrics] = useState({ 
    onLeaveToday: 0, 
    pendingRequests: 0,
    actionRequired: 0,
    upcomingLeaves: 0,
    needsAttention: [],
    upcomingImpact: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await leaveApi.getDashboardMetrics();
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#6b7280', textAlign: 'center' }}>Loading overview...</div>;

  return (
    <div className="leave-overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        <div 
          onClick={() => setActiveTab('requests')}
          style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '50%' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Pending Approvals</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{metrics.pendingRequests}</div>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('calendar')}
          style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '50%' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>On Leave Today</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{metrics.onLeaveToday}</div>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('requests')}
          style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '12px', borderRadius: '50%' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Action Required</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{metrics.actionRequired}</div>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('calendar')}
          style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ background: '#d1fae5', color: '#059669', padding: '12px', borderRadius: '50%' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Upcoming Leaves</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{metrics.upcomingLeaves}</div>
          </div>
        </div>
        
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Needs Attention Table */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>Needs Attention</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Requests requiring document review or immediate HR action</p>
          </div>
          <table className="leave-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {metrics.needsAttention && metrics.needsAttention.length > 0 ? (
                metrics.needsAttention.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500 }}>{req.first_name} {req.last_name}</td>
                    <td>{req.leave_type_name}</td>
                    <td>{req.start_date.split('T')[0]} to {req.end_date.split('T')[0]}</td>
                    <td><span className={`badge ${req.status}`}>{req.status === 'pending' ? 'Document Review' : req.status}</span></td>
                    <td>
                      <button 
                        onClick={() => setActiveTab('requests')}
                        style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    No critical items need attention right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Leave Impact Table */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>Upcoming Leave Impact</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Staffing impact over the next 7 days</p>
          </div>
          <table className="leave-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employees on Leave</th>
                <th>Most Affected Department</th>
              </tr>
            </thead>
            <tbody>
              {metrics.upcomingImpact && metrics.upcomingImpact.length > 0 ? (
                metrics.upcomingImpact.map((impact, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{new Date(impact.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>{impact.count} {impact.count === 1 ? 'employee' : 'employees'}</td>
                    <td>{impact.mostAffected}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    No leaves approved for the upcoming 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#374151' }}>Important Policies</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Medical leave more than 2 consecutive days requires a medical document.</li>
            <li>Unpaid leave does not deduct accrued leave balance.</li>
            <li>Ensure minimal overlap in leaves for critical departments (e.g., Engineering, Support).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LeaveOverview;
