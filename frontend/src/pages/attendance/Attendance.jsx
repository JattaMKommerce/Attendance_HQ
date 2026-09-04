import React, { useState } from 'react';
import AttendanceOverview from './AttendanceOverview';
import AttendanceRecords from './AttendanceRecords';
import AttendanceRegularization from './AttendanceRegularization';
import Shifts from './Shifts';
import Roster from './Roster';
import { Calendar, Clock, CheckSquare, Settings, Users } from 'lucide-react';
import './Attendance.css';

const Attendance = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="attendance-module" style={{ gap: '10px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="page-title" style={{ margin: '0 0 5px 0', fontSize: '24px' }}>Attendance</h1>
        <p className="page-description" style={{ margin: 0, color: '#6b7280' }}>Manage workforce attendance</p>
      </div>

      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Calendar size={18} /> Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <Clock size={18} /> Records
        </button>
        <button 
          className={`tab-btn ${activeTab === 'regularization' ? 'active' : ''}`}
          onClick={() => setActiveTab('regularization')}
        >
          <CheckSquare size={18} /> Regularization
        </button>
        <button 
          className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          <Users size={18} /> Roster
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && <AttendanceOverview setActiveTab={setActiveTab} />}
        {activeTab === 'records' && <AttendanceRecords />}
        {activeTab === 'regularization' && <AttendanceRegularization />}
        {activeTab === 'roster' && <Roster />}
      </div>
    </div>
  );
};

export default Attendance;
