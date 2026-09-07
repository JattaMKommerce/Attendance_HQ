import React from 'react';

const ADJUSTMENTS = [
  { id: 'ADJ-001', employee: 'Alice Smith', type: 'Bonus', amount: 50000, status: 'Pending' },
  { id: 'ADJ-002', employee: 'Bob Johnson', type: 'Overtime', amount: 12000, status: 'Approved' },
];

export default function Adjustments() {
  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn-v2 secondary">Add Bonus</button>
        <button className="btn-v2 secondary">Add Incentive</button>
        <button className="btn-v2 secondary">Add Overtime</button>
        <button className="btn-v2 secondary">Add Arrears</button>
        <button className="btn-v2 secondary">Add Retro Pay</button>
        <button className="btn-v2 secondary">Add Off-cycle Payment</button>
        <button className="btn-v2 primary">Add Custom Adjustment</button>
      </div>

      <div className="v2-card">
        <table className="v2-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ADJUSTMENTS.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td style={{fontWeight: 500}}>{a.employee}</td>
                <td>{a.type}</td>
                <td>₹{a.amount.toLocaleString()}</td>
                <td><span className={`v2-badge ${a.status === 'Approved' ? 'green' : 'yellow'}`}>{a.status}</span></td>
                <td style={{textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  {a.status === 'Pending' && (
                    <>
                      <button className="btn-v2 primary">Approve</button>
                      <button className="btn-v2 danger">Reject</button>
                    </>
                  )}
                  <button className="btn-v2 secondary">View</button>
                  <button className="btn-v2 secondary">Edit</button>
                  <button className="btn-v2 danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
