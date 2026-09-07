import React, { useState } from 'react';
import '../recruitment/Recruitment.css'; // Reusing mgmt-page styles
import './Onboarding.css';

const INITIAL_HIRES = [
  { id: 1, name: 'Alice Smith', role: 'Senior Frontend Engineer', start_date: 'Oct 1, 2026', tasks: { hr: [true, true, false], it: [true, false, false] } },
  { id: 2, name: 'Diana Evans', role: 'Backend Engineer', start_date: 'Oct 15, 2026', tasks: { hr: [true, false, false], it: [false, false, false] } }
];

const HR_TASKS = ['Send Welcome Email', 'Collect Tax Forms', 'Verify ID Documents'];
const IT_TASKS = ['Create Google Workspace Account', 'Order MacBook Pro', 'Assign Software Licenses'];

export default function Onboarding() {
  const [hires, setHires] = useState(INITIAL_HIRES);
  const [activeId, setActiveId] = useState(1);

  const activeHire = hires.find(h => h.id === activeId);

  const toggleTask = (category, index) => {
    setHires(hires.map(h => {
      if (h.id !== activeId) return h;
      const newTasks = { ...h.tasks };
      newTasks[category][index] = !newTasks[category][index];
      return { ...h, tasks: newTasks };
    }));
  };

  const calculateProgress = (hire) => {
    const total = hire.tasks.hr.length + hire.tasks.it.length;
    const completed = hire.tasks.hr.filter(Boolean).length + hire.tasks.it.filter(Boolean).length;
    return (completed / total) * 100;
  };

  return (
    <div className="mgmt-page">
      <div className="mgmt-header">
        <div>
          <h1>Onboarding & IT Setup</h1>
          <p>Automate workflows across HR, IT, and Finance for new hires.</p>
        </div>
      </div>

      <div className="onboarding-grid">
        <div className="hire-list">
          {hires.map(hire => (
            <div 
              key={hire.id} 
              className={`hire-item ${activeId === hire.id ? 'active' : ''}`}
              onClick={() => setActiveId(hire.id)}
            >
              <h4>{hire.name}</h4>
              <p>{hire.role} • Starts {hire.start_date}</p>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${calculateProgress(hire)}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        {activeHire && (
          <div className="onboarding-details">
            <h2 style={{marginTop: 0, marginBottom: '24px'}}>{activeHire.name}'s Onboarding Plan</h2>
            
            <div className="task-group">
              <h3>HR Requirements</h3>
              {HR_TASKS.map((task, i) => (
                <div key={i} className="task-item">
                  <input type="checkbox" id={`hr-${i}`} checked={activeHire.tasks.hr[i]} onChange={() => toggleTask('hr', i)} />
                  <label htmlFor={`hr-${i}`} className={activeHire.tasks.hr[i] ? 'done' : ''}>{task}</label>
                </div>
              ))}
            </div>

            <div className="task-group">
              <h3>IT & Provisioning</h3>
              {IT_TASKS.map((task, i) => (
                <div key={i} className="task-item">
                  <input type="checkbox" id={`it-${i}`} checked={activeHire.tasks.it[i]} onChange={() => toggleTask('it', i)} />
                  <label htmlFor={`it-${i}`} className={activeHire.tasks.it[i] ? 'done' : ''}>{task}</label>
                </div>
              ))}
            </div>
            
            <button className="btn btn-primary" style={{marginTop: '16px'}}>Send Reminder to Employee</button>
          </div>
        )}
      </div>
    </div>
  );
}
