import React, { useMemo, useState, useEffect } from "react";
import { payrollApi } from "../services/payrollApi";
import "./Payroll.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const DEPARTMENTS = ["All Departments", "Engineering", "Human Resources", "Finance", "Marketing", "Operations"];

export default function Payroll() {
  // Data State
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  // Workflow State
  const [selectedMonth, setSelectedMonth] = useState("September 2026");
  const [workflowStatus, setWorkflowStatus] = useState("Draft"); // Draft -> Calculate -> Review -> Approve -> Lock -> Paid
  
  // Advanced State (Local temporary store for new features)
  const [adjustments, setAdjustments] = useState([]); // { id, user_id, type: 'addition'|'deduction', amount, reason }
  
  // UI State
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [activeCardFilter, setActiveCardFilter] = useState("All"); // All, Ready, Review, Issues
  
  // Modals
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(null);

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getSalaries();
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error(err);
      showNotice("Failed to load employee master salaries.");
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  // --- RECALCULATION ENGINE ---
  const processedEmployees = useMemo(() => {
    return employees.map((emp) => {
      // Base Salary config
      const ctc = parseFloat(emp.ctc || 0);
      const monthlyCTC = ctc / 12;
      const basic = parseFloat(emp.base_salary || 0) || (monthlyCTC * 0.5);
      const hra = monthlyCTC * 0.2;
      const special = monthlyCTC - basic - hra;

      // Find Adjustments
      const empAdjustments = adjustments.filter(a => a.user_id === emp.user_id);
      const totalAdditions = empAdjustments.filter(a => a.type === 'addition').reduce((sum, a) => sum + parseFloat(a.amount), 0);
      const totalDeductionsManual = empAdjustments.filter(a => a.type === 'deduction').reduce((sum, a) => sum + parseFloat(a.amount), 0);

      // Statutory
      const pf = Math.min(basic, 15000) * 0.12;
      const pt = 200; // Standard Professional Tax

      // LOP (Simulated as random for demo if in calculate mode, or 0)
      // In real backend, this comes from previewPayrollRun
      const lopDays = 0; 
      const lopAmount = 0;

      const gross = basic + hra + special + totalAdditions;
      const statDeductions = pf + pt + lopAmount;
      const totalDeductions = statDeductions + totalDeductionsManual;
      const netPay = gross - totalDeductions;

      // Detect Issues
      const issues = [];
      if (!emp.bank_name || emp.bank_verification_status !== 'Verified') issues.push('Missing/Unverified Bank Details');
      if (ctc === 0) issues.push('Missing Salary Structure');
      if (netPay < 0) issues.push('Negative Net Salary');

      return {
        ...emp,
        breakdown: { basic, hra, special, totalAdditions, pf, pt, lopAmount, totalDeductionsManual },
        computed: { gross, statDeductions, totalDeductions, netPay, issues, empAdjustments }
      };
    });
  }, [employees, adjustments]);

  // --- OVERVIEW STATS ---
  const stats = useMemo(() => {
    let totalGross = 0, totalDed = 0, totalNet = 0;
    let ready = 0, review = 0, withIssues = 0;

    processedEmployees.forEach(emp => {
      totalGross += emp.computed.gross;
      totalDed += emp.computed.totalDeductions;
      totalNet += emp.computed.netPay;
      
      if (emp.computed.issues.length > 0) {
        withIssues++;
        review++;
      } else {
        ready++;
      }
    });

    return {
      totalEmployees: processedEmployees.length,
      totalGross, totalDed, totalNet, ready, review, withIssues
    };
  }, [processedEmployees]);

  // --- FILTERING ---
  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter(emp => {
      // Card Filter
      if (activeCardFilter === "Ready" && emp.computed.issues.length > 0) return false;
      if (activeCardFilter === "Review" && emp.computed.issues.length === 0) return false;
      if (activeCardFilter === "Issues" && emp.computed.issues.length === 0) return false;

      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(searchLower) ||
        (emp.employee_id || '').toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      // Department
      if (department !== "All Departments" && emp.department !== department) return false;

      return true;
    });
  }, [processedEmployees, search, department, activeCardFilter]);

  // --- ACTIONS ---
  const handleWorkflowAction = (action) => {
    if (action === 'Calculate') setWorkflowStatus('Calculate');
    if (action === 'Review') {
      if (stats.withIssues > 0) return showNotice("Resolve issues before reviewing.");
      setWorkflowStatus('Review');
    }
    if (action === 'Approve') setWorkflowStatus('Approve');
    if (action === 'Lock') setWorkflowStatus('Lock');
    if (action === 'Pay') setWorkflowStatus('Paid');
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAdj = {
      id: Date.now(),
      user_id: showAdjustmentModal.user_id,
      type: formData.get('type'),
      amount: formData.get('amount'),
      reason: formData.get('reason')
    };
    setAdjustments([...adjustments, newAdj]);
    setShowAdjustmentModal(null);
    showNotice("Adjustment saved and net pay recalculated.");
  };

  const removeAdjustment = (id) => {
    setAdjustments(adjustments.filter(a => a.id !== id));
  };

  const downloadPayslip = (emp) => {
    showNotice(`Generating payslip PDF for ${emp.first_name}...`);
    // Placeholder for actual PDF generation
  };

  return (
    <div className="payroll-page">
      {notice && <div className="payroll-notice"><span>{notice}</span><button onClick={() => setNotice("")} className="action-btn" style={{color:'white'}}>✕</button></div>}

      <div className="payroll-header">
        <div>
          <h1>Payroll Command Center</h1>
          <p>Process, validate, and manage employee salaries for the organization.</p>
        </div>
        <div className="payroll-header-actions">
          <button className="btn btn-secondary" onClick={() => window.print()}>Export Report</button>
        </div>
      </div>

      <div className="payroll-tabs">
        <button className="active">Overview</button>
        <button>Payroll Runs</button>
        <button>Employees</button>
        <button>Salary Structures</button>
        <button>Deductions & Taxes</button>
        <button>Payslips</button>
        <button>Settings</button>
      </div>

      <div className="payroll-workflow">
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <strong>Current Period:</strong>
          <select className="month-selector" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={workflowStatus !== 'Draft'}>
            <option>September 2026</option>
            <option>August 2026</option>
          </select>
          <span style={{marginLeft: '12px'}}><strong>Status:</strong></span>
          <span className={`workflow-status-badge ${workflowStatus.toLowerCase()}`}>{workflowStatus.toUpperCase()}</span>
        </div>
        <div className="workflow-buttons">
          {workflowStatus === 'Draft' && <button className="btn btn-primary" onClick={() => handleWorkflowAction('Calculate')}>Calculate Payroll</button>}
          {workflowStatus === 'Calculate' && <button className="btn btn-primary" onClick={() => handleWorkflowAction('Review')}>Submit for Review</button>}
          {workflowStatus === 'Review' && <button className="btn btn-primary" onClick={() => handleWorkflowAction('Approve')}>Approve Payroll</button>}
          {workflowStatus === 'Approve' && <button className="btn btn-primary" onClick={() => handleWorkflowAction('Lock')}>Lock Payroll</button>}
          {workflowStatus === 'Lock' && <button className="btn btn-primary" onClick={() => handleWorkflowAction('Pay')}>Mark as Paid</button>}
          {workflowStatus !== 'Draft' && workflowStatus !== 'Paid' && <button className="btn btn-secondary" onClick={() => setWorkflowStatus('Draft')}>Reset to Draft</button>}
        </div>
      </div>

      <div className="payroll-overview">
        <div className={`overview-card ${activeCardFilter === 'All' ? 'active' : ''}`} onClick={() => setActiveCardFilter('All')}>
          <div className="card-title">Total Employees</div>
          <div className="card-value">{stats.totalEmployees}</div>
        </div>
        <div className={`overview-card ${activeCardFilter === 'Ready' ? 'active' : ''}`} onClick={() => setActiveCardFilter('Ready')}>
          <div className="card-title">Ready for Payout</div>
          <div className="card-value" style={{color: '#059669'}}>{stats.ready}</div>
        </div>
        <div className={`overview-card warning ${activeCardFilter === 'Review' ? 'active' : ''}`} onClick={() => setActiveCardFilter('Review')}>
          <div className="card-title">Needs Review (Issues)</div>
          <div className="card-value" style={{color: '#d97706'}}>{stats.review}</div>
        </div>
        <div className="overview-card">
          <div className="card-title">Total Gross</div>
          <div className="card-value">{formatCurrency(stats.totalGross)}</div>
        </div>
        <div className="overview-card">
          <div className="card-title">Total Deductions</div>
          <div className="card-value">{formatCurrency(stats.totalDed)}</div>
        </div>
        <div className="overview-card">
          <div className="card-title">Net Payable</div>
          <div className="card-value" style={{color: '#4f46e5'}}>{formatCurrency(stats.totalNet)}</div>
        </div>
      </div>

      {stats.withIssues > 0 && workflowStatus !== 'Paid' && (
        <div className="issues-panel">
          <h3 style={{margin: '0 0 12px 0', color: '#92400e', fontSize: '15px'}}>Action Required: Payroll Issues Detected</h3>
          {processedEmployees.filter(e => e.computed.issues.length > 0).map(emp => (
            <div key={emp.user_id} className="issue-item" onClick={() => { setSearch(emp.first_name); setActiveCardFilter('All'); }}>
              <strong>{emp.first_name} {emp.last_name}</strong> - 
              {emp.computed.issues.join(', ')}
            </div>
          ))}
        </div>
      )}

      <div className="payroll-workspace">
        <div className="workspace-header">
          <input type="text" placeholder="Search employee or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
          {activeCardFilter !== 'All' && (
            <button className="btn btn-secondary" onClick={() => setActiveCardFilter('All')}>Clear Filter ({activeCardFilter})</button>
          )}
        </div>

        <div className="payroll-table-wrapper">
          <table className="payroll-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Gross Pay</th>
                <th>Additions</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.user_id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">{emp.first_name.charAt(0)}</div>
                      <div className="employee-details">
                        <strong>{emp.first_name} {emp.last_name}</strong>
                        <small>{emp.employee_id} • {emp.department}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {emp.computed.issues.length > 0 ? (
                      <span className="status-pill issue">Issue Detected</span>
                    ) : (
                      <span className="status-pill ready">Ready</span>
                    )}
                  </td>
                  <td className="amount-cell">{formatCurrency(emp.computed.gross)}</td>
                  <td className="amount-cell positive">{formatCurrency(emp.breakdown.totalAdditions)}</td>
                  <td className="amount-cell negative">{formatCurrency(emp.computed.totalDeductions)}</td>
                  <td className="amount-cell" style={{fontWeight: 700}}>{formatCurrency(emp.computed.netPay)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => setShowBreakdownModal(emp)}>Breakdown</button>
                      <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => setShowAdjustmentModal(emp)} disabled={workflowStatus === 'Paid' || workflowStatus === 'Lock'}>Adjust</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', color: '#6b7280'}}>No employees match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Add Adjustment</h2>
              <button className="action-btn" onClick={() => setShowAdjustmentModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body">
                <div style={{marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '6px'}}>
                  <strong>{showAdjustmentModal.first_name} {showAdjustmentModal.last_name}</strong>
                  <br/><small>{selectedMonth}</small>
                </div>
                
                <div className="form-group">
                  <label>Adjustment Type</label>
                  <select name="type" required>
                    <option value="addition">Addition (Bonus, Arrears, Incentives)</option>
                    <option value="deduction">Deduction (Loan, Fine, LOP Override)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" name="amount" required min="1" step="0.01" />
                </div>

                <div className="form-group">
                  <label>Reason / Category</label>
                  <input type="text" name="reason" required placeholder="e.g. Performance Bonus" />
                </div>

                {showAdjustmentModal.computed.empAdjustments.length > 0 && (
                  <div style={{marginTop: '24px'}}>
                    <h4 style={{fontSize: '13px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px 0'}}>Existing Adjustments</h4>
                    {showAdjustmentModal.computed.empAdjustments.map(adj => (
                      <div key={adj.id} className="flex justify-between" style={{padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '8px'}}>
                        <div>
                          <span style={{fontWeight: 500}}>{adj.reason}</span>
                          <span className={`status-pill ${adj.type === 'addition' ? 'ready' : 'review'}`} style={{marginLeft: '8px', padding: '2px 6px'}}>{adj.type}</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <span className="amount-cell">{formatCurrency(adj.amount)}</span>
                          <button type="button" className="action-btn" onClick={() => removeAdjustment(adj.id)} style={{color: '#ef4444'}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustmentModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Recalculate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Breakdown Modal */}
      {showBreakdownModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Salary Breakdown</h2>
              <button className="action-btn" onClick={() => setShowBreakdownModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex justify-between" style={{marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb'}}>
                <div>
                  <div style={{fontSize: '18px', fontWeight: 600}}>{showBreakdownModal.first_name} {showBreakdownModal.last_name}</div>
                  <div style={{color: '#6b7280', fontSize: '14px'}}>{showBreakdownModal.employee_id} • {showBreakdownModal.designation}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '14px', color: '#6b7280'}}>Net Pay</div>
                  <div style={{fontSize: '24px', fontWeight: 700, color: '#111827'}}>{formatCurrency(showBreakdownModal.computed.netPay)}</div>
                </div>
              </div>

              <div className="breakdown-grid">
                <div className="breakdown-section">
                  <h3>Earnings</h3>
                  <div className="breakdown-item"><span>Basic Salary</span><span>{formatCurrency(showBreakdownModal.breakdown.basic)}</span></div>
                  <div className="breakdown-item"><span>House Rent Allowance (HRA)</span><span>{formatCurrency(showBreakdownModal.breakdown.hra)}</span></div>
                  <div className="breakdown-item"><span>Special Allowance</span><span>{formatCurrency(showBreakdownModal.breakdown.special)}</span></div>
                  
                  {showBreakdownModal.computed.empAdjustments.filter(a => a.type === 'addition').map(adj => (
                     <div key={adj.id} className="breakdown-item" style={{color: '#059669'}}><span>{adj.reason} (Adj)</span><span>{formatCurrency(adj.amount)}</span></div>
                  ))}

                  <div className="breakdown-item total"><span>Gross Earnings</span><span>{formatCurrency(showBreakdownModal.computed.gross)}</span></div>
                </div>

                <div className="breakdown-section">
                  <h3>Deductions</h3>
                  <div className="breakdown-item"><span>Provident Fund (PF)</span><span>{formatCurrency(showBreakdownModal.breakdown.pf)}</span></div>
                  <div className="breakdown-item"><span>Professional Tax (PT)</span><span>{formatCurrency(showBreakdownModal.breakdown.pt)}</span></div>
                  {showBreakdownModal.breakdown.lopAmount > 0 && (
                     <div className="breakdown-item" style={{color: '#ef4444'}}><span>Loss of Pay</span><span>{formatCurrency(showBreakdownModal.breakdown.lopAmount)}</span></div>
                  )}

                  {showBreakdownModal.computed.empAdjustments.filter(a => a.type === 'deduction').map(adj => (
                     <div key={adj.id} className="breakdown-item" style={{color: '#ef4444'}}><span>{adj.reason} (Adj)</span><span>{formatCurrency(adj.amount)}</span></div>
                  ))}

                  <div className="breakdown-item total"><span>Total Deductions</span><span>{formatCurrency(showBreakdownModal.computed.totalDeductions)}</span></div>
                </div>
              </div>

              {showBreakdownModal.computed.issues.length > 0 && (
                <div style={{marginTop: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px'}}>
                  <strong style={{color: '#991b1b', display: 'block', marginBottom: '8px'}}>Detected Issues</strong>
                  <ul style={{margin: 0, paddingLeft: '20px', color: '#b91c1c', fontSize: '14px'}}>
                    {showBreakdownModal.computed.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => downloadPayslip(showBreakdownModal)}>Download Payslip</button>
              <button className="btn btn-primary" onClick={() => setShowBreakdownModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}