import React, { useState, useEffect, useMemo } from 'react';
import { leaveApi } from '../../services/leaveApi';
import { FileText } from 'lucide-react';

const LeaveRequests = ({ highlightId, employeeSearch }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState(employeeSearch || '');
  const [targetId, setTargetId] = useState(highlightId ? String(highlightId) : null);

  useEffect(() => {
    if (highlightId) {
      setTargetId(String(highlightId));
    }
  }, [highlightId]);

  useEffect(() => {
    if (employeeSearch) {
      setSearch(employeeSearch);
    }
  }, [employeeSearch]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Auto-scroll to highlighted request once data loads
  useEffect(() => {
    if (targetId && requests.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`leave-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [targetId, requests]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const filters = filter === 'all' ? {} : { status: filter };
      const res = await leaveApi.getRequests(filters);
      if (res.data.success) setRequests(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const res = await leaveApi.downloadDocument(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to download document. You might not have permission.');
    }
  };

  const handleReview = async (id, action, isPaid) => {
    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) return;
    
    try {
      const res = await leaveApi.reviewRequest(id, { action, isPaid, comments: 'Reviewed by HR' });
      if (res.data.success) {
        fetchRequests();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to process request');
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (!search) return true;
      const q = search.toLowerCase();
      const fullName = `${req.first_name || ''} ${req.last_name || ''}`.toLowerCase();
      const code = (req.employee_code || '').toLowerCase();
      const reason = (req.reason || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || reason.includes(q);
    });
  }, [requests, search]);

  return (
    <div className="leave-requests">
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value="pending">Pending Requests</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All Requests</option>
        </select>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text"
            placeholder="Filter employee or reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '220px', fontSize: '13px' }}
          />
          {search && (
            <button 
              type="button" 
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading requests...</div>
      ) : (
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Reason</th>
              <th>Doc</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(req => {
                const isTarget = String(req.id) === String(targetId);
                return (
                  <tr 
                    key={req.id} 
                    id={`leave-row-${req.id}`}
                    className={isTarget ? 'leave-row-highlighted' : ''}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{req.first_name} {req.last_name}</span>
                        {isTarget && (
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            color: '#ffffff', 
                            background: '#2563eb', 
                            padding: '2px 7px', 
                            borderRadius: '4px',
                            letterSpacing: '0.02em'
                          }}>
                            Selected for Review
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.employee_code} | {req.department_name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: req.color_code }}></div>
                        {req.leave_type_name}
                      </div>
                    </td>
                    <td>
                      <div>{req.start_date.split('T')[0]} to {req.end_date.split('T')[0]}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.total_days} days</div>
                    </td>
                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.reason}>
                      {req.reason}
                    </td>
                    <td>
                      {req.attachment_url ? (
                        <button onClick={() => handleDownload(req.id, 'medical-proof.pdf')} className="btn-icon" title="View Document">
                          <FileText size={18} color="#4f46e5" />
                        </button>
                      ) : '-'}
                    </td>
                    <td><span className={`badge ${req.status}`}>{req.status}</span></td>
                    <td>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleReview(req.id, 'approved', true)}
                            style={{ padding: '6px 10px', fontSize: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Approve (Paid)
                          </button>
                          <button 
                            onClick={() => handleReview(req.id, 'approved', false)}
                            style={{ padding: '6px 10px', fontSize: '12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Approve (Unpaid)
                          </button>
                          <button 
                            onClick={() => handleReview(req.id, 'rejected', false)}
                            style={{ padding: '6px 10px', fontSize: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {req.approved_as_paid !== null ? (req.approved_as_paid ? 'Paid Leave' : 'Unpaid Leave') : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No requests found.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LeaveRequests;
