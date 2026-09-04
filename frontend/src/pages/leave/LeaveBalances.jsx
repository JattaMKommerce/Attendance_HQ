import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';

const LeaveBalances = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async (searchTerm = '') => {
    setLoading(true);
    try {
      const res = await leaveApi.getAllBalances(searchTerm);
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBalances(search);
  };

  const handleAdjust = async (employeeId, leaveTypeId, action) => {
    const amountStr = window.prompt(`Enter amount of days to ${action}:`);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    const reason = window.prompt('Enter reason for adjustment:');
    if (!reason) return;

    try {
      const res = await leaveApi.adjustBalance({
        employeeId,
        leaveTypeId,
        action,
        amount,
        reason
      });

      if (res.data.success) {
        alert(res.data.message);
        fetchBalances(search);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to adjust balance');
    }
  };

  return (
    <div className="leave-balances">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Search employee..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '250px' }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px' }}>
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading balances...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {employees.map(emp => (
            <div key={emp.id} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>{emp.first_name} {emp.last_name}</h3>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.employee_code} | {emp.department_name}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {emp.balances && emp.balances.map(bal => {
                  const remaining = parseFloat(bal.allocated) + parseFloat(bal.carried_forward) - parseFloat(bal.used);
                  
                  return (
                    <div key={bal.leave_type_id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#374151' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: bal.color_code }}></div>
                        {bal.leave_type_name}
                      </div>
                      
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                        {remaining} <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>days left</span>
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Allocated: {parseFloat(bal.allocated) + parseFloat(bal.carried_forward)}</span>
                        <span>Used: {bal.used}</span>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleAdjust(emp.id, bal.leave_type_id, 'credit')}
                          style={{ flex: 1, padding: '4px', fontSize: '12px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          + Credit
                        </button>
                        <button 
                          onClick={() => handleAdjust(emp.id, bal.leave_type_id, 'debit')}
                          style={{ flex: 1, padding: '4px', fontSize: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          - Debit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {employees.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No employees found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveBalances;
