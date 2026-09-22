import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { getEmployees } from '../../services/employeeApi';
import '../../styles/components.css';

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployees({ search });
      if (res.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/app/employees/new')}
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              className="input-control"
              style={{ width: '100%', paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            Filters
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', margin: '16px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading employees...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <Users size={48} className="empty-state-icon" />
                      <h3 className="empty-state-title">No employees found</h3>
                      <p className="empty-state-desc">
                        {search ? "No employees match your search criteria." : "Get started by adding your first employee to the organization."}
                      </p>
                      {!search && (
                        <button className="btn btn-primary" onClick={() => navigate('/app/employees/new')}>
                          <Plus size={16} /> Add Employee
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr 
                    key={emp.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/app/employees/${emp.id}`)}
                  >
                    <td>{emp.employee_code}</td>
                    <td style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td>{emp.department_name || '-'}</td>
                    <td>{emp.designation_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          fontWeight: 600,
                          width: 'fit-content',
                          backgroundColor: emp.status === 'active' ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: emp.status === 'active' ? 'var(--success-text)' : 'var(--warning-text)'
                        }}>
                          {emp.status.charAt(0).toUpperCase() + emp.status.slice(1).replace('_', ' ')}
                        </span>
                        {emp.user_status === 'inactive' && (
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                            ⏳ Invite Pending
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
