import React, { useState } from 'react';

const MOCK_RUNS = [
  { id: 'PR-2026-10', period: 'October 2026', status: 'Draft', employees: 428, total: 13005000 },
  { id: 'PR-2026-09', period: 'September 2026', status: 'Paid', employees: 425, total: 12800000 },
];

export default function PayrollRuns() {
  const [runs, setRuns] = useState(MOCK_RUNS);
  
  const advanceStatus = (id, newStatus) => {
    setRuns(runs.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Draft': return 'gray';
      case 'Validated': return 'blue';
      case 'Pending Approval': return 'yellow';
      case 'Approved': return 'green';
      case 'Processing': return 'yellow';
      case 'Paid': return 'green';
      case 'Closed': return 'gray';
      default: return 'gray';
    }
  };

  const renderActions = (run) => {
    switch (run.status) {
      case 'Draft':
        return (
          <>
            <button className="btn-v2 secondary" onClick={() => advanceStatus(run.id, 'Validated')}>Validate</button>
            <button className="btn-v2 secondary">Edit Draft</button>
          </>
        );
      case 'Validated':
        return (
          <>
            <button className="btn-v2 secondary">Preview</button>
            <button className="btn-v2 secondary">Recalculate</button>
            <button className="btn-v2 primary" onClick={() => advanceStatus(run.id, 'Pending Approval')}>Submit for Approval</button>
          </>
        );
      case 'Pending Approval':
        return (
          <>
            <button className="btn-v2 primary" onClick={() => advanceStatus(run.id, 'Approved')}>Approve</button>
            <button className="btn-v2 danger" onClick={() => advanceStatus(run.id, 'Draft')}>Reject</button>
          </>
        );
      case 'Approved':
        return <button className="btn-v2 primary" onClick={() => advanceStatus(run.id, 'Processing')}>Process Payroll</button>;
      case 'Processing':
        return <button className="btn-v2 primary" onClick={() => advanceStatus(run.id, 'Paid')}>Mark as Paid</button>;
      case 'Paid':
        return <button className="btn-v2 secondary" onClick={() => advanceStatus(run.id, 'Closed')}>Close Payroll</button>;
      case 'Closed':
        return <button className="btn-v2 secondary">View Details</button>;
      default: return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn-v2 primary">Create Payroll Run</button>
      </div>

      <div className="v2-card">
        <table className="v2-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Pay Period</th>
              <th>Employees</th>
              <th>Net Total</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id}>
                <td style={{fontWeight: 500}}>{run.id}</td>
                <td>{run.period}</td>
                <td>{run.employees}</td>
                <td>₹{run.total.toLocaleString()}</td>
                <td><span className={`v2-badge ${getStatusBadge(run.status)}`}>{run.status}</span></td>
                <td style={{textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  {renderActions(run)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
