import React from 'react';

export default function PayrollSettings() {
  return (
    <div style={{ display: 'flex', gap: '32px' }}>
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Payroll Cycle</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Pay Period</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Salary Components</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Deduction Rules</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Tax Settings</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Approval Workflow</button>
        <button className="btn-v2 secondary" style={{ justifyContent: 'flex-start' }}>Payslip Template</button>
      </div>

      <div className="v2-card" style={{ flex: 1, padding: '24px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px' }}>Payroll Cycle Configuration</h3>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Payment Frequency</label>
          <select style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
            <option>Monthly</option>
            <option>Bi-Weekly</option>
            <option>Weekly</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pay Date</label>
          <select style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
            <option>Last day of the month</option>
            <option>1st of the month</option>
            <option>15th of the month</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <button className="btn-v2 secondary">Reset</button>
          <button className="btn-v2 primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
