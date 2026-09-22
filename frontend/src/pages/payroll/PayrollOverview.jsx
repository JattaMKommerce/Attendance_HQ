import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Settings, CalendarDays, Download, IndianRupee, 
  Clock, Sparkles, BarChart2, Filter, Search, Printer,
  Eye, X, Users, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getEmployees } from '../../services/employeeApi';
import OfficialPayslipModal from '../../components/payroll/OfficialPayslipModal';
import './PayrollOverview.css';

// ── Toast component ────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
      padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
      backgroundColor: type === 'success' ? '#dcfce7' : '#fee2e2',
      color: type === 'success' ? '#059669' : '#ef4444',
      border: `1px solid ${type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px'
    }}>
      <CheckCircle size={16} /> {message}
    </div>
  );
}

// ── Main PayrollOverview ───────────────────────────────────────────────────
export default function PayrollOverview() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [showSettings, setShowSettings]     = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toast, setToast]                   = useState(null);

  // Dynamic Date Logic
  const today          = new Date();
  const [pickerMonth, setPickerMonth] = useState(today.getMonth()); // 0-indexed
  const [pickerYear,  setPickerYear]  = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // the payroll period
  const [selectedYear,  setSelectedYear]  = useState(today.getFullYear());

  const monthName     = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long' });
  const monthShort    = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'short' });
  const lastDay       = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateRangeLabel = `01 ${monthShort} ${selectedYear} — ${lastDay} ${monthShort} ${selectedYear}`;

  // Computed KPIs
  const [kpis, setKpis] = useState({ monthlyPayroll: 0, bonus: 0, incentives: 0 });

  // Chart
  const [chartView,     setChartView]     = useState('Month');
  const [visibleSeries, setVisibleSeries] = useState({ payroll: true, bonus: true, incentives: true });
  const toggleSeries = (s) => setVisibleSeries(prev => ({ ...prev, [s]: !prev[s] }));

  // Filter / search
  const [showFilter,   setShowFilter]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');

  // Modal
  const [viewEmployee, setViewEmployee] = useState(null);

  // Calculator
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay]       = useState('0');
  const [calcMemory,  setCalcMemory]        = useState(null);
  const [calcOp,      setCalcOp]            = useState(null);
  const [calcWaiting, setCalcWaiting]       = useState(false);

  // Payroll settings state
  const [payrollCycle, setPayrollCycle]         = useState('Monthly');
  const [paymentMethod, setPaymentMethod]       = useState('Bank Transfer');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); };

  // ── Load employees ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getEmployees();
        if (res.success && res.data?.employees) {
          let totalSalary = 0, totalBonus = 0, totalIncentives = 0;
          const mapped = res.data.employees.map(emp => {
            const base       = parseFloat(emp.gross_salary || emp.basic_salary || 0) || 0;
            const incentives = parseFloat(emp.incentives || 0) || 0;
            const bonus      = parseFloat(emp.special_allowance || 0) || Math.round(base * 0.05);
            totalSalary     += base;
            totalBonus      += bonus;
            totalIncentives += incentives;
            return {
              id:       emp.id,
              name:     `${emp.first_name} ${emp.last_name}`,
              email:    emp.email,
              position: emp.designation_name || emp.department_name || 'Employee',
              salary:   base,
              incentives, bonus,
              type:     emp.employment_type
                          ? emp.employment_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
                          : 'Full-Time',
              status: emp.status === 'active' && base > 0 ? 'Pending' : base > 0 ? 'Paid' : 'No Salary Set',
              avatar: emp.profile_image_url || `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=random`
            };
          });
          setEmployees(mapped);
          setKpis({ monthlyPayroll: totalSalary, bonus: totalBonus, incentives: totalIncentives });
        }
      } catch (err) {
        console.error('Failed to fetch employees for payroll:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // ── Chart data ──────────────────────────────────────────────────────────
  let chartData = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (chartView === 'Month') {
    chartData = months.slice(0, selectedMonth + 1).map((label, i) => ({
      label,
      payroll:    i === selectedMonth ? kpis.monthlyPayroll : 0,
      bonus:      i === selectedMonth ? kpis.bonus : 0,
      incentives: i === selectedMonth ? kpis.incentives : 0,
    }));
  } else if (chartView === 'Week') {
    chartData = ['Week 1','Week 2','Week 3','Week 4'].map((label, i) => ({
      label,
      payroll: i === 3 ? kpis.monthlyPayroll : 0,
      bonus:   i === 3 ? kpis.bonus : 0,
      incentives: i === 3 ? kpis.incentives : 0,
    }));
  } else {
    chartData = ['Mon','Tue','Wed','Thu','Fri'].map((label, i) => ({
      label,
      payroll: i === 4 ? kpis.monthlyPayroll : 0,
      bonus:   i === 4 ? kpis.bonus : 0,
      incentives: i === 4 ? kpis.incentives : 0,
    }));
  }
  const maxChartValue = Math.max(...chartData.map(d => d.payroll + d.bonus + d.incentives), 1);

  // ── Date picker calendar ────────────────────────────────────────────────
  const daysInPickerMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDayOfWeek    = new Date(pickerYear, pickerMonth, 1).getDay();
  const prevMonthDays     = new Date(pickerYear, pickerMonth, 0).getDate();
  const calendarGrid = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) calendarGrid.push({ day: prevMonthDays - i, isMuted: true });
  for (let i = 1; i <= daysInPickerMonth; i++) calendarGrid.push({ day: i, isMuted: false, month: pickerMonth, year: pickerYear });
  const rem = 42 - calendarGrid.length;
  for (let i = 1; i <= rem; i++) calendarGrid.push({ day: i, isMuted: true });

  const handlePickerPrev = () => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1); } else setPickerMonth(m => m - 1); };
  const handlePickerNext = () => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(y => y + 1); } else setPickerMonth(m => m + 1); };
  const handleDaySelect  = (d) => { if (!d.isMuted) { setSelectedMonth(d.month); setSelectedYear(d.year); setShowDatePicker(false); } };
  const handleThisMonth  = () => { setSelectedMonth(today.getMonth()); setSelectedYear(today.getFullYear()); setShowDatePicker(false); };

  // ── CSV Export ──────────────────────────────────────────────────────────
  const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const exportToCSV = () => {
    if (!employees.length) { showToast('No employee data to export.', 'error'); return; }
    const headers = ['Employee Name','Email','Position','Employment Type','Gross Salary','Status'];
    const rows = filteredEmployees.map(emp => [
      emp.name, emp.email, emp.position, emp.type,
      emp.salary, emp.status
    ].map(v => `"${v}"`).join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `Payroll_${monthName}_${selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredEmployees.length} records as CSV.`);
  };

  // ── Print handler ──────────────────────────────────────────────────────
  const handlePrint = (emp) => {
    const orig = document.title;
    document.title = `Payslip_${(emp.name || '').replace(' ', '_')}_${monthName}_${selectedYear}`;
    window.print();
    setTimeout(() => { document.title = orig; }, 500);
  };

  // ── Calculator ──────────────────────────────────────────────────────────
  const handleCalcInput = (input) => {
    if (['+','-','×','÷'].includes(input)) {
      if (calcOp && !calcWaiting) {
        const cur = parseFloat(calcDisplay), mem = calcMemory;
        let res = cur;
        if (calcOp === '+') res = mem + cur; if (calcOp === '-') res = mem - cur;
        if (calcOp === '×') res = mem * cur; if (calcOp === '÷') res = cur !== 0 ? mem / cur : 'Error';
        setCalcDisplay(String(res)); setCalcMemory(res);
      } else { setCalcMemory(parseFloat(calcDisplay)); }
      setCalcOp(input); setCalcWaiting(true);
    } else if (input === '=') {
      if (calcOp && calcMemory !== null) {
        const cur = parseFloat(calcDisplay);
        let res = cur;
        if (calcOp === '+') res = calcMemory + cur; if (calcOp === '-') res = calcMemory - cur;
        if (calcOp === '×') res = calcMemory * cur; if (calcOp === '÷') res = cur !== 0 ? calcMemory / cur : 'Error';
        setCalcDisplay(String(res)); setCalcMemory(null); setCalcOp(null); setCalcWaiting(true);
      }
    } else if (input === 'AC') { setCalcDisplay('0'); setCalcMemory(null); setCalcOp(null); setCalcWaiting(false); }
    else if (input === '+/-') { setCalcDisplay(String(parseFloat(calcDisplay) * -1)); }
    else if (input === '%') { setCalcDisplay(String(parseFloat(calcDisplay) / 100)); }
    else {
      if (calcWaiting) { setCalcDisplay(input === '.' ? '0.' : input); setCalcWaiting(false); }
      else {
        if (input === '.' && calcDisplay.includes('.')) return;
        setCalcDisplay(calcDisplay === '0' && input !== '.' ? input : calcDisplay + input);
      }
    }
  };

  // ── Status & Filter ─────────────────────────────────────────────────────
  const handleStatusChange = (id, newStatus) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, status: newStatus } : emp));
    showToast(`Payroll status updated to "${newStatus}".`);
  };

  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    const matchSearch = emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' ||
      (statusFilter === 'No Salary' ? emp.status === 'No Salary Set' : emp.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const paidCount    = employees.filter(e => e.status === 'Paid').length;
  const pendingCount = employees.filter(e => e.status === 'Pending').length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="stella-container">
      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Payslip Modal — uses the real OfficialPayslipModal */}
      {viewEmployee && (
        <OfficialPayslipModal
          employee={viewEmployee}
          onClose={() => setViewEmployee(null)}
          onPrint={handlePrint}
        />
      )}

      {/* Settings Modal */}
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
                <select className="s-select" value={payrollCycle} onChange={e => setPayrollCycle(e.target.value)}>
                  <option>Monthly</option><option>Bi-weekly</option><option>Weekly</option>
                </select>
              </div>
              <div className="s-form-group">
                <label>Default Payment Method</label>
                <select className="s-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option>Bank Transfer</option><option>Cheque</option><option>Cash</option>
                </select>
              </div>
              <div className="s-form-group">
                <label>PF Contribution (%)</label>
                <input className="s-select" type="number" defaultValue={12} min={0} max={100} />
              </div>
              <div className="s-form-group">
                <label>Professional Tax (₹/month)</label>
                <input className="s-select" type="number" defaultValue={200} min={0} />
              </div>
            </div>
            <div className="stella-modal-footer">
              <button className="stella-btn outline" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="stella-btn primary" onClick={() => { setShowSettings(false); showToast('Payroll settings saved successfully.'); }}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="stella-header">
        <div className="stella-title">
          <div className="stella-icon-box"><Briefcase size={20} /></div>
          <div>
            <h2 style={{ margin: 0 }}>Payroll</h2>
          </div>
        </div>
        <div className="stella-actions">
          <button className="stella-btn outline" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Payroll Settings
          </button>

          {/* Calculator */}
          <div style={{ position: 'relative' }}>
            <button className="stella-btn outline" onClick={() => setShowCalculator(c => !c)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="16" y1="14" x2="16" y2="14.01"/><line x1="16" y1="10" x2="16" y2="10.01"/>
                <line x1="16" y1="18" x2="16" y2="18.01"/><line x1="12" y1="14" x2="12" y2="14.01"/>
                <line x1="12" y1="10" x2="12" y2="10.01"/><line x1="12" y1="18" x2="12" y2="18.01"/>
                <line x1="8" y1="14" x2="8" y2="14.01"/><line x1="8" y1="10" x2="8" y2="10.01"/>
                <line x1="8" y1="18" x2="8" y2="18.01"/>
              </svg> Calculator
            </button>
            {showCalculator && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={() => setShowCalculator(false)} />
                <div className="mac-calculator">
                  <div className="mac-calc-header">
                    <div className="mac-dot red" onClick={() => setShowCalculator(false)} />
                    <div className="mac-dot yellow" onClick={() => setShowCalculator(false)} />
                    <div className="mac-dot green" />
                  </div>
                  <div className="mac-calc-display">{calcDisplay.length > 9 ? parseFloat(calcDisplay).toExponential(4) : calcDisplay}</div>
                  <div className="mac-calc-grid">
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('AC')}>{calcDisplay === '0' ? 'AC' : 'C'}</button>
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('+/-')}>+/-</button>
                    <button className="mac-calc-btn light" onClick={() => handleCalcInput('%')}>%</button>
                    <button className={`mac-calc-btn orange ${calcOp === '÷' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('÷')}>÷</button>
                    {['7','8','9'].map(n => <button key={n} className="mac-calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                    <button className={`mac-calc-btn orange ${calcOp === '×' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('×')}>×</button>
                    {['4','5','6'].map(n => <button key={n} className="mac-calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                    <button className={`mac-calc-btn orange ${calcOp === '-' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('-')}>-</button>
                    {['1','2','3'].map(n => <button key={n} className="mac-calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                    <button className={`mac-calc-btn orange ${calcOp === '+' && calcWaiting ? 'active' : ''}`} onClick={() => handleCalcInput('+')}>+</button>
                    <button className="mac-calc-btn zero" onClick={() => handleCalcInput('0')}>0</button>
                    <button className="mac-calc-btn dot" onClick={() => handleCalcInput('.')}>.</button>
                    <button className="mac-calc-btn orange equals" onClick={() => handleCalcInput('=')}>=</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Date Picker */}
          <div className="stella-datepicker-wrapper" style={{ position: 'relative' }}>
            <button className="stella-btn outline" onClick={() => setShowDatePicker(d => !d)}>
              <CalendarDays size={16} /> {dateRangeLabel}
            </button>
            {showDatePicker && (
              <div className="stella-calendar-dropdown" style={{ width: '280px', position: 'absolute', right: 0, zIndex: 200, top: '100%', marginTop: '8px' }}>
                <div className="stella-cal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button style={{ padding: '4px 8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }} onClick={handlePickerPrev}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {new Date(pickerYear, pickerMonth, 1).toLocaleString('default', { month: 'long' })} {pickerYear}
                  </span>
                  <button style={{ padding: '4px 8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }} onClick={handlePickerNext}>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="stella-cal-body">
                  <div className="stella-cal-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
                  <div className="stella-cal-days">
                    {calendarGrid.slice(0, 35).map((d, i) => (
                      <span
                        key={i}
                        className={`stella-day ${d.isMuted ? 'muted' : ''} ${!d.isMuted && d.month === selectedMonth && d.year === selectedYear ? 'active' : ''}`}
                        onClick={() => handleDaySelect(d)}
                        style={{ cursor: d.isMuted ? 'default' : 'pointer' }}
                      >{d.day}</span>
                    ))}
                  </div>
                </div>
                <div className="stella-cal-footer">
                  <button className="stella-btn outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleThisMonth}>This Month</button>
                </div>
              </div>
            )}
          </div>

          <button className="stella-btn primary" onClick={exportToCSV}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      {/* ── Top Grid ───────────────────────────────────────────────────── */}
      <div className="stella-grid">

        {/* KPI Stack */}
        <div className="stella-kpi-stack" style={{ justifyContent: 'center' }}>
          <div className="stella-kpi-card" onClick={() => toggleSeries('payroll')} style={{ cursor: 'pointer', opacity: visibleSeries.payroll ? 1 : 0.5 }}>
            <div className="stella-kpi-header"><IndianRupee size={16} className="stella-kpi-icon" /><span>Monthly Payroll</span></div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.monthlyPayroll)}</h3>
              <span className="stella-badge green">{employees.length} employees</span>
            </div>
          </div>
          <div className="stella-kpi-card" onClick={() => toggleSeries('bonus')} style={{ cursor: 'pointer', opacity: visibleSeries.bonus ? 1 : 0.5 }}>
            <div className="stella-kpi-header"><Sparkles size={16} className="stella-kpi-icon" /><span>Bonus</span></div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.bonus)}</h3>
              <span className="stella-badge green">This month</span>
            </div>
          </div>
          <div className="stella-kpi-card" onClick={() => toggleSeries('incentives')} style={{ cursor: 'pointer', opacity: visibleSeries.incentives ? 1 : 0.5 }}>
            <div className="stella-kpi-header"><Sparkles size={16} className="stella-kpi-icon" /><span>Incentives</span></div>
            <div className="stella-kpi-value-row">
              <h3>{formatINR(kpis.incentives)}</h3>
              <span className="stella-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>This month</span>
            </div>
          </div>
          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>{paidCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Paid</div>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{pendingCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Pending</div>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{employees.filter(e => e.status === 'No Salary Set').length}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>No Salary</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="stella-chart-card">
          <div className="stella-chart-header">
            <div className="stella-chart-title"><BarChart2 size={16} className="stella-kpi-icon" /><span>Payroll Overview — {monthName} {selectedYear}</span></div>
            <div className="stella-toggle-group">
              {['Day','Week','Month'].map(v => <button key={v} className={chartView === v ? 'active' : ''} onClick={() => setChartView(v)}>{v}</button>)}
            </div>
          </div>
          <div className="stella-chart-body">
            <div className="stella-y-axis">
              {[1,0.8,0.6,0.4,0.2,0].map(f => <span key={f}>{f === 0 ? '₹0' : formatINR(maxChartValue * f)}</span>)}
            </div>
            <div className="stella-chart-area">
              <div className="stella-grid-lines">
                {[0,1,2,3,4,5].map(i => <div key={i} className="stella-grid-line" />)}
              </div>
              <div className="stella-bars-container">
                {chartData.map((data, idx) => (
                  <div key={idx} className="stella-bar-group">
                    <div className="stella-bar-stack">
                      {visibleSeries.payroll    && <div className="s-bar dark-blue"  style={{ height: `${(data.payroll    / maxChartValue) * 100}%` }} />}
                      {visibleSeries.bonus      && <div className="s-bar light-blue" style={{ height: `${(data.bonus      / maxChartValue) * 100}%` }} />}
                      {visibleSeries.incentives && <div className="s-bar gray"       style={{ height: `${(data.incentives / maxChartValue) * 100}%` }} />}
                    </div>
                    <span className="s-bar-label">{data.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="stella-chart-legend">
            {[['payroll','#2563eb','Monthly Payroll'],['bonus','#93c5fd','Bonus'],['incentives','#cbd5e1','Incentives']].map(([key, color, label]) => (
              <div key={key} className="s-legend-item" onClick={() => toggleSeries(key)} style={{ cursor: 'pointer', opacity: visibleSeries[key] ? 1 : 0.5 }}>
                <div className="s-legend-color" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Employee Table ──────────────────────────────────────────────── */}
      <div className="stella-table-container">
        <div className="stella-table-header">
          <div className="stella-table-title"><Users size={16} className="stella-kpi-icon" /><span>Employees — {monthName} {selectedYear}</span></div>
          <div className="stella-table-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {/* Filter */}
            <div style={{ position: 'relative' }}>
              <button className={`stella-btn outline ${showFilter ? 'active' : ''}`} onClick={() => setShowFilter(f => !f)}>
                <Filter size={14} /> Filter{statusFilter !== 'All' ? `: ${statusFilter}` : ''}
              </button>
              {showFilter && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '150px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', padding: '0 8px' }}>STATUS</div>
                  {['All','Paid','Pending','Paused','Delayed','No Salary'].map(s => (
                    <div key={s} onClick={() => { setStatusFilter(s); setShowFilter(false); }}
                      style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', backgroundColor: statusFilter === s ? '#f1f5f9' : 'transparent', color: statusFilter === s ? '#0f172a' : '#475569' }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Search */}
            <div className="stella-search">
              <Search size={14} className="stella-search-icon" />
              <input type="text" placeholder="Search employee…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        <table className="stella-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>Employee</th>
              <th>Position</th>
              <th>Salary</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Loading employees…</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No employees found.</td></tr>
            ) : filteredEmployees.map(emp => (
              <tr key={emp.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div className="s-emp-cell">
                    <img src={emp.avatar} alt={emp.name} className="s-emp-avatar" />
                    <div className="s-emp-info"><strong>{emp.name}</strong><span>{emp.email}</span></div>
                  </div>
                </td>
                <td>{emp.position}</td>
                <td><strong>{formatINR(emp.salary)}</strong></td>
                <td>{emp.type}</td>
                <td>
                  <div className={`s-status-badge ${emp.status.toLowerCase().replace(/\s+/g,'-')}`} style={{ padding: '2px 8px' }}>
                    <select className="s-status-select" value={emp.status} onChange={e => handleStatusChange(emp.id, e.target.value)}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Paused">Paused</option>
                      <option value="Delayed">Delayed</option>
                      <option value="No Salary Set">No Salary Set</option>
                    </select>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="s-icon-btn" title="View Payslip" onClick={() => setViewEmployee(emp)}><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
