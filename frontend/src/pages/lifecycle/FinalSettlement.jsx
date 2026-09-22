import React, { useState, useEffect } from 'react';
import { Banknote, Search, X, CheckCircle, Calculator, Clock, Plus } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_SETTLEMENT_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', lastWorkingDay: '2025-09-30', dues: 'Salary, Leave Encashment, Bonus', grossEarnings: 140000, totalDeductions: 15000, amount: '₹1,25,000', status: 'Pending', bankAccount: 'HDFC - 4821', salaryMonth: '₹1,00,000', leaveEncashment: '₹25,000', bonus: '₹15,000', lop: '₹5,000', assetRecovery: '₹10,000' },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', lastWorkingDay: '2025-09-15', dues: 'Salary, LOP Deductions', grossEarnings: 55000, totalDeductions: 10000, amount: '₹45,000', status: 'In Process', bankAccount: 'ICICI - 9021', salaryMonth: '₹45,000', leaveEncashment: '₹10,000', bonus: '₹0', lop: '₹10,000', assetRecovery: '₹0' },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', lastWorkingDay: '2025-10-31', dues: 'Salary, Leave Encashment', grossEarnings: 90000, totalDeductions: 12000, amount: '₹78,000', status: 'Pending', bankAccount: 'SBI - 3144', salaryMonth: '₹70,000', leaveEncashment: '₹20,000', bonus: '₹0', lop: '₹5,000', assetRecovery: '₹7,000' },
];

export default function FinalSettlement() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_SETTLEMENT_DATA);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    employeeId: '',
    lastWorkingDay: '2025-10-15',
    salary: 60000,
    leaveEncashment: 15000,
    bonus: 5000,
    lop: 3000,
    assetRecovery: 2000,
    otherDeductions: 0,
    bankAccount: 'HDFC - 8923',
    duesSummary: 'Salary, Encashment, Recovery'
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { employees: emps, departments: depts } = await fetchLifecycleContext();
        setEmployees(emps);
        setDepartments(depts);
      } catch (err) {
        console.error('Error fetching context:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleOpenModal = () => {
    const initialDept = departments[0] || 'IT';
    const firstEmp = employees.find(e => e.department === initialDept) || employees[0];

    setFormData({
      department: initialDept,
      employeeId: firstEmp ? firstEmp.id : '',
      lastWorkingDay: '2025-10-15',
      salary: 65000,
      leaveEncashment: 12000,
      bonus: 8000,
      lop: 2000,
      assetRecovery: 3000,
      otherDeductions: 0,
      bankAccount: 'HDFC - 4821',
      duesSummary: 'Salary, Leave Encashment, Performance Bonus'
    });
    setShowModal(true);
  };

  const handleDepartmentChange = (dept) => {
    const filteredEmps = employees.filter(e => e.department === dept);
    const matchedEmp = filteredEmps[0] || employees[0];
    setFormData(prev => ({
      ...prev,
      department: dept,
      employeeId: matchedEmp ? matchedEmp.id : ''
    }));
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id.toString() === empId.toString());
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.id,
        department: emp.department || prev.department
      }));
    }
  };

  const grossEarnings = Number(formData.salary || 0) + Number(formData.leaveEncashment || 0) + Number(formData.bonus || 0);
  const totalDeductions = Number(formData.lop || 0) + Number(formData.assetRecovery || 0) + Number(formData.otherDeductions || 0);
  const netSettlement = Math.max(0, grossEarnings - totalDeductions);

  const handleCalculateSubmit = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      lastWorkingDay: formData.lastWorkingDay,
      dues: formData.duesSummary || 'Salary, Leave Encashment',
      grossEarnings,
      totalDeductions,
      amount: `₹${netSettlement.toLocaleString('en-IN')}`,
      status: 'Pending',
      bankAccount: formData.bankAccount,
      salaryMonth: `₹${Number(formData.salary).toLocaleString('en-IN')}`,
      leaveEncashment: `₹${Number(formData.leaveEncashment).toLocaleString('en-IN')}`,
      bonus: `₹${Number(formData.bonus).toLocaleString('en-IN')}`,
      lop: `₹${Number(formData.lop).toLocaleString('en-IN')}`,
      assetRecovery: `₹${Number(formData.assetRecovery).toLocaleString('en-IN')}`
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: Full & Final Settlement calculated for ${empName} (${newRecord.amount})!`);
  };

  const handleSettlementAction = (empId, newStatus) => {
    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, status: newStatus }));
    }

    showAlert(`Settlement status updated to "${newStatus}"!`);
  };

  const handleMarkAllPendingAsPaid = () => {
    const hasPending = tableData.some(d => d.status !== 'Completed');
    if (!hasPending) {
      showAlert('All settlements are already marked as Completed / Paid!');
      return;
    }

    setTableData(prev => prev.map(item => ({ ...item, status: 'Completed' })));
    if (selectedEmp) {
      setSelectedEmp(prev => ({ ...prev, status: 'Completed' }));
    }
    showAlert('Success: All pending settlements marked as Completed / Paid!');
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // KPIs
  const kpis = {
    'Pending': tableData.filter(d => d.status === 'Pending').length,
    'In Process': tableData.filter(d => d.status === 'In Process').length,
    'Approved': tableData.filter(d => d.status === 'Approved').length,
    'Completed': tableData.filter(d => d.status === 'Completed').length
  };

  // Filtered rows
  const filteredData = tableData.filter(emp => {
    const matchDept = selectedDept === 'All Departments' || (emp.department && emp.department.toLowerCase() === selectedDept.toLowerCase());
    const matchStatus = selectedStatus === 'All Status' || emp.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.dues.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {alertMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <CheckCircle size={18} color="#10b981" />
          {alertMsg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Banknote size={24} color="#059669" /> Full & Final Settlement
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            onClick={handleOpenModal}
            className="stella-btn outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            <Calculator size={16}/> Calculate Settlement
          </button>
          <button 
            type="button"
            onClick={handleMarkAllPendingAsPaid}
            className="stella-btn primary" 
            style={{ background: '#059669', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Mark as Paid
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(kpis).map(([label, count]) => (
          <div key={label} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px' }}>
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All Departments">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All Status">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Process">In Process</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name or employee ID..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Last Working Day</th>
              <th style={{ padding: '12px 16px' }}>Dues Summary</th>
              <th style={{ padding: '12px 16px' }}>Total Amount</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No settlements found matching criteria.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.department}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{emp.lastWorkingDay}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>{emp.dues}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0f172a' }}>{emp.amount}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Completed' ? '#dcfce7' : emp.status === 'Rejected' ? '#fee2e2' : emp.status === 'Approved' ? '#ecfdf5' : '#fef3c7', color: emp.status === 'Completed' ? '#059669' : emp.status === 'Rejected' ? '#dc2626' : emp.status === 'Approved' ? '#047857' : '#d97706', fontWeight: 500 }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button 
                      onClick={() => setSelectedEmp(emp)} 
                      style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#3b82f6', fontWeight: 500 }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Calculate Settlement Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={20} color="#059669" /> Calculate Full & Final Settlement
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleCalculateSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Department</label>
                  <select 
                    required 
                    value={formData.department} 
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Employee</label>
                  <select 
                    required 
                    value={formData.employeeId} 
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">Select Employee</option>
                    {employees
                      .filter(e => !formData.department || e.department?.toLowerCase() === formData.department.toLowerCase())
                      .map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code || e.id})</option>)}
                    {employees.filter(e => !formData.department || e.department?.toLowerCase() === formData.department.toLowerCase()).length === 0 &&
                      employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code || e.id})</option>)
                    }
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Last Working Day</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.lastWorkingDay}
                    onChange={(e) => setFormData({...formData, lastWorkingDay: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Bank Account</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>

                {/* Earnings Section */}
                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b', marginBottom: '12px' }}>Earnings Breakdown (₹)</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b' }}>Salary Due</label>
                      <input 
                        type="number" 
                        value={formData.salary}
                        onChange={(e) => setFormData({...formData, salary: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b' }}>Leave Encashment</label>
                      <input 
                        type="number" 
                        value={formData.leaveEncashment}
                        onChange={(e) => setFormData({...formData, leaveEncashment: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b' }}>Bonus / Incentives</label>
                      <input 
                        type="number" 
                        value={formData.bonus}
                        onChange={(e) => setFormData({...formData, bonus: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div style={{ gridColumn: 'span 2', background: '#fff1f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#9f1239', marginBottom: '12px' }}>Deductions & Recoveries (₹)</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9f1239' }}>Loss of Pay (LOP)</label>
                      <input 
                        type="number" 
                        value={formData.lop}
                        onChange={(e) => setFormData({...formData, lop: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9f1239' }}>Asset Recovery</label>
                      <input 
                        type="number" 
                        value={formData.assetRecovery}
                        onChange={(e) => setFormData({...formData, assetRecovery: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9f1239' }}>Other Deductions</label>
                      <input 
                        type="number" 
                        value={formData.otherDeductions}
                        onChange={(e) => setFormData({...formData, otherDeductions: e.target.value})}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Net Result */}
                <div style={{ gridColumn: 'span 2', background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#047857' }}>Net Settlement Payable</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>₹{netSettlement.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', textAlign: 'right' }}>
                    Gross: ₹{grossEarnings.toLocaleString('en-IN')} <br/>
                    Deductions: -₹{totalDeductions.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Save Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Drawer */}
      {selectedEmp && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '600px', background: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.amount}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Settlement Summary</h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                 <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Gross Earnings</div>
                 <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>₹{selectedEmp.grossEarnings ? selectedEmp.grossEarnings.toLocaleString('en-IN') : '70,000'}</div>
              </div>
              <div style={{ flex: 1, background: '#fee2e2', padding: '16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                 <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '4px' }}>Total Deductions</div>
                 <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b91c1c' }}>-₹{selectedEmp.totalDeductions ? selectedEmp.totalDeductions.toLocaleString('en-IN') : '8,000'}</div>
              </div>
              <div style={{ flex: 1, background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                 <div style={{ fontSize: '12px', color: '#047857', marginBottom: '4px' }}>Net Payable</div>
                 <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857' }}>{selectedEmp.amount}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
               <div>
                  <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Payment Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                     <div><strong style={{ color: '#64748b' }}>Last Working Day:</strong> {selectedEmp.lastWorkingDay}</div>
                     <div><strong style={{ color: '#64748b' }}>Bank Account:</strong> {selectedEmp.bankAccount || 'HDFC - 4821'}</div>
                     <div>
                       <strong style={{ color: '#64748b' }}>Payment Status:</strong>{' '}
                       <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: selectedEmp.status === 'Completed' ? '#dcfce7' : selectedEmp.status === 'Approved' ? '#ecfdf5' : '#fef3c7', color: selectedEmp.status === 'Completed' ? '#059669' : selectedEmp.status === 'Approved' ? '#047857' : '#d97706', fontWeight: 600 }}>
                         {selectedEmp.status === 'Completed' ? 'Paid / Settled' : selectedEmp.status}
                       </span>
                     </div>
                  </div>
               </div>
               <div>
                  <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Clearance Status</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> HR Clearance</span> <span style={{ color: '#10b981' }}>Done</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Manager Clearance</span> <span style={{ color: '#10b981' }}>Done</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> IT Clearance</span> <span style={{ color: '#10b981' }}>Done</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Finance Audit</span> <span style={{ color: '#10b981' }}>Done</span></div>
                  </div>
               </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Detailed Breakdown</h4>
            <div style={{ display: 'flex', gap: '16px' }}>
               <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                 <div style={{ background: '#f8fafc', padding: '10px 16px', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>Earnings</div>
                 <div style={{ padding: '12px 16px', fontSize: '13px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Salary Due</span> <span>{selectedEmp.salaryMonth || '₹50,000'}</span></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Leave Encashment</span> <span>{selectedEmp.leaveEncashment || '₹12,000'}</span></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><span style={{ color: '#64748b' }}>Bonus</span> <span>{selectedEmp.bonus || '₹8,000'}</span></div>
                 </div>
               </div>
               <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                 <div style={{ background: '#f8fafc', padding: '10px 16px', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>Deductions</div>
                 <div style={{ padding: '12px 16px', fontSize: '13px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>LOP</span> <span style={{ color: '#ef4444' }}>{selectedEmp.lop || '₹2,000'}</span></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Asset Recovery</span> <span style={{ color: '#ef4444' }}>{selectedEmp.assetRecovery || '₹5,000'}</span></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><span style={{ color: '#64748b' }}>Taxes & Admin</span> <span style={{ color: '#ef4444' }}>₹1,000</span></div>
                 </div>
               </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'space-between', background: '#f8fafc' }}>
             <button 
               type="button"
               onClick={() => handleSettlementAction(selectedEmp.id, 'In Process')}
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Recalculate
             </button>
             <button 
               type="button"
               onClick={() => handleSettlementAction(selectedEmp.id, 'Approved')}
               style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Approve
             </button>
             <button 
               type="button"
               onClick={() => handleSettlementAction(selectedEmp.id, 'Rejected')}
               style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Reject
             </button>
             <button 
               type="button"
               onClick={() => handleSettlementAction(selectedEmp.id, 'Completed')}
               style={{ flex: 1, padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Mark as Paid
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
