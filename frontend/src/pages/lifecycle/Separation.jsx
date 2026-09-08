import React, { useState, useEffect } from 'react';
import { LogOut, Search, Plus, X, CheckCircle, Clock } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_SEPARATION_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', type: 'Resignation', noticePeriod: '30 days', lastWorkingDay: '2025-09-30', status: 'Notice Period', reason: 'Pursuing higher studies and career transition.', resignationDate: '2025-09-01' },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', type: 'Termination', noticePeriod: '-', lastWorkingDay: '2025-09-15', status: 'In Process', reason: 'Mutual separation due to role restructuring.', resignationDate: '2025-09-01' },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', type: 'Resignation', noticePeriod: '60 days', lastWorkingDay: '2025-10-31', status: 'Pending Approval', reason: 'Relocating to another city.', resignationDate: '2025-09-01' },
];

export default function Separation() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_SEPARATION_DATA);
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
    type: 'Resignation',
    resignationDate: '2025-09-15',
    noticePeriod: '30 days',
    lastWorkingDay: '2025-10-15',
    reason: 'Better career opportunity'
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
      type: 'Resignation',
      resignationDate: new Date().toISOString().split('T')[0],
      noticePeriod: '30 days',
      lastWorkingDay: '2025-10-30',
      reason: 'Personal relocation and career advancement.'
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

  const handleNoticePeriodChange = (days) => {
    const resDate = new Date(formData.resignationDate || new Date());
    const lastDay = new Date(resDate);
    const numDays = parseInt(days) || 30;
    lastDay.setDate(lastDay.getDate() + numDays);

    setFormData(prev => ({
      ...prev,
      noticePeriod: days,
      lastWorkingDay: lastDay.toISOString().split('T')[0]
    }));
  };

  const handleInitiateSeparation = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      type: formData.type,
      noticePeriod: formData.noticePeriod,
      lastWorkingDay: formData.lastWorkingDay,
      resignationDate: formData.resignationDate,
      reason: formData.reason,
      status: formData.type === 'Resignation' ? 'Pending Approval' : 'In Process'
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: Separation initiated for ${empName}!`);
  };

  const handleSeparationAction = (empId, newStatus) => {
    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, status: newStatus }));
    }

    showAlert(`Separation status updated to "${newStatus}"!`);
  };

  const handleUpdateLWD = (empId) => {
    const nextDate = prompt('Enter updated Last Working Day (YYYY-MM-DD):', selectedEmp?.lastWorkingDay || '2025-10-15');
    if (!nextDate) return;

    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, lastWorkingDay: nextDate };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, lastWorkingDay: nextDate }));
    }

    showAlert(`Last working day updated to ${nextDate}!`);
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Dynamic KPIs
  const kpis = {
    'All': tableData.length,
    'Resignation': tableData.filter(d => d.type === 'Resignation').length,
    'Termination': tableData.filter(d => d.type === 'Termination').length,
    'Notice Period': tableData.filter(d => d.status === 'Notice Period').length,
    'Offboarding': tableData.filter(d => d.status === 'In Process').length,
    'Completed': tableData.filter(d => d.status === 'Completed').length
  };

  // Filtered list
  const filteredData = tableData.filter(emp => {
    const matchDept = selectedDept === 'All Departments' || (emp.department && emp.department.toLowerCase() === selectedDept.toLowerCase());
    const matchStatus = selectedStatus === 'All Status' || emp.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.reason.toLowerCase().includes(searchQuery.toLowerCase());
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
            <LogOut size={24} color="#f97316" /> Separation Management
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Manage resignations, terminations and offboarding process</p>
        </div>
        <button 
          type="button"
          onClick={handleOpenModal}
          className="stella-btn primary" 
          style={{ background: '#f97316', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Initiate Separation
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(kpis).map(([label, count]) => (
          <div key={label} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500, fontSize: '13px' }}>{label}</span>
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
            <option value="Notice Period">Notice Period</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="In Process">In Process</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or reason..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Notice Period</th>
              <th style={{ padding: '12px 16px' }}>Last Working Day</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No separation records found.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#ffedd5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.department}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{emp.type}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.noticePeriod}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.lastWorkingDay}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Completed' ? '#dcfce7' : emp.status === 'Cancelled' ? '#fee2e2' : emp.status === 'Notice Period' ? '#ffedd5' : '#fef3c7', color: emp.status === 'Completed' ? '#059669' : emp.status === 'Cancelled' ? '#dc2626' : emp.status === 'Notice Period' ? '#c2410c' : '#d97706', fontWeight: 500 }}>
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

      {/* Initiate Separation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogOut size={20} color="#f97316" /> Initiate Employee Separation
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleInitiateSeparation} style={{ padding: '24px' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Separation Type</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="Resignation">Resignation</option>
                    <option value="Termination">Termination</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Contract End">Contract End</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Notice Period</label>
                  <select 
                    value={formData.noticePeriod} 
                    onChange={(e) => handleNoticePeriodChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="Immediate">Immediate / 0 days</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Resignation / Notice Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.resignationDate}
                    onChange={(e) => setFormData({...formData, resignationDate: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
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
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Reason for Separation</label>
                  <textarea 
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Initiate Separation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Drawer */}
      {selectedEmp && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '550px', background: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#ffedd5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.type}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Separation Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginBottom: '24px' }}>
               <div><strong style={{ color: '#64748b' }}>Separation Type:</strong> {selectedEmp.type}</div>
               <div><strong style={{ color: '#64748b' }}>Notice Period:</strong> {selectedEmp.noticePeriod}</div>
               <div><strong style={{ color: '#64748b' }}>Last Working Day:</strong> {selectedEmp.lastWorkingDay}</div>
               <div>
                 <strong style={{ color: '#64748b' }}>Status:</strong>{' '}
                 <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: selectedEmp.status === 'Completed' ? '#dcfce7' : selectedEmp.status === 'Cancelled' ? '#fee2e2' : '#ffedd5', color: selectedEmp.status === 'Completed' ? '#059669' : selectedEmp.status === 'Cancelled' ? '#dc2626' : '#c2410c', fontWeight: 600 }}>
                   {selectedEmp.status}
                 </span>
               </div>
               <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>Reason:</strong> {selectedEmp.reason}</div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Clearance Checklist</h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> HR Clearance</span> <span style={{ color: '#10b981' }}>Done</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><CheckCircle size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Reporting Manager</span> <span style={{ color: '#10b981' }}>Done</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><Clock size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> IT Assets Handover</span> <span style={{ color: '#f59e0b' }}>Pending</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><Clock size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Finance Clearance</span> <span style={{ color: '#f59e0b' }}>Pending</span></div>
                </div>
              </div>
              <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Assets to Return</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#475569' }}>
                  <li>Laptop & Charger</li>
                  <li>Employee ID Card</li>
                  <li>Building Access FOB</li>
                </ul>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'space-between', background: '#f8fafc' }}>
             <button 
               type="button"
               onClick={() => handleSeparationAction(selectedEmp.id, 'Notice Period')}
               style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Approve Notice
             </button>
             <button 
               type="button"
               onClick={() => handleUpdateLWD(selectedEmp.id)}
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Update LWD
             </button>
             <button 
               type="button"
               onClick={() => handleSeparationAction(selectedEmp.id, 'Completed')}
               style={{ flex: 1, padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Complete Exit
             </button>
             <button 
               type="button"
               onClick={() => handleSeparationAction(selectedEmp.id, 'Cancelled')}
               style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Cancel
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
