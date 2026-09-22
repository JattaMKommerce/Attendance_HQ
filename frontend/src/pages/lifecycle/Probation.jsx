import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Filter, Plus, ChevronRight, X, Calendar, Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_PROBATION_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', designation: 'Software Engineer', joiningDate: '2025-07-01', probationEnd: '2025-09-30', daysLeft: 5, status: 'Ending Soon', rating: 3.8, goals: '8/10', attendance: '96%', feedback: 'Good technical skills and fast learner. Needs to improve documentation and communication.' },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', designation: 'HR Executive', joiningDate: '2025-07-15', probationEnd: '2025-10-14', daysLeft: 19, status: 'On Track', rating: 4.2, goals: '5/5', attendance: '98%', feedback: 'Excellent interpersonal skills and quick ramp up on company policies.' },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', designation: 'Operations Lead', joiningDate: '2025-08-01', probationEnd: '2025-10-31', daysLeft: 36, status: 'On Track', rating: 3.5, goals: '6/10', attendance: '92%', feedback: 'Shows good leadership on the floor. Punctuality can be improved.' },
];

export default function Probation() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_PROBATION_DATA);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    employeeId: '',
    designation: '',
    joiningDate: '2025-08-01',
    periodMonths: '3',
    manager: 'Neha Gupta',
    mentor: 'Arjun Sen'
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
      designation: firstEmp ? firstEmp.designation : '',
      joiningDate: firstEmp ? firstEmp.joining_date : '2025-08-01',
      periodMonths: '3',
      manager: 'Neha Gupta',
      mentor: 'Arjun Sen'
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
      designation: matchedEmp ? matchedEmp.designation : '',
      joiningDate: matchedEmp?.joining_date || prev.joiningDate
    }));
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id.toString() === empId.toString());
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.id,
        designation: emp.designation,
        department: emp.department || prev.department,
        joiningDate: emp.joining_date || prev.joiningDate
      }));
    }
  };

  const handleAddProbation = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'New Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;

    const joining = new Date(formData.joiningDate || '2025-08-01');
    const probationEnd = new Date(joining);
    probationEnd.setMonth(probationEnd.getMonth() + parseInt(formData.periodMonths || '3'));
    
    const today = new Date();
    const diffTime = probationEnd.getTime() - today.getTime();
    const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      designation: formData.designation || 'Associate',
      joiningDate: formData.joiningDate || '2025-08-01',
      probationEnd: probationEnd.toISOString().split('T')[0],
      daysLeft: daysLeft > 90 ? 85 : daysLeft,
      status: 'On Track',
      rating: 4.0,
      goals: '7/10',
      attendance: '95%',
      feedback: `Assigned to ${formData.mentor} for onboarding and probationary milestone checks.`
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: ${empName} added to Probation Management!`);
  };

  const handleAction = (empId, actionType) => {
    let newStatus = '';
    let updatedFields = {};

    if (actionType === 'confirm') {
      newStatus = 'Confirmed';
      updatedFields = { status: 'Confirmed', daysLeft: 0 };
    } else if (actionType === 'extend') {
      newStatus = 'Extended';
      updatedFields = { status: 'Extended', daysLeft: 30 };
    } else if (actionType === 'terminate') {
      newStatus = 'Ended';
      updatedFields = { status: 'Ended', daysLeft: 0 };
    }

    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({ ...prev, ...updatedFields }));
    }

    showAlert(`Probation Updated: Employee status changed to "${newStatus}"!`);
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Dynamic KPIs
  const kpis = {
    'On Probation': tableData.filter(d => d.status === 'On Track').length,
    'Due for Review': tableData.filter(d => d.status === 'Ending Soon').length,
    'Confirmed': tableData.filter(d => d.status === 'Confirmed').length,
    'Extended': tableData.filter(d => d.status === 'Extended').length
  };

  // Filtered list
  const filteredData = tableData.filter(emp => {
    const matchDept = selectedDept === 'All Departments' || emp.department.toLowerCase() === selectedDept.toLowerCase();
    const matchStatus = selectedStatus === 'All Status' || emp.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDate = !dateFilter || emp.probationEnd === dateFilter || emp.joiningDate === dateFilter;
    return matchDept && matchStatus && matchSearch && matchDate;
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
            <UserCheck size={24} color="#3b82f6" /> Probation Management
          </h1>
        </div>
        <button 
          type="button"
          onClick={handleOpenModal}
          className="stella-btn primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Employee to Probation
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
            <option value="On Track">On Track</option>
            <option value="Ending Soon">Ending Soon</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Extended">Extended</option>
            <option value="Ended">Ended</option>
          </select>
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Department</th>
              <th style={{ padding: '12px 16px' }}>Joining Date</th>
              <th style={{ padding: '12px 16px' }}>Probation End</th>
              <th style={{ padding: '12px 16px' }}>Days Left</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No probation records matching criteria.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.designation || 'Staff'}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{emp.department}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.joiningDate}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.probationEnd}</td>
                  <td style={{ padding: '12px 16px', fontWeight: emp.daysLeft <= 10 ? 600 : 400, color: emp.daysLeft <= 10 ? '#d97706' : '#334155' }}>{emp.daysLeft}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Confirmed' ? '#dcfce7' : emp.status === 'Ending Soon' ? '#fef3c7' : emp.status === 'Extended' ? '#fed7aa' : emp.status === 'Ended' ? '#fee2e2' : '#dbeafe', color: emp.status === 'Confirmed' ? '#059669' : emp.status === 'Ending Soon' ? '#d97706' : emp.status === 'Extended' ? '#c2410c' : emp.status === 'Ended' ? '#dc2626' : '#2563eb', fontWeight: 500 }}>
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

      {/* Add to Probation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#3b82f6" /> Add Employee to Probation
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <form onSubmit={handleAddProbation} style={{ padding: '24px' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Designation</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={formData.designation} 
                    placeholder="Auto-filled from employee"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Joining Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Probation Duration</label>
                  <select 
                    value={formData.periodMonths} 
                    onChange={(e) => setFormData({...formData, periodMonths: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="9">9 Months</option>
                    <option value="12">1 Year</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Manager</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.manager}
                    onChange={(e) => setFormData({...formData, manager: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Assigned Mentor</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.mentor}
                    onChange={(e) => setFormData({...formData, mentor: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Add to Probation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {selectedEmp && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '500px', background: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.department}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Probation Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '14px' }}>
              <div><strong style={{ color: '#64748b', display: 'block' }}>Joining Date</strong> {selectedEmp.joiningDate}</div>
              <div><strong style={{ color: '#64748b', display: 'block' }}>Probation End</strong> {selectedEmp.probationEnd}</div>
              <div><strong style={{ color: '#64748b', display: 'block' }}>Days Remaining</strong> <span style={{ color: selectedEmp.daysLeft <= 10 ? '#d97706' : '#10b981', fontWeight: 'bold' }}>{selectedEmp.daysLeft} days</span></div>
              <div>
                <strong style={{ color: '#64748b', display: 'block' }}>Status</strong>
                <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: selectedEmp.status === 'Confirmed' ? '#dcfce7' : selectedEmp.status === 'Extended' ? '#fed7aa' : selectedEmp.status === 'Ended' ? '#fee2e2' : '#dbeafe', color: selectedEmp.status === 'Confirmed' ? '#059669' : selectedEmp.status === 'Extended' ? '#c2410c' : selectedEmp.status === 'Ended' ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
                  {selectedEmp.status}
                </span>
              </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Performance Summary</h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Rating</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedEmp.rating}/5</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Goals</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedEmp.goals}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Attendance</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedEmp.attendance}</div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Manager Feedback</h4>
            <p style={{ fontSize: '14px', color: '#334155', background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
              {selectedEmp.feedback || 'Good performance and quick to adapt to workflows. Continued progress recommended.'}
            </p>

            <h4 style={{ margin: '24px 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Documents</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><FileText size={16} color="#3b82f6" /> Offer_Letter.pdf</div>
                <Download size={16} color="#64748b" style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><FileText size={16} color="#3b82f6" /> Probation_Agreement.pdf</div>
                <Download size={16} color="#64748b" style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'space-between', background: '#f8fafc' }}>
             <button 
               type="button"
               onClick={() => handleAction(selectedEmp.id, 'terminate')}
               style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               End Employment
             </button>
             <button 
               type="button"
               onClick={() => handleAction(selectedEmp.id, 'extend')}
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Extend Probation
             </button>
             <button 
               type="button"
               onClick={() => handleAction(selectedEmp.id, 'confirm')}
               style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Confirm Employee
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
