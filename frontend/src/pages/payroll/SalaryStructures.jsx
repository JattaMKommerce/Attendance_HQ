import React from 'react';

const STRUCTURES = [
  { id: 'S1', name: 'Standard Engineering Package', base: 1200000, active: true },
  { id: 'S2', name: 'Junior Support Staff', base: 400000, active: true },
];

export default function SalaryStructures() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn-v2 primary">Add Salary Structure</button>
      </div>

      <div className="v2-card">
        <table className="v2-table">
          <thead>
            <tr>
              <th>Structure Name</th>
              <th>Base Pay (Annual)</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {STRUCTURES.map(s => (
              <tr key={s.id}>
                <td style={{fontWeight: 500}}>{s.name}</td>
                <td>₹{s.base.toLocaleString()}</td>
                <td><span className={`v2-badge ${s.active ? 'green' : 'gray'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                <td style={{textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  <button className="btn-v2 secondary">View</button>
                  <button className="btn-v2 secondary">Edit</button>
                  <button className="btn-v2 secondary">Assign to Employee</button>
                  <button className="btn-v2 secondary">Duplicate</button>
                  <button className="btn-v2 secondary">Deactivate</button>
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
