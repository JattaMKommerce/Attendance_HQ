import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Umbrella, 
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyLeave = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('balance');
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceRes, requestsRes] = await Promise.all([
        employeePortalApi.getMyLeaveBalance(),
        employeePortalApi.getMyLeaves()
      ]);

      if (balanceRes.data?.success) {
        setLeaveBalance(balanceRes.data.data || []);
      }
      if (requestsRes.data?.success) {
        setLeaveRequests(requestsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Unable to load leave details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return;

    try {
      setError(null);
      const res = await employeePortalApi.cancelLeave(id);
      if (res.data?.success) {
        setSuccessMsg('Leave request cancelled successfully');
        await fetchLeaveData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to cancel leave:', err);
      setError(err.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            My Leave
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Manage your annual leave entitlements and requests
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchLeaveData}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => navigate('/app/employee/leave/apply')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <Plus size={16} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto'
      }}>
        <TabButton 
          active={activeTab === 'balance'} 
          onClick={() => setActiveTab('balance')}
          icon={TrendingUp}
        >
          Entitlements & Balance
        </TabButton>
        <TabButton 
          active={activeTab === 'requests'} 
          onClick={() => setActiveTab('requests')}
          icon={FileText}
        >
          My Requests ({leaveRequests.length})
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'balance' && (
        <BalanceTab balance={leaveBalance} loading={loading} />
      )}

      {activeTab === 'requests' && (
        <RequestsTab 
          requests={leaveRequests} 
          loading={loading} 
          onCancel={handleCancelRequest}
        />
      )}
    </div>
  );
};

// Balance Tab
const BalanceTab = ({ balance, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        Loading leave balances...
      </div>
    );
  }

  const totalAvailable = balance.reduce((sum, item) => sum + (parseFloat(item.available_days) || 0), 0);
  const totalUsed = balance.reduce((sum, item) => sum + (parseFloat(item.used_days) || 0), 0);
  const totalAllocation = balance.reduce((sum, item) => sum + (parseFloat(item.total_days) || 0), 0);

  return (
    <div>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <SummaryCard 
          icon={Umbrella}
          label="Total Available"
          value={`${totalAvailable} Days`}
          subtitle={`Out of ${totalAllocation} allotted`}
          color="#2563eb"
        />
        <SummaryCard 
          icon={CheckCircle}
          label="Used This Year"
          value={`${totalUsed} Days`}
          subtitle="Taken & approved"
          color="#16a34a"
        />
        <SummaryCard 
          icon={Calendar}
          label="Annual Quota"
          value={`${totalAllocation} Days`}
          subtitle="Full year allocation"
          color="#7c3aed"
        />
      </div>

      {/* Breakdown per Leave Type */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
          Leave Type Entitlements
        </h3>

        {balance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
            No leave policies configured for your grade.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {balance.map((item) => {
              const avail = parseFloat(item.available_days) || 0;
              const used = parseFloat(item.used_days) || 0;
              const total = parseFloat(item.total_days) || 1;
              const percent = Math.min(100, Math.round((avail / total) * 100));

              return (
                <div key={item.leave_type_id || item.code} style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                        {item.name} ({item.code})
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Used: {used} day(s) • Total: {total} day(s)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#2563eb'
                      }}>
                        {avail}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>days left</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '7px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: percent > 20 ? '#2563eb' : '#ef4444',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Requests Tab
const RequestsTab = ({ requests, loading, onCancel }) => {
  const [filter, setFilter] = useState('all');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        Loading requests...
      </div>
    );
  }

  const filtered = filter === 'all' 
    ? requests 
    : requests.filter((r) => r.status === filter);

  return (
    <div>
      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: filter === st ? '#2563eb' : '#cbd5e1',
              backgroundColor: filter === st ? '#eff6ff' : '#ffffff',
              color: filter === st ? '#2563eb' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
              cursor: 'pointer'
            }}
          >
            {st} ({st === 'all' ? requests.length : requests.filter(r => r.status === st).length})
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <Umbrella size={40} color="#94a3b8" style={{ marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b' }}>No Leave Requests Found</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {filter === 'all' ? "You haven't submitted any leave requests." : `No ${filter} requests found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((req) => (
            <RequestCard key={req.id} request={req} onCancel={onCancel} />
          ))}
        </div>
      )}
    </div>
  );
};

const RequestCard = ({ request, onCancel }) => {
  const getBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved') return { bg: '#dcfce7', color: '#16a34a', icon: CheckCircle, label: 'Approved' };
    if (s === 'rejected') return { bg: '#fee2e2', color: '#dc2626', icon: XCircle, label: 'Rejected' };
    if (s === 'cancelled') return { bg: '#f1f5f9', color: '#64748b', icon: AlertCircle, label: 'Cancelled' };
    return { bg: '#fef3c7', color: '#d97706', icon: Clock, label: 'Pending Approval' };
  };

  const badge = getBadge(request.status);
  const Icon = badge.icon;

  const formatDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
            {request.leave_type_name || request.leaveType || 'Leave'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Submitted on {formatDate(request.created_at)}
          </div>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          backgroundColor: badge.bg,
          color: badge.color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Icon size={12} />
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#334155', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#64748b' }}>From: </span>
          <strong>{formatDate(request.start_date || request.startDate)}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>To: </span>
          <strong>{formatDate(request.end_date || request.endDate)}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Duration: </span>
          <strong>{request.total_days || request.duration || 1} day(s)</strong>
        </div>
      </div>

      {request.reason && (
        <div style={{ fontSize: '13px', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
          <strong>Reason:</strong> {request.reason}
        </div>
      )}

      {/* Reviewer Note */}
      {request.review_notes && (
        <div style={{ fontSize: '12px', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
          <strong>Approver Note:</strong> {request.review_notes}
        </div>
      )}

      {/* Actions */}
      {request.status === 'pending' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <button
            onClick={() => onCancel(request.id)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Trash2 size={13} />
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, subtitle, color }) => (
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
      <Icon size={18} color={color} />
      <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
    </div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{value}</div>
    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</div>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 16px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: active ? 600 : 500,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.15s'
    }}
  >
    <Icon size={16} />
    {children}
  </button>
);

export default MyLeave;
