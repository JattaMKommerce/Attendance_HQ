import React, { useState, useEffect } from 'react';
import { Layers, Search, Plus, X, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_ACTIONS_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', type: 'Promotion', current: 'Software Engineer', proposed: 'Senior Software Engineer', effective: '2025-10-01', status: 'Pending Approval', reason: 'Consistently exceeded sprint velocity and demonstrated senior design leadership.' },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', type: 'Transfer', current: 'Human Resources', proposed: 'Operations', effective: '2025-09-15', status: 'Approved', reason: 'Internal transfer to strengthen operations workflow team.' },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', type: 'Salary Revision', current: '₹6,00,000', proposed: '₹7,20,000', effective: '2025-10-01', status: 'Pending Approval', reason: 'Annual compensation appraisal adjustment based on stellar review.' },
];

export default function EmployeeActions() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_ACTIONS_DATA);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedType, setSelectedType] = useState('All Action Types');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    employeeId: '',
    type: 'Promotion',
    current: '',
    proposed: '',
    effective: '2025-10-01',
    reason: 'Exemplary dedication and expanded scope of responsibilities.'
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
      type: 'Promotion',
      current: firstEmp ? firstEmp.designation : 'Software Engineer',
      proposed: 'Senior ' + (firstEmp ? firstEmp.designation : 'Specialist'),
      effective: '2025-10-01',
      reason: 'Recognized for outstanding delivery and leadership qualities.'
    });
    setShowModal(true);
  };

  const handleDepartmentChange = (dept) => {
    const filteredEmps = employees.filter(e => e.department === dept);
    const matchedEmp = filteredEmps[0] || employees[0];
    setFormData(prev => ({
      ...prev,
      department: dept,
      employeeId: matchedEmp ? matchedEmp.id : '',
      current: getCurrentValue(prev.type, matchedEmp)
    }));
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id.toString() === empId.toString());
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.id,
        department: emp.department || prev.department,
        current: getCurrentValue(prev.type, emp)
      }));
    }
  };

  const handleTypeChange = (type) => {
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString()) || employees[0];
    let currentVal = getCurrentValue(type, emp);
    let defaultProposed = '';

    if (type === 'Promotion') defaultProposed = `Senior ${emp?.designation || 'Lead'}`;
    else if (type === 'Transfer') defaultProposed = 'Operations';
    else if (type === 'Salary Revision') defaultProposed = '₹7,50,000';
    else if (type === 'Role Change') defaultProposed = 'Product Manager';

    setFormData(prev => ({
      ...prev,
      type,
      current: currentVal,
      proposed: defaultProposed
    }));
  };

  const getCurrentValue = (type, emp) => {
    if (!emp) return '';
    if (type === 'Promotion' || type === 'Role Change') return emp.designation || 'Associate';
    if (type === 'Transfer') return emp.department || 'Operations';
    if (type === 'Salary Revision') return emp.gross_salary || '₹6,00,000';
    return emp.designation;
  };

  const handleInitiate = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      type: formData.type,
      current: formData.current,
      proposed: formData.proposed,
      effective: formData.effective,
      status: 'Pending Approval',
      reason: formData.reason
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: ${formData.type} action initiated for ${empName}!`);
  };

  const handleApprovalAction = (empId, newStatus) => {
    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, status: newStatus }));
    }

    showAlert(`Action status updated to "${newStatus}"!`);
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // KPIs
  const kpis = {
    'All Actions': tableData.length,
    'Promotions': tableData.filter(d => d.type === 'Promotion').length,
    'Transfers': tableData.filter(d => d.type === 'Transfer').length,
    'Salary Revision': tableData.filter(d => d.type === 'Salary Revision').length,
    'Role Change': tableData.filter(d => d.type === 'Role Change').length
  };

  // Filtered rows
  const filteredData = tableData.filter(item => {
    const matchDept = selectedDept === 'All Departments' || (item.department && item.department.toLowerCase() === selectedDept.toLowerCase());
    const matchType = selectedType === 'All Action Types' || item.type.toLowerCase() === selectedType.toLowerCase();
    const matchSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.proposed.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchType && matchSearch;
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
            <Layers size={24} color="#10b981" /> Employee Actions
          </h1>
        </div>
        <button 
          type="button"
          onClick={handleOpenModal}
          className="stella-btn primary" 
          style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Initiate Action
        </button>
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All Action Types">All Action Types</option>
            <option value="Promotion">Promotion</option>
            <option value="Transfer">Transfer</option>
            <option value="Salary Revision">Salary Revision</option>
            <option value="Role Change">Role Change</option>
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, ID or proposed change..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Action Type</th>
              <th style={{ padding: '12px 16px' }}>Current → New</th>
              <th style={{ padding: '12px 16px' }}>Effective Date</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No employee actions found.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.id + emp.type} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.department}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{emp.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ color: '#64748b' }}>{emp.current}</div>
                    <div style={{ color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowRight size={12}/> {emp.proposed}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{emp.effective}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Approved' ? '#dcfce7' : emp.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: emp.status === 'Approved' ? '#059669' : emp.status === 'Rejected' ? '#dc2626' : '#d97706', fontWeight: 500 }}>
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

      {/* Initiate Action Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#10b981" /> Initiate Employee Action
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleInitiate} style={{ padding: '24px' }}>
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
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Action Type</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => handleTypeChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Salary Revision">Salary Revision</option>
                    <option value="Role Change">Role Change</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Current Details</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={formData.current}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Proposed Details</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.proposed}
                    onChange={(e) => setFormData({...formData, proposed: e.target.value})}
                    placeholder="e.g. Senior Software Engineer"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Effective Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.effective}
                    onChange={(e) => setFormData({...formData, effective: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Reason & Remarks</label>
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
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Initiate Action</button>
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
              <div style={{ width: '48px', height: '48px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.type}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Action Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginBottom: '24px' }}>
               <div><strong style={{ color: '#64748b' }}>Action Type:</strong> {selectedEmp.type}</div>
               <div><strong style={{ color: '#64748b' }}>Effective Date:</strong> {selectedEmp.effective}</div>
               <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>Reason:</strong> {selectedEmp.reason}</div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>Current Details</div>
                 <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><span style={{ color: '#94a3b8' }}>State / Role</span> <br/> <strong>{selectedEmp.current}</strong></div>
                 </div>
              </div>
              <div style={{ flex: 1, background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '12px', textTransform: 'uppercase' }}>Proposed Details</div>
                 <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><span style={{ color: '#047857' }}>Proposed Change</span> <br/> <strong>{selectedEmp.proposed}</strong></div>
                 </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Approval Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="#10b981"/> Manager Review</div>
                 <span style={{ color: '#10b981', fontWeight: 500 }}>Approved</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} color={selectedEmp.status === 'Approved' ? '#10b981' : selectedEmp.status === 'Rejected' ? '#ef4444' : '#f59e0b'} /> HR Decision</div>
                 <span style={{ color: selectedEmp.status === 'Approved' ? '#10b981' : selectedEmp.status === 'Rejected' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                   {selectedEmp.status}
                 </span>
               </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: '#f8fafc' }}>
             <button 
               type="button"
               onClick={() => handleApprovalAction(selectedEmp.id, 'Rejected')}
               style={{ padding: '10px 24px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Reject
             </button>
             <button 
               type="button"
               onClick={() => handleApprovalAction(selectedEmp.id, 'Approved')}
               style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Approve
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
