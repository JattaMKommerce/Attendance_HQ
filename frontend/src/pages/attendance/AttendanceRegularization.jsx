import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/attendanceApi';

const AttendanceRegularization = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getRegularizationRequests({ status: statusFilter !== 'all' ? statusFilter : undefined });
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch regularizations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleAction = async (id, status) => {
    try {
      const res = await attendanceApi.updateRegularizationRequest(id, { status, rejectionReason: status === 'rejected' ? 'Manager Rejected' : null });
      if (res.data.success) {
        alert(`Request ${status} successfully`);
        fetchRequests();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update request');
    }
  };

  return (
    <div className="attendance-regularization">
      <div className="filter-bar">
        <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px' }}>Employee</th>
                <th style={{ padding: '12px 8px' }}>Date</th>
                <th style={{ padding: '12px 8px' }}>Type</th>
                <th style={{ padding: '12px 8px' }}>Reason</th>
                <th style={{ padding: '12px 8px' }}>Requested Times</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <strong>{req.first_name} {req.last_name}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.employee_code} | {req.department_name || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{new Date(req.attendance_date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: '#f3f4f6' }}>
                      {req.request_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{req.reason}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                    <div>In: {req.check_in_time ? new Date(req.check_in_time).toLocaleTimeString() : '-'}</div>
                    <div>Out: {req.check_out_time ? new Date(req.check_out_time).toLocaleTimeString() : '-'}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      background: req.status === 'approved' ? '#d1fae5' : req.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                      color: req.status === 'approved' ? '#065f46' : req.status === 'rejected' ? '#991b1b' : '#92400e'
                    }}>
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAction(req.id, 'approved')} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Approve</button>
                        <button onClick={() => handleAction(req.id, 'rejected')} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Reject</button>
                      </div>
                    )}
                    {req.status !== 'pending' && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        By: {req.approver_first_name} {req.approver_last_name}
                      </span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceRegularization;
