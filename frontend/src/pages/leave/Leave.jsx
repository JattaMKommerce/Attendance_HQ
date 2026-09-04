import React, { useState } from 'react';
import LeaveOverview from './LeaveOverview';
import LeaveRequests from './LeaveRequests';
import LeaveCalendar from './LeaveCalendar';
import LeaveBalances from './LeaveBalances';
import LeaveSettings from './LeaveSettings';
import LeaveHolidays from './LeaveHolidays';
import { LayoutDashboard, Inbox, Calendar, Scale, Settings } from 'lucide-react';
import './Leave.css';

const Leave = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="leave-module">
      <div className="page-header">
        <h1 className="page-title">Leave Management (HR Command Center)</h1>
        <p className="page-description">Oversee employee availability, manage requests, and track leave balances</p>
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
        {activeTab === 'requests' && <LeaveRequests />}
        {activeTab === 'calendar' && <LeaveCalendar />}
        {activeTab === 'balances' && <LeaveBalances />}
        {activeTab === 'settings' && <LeaveSettings />}
        {activeTab === 'holidays' && <LeaveHolidays />}
      </div>
    </div>
  );
};

export default Leave;
