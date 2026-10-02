import React, { useState } from 'react';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
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
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No salary adjustments or one-off bonuses recorded.
                </td>
              </tr>
            ) : (
              adjustments.map(a => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td style={{ fontWeight: 500 }}>{a.employee}</td>
                  <td>{a.type}</td>
                  <td>₹{Number(a.amount).toLocaleString()}</td>
                  <td><span className={`v2-badge ${a.status === 'Approved' ? 'green' : 'yellow'}`}>{a.status}</span></td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
