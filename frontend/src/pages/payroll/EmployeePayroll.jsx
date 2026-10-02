import React, { useState, useEffect } from 'react';
import { getEmployees } from '../../services/employeeApi';

export default function EmployeePayroll() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmps = async () => {
      try {
        setLoading(true);
        const res = await getEmployees();
        const emps = res?.data?.employees || (Array.isArray(res?.data) ? res.data : []);
        setEmployees(emps);
      } catch (e) {
        console.warn('Failed to fetch payroll employees:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEmps();
  }, []);

  const filtered = employees.filter(emp => {
    if (!search) return true;
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Search employee..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1 }} 
        />
      </div>

      <div className="v2-card">
        <table className="v2-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading employee payroll data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  {search ? 'No employees match your search.' : 'No employees registered. Onboard your first employee to configure payroll.'}
                </td>
              </tr>
            ) : (
              filtered.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.employee_code}</strong></td>
                  <td style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</td>
                  <td>{emp.department_name || '-'}</td>
                  <td>{emp.designation_name || '-'}</td>
                  <td>
                    <span className={`v2-badge ${emp.status === 'active' ? 'green' : 'yellow'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-v2 secondary" onClick={() => window.location.href = `/app/employees/${emp.id}`}>
                      View Profile
                    </button>
                    <button className="btn-v2 secondary">Structure</button>
                    <button className="btn-v2 secondary">Payslips</button>
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
