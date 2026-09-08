import React, { useState, useEffect } from 'react';
import { TrendingDown, Search, Plus, X, CheckCircle, Clock, Activity, AlertCircle } from 'lucide-react';
import { fetchLifecycleContext } from './lifecycleHelper';

const INITIAL_PIP_DATA = [
  { id: 'EMP002', name: 'Rahul Sharma', department: 'IT', designation: 'Software Engineer', type: 'PIP', period: 'Q3 2025', manager: 'Neha Gupta', status: 'In Progress', nextReview: '15 Oct 2025', progress: 65, rating: '3.2/5', targets: ['Reduce open bugs by 40%', 'Meet sprint deadlines', 'Improve documentation quality'] },
  { id: 'EMP007', name: 'Priya Patel', department: 'Human Resources', designation: 'HR Executive', type: 'Performance Review', period: 'H1 2025', manager: 'Amit Verma', status: 'Completed', nextReview: '-', progress: 100, rating: '4.5/5', targets: ['Complete onboarding process audit', 'Reduce hiring turnaround by 15%'] },
  { id: 'EMP011', name: 'Amit Kumar', department: 'Operations', designation: 'Operations Lead', type: 'Performance Review', period: 'Q3 2025', manager: 'Vikram Mehta', status: 'Pending', nextReview: '20 Oct 2025', progress: 40, rating: '3.6/5', targets: ['Improve vendor SLA compliance', 'Optimize warehouse logistics'] }
];

export default function PerformancePIP() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tableData, setTableData] = useState(INITIAL_PIP_DATA);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('Review'); // 'Performance Review' or 'PIP'
  const [formData, setFormData] = useState({
    department: '',
    employeeId: '',
    designation: '',
    period: 'Q3 2025',
    manager: 'Neha Gupta',
    targets: 'Complete project deliverables on time\nImprove code quality and unit test coverage'
  });

  // Fetch real employees and departments
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

  const handleOpenModal = (type) => {
    setModalType(type);
    const initialDept = departments.length > 0 ? departments[0] : 'IT';
    const firstEmp = employees.find(e => e.department === initialDept) || employees[0];
    
    setFormData({
      department: initialDept,
      employeeId: firstEmp ? firstEmp.id : '',
      designation: firstEmp ? firstEmp.designation : '',
      period: 'Q3 2025',
      manager: 'Neha Gupta',
      targets: type === 'PIP' ? 'Reduce error rate by 30%\nComplete weekly mentor checkpoints' : 'Exceed quarterly goals\nMentorship of junior team members'
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
      designation: matchedEmp ? matchedEmp.designation : ''
    }));
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id.toString() === empId.toString());
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.id,
        designation: emp.designation,
        department: emp.department || prev.department
      }));
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id.toString() === formData.employeeId.toString());
    const empName = emp ? emp.name : (formData.employeeId || 'Employee');
    const empCode = emp?.employee_code || formData.employeeId || `EMP${Math.floor(100 + Math.random() * 900)}`;

    const newRecord = {
      id: empCode,
      name: empName,
      department: formData.department || emp?.department || 'Operations',
      designation: formData.designation || 'Associate',
      type: modalType,
      period: formData.period || 'Q3 2025',
      manager: formData.manager || 'HR Reviewer',
      status: 'In Progress',
      nextReview: '15 Oct 2025',
      progress: modalType === 'PIP' ? 20 : 50,
      rating: '3.5/5',
      targets: formData.targets.split('\n').filter(Boolean)
    };

    setTableData(prev => [newRecord, ...prev]);
    setShowModal(false);
    showAlert(`Success: ${modalType} created for ${empName}!`);
  };

  const handleStatusUpdate = (empId, newStatus) => {
    setTableData(prev => prev.map(item => {
      if (item.id === empId) {
        return {
          ...item,
          status: newStatus,
          progress: newStatus === 'Completed' ? 100 : item.progress
        };
      }
      return item;
    }));

    if (selectedEmp && selectedEmp.id === empId) {
      setSelectedEmp(prev => ({
        ...prev,
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : prev.progress
      }));
    }

    showAlert(`Action Recorded: Status updated to "${newStatus}"!`);
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Filtered table rows
  const filteredData = tableData.filter(item => {
    const matchDept = selectedDept === 'All Departments' || item.department.toLowerCase() === selectedDept.toLowerCase();
    const matchStatus = selectedStatus === 'All Status' || item.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manager.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  // Dynamic KPI counts
  const kpiCounts = {
    All: tableData.length,
    'Performance Review': tableData.filter(t => t.type === 'Performance Review').length,
    PIP: tableData.filter(t => t.type === 'PIP').length,
    Completed: tableData.filter(t => t.status === 'Completed').length
  };

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
            <TrendingDown size={24} color="#8b5cf6" /> Performance & PIP
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Manage performance reviews and improvement plans</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="stella-btn outline" 
            onClick={() => handleOpenModal('Performance Review')}
            style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600 }}
          >
            Create Review
          </button>
          <button 
            type="button" 
            className="stella-btn primary" 
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }} 
            onClick={() => handleOpenModal('PIP')}
          >
            Create PIP
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(kpiCounts).map(([label, count]) => (
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
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Escalated">Escalated</option>
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, ID or manager..." 
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} 
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Period</th>
              <th style={{ padding: '12px 16px' }}>Manager</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Next Review</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No records found matching current filters.</td></tr>
            ) : (
              filteredData.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7e22ce', fontWeight: 'bold' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.id} • {emp.department}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ color: emp.type === 'PIP' ? '#ef4444' : '#334155', fontWeight: emp.type === 'PIP' ? 600 : 400 }}>{emp.type}</span></td>
                  <td style={{ padding: '12px 16px' }}>{emp.period}</td>
                  <td style={{ padding: '12px 16px' }}>{emp.manager}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: emp.status === 'Completed' ? '#dcfce7' : emp.status === 'Escalated' ? '#fee2e2' : emp.status === 'In Progress' ? '#dbeafe' : '#fef3c7', color: emp.status === 'Completed' ? '#059669' : emp.status === 'Escalated' ? '#dc2626' : emp.status === 'In Progress' ? '#2563eb' : '#d97706', fontWeight: 500 }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{emp.nextReview}</td>
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

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
               <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <TrendingDown size={20} color={modalType === 'PIP' ? '#ef4444' : '#8b5cf6'} /> 
                 Create {modalType}
               </h2>
               <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleCreate} style={{ padding: '24px' }}>
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
                        .map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.employee_code || e.id})</option>
                      ))}
                      {/* Fallback if none in selected dept */}
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
                      placeholder="Auto-filled based on employee"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }} 
                    />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Manager/Reviewer</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.manager} 
                      onChange={(e) => setFormData({...formData, manager: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                    />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Period</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.period} 
                      onChange={(e) => setFormData({...formData, period: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                    />
                 </div>
                 <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '8px' }}>Goals & Targets (one per line)</label>
                    <textarea 
                      rows="3"
                      value={formData.targets}
                      onChange={(e) => setFormData({...formData, targets: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                    />
                 </div>
              </div>

              {/* Performance Graph Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Activity size={18} color="#3b82f6" />
                    <strong style={{ color: '#334155', fontSize: '13px' }}>Recent Performance Trend</strong>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '100px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '60px', left: 0, right: 0, borderTop: '1px dashed #cbd5e1' }}></div>
                    <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                       <div style={{ width: '40px', height: '40%', background: '#93c5fd', borderRadius: '4px 4px 0 0' }}></div>
                       <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>M1</div>
                    </div>
                    <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                       <div style={{ width: '40px', height: '55%', background: '#93c5fd', borderRadius: '4px 4px 0 0' }}></div>
                       <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>M2</div>
                    </div>
                    <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                       <div style={{ width: '40px', height: '70%', background: '#3b82f6', borderRadius: '4px 4px 0 0' }}></div>
                       <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>M3</div>
                    </div>
                    <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                       <div style={{ width: '40px', height: modalType === 'PIP' ? '35%' : '80%', background: modalType === 'PIP' ? '#ef4444' : '#10b981', borderRadius: '4px 4px 0 0' }}></div>
                       <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Current</div>
                    </div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                 <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                 <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: modalType === 'PIP' ? '#ef4444' : '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Create {modalType}</button>
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
              <div style={{ width: '48px', height: '48px', background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7e22ce', fontWeight: 'bold', fontSize: '20px' }}>{selectedEmp.name.charAt(0)}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmp.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedEmp.id} | {selectedEmp.type}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{selectedEmp.type} Details</h4>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                 <div><strong style={{ color: '#64748b' }}>Designation:</strong> {selectedEmp.designation}</div>
                 <div><strong style={{ color: '#64748b' }}>Department:</strong> {selectedEmp.department}</div>
                 <div><strong style={{ color: '#64748b' }}>Manager:</strong> {selectedEmp.manager}</div>
                 <div>
                   <strong style={{ color: '#64748b' }}>Status:</strong>{' '}
                   <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: selectedEmp.status === 'Completed' ? '#dcfce7' : selectedEmp.status === 'Escalated' ? '#fee2e2' : '#dbeafe', color: selectedEmp.status === 'Completed' ? '#059669' : selectedEmp.status === 'Escalated' ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
                     {selectedEmp.status}
                   </span>
                 </div>
               </div>
               <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Current Progress</span> 
                    <strong>{selectedEmp.progress || 65}%</strong>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedEmp.progress || 65}%`, height: '100%', background: selectedEmp.status === 'Completed' ? '#10b981' : '#3b82f6', transition: 'width 0.3s' }}></div>
                  </div>
               </div>
            </div>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Improvement Areas & Targets</h4>
            <ul style={{ fontSize: '14px', color: '#334155', paddingLeft: '20px', marginBottom: '24px' }}>
              {selectedEmp.targets && selectedEmp.targets.length > 0 ? (
                selectedEmp.targets.map((t, idx) => <li key={idx} style={{ marginBottom: '6px' }}>{t}</li>)
              ) : (
                <>
                  <li>Reduce open bugs by 40%</li>
                  <li>Meet sprint deadlines consistently</li>
                  <li>Improve documentation quality</li>
                </>
              )}
            </ul>

            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Review Checkpoints</h4>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', flex: 1 }}>
                 <div style={{ fontSize: '13px', color: '#64748b' }}>Checkpoint 1</div>
                 <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><CheckCircle size={14}/> Verified</div>
              </div>
              <div style={{ border: '1px solid #3b82f6', padding: '12px', borderRadius: '8px', flex: 1, background: '#eff6ff' }}>
                 <div style={{ fontSize: '13px', color: '#1e40af' }}>{selectedEmp.nextReview !== '-' ? selectedEmp.nextReview : 'Final Assessment'}</div>
                 <div style={{ color: '#d97706', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Clock size={14}/> {selectedEmp.status}</div>
              </div>
            </div>
            
            <h4 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Manager Comments</h4>
            <p style={{ fontSize: '14px', color: '#334155', background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
              {selectedEmp.status === 'Completed' ? 'All performance goals successfully achieved. Review completed and archived.' : 'Actively tracking deliverables. Weekly evaluation ongoing with mentor.'}
            </p>
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'space-between', background: '#f8fafc' }}>
             <button 
               onClick={() => handleStatusUpdate(selectedEmp.id, 'In Progress')} 
               style={{ flex: 1, padding: '10px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Update Progress
             </button>
             <button 
               onClick={() => handleStatusUpdate(selectedEmp.id, 'Completed')} 
               style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Complete {selectedEmp.type}
             </button>
             <button 
               onClick={() => handleStatusUpdate(selectedEmp.id, 'Escalated')} 
               style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
             >
               Escalate
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
