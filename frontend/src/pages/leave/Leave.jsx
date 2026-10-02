import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import LeaveOverview from './LeaveOverview';
import LeaveRequests from './LeaveRequests';
import LeaveCalendar from './LeaveCalendar';
import LeaveBalances from './LeaveBalances';
import LeaveSettings from './LeaveSettings';
import LeaveHolidays from './LeaveHolidays';
import { LayoutDashboard, Inbox, Calendar, Scale, Settings, ArrowLeft } from 'lucide-react';
import './Leave.css';

const Leave = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const requestedTab = searchParams.get('tab') || location.state?.tab || 'overview';
  const [activeTab, setActiveTab] = useState(requestedTab);

  // Sync tab if URL changes or notification triggers navigation
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || location.state?.tab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, location.state]);
  
  return (
    <div className="leave-module">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}
          title="Go Back"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>Leave Management</h1>
      </div>

      <div className="leave-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px', overflowX: 'auto' }}>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} /> Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Inbox size={18} /> Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={18} /> Calendar
        </button>
        <button 
          className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          <Scale size={18} /> Balances
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> Leave Types
        </button>
        <button 
          className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          <Calendar size={18} /> Holidays
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && <LeaveOverview setActiveTab={setActiveTab} />}
        {activeTab === 'requests' && (
          <LeaveRequests 
            highlightId={searchParams.get('requestId') || location.state?.requestId}
            employeeSearch={searchParams.get('employee') || location.state?.employee}
          />
        )}
        {activeTab === 'calendar' && <LeaveCalendar />}
        {activeTab === 'balances' && <LeaveBalances />}
        {activeTab === 'settings' && <LeaveSettings />}
        {activeTab === 'holidays' && <LeaveHolidays />}
      </div>
    </div>
  );
};

export default Leave;
