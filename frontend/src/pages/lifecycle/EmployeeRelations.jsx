import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Plus, X, FileText, CheckCircle, Clock } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_RELATIONS_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', caseId: 'ER-2025-001', caseType: 'Policy Violation', reason: 'Repeated late login', date: '2025-09-12', status: 'Under Review', description: 'Employee has logged in late for 5 consecutive days without prior notification.', assignedTo: 'Anita Patel (HR Manager)' },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', caseId: 'ER-2025-002', caseType: 'Warning', reason: 'Unapproved leave', date: '2025-09-05', status: 'Issued', description: 'Absent on critical project sprint delivery date without taking approved leave.', assignedTo: 'Amit Verma (Director HR)' },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', caseId: 'ER-2025-003', caseType: 'Investigation', reason: 'Misconduct', date: '2025-09-01', status: 'In Progress', description: 'Investigation initiated regarding conflict during warehouse inventory reconciliation.', assignedTo: 'Anita Patel (HR Manager)' },
];

export default function EmployeeRelations() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_RELATIONS_DATA);
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
    caseType: 'Policy Violation',
    reason: '',
    date: '2025-09-15',
    assignedTo: 'Anita Patel (HR Manager)',
    description: ''
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
      caseType: 'Policy Violation',
      reason: 'Repeated non-adherence to office policy',
      date: new Date().toISOString().split('T')[0],
      assignedTo: 'Anita Patel (HR Manager)',
      description: 'Documented infraction requiring formal grievance or disciplinary review.'
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

  const handleRecordCase = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;
    const randomCaseNum = Math.floor(100 + Math.random() * 900);

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      caseId: `ER-2025-${randomCaseNum}`,
      caseType: formData.caseType,
      reason: formData.reason,
      date: formData.date,
      status: 'Under Review',
      description: formData.description,
      assignedTo: formData.assignedTo
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: Case ${newRecord.caseId} recorded for ${empName}!`);
  };

  const handleCaseAction = (empId, newStatus) => {
    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, status: newStatus }));
    }

    showAlert(`Case status updated to "${newStatus}"!`);
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // KPIs
  const kpis = {
    'All Cases': tableData.length,
    'Warnings': tableData.filter(d => d.caseType === 'Warning' || d.status === 'Warning Issued').length,
    'Investigations': tableData.filter(d => d.caseType === 'Investigation').length,
    'Policy Violations': tableData.filter(d => d.caseType === 'Policy Violation').length,
    'Closed': tableData.filter(d => d.status === 'Closed').length
  };

  // Filtered rows
  const filteredData = tableData.filter(item => {
    const matchDept = selectedDept === 'All Departments' || (item.department && item.department.toLowerCase() === selectedDept.toLowerCase());
    const matchStatus = selectedStatus === 'All Status' || item.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase());
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
            <AlertTriangle size={24} color="#ef4444" /> Employee Relations
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Manage disciplinary cases, warnings and policy violations</p>
        </div>
        <button 
          type="button"
          onClick={handleOpenModal}
          className="stella-btn primary" 
          style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Record New Case
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            <option value="All Status">All Status</option>
            <option value="Under Review">Under Review</option>
            <option value="Issued">Issued</option>
            <option value="Warning Issued">Warning Issued</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, case ID, reason..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Case Type</th>
              <th style={{ padding: '12px 16px' }}>Reason</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No cases found.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.caseId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.department}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{emp.caseType}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.reason}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.date}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Closed' ? '#dcfce7' : emp.status === 'Issued' || emp.status === 'Warning Issued' ? '#fee2e2' : '#fef3c7', color: emp.status === 'Closed' ? '#059669' : emp.status === 'Issued' || emp.status === 'Warning Issued' ? '#dc2626' : '#d97706', fontWeight: 500 }}>
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

      {/* Record New Case Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#ef4444" /> Record Employee Relations Case
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleRecordCase} style={{ padding: '24px' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Case Type</label>
                  <select 
                    value={formData.caseType} 
                    onChange={(e) => setFormData({...formData, caseType: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="Policy Violation">Policy Violation</option>
                    <option value="Warning">Warning</option>
                    <option value="Investigation">Investigation</option>
                    <option value="Misconduct">Misconduct</option>
                    <option value="Attendance Issue">Attendance Issue</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Incident Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Reason / Subject</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="e.g. Unapproved leave / Violation of dress code"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Assigned HR Investigator</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Incident Description & Evidence</label>
                  <textarea 
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe facts, witnesses and any prior warnings..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Record Case</button>
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
              <div style={{ width: '48px', height: '48px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.caseId}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Case Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginBottom: '24px' }}>
               <div><strong style={{ color: '#64748b' }}>Case ID:</strong> {selectedEmp.caseId}</div>
               <div><strong style={{ color: '#64748b' }}>Case Type:</strong> {selectedEmp.caseType}</div>
               <div><strong style={{ color: '#64748b' }}>Opened On:</strong> {selectedEmp.date}</div>
               <div>
                 <strong style={{ color: '#64748b' }}>Status:</strong>{' '}
                 <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: selectedEmp.status === 'Closed' ? '#dcfce7' : '#fee2e2', color: selectedEmp.status === 'Closed' ? '#059669' : '#dc2626', fontWeight: 600 }}>
                   {selectedEmp.status}
                 </span>
               </div>
               <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>Assigned To:</strong> {selectedEmp.assignedTo}</div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Incident Details</h4>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '24px' }}>
               <div style={{ marginBottom: '8px' }}><strong style={{ color: '#64748b' }}>Reason:</strong> {selectedEmp.reason}</div>
               <div><strong style={{ color: '#64748b' }}>Description:</strong> {selectedEmp.description}</div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Previous Actions & Audit</h4>
            <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', marginBottom: '24px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Action</th>
                  <th style={{ padding: '8px' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>{selectedEmp.date}</td>
                  <td style={{ padding: '8px' }}>Case Opened</td>
                  <td style={{ padding: '8px' }}>Initial report filed</td>
                </tr>
                {selectedEmp.status === 'Warning Issued' && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fff1f2' }}>
                    <td style={{ padding: '8px' }}>Today</td>
                    <td style={{ padding: '8px', color: '#dc2626', fontWeight: 'bold' }}>Official Warning</td>
                    <td style={{ padding: '8px' }}>Written warning issued to employee</td>
                  </tr>
                )}
                {selectedEmp.status === 'Closed' && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                    <td style={{ padding: '8px' }}>Today</td>
                    <td style={{ padding: '8px', color: '#16a34a', fontWeight: 'bold' }}>Case Resolved</td>
                    <td style={{ padding: '8px' }}>Resolution agreed and case closed</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Documents</h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <FileText size={16} color="#3b82f6" /> Grievance_Log.pdf
              </div>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <FileText size={16} color="#3b82f6" /> Evidence_Note.png
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'space-between', background: '#f8fafc' }}>
             <button 
               type="button"
               onClick={() => handleCaseAction(selectedEmp.id, 'Warning Issued')}
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Add Warning
             </button>
             <button 
               type="button"
               onClick={() => handleCaseAction(selectedEmp.id, 'Under Review')}
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Update Case
             </button>
             <button 
               type="button"
               onClick={() => handleCaseAction(selectedEmp.id, 'Closed')}
               style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Close Case
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
