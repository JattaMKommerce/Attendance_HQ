import React from 'react';

const EMPLOYEES = [
  { id: 'EMP001', name: 'Alice Smith', dept: 'Engineering', status: 'Ready', netPay: 85000 },
  { id: 'EMP002', name: 'Bob Johnson', dept: 'Sales', status: 'Needs Review', netPay: 45000 },
];

export default function EmployeePayroll() {
  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input type="text" placeholder="Search employee..." style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1 }} />
        <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <option>All Departments</option>
          <option>Engineering</option>
          <option>Sales</option>
        </select>
        <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <option>All Statuses</option>
          <option>Ready</option>
          <option>Needs Review</option>
        </select>
      </div>

      <div className="v2-card">
        <table className="v2-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Net Pay</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map(emp => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td style={{fontWeight: 500}}>{emp.name}</td>
                <td>{emp.dept}</td>
                <td><span className={`v2-badge ${emp.status === 'Ready' ? 'green' : 'yellow'}`}>{emp.status}</span></td>
                <td>₹{emp.netPay.toLocaleString()}</td>
                <td style={{textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  <button className="btn-v2 secondary">View</button>
                  <button className="btn-v2 secondary">Edit</button>
                  <button className="btn-v2 secondary">Structure</button>
                  <button className="btn-v2 secondary">History</button>
                  <button className="btn-v2 secondary">Payslips</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
