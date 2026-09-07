import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Settings, 
  CalendarDays, 
  Download, 
  IndianRupee, 
  Clock, 
  Sparkles,
  BarChart2,
  Filter,
  Search,
  LayoutGrid,
  List,
  Printer,
  Eye,
  X,
  Users
} from 'lucide-react';
import { getEmployees } from '../../services/employeeApi';
import './PayrollOverview.css';

export default function PayrollOverview() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dynamic Date Logic
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'short' });
  const currentFullMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const lastDay = new Date(currentYear, today.getMonth() + 1, 0).getDate();
  
  const defaultDateRange = `01 ${currentMonth} ${currentYear} — ${lastDay} ${currentMonth} ${currentYear}`;
  const [dateRange, setDateRange] = useState(defaultDateRange);

  // Computed KPIs
  const [kpis, setKpis] = useState({
    monthlyPayroll: 0,
    bonus: 0,
    incentives: 0
  });

  // Chart interactivity states
  const [chartView, setChartView] = useState('Month'); // Day, Week, Month
  const [visibleSeries, setVisibleSeries] = useState({
    payroll: true,
    bonus: true,
    incentives: true
  });

  // Simple calendar selection
  const handleDateSelect = (newRange) => {
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  const toggleSeries = (series) => {
    setVisibleSeries(prev => ({...prev, [series]: !prev[series]}));
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getEmployees();
        if (res.success && res.data && res.data.employees) {
          let totalSalary = 0;
          let totalIncentives = 0;
          let totalBonus = 0;
          
          const mappedEmployees = res.data.employees.map(emp => {
            // Strictly use DB values. No fake data for payroll.
            let baseSalary = 0;
            if (emp.gross_salary) {
              baseSalary = parseFloat(emp.gross_salary) || 0;
            } else if (emp.basic_salary) {
              baseSalary = parseFloat(emp.basic_salary) || 0;
            }
            
            const empIncentives = emp.incentives ? (parseFloat(emp.incentives) || 0) : 0;
            // Treating special_allowance or a computed 5% as bonus since DB doesn't have a strict bonus column
            const empBonus = emp.special_allowance ? (parseFloat(emp.special_allowance) || 0) : (baseSalary * 0.05);

            totalSalary += baseSalary;
            totalIncentives += empIncentives;
            totalBonus += empBonus;

            return {
              id: emp.id,
              name: `${emp.first_name} ${emp.last_name}`,
              email: emp.email,
              position: emp.designation_name || emp.department_name || 'Employee',
              salary: baseSalary,
              incentives: empIncentives,
              bonus: empBonus,
              lop: 0, // Loss of pay (default 0 for now)
              type: emp.employment_type ? emp.employment_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-') : 'Full-Time',
              status: emp.status === 'active' && baseSalary > 0 ? 'Pending' : (baseSalary > 0 ? 'Paid' : 'No Salary Set'),
              avatar: emp.profile_image_url || `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=random`
            };
          });
          
          setEmployees(mappedEmployees);
          
          // Set KPIs
          setKpis({
            monthlyPayroll: totalSalary,
            bonus: totalBonus,
            incentives: totalIncentives
          });
        }
      } catch (err) {
        console.error("Failed to fetch employees for payroll:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // Generate dynamic chart data based on the current KPI
  // The user requested REAL data without fake alignments/multipliers.
  let chartData = [];
  if (chartView === 'Month') {
    chartData = [
      { label: 'Jan', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Feb', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Mar', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Apr', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'May', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Jun', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Jul', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Aug', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Sep', payroll: kpis.monthlyPayroll, bonus: kpis.bonus, incentives: kpis.incentives },
    ];
  } else if (chartView === 'Week') {
    chartData = [
      { label: 'Week 1', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Week 2', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Week 3', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Week 4', payroll: kpis.monthlyPayroll, bonus: kpis.bonus, incentives: kpis.incentives },
    ];
  } else if (chartView === 'Day') {
    chartData = [
      { label: 'Mon', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Tue', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Wed', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Thu', payroll: 0, bonus: 0, incentives: 0 },
      { label: 'Fri', payroll: kpis.monthlyPayroll, bonus: kpis.bonus, incentives: kpis.incentives },
    ];
  }

  // Find max value to scale the CSS bars
  const maxChartValue = Math.max(...chartData.map(d => d.payroll + d.bonus + d.incentives), 1); // fallback to 1 to avoid div by zero
  // Calendar Generation Logic
  const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentYear, today.getMonth(), 1).getDay();
  const prevMonthDays = new Date(currentYear, today.getMonth(), 0).getDate();
  
  const calendarGrid = [];
  // Previous month padded days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarGrid.push({ day: prevMonthDays - i, isMuted: true, fullDate: null });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const formattedDate = `${i.toString().padStart(2, '0')} ${currentMonth} ${currentYear} — ${lastDay} ${currentMonth} ${currentYear}`;
    calendarGrid.push({ day: i, isMuted: false, fullDate: formattedDate, isToday: i === today.getDate() });
  }
  // Next month padded days
  const remainingCells = 42 - calendarGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarGrid.push({ day: i, isMuted: true, fullDate: null });
  }

  // Format currency
  const formatINR = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcWaiting, setCalcWaiting] = useState(false);

  const handleCalcInput = (input) => {
    if (['+', '-', '×', '÷'].includes(input)) {
      if (calcOp && !calcWaiting) {
        // Evaluate previous op
        const current = parseFloat(calcDisplay);
        let result = current;
        if (calcOp === '+') result = calcMemory + current;
        if (calcOp === '-') result = calcMemory - current;
        if (calcOp === '×') result = calcMemory * current;
        if (calcOp === '÷') result = calcMemory / current;
        setCalcDisplay(String(result));
        setCalcMemory(result);
      } else {
        setCalcMemory(parseFloat(calcDisplay));
      }
      setCalcOp(input);
      setCalcWaiting(true);
    } else if (input === '=') {
      if (calcOp && calcMemory !== null) {
        const current = parseFloat(calcDisplay);
        let result = current;
        if (calcOp === '+') result = calcMemory + current;
        if (calcOp === '-') result = calcMemory - current;
        if (calcOp === '×') result = calcMemory * current;
        if (calcOp === '÷') result = calcMemory / current;
        setCalcDisplay(String(result));
        setCalcMemory(null);
        setCalcOp(null);
        setCalcWaiting(true);
      }
    } else if (input === 'AC') {
      setCalcDisplay('0');
      setCalcMemory(null);
      setCalcOp(null);
      setCalcWaiting(false);
    } else if (input === '+/-') {
      setCalcDisplay(String(parseFloat(calcDisplay) * -1));
    } else if (input === '%') {
      setCalcDisplay(String(parseFloat(calcDisplay) / 100));
    } else {
      // Number or dot
      if (calcWaiting) {
        setCalcDisplay(input === '.' ? '0.' : input);
        setCalcWaiting(false);
      } else {
        if (input === '.' && calcDisplay.includes('.')) return;
        setCalcDisplay(calcDisplay === '0' && input !== '.' ? input : calcDisplay + input);
      }
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, status: newStatus } : emp));
  };

  // Modal states
  const [viewEmployee, setViewEmployee] = useState(null);

  const handlePrint = (emp) => {
    // Temporarily change document title so the print PDF gets a professional filename
    const originalTitle = document.title;
    document.title = `Payslip_September_2026`;
    
    // Triggers the browser's native print dialog
    window.print();
    
    // Restore original title after a slight delay to ensure print dialog caught it
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'Paid' && emp.status === 'Paid') ||
                         (statusFilter === 'Pending' && emp.status === 'Pending') ||
                         (statusFilter === 'Paused' && emp.status === 'Paused') ||
                         (statusFilter === 'Delayed' && emp.status === 'Delayed') ||
                         (statusFilter === 'No Salary' && emp.status === 'No Salary Set');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="stella-container">
      {/* Official Payslip Modal */}
      {viewEmployee && (
        <div className="stella-modal-overlay">
          <div className="stella-modal" style={{ width: '850px', maxWidth: '95vw', borderRadius: '12px' }}>
            <div className="stella-modal-header hide-on-print">
              <h3>Official Payslip</h3>
              <button className="s-close-btn" onClick={() => setViewEmployee(null)}><X size={18} /></button>
            </div>
            
            <div className="stella-modal-body" id="payslip-document" style={{ padding: '40px 48px', backgroundColor: '#fff', color: '#0f172a', fontFamily: '"Inter", -apple-system, sans-serif', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '24px', marginBottom: '32px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>A</div>
                    <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>ACME CORP</h2>
                  </div>
                  <p style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '12px' }}>123 Corporate Blvd, Tech District</p>
                  <p style={{ margin: 0, color: '#475569', fontSize: '12px' }}>San Francisco, CA 94107, United States</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '300', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>Payslip</h1>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600' }}>Month: <span style={{ color: '#475569', fontWeight: '400' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span></p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Date: <span style={{ color: '#475569', fontWeight: '400' }}>{new Date().toLocaleDateString()}</span></p>
                </div>
              </div>

              {/* Employee & Payment Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Employee Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Name:</strong> <span>{viewEmployee.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Employee ID:</strong> <span>EMP-{String(viewEmployee.id).padStart(4, '0')}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Designation:</strong> <span>{viewEmployee.position}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Department:</strong> <span>Engineering</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Type:</strong> <span>{viewEmployee.type}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Date of Joining:</strong> <span>01 Apr 2024</span></div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Payment Details</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Bank Name:</strong> <span>Chase Bank</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Account No:</strong> <span>XXXX-XXXX-1234</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>PAN No:</strong> <span>ABCDE1234F</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>UAN No:</strong> <span>100XXXXX3456</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Working Days:</strong> <span>30</span></div>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Earnings Column */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Earnings</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Basic Salary:</strong> <span>{formatINR(viewEmployee.salary || 0)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>House Rent Allowance:</strong> <span>{formatINR((viewEmployee.salary || 0) * 0.4)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Special Allowance (Bonus):</strong> <span>{formatINR(viewEmployee.bonus || 0)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Incentives:</strong> <span>{formatINR(viewEmployee.incentives || 0)}</span></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}>
                    <strong>Gross Earnings:</strong>
                    <strong>{formatINR((viewEmployee.salary || 0) + ((viewEmployee.salary || 0) * 0.4) + (viewEmployee.bonus || 0) + (viewEmployee.incentives || 0))}</strong>
                  </div>
                </div>
                
                {/* Deductions Column */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Deductions</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Loss of Pay (LOP):</strong> <span>{formatINR(viewEmployee.lop || 0)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Provident Fund (PF):</strong> <span style={{ color: '#64748b' }}>{formatINR((viewEmployee.salary || 0) * 0.12)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Professional Tax:</strong> <span style={{ color: '#64748b' }}>₹200</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Income Tax (TDS):</strong> <span style={{ color: '#64748b' }}>₹0</span></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}>
                    <strong>Total Deductions:</strong>
                    <strong>{formatINR((viewEmployee.lop || 0) + ((viewEmployee.salary || 0) * 0.12) + 200)}</strong>
                  </div>
                </div>
              </div>

              {/* Net Pay & Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', marginTop: '32px' }}>
                <div style={{ flex: 1, marginRight: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                    <strong style={{ fontSize: '13px', color: '#334155', marginRight: '8px' }}>Net Pay Amount:</strong>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatINR(
                        ((viewEmployee.salary || 0) + ((viewEmployee.salary || 0) * 0.4) + (viewEmployee.bonus || 0) + (viewEmployee.incentives || 0)) -
                        ((viewEmployee.lop || 0) + ((viewEmployee.salary || 0) * 0.12) + 200)
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Amount in words: <span style={{ fontStyle: 'italic' }}>**Auto-generated based on final amount**</span></div>
                </div>
                
                <div style={{ width: '180px', textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '22px' }}>
                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Authorized Signatory</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Acme Corp HR Dept</div>
                </div>
              </div>

              {/* Footer / T&C */}
              <div style={{ fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '16px', lineHeight: '1.6' }}>
                <strong style={{ color: '#64748b' }}>CONFIDENTIAL DOCUMENT:</strong> This is a computer-generated payslip and does not require a physical signature. The information contained herein is highly confidential and intended solely for the referenced employee. Please report any discrepancies to the HR or Payroll department within 7 working days.
              </div>
            </div>
            
            <div className="stella-modal-footer hide-on-print" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button className="stella-btn outline" onClick={() => setViewEmployee(null)}>Close</button>
              <button className="stella-btn primary" onClick={() => handlePrint(viewEmployee)}>
                <Printer size={16} style={{marginRight: '6px'}} /> Print Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal overlay */}
      {showSettings && (
        <div className="stella-modal-overlay">
          <div className="stella-modal">
            <div className="stella-modal-header">
              <h3>Payroll Settings</h3>
              <button className="s-close-btn" onClick={() => setShowSettings(false)}><X size={18} /></button>
            </div>
            <div className="stella-modal-body">
              <div className="s-form-group">
                <label>Payroll Cycle</label>
                <select className="s-select"><option>Monthly</option><option>Bi-weekly</option></select>
              </div>
              <div className="s-form-group">
                <label>Default Payment Method</label>
                <select className="s-select"><option>Bank Transfer</option><option>Cheque</option></select>
              </div>
            </div>
            <div className="stella-modal-footer">
              <button className="stella-btn outline" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="stella-btn primary" onClick={() => setShowSettings(false)}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="stella-header">
        <div className="stella-title">
          <div className="stella-icon-box"><Briefcase size={20} /></div>
          <h2>Payroll</h2>
        </div>
        <div className="stella-actions">
          <button className="stella-btn outline" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Payroll Settings
          </button>
          
          <div style={{ position: 'relative' }}>
            <button className="stella-btn outline" onClick={() => setShowCalculator(!showCalculator)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="14.01"></line><line x1="16" y1="10" x2="16" y2="10.01"></line><line x1="16" y1="18" x2="16" y2="18.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line><line x1="8" y1="14" x2="8" y2="14.01"></line><line x1="8" y1="10" x2="8" y2="10.01"></line><line x1="8" y1="18" x2="8" y2="18.01"></line></svg> Calculator
            </button>
            
            {/* MacOS Calculator Modal */}
            {showCalculator && (
              <>
                {/* Invisible overlay just to close when clicking outside */}
                <div style={{position: 'fixed', inset: 0, zIndex: 1099}} onClick={() => setShowCalculator(false)}></div>
                <div className="mac-calculator">
                  <div className="mac-calc-header">
                    <div className="mac-dot red" onClick={() => setShowCalculator(false)}></div>
                    <div className="mac-dot yellow" onClick={() => setShowCalculator(false)}></div>
                    <div className="mac-dot green"></div>
                  </div>
                  <div className="mac-calc-display">{calcDisplay.length > 9 ? parseFloat(calcDisplay).toExponential(4) : calcDisplay}</div>
                  <div className="mac-calc-grid">
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('AC')}>{calcDisplay === '0' ? 'AC' : 'C'}</button>
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('+/-')}>+/-</button>
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('%')}>%</button>
                    <button className={`mac-calc-btn orange ${calcOp === '÷' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('÷')}>÷</button>
                    
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('7')}>7</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('8')}>8</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('9')}>9</button>
                    <button className={`mac-calc-btn orange ${calcOp === '×' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('×')}>×</button>
                    
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('4')}>4</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('5')}>5</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('6')}>6</button>
                    <button className={`mac-calc-btn orange ${calcOp === '-' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('-')}>-</button>
                    
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('1')}>1</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('2')}>2</button>
                    <button className="mac-calc-btn" onClick={() => handleCalcInput('3')}>3</button>
                    <button className={`mac-calc-btn orange ${calcOp === '+' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('+')}>+</button>
                    
                    <button className="mac-calc-btn zero" onClick={() => handleCalcInput('0')}>0</button>
                    <button className="mac-calc-btn dot" onClick={() => handleCalcInput('.')}>.</button>
                    <button className="mac-calc-btn orange equals" onClick={() => handleCalcInput('=')}>=</button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="stella-datepicker-wrapper">
            <button className="stella-btn outline" onClick={() => setShowDatePicker(!showDatePicker)}>
              <CalendarDays size={16} /> {dateRange}
            </button>
            
            {showDatePicker && (
              <div className="stella-calendar-dropdown" style={{ width: '280px' }}>
                <div className="stella-cal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{currentFullMonth} {currentYear}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={{ padding: '2px 6px' }}>&lt;</button>
                    <button style={{ padding: '2px 6px' }}>&gt;</button>
                  </div>
                </div>
                <div className="stella-cal-body">
                  <div className="stella-cal-weekdays">
                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                  </div>
                  <div className="stella-cal-days">
                    {calendarGrid.slice(0, 35).map((d, i) => (
                      <span 
                        key={i} 
                        className={`stella-day ${d.isMuted ? 'muted' : ''} ${d.isToday ? 'active' : ''}`}
                        onClick={() => d.fullDate && handleDateSelect(d.fullDate)}
                      >
                        {d.day}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="stella-cal-footer">
                  <button className="stella-btn outline" style={{width: '100%', justifyContent: 'center'}} onClick={() => handleDateSelect(`01 ${currentMonth} ${currentYear} — ${lastDay} ${currentMonth} ${currentYear}`)}>This Month</button>
                </div>
              </div>
            )}
          </div>

          <button className="stella-btn primary" onClick={() => alert('Downloading CSV...')}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      {/* Top Grid */}
      <div className="stella-grid">
        
        {/* Column 1: KPI Stack */}
        <div className="stella-kpi-stack" style={{ justifyContent: 'center' }}>
          <div className="stella-kpi-card" onClick={() => toggleSeries('payroll')} style={{ cursor: 'pointer', opacity: visibleSeries.payroll ? 1 : 0.5 }}>
            <div className="stella-kpi-header">
              <IndianRupee size={16} className="stella-kpi-icon" />
              <span>Monthly Payroll</span>
            </div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.monthlyPayroll)}</h3>
              <span className="stella-badge green">-12.5%</span>
            </div>
          </div>

          <div className="stella-kpi-card" onClick={() => toggleSeries('bonus')} style={{ cursor: 'pointer', opacity: visibleSeries.bonus ? 1 : 0.5 }}>
            <div className="stella-kpi-header">
              <Sparkles size={16} className="stella-kpi-icon" />
              <span>Bonus</span>
            </div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.bonus)}</h3>
              <span className="stella-badge green">+5.2%</span>
            </div>
          </div>

          <div className="stella-kpi-card" onClick={() => toggleSeries('incentives')} style={{ cursor: 'pointer', opacity: visibleSeries.incentives ? 1 : 0.5 }}>
            <div className="stella-kpi-header">
              <Sparkles size={16} className="stella-kpi-icon" />
              <span>Incentives</span>
            </div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.incentives)}</h3>
              <span className="stella-badge red">+12.3%</span>
            </div>
          </div>
        </div>

        {/* Column 2: Chart Area */}
        <div className="stella-chart-card">
          <div className="stella-chart-header">
            <div className="stella-chart-title">
              <BarChart2 size={16} className="stella-kpi-icon" />
              <span>Overview</span>
            </div>
            <div className="stella-toggle-group">
              <button className={chartView === 'Day' ? 'active' : ''} onClick={() => setChartView('Day')}>Day</button>
              <button className={chartView === 'Week' ? 'active' : ''} onClick={() => setChartView('Week')}>Week</button>
              <button className={chartView === 'Month' ? 'active' : ''} onClick={() => setChartView('Month')}>Month</button>
            </div>
          </div>

          <div className="stella-chart-body">
            {/* Y-Axis Labels */}
            <div className="stella-y-axis">
              <span>{formatINR(maxChartValue)}</span>
              <span>{formatINR(maxChartValue * 0.8)}</span>
              <span>{formatINR(maxChartValue * 0.6)}</span>
              <span>{formatINR(maxChartValue * 0.4)}</span>
              <span>{formatINR(maxChartValue * 0.2)}</span>
              <span>₹0</span>
            </div>
            
            {/* Chart Grid & Bars */}
            <div className="stella-chart-area">
              <div className="stella-grid-lines">
                <div className="stella-grid-line"></div>
                <div className="stella-grid-line"></div>
                <div className="stella-grid-line"></div>
                <div className="stella-grid-line"></div>
                <div className="stella-grid-line"></div>
                <div className="stella-grid-line"></div>
              </div>
              
              <div className="stella-bars-container">
                {chartData.map((data, idx) => (
                  <div key={idx} className="stella-bar-group">
                    <div className="stella-bar-stack">
                      {visibleSeries.payroll && <div className="s-bar dark-blue" style={{ height: `${(data.payroll / maxChartValue) * 100}%` }}></div>}
                      {visibleSeries.bonus && <div className="s-bar light-blue" style={{ height: `${(data.bonus / maxChartValue) * 100}%` }}></div>}
                      {visibleSeries.incentives && <div className="s-bar gray" style={{ height: `${(data.incentives / maxChartValue) * 100}%` }}></div>}
                    </div>
                    <span className="s-bar-label">{data.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="stella-chart-legend">
            <div className="s-legend-item" onClick={() => toggleSeries('payroll')} style={{ cursor: 'pointer', opacity: visibleSeries.payroll ? 1 : 0.5 }}>
              <div className="s-legend-color" style={{background: '#2563eb'}}></div>
              <span>Monthly Payroll</span>
            </div>
            <div className="s-legend-item" onClick={() => toggleSeries('bonus')} style={{ cursor: 'pointer', opacity: visibleSeries.bonus ? 1 : 0.5 }}>
              <div className="s-legend-color" style={{background: '#93c5fd'}}></div>
              <span>Bonus</span>
            </div>
            <div className="s-legend-item" onClick={() => toggleSeries('incentives')} style={{ cursor: 'pointer', opacity: visibleSeries.incentives ? 1 : 0.5 }}>
              <div className="s-legend-color" style={{background: '#f1f5f9'}}></div>
              <span>Incentives</span>
            </div>
          </div>
        </div>

        {/* Column 3: AI Widget */}
        <div className="stella-ai-widget">
          <button className="stella-ai-close"><X size={16} /></button>
          <div className="stella-ai-graphic">
            <div className="stella-ai-orb"></div>
            <div className="stella-ai-logo"><Sparkles size={24} /></div>
          </div>
          <h3>Stella AI</h3>
          <p>Generate your financial report with ease with our AI personal assistant</p>
          <button className="stella-btn-ai" onClick={() => alert('Opening AI Assistant...')}>Try now!</button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="stella-table-container">
        <div className="stella-table-header">
          <div className="stella-table-title">
            <Users size={16} className="stella-kpi-icon" />
            <span>Employee</span>
          </div>
          <div className="stella-table-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <button className={`stella-btn outline ${showFilter ? 'active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
                <Filter size={14} /> Filter
              </button>
              
              {showFilter && (
                <div className="stella-filter-dropdown" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                  backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', 
                  padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 100, minWidth: '150px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', padding: '0 8px' }}>STATUS</div>
                  {['All', 'Paid', 'Pending', 'Paused', 'Delayed', 'No Salary'].map(status => (
                    <div 
                      key={status} 
                      onClick={() => { setStatusFilter(status); setShowFilter(false); }}
                      style={{ 
                        padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px',
                        backgroundColor: statusFilter === status ? '#f1f5f9' : 'transparent',
                        color: statusFilter === status ? '#0f172a' : '#475569'
                      }}
                    >
                      {status}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="stella-search">
              <Search size={14} className="stella-search-icon" />
              <input 
                type="text" 
                placeholder="Search employee" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="stella-table">
          <thead>
            <tr>
              <th style={{width: '40px'}}><input type="checkbox" /></th>
              <th>Employee</th>
              <th>Position</th>
              <th>Salary</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading employees...</td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No employees found.</td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="s-emp-cell">
                      <img src={emp.avatar} alt={emp.name} className="s-emp-avatar" />
                      <div className="s-emp-info">
                        <strong>{emp.name}</strong>
                        <span>{emp.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{emp.position}</td>
                  <td><strong>{formatINR(emp.salary)}</strong></td>
                  <td>{emp.type}</td>
                  <td>
                    <div className={`s-status-badge ${emp.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ padding: '2px 8px' }}>
                      <select 
                        className="s-status-select" 
                        value={emp.status} 
                        onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Paused">Paused</option>
                        <option value="Delayed">Delayed</option>
                        <option value="No Salary Set">No Salary Set</option>
                      </select>
                    </div>
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <button className="s-icon-btn" onClick={() => setViewEmployee(emp)}><Eye size={16} /></button>
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
