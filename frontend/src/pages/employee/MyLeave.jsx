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
  X
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';
import { leaveApi } from '../../services/leaveApi';

const MyLeave = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('balance');
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState({
    balance: null,
    requests: [],
    types: []
  });

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      
      // In production:
      // const [balance, requests, types] = await Promise.all([
      //   employeePortalApi.getMyLeaveBalance(),
      //   employeePortalApi.getMyLeaves(),
      //   leaveApi.getLeaveTypes()
      // ]);
      
      // Mock data
      const mockData = {
        balance: [
          { type: 'Casual Leave', code: 'CL', available: 8, total: 12, used: 4 },
          { type: 'Sick Leave', code: 'SL', available: 5, total: 10, used: 5 },
          { type: 'Earned Leave', code: 'EL', available: 15, total: 15, used: 0 },
          { type: 'Comp Off', code: 'CO', available: 2, total: 2, used: 0 }
        ],
        requests: generateMockRequests(),
        types: [
          { id: 1, name: 'Casual Leave', code: 'CL', requires_document: false },
          { id: 2, name: 'Sick Leave', code: 'SL', requires_document: true },
          { id: 3, name: 'Earned Leave', code: 'EL', requires_document: false },
          { id: 4, name: 'Comp Off', code: 'CO', requires_document: false }
        ]
      };
      
      setLeaveData(mockData);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leave</h1>
          <p className="page-description">Manage your leave balance and requests</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/app/employee/leave/apply')}
          >
            <Plus size={16} />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <TabButton 
          active={activeTab === 'balance'} 
          onClick={() => setActiveTab('balance')}
          icon={TrendingUp}
        >
          Balance
        </TabButton>
        <TabButton 
          active={activeTab === 'requests'} 
          onClick={() => setActiveTab('requests')}
          icon={FileText}
        >
          My Requests
        </TabButton>
        <TabButton 
          active={activeTab === 'calendar'} 
          onClick={() => setActiveTab('calendar')}
          icon={Calendar}
        >
          Calendar
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'balance' && (
        <BalanceTab balance={leaveData.balance} loading={loading} />
      )}

      {activeTab === 'requests' && (
        <RequestsTab requests={leaveData.requests} loading={loading} onRefresh={fetchLeaveData} />
      )}

      {activeTab === 'calendar' && (
        <CalendarTab />
      )}
    </div>
  );
};

// Balance Tab
const BalanceTab = ({ balance, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Loading leave balance...
      </div>
    );
  }

  const totalAvailable = balance?.reduce((sum, item) => sum + item.available, 0) || 0;
  const totalUsed = balance?.reduce((sum, item) => sum + item.used, 0) || 0;
  const totalAllocation = balance?.reduce((sum, item) => sum + item.total, 0) || 0;

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard 
          icon={Umbrella}
          label="Total Available"
          value={totalAvailable}
          subtitle={`Out of ${totalAllocation} days`}
          color="var(--accent-hover)"
        />
        <SummaryCard 
          icon={CheckCircle}
          label="Used This Year"
          value={totalUsed}
          subtitle="Days taken"
          color="var(--success-text)"
        />
        <SummaryCard 
          icon={Calendar}
          label="Remaining"
          value={totalAvailable}
          subtitle="Days left"
          color="var(--info-text)"
        />
      </div>

      {/* Detailed Balance */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Leave Type Breakdown</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {balance?.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>
                      {item.type}
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {item.available} available • {item.used} used • {item.total} total
                    </p>
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent-bg)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: 'var(--accent-hover)'
                  }}>
                    {item.available}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', height: '8px' }}>
                  <div style={{
                    flex: item.used,
                    backgroundColor: 'var(--success-text)',
                    borderRadius: '4px',
                    transition: 'flex 0.3s'
                  }} title={`${item.used} used`} />
                  <div style={{
                    flex: item.available,
                    backgroundColor: 'var(--accent-hover)',
                    borderRadius: '4px',
                    transition: 'flex 0.3s'
                  }} title={`${item.available} available`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Requests Tab
const RequestsTab = ({ requests, loading, onRefresh }) => {
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Loading requests...
      </div>
    );
  }

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div>
      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({requests.length})
        </FilterButton>
        <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
          Pending ({requests.filter(r => r.status === 'pending').length})
        </FilterButton>
        <FilterButton active={filter === 'approved'} onClick={() => setFilter('approved')}>
          Approved ({requests.filter(r => r.status === 'approved').length})
        </FilterButton>
        <FilterButton active={filter === 'rejected'} onClick={() => setFilter('rejected')}>
          Rejected ({requests.filter(r => r.status === 'rejected').length})
        </FilterButton>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <Umbrella size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No leave requests</h3>
              <p className="empty-state-desc">
                {filter === 'all' 
                  ? "You haven't submitted any leave requests yet."
                  : `No ${filter} leave requests found.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRequests.map(request => (
            <RequestCard key={request.id} request={request} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
};

// Calendar Tab
const CalendarTab = () => {
  return (
    <div className="card">
      <div className="card-body">
        <div className="empty-state" style={{ padding: '40px' }}>
          <Calendar size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">Leave Calendar</h3>
          <p className="empty-state-desc">
            Calendar view will show your leave history and upcoming leaves with team availability.
          </p>
          <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            This feature requires calendar component integration.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 20px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid var(--accent-hover)' : '2px solid transparent',
      color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
      fontWeight: active ? 600 : 400,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    }}
  >
    <Icon size={18} />
    {children}
  </button>
);

const SummaryCard = ({ icon: Icon, label, value, subtitle, color }) => (
  <div className="card">
    <div className="card-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
        <div>
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {label}
          </p>
          <h3 style={{ margin: '0 0 2px 0', fontSize: '28px', fontWeight: 600 }}>{value}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
      border: active ? '1px solid var(--accent-hover)' : '1px solid var(--border-color)',
      backgroundColor: active ? 'var(--accent-bg)' : 'transparent',
      color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: active ? 600 : 400,
      transition: 'all 0.2s'
    }}
  >
    {children}
  </button>
);

const RequestCard = ({ request, onRefresh }) => {
  const statusConfig = {
    pending: { icon: Clock, color: 'var(--warning-text)', bg: 'var(--warning-bg)', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'var(--success-text)', bg: 'var(--success-bg)', label: 'Approved' },
    rejected: { icon: XCircle, color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Rejected' }
  };

  const config = statusConfig[request.status] || statusConfig.pending;
  const Icon = config.icon;

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    
    try {
      // await employeePortalApi.cancelLeave(request.id);
      alert('Leave cancellation will be connected to backend API');
      onRefresh();
    } catch (error) {
      console.error('Failed to cancel leave:', error);
    }
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {request.leaveType}
              </h3>
              <span style={{
                padding: '4px 12px',
                backgroundColor: config.bg,
                color: config.color,
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Icon size={14} />
                {config.label}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <div>
                <strong>From:</strong> {request.startDate}
              </div>
              <div>
                <strong>To:</strong> {request.endDate}
              </div>
              <div>
                <strong>Duration:</strong> {request.duration} day(s)
              </div>
            </div>
            
            {request.reason && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>Reason:</strong> {request.reason}
              </div>
            )}
            
            {request.reviewedBy && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewedBy} on {request.reviewedDate}
                {request.reviewComments && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    "{request.reviewComments}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {request.status === 'pending' && (
            <button 
              className="btn btn-secondary"
              onClick={handleCancel}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock data generator
const generateMockRequests = () => {
  return [
    {
      id: 1,
      leaveType: 'Casual Leave',
      startDate: '2026-09-15',
      endDate: '2026-09-17',
      duration: 3,
      reason: 'Family function',
      status: 'pending',
      appliedDate: '2026-09-01'
    },
    {
      id: 2,
      leaveType: 'Sick Leave',
      startDate: '2026-08-20',
      endDate: '2026-08-21',
      duration: 2,
      reason: 'Medical checkup',
      status: 'approved',
      appliedDate: '2026-08-18',
      reviewedBy: 'John Manager',
      reviewedDate: '2026-08-19',
      reviewComments: 'Approved. Take care!'
    },
    {
      id: 3,
      leaveType: 'Casual Leave',
      startDate: '2026-07-10',
      endDate: '2026-07-10',
      duration: 1,
      reason: 'Personal work',
      status: 'approved',
      appliedDate: '2026-07-05',
      reviewedBy: 'John Manager',
      reviewedDate: '2026-07-06'
    }
  ];
};

export default MyLeave;
