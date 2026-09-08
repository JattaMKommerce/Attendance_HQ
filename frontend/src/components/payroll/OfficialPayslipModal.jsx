import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';

const formatINR = (num) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

export default function OfficialPayslipModal({ employee, onClose, onPrint }) {
  const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  if (!employee) return null;

  // Normalize employee data if it comes from different sources
  const name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  const empId = employee.id ? String(employee.id).padStart(4, '0') : (employee.employee_code || '0000');
  const position = employee.position || employee.designation_name || 'Employee';
  const department = employee.department || employee.department_name || 'Engineering';
  const type = employee.type || employee.employment_type || 'Full-Time';
  
  const basicSalary = parseFloat(employee.salary || employee.basic_salary || employee.gross_salary || 0);
  const hra = basicSalary * 0.4;
  const specialAllowance = parseFloat(employee.bonus || employee.special_allowance || (basicSalary * 0.05) || 0);
  const incentives = parseFloat(employee.incentives || 0);
  const grossEarnings = basicSalary + hra + specialAllowance + incentives;

  const lop = parseFloat(employee.lop || 0);
  const pf = basicSalary * 0.12;
  const profTax = 200;
  const tds = 0;
  const totalDeductions = lop + pf + profTax + tds;

  const netPay = grossEarnings - totalDeductions;

  const handlePrintWrapper = () => {
    if (onPrint) {
      onPrint(employee);
    } else {
      window.print();
    }
  };

  const joinDate = employee.joining_date ? new Date(employee.joining_date) : new Date(2024, 3, 1);
  const now = new Date();
  const monthsList = [];
  let d = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
  while (d <= now) {
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthsList.push({ val: mStr, label: mLabel });
    d.setMonth(d.getMonth() + 1);
  }
  monthsList.reverse();

  const [sYear, sMonth] = selectedMonthStr.split('-');
  const selectedDateObj = new Date(sYear, parseInt(sMonth) - 1, 1);
  const formattedSelectedMonth = selectedDateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  const formattedJoinDate = joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="stella-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="stella-modal" style={{ width: '850px', maxWidth: '95vw', borderRadius: '12px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="stella-modal-header hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>Official Payslip</h3>
            <select 
              value={selectedMonthStr} 
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              {monthsList.map(m => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={handlePrintWrapper} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              <Printer size={16} /> Print
            </button>
            <button className="s-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        
        <div className="stella-modal-body" id="payslip-document" style={{ padding: '40px 48px', backgroundColor: '#fff', color: '#0f172a', fontFamily: '"Inter", -apple-system, sans-serif', overflowY: 'auto', flex: 1 }}>
          
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
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600' }}>Month: <span style={{ color: '#475569', fontWeight: '400' }}>{formattedSelectedMonth}</span></p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Date: <span style={{ color: '#475569', fontWeight: '400' }}>{new Date().toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Employee & Payment Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Employee Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Name:</strong> <span>{name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Employee ID:</strong> <span>EMP-{empId}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Designation:</strong> <span>{position}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Department:</strong> <span>{department}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Type:</strong> <span>{type}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Date of Joining:</strong> <span>{formattedJoinDate}</span></div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Basic Salary:</strong> <span>{formatINR(basicSalary)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>House Rent Allowance:</strong> <span>{formatINR(hra)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Special Allowance (Bonus):</strong> <span>{formatINR(specialAllowance)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Incentives:</strong> <span>{formatINR(incentives)}</span></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}>
                <strong>Gross Earnings:</strong>
                <strong>{formatINR(grossEarnings)}</strong>
              </div>
            </div>
            
            {/* Deductions Column */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Deductions</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#334155' }}>Loss of Pay (LOP):</strong> <span>{formatINR(lop)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Provident Fund (PF):</strong> <span style={{ color: '#64748b' }}>{formatINR(pf)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Professional Tax:</strong> <span style={{ color: '#64748b' }}>{formatINR(profTax)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}><strong style={{ color: '#64748b' }}>Income Tax (TDS):</strong> <span style={{ color: '#64748b' }}>{formatINR(tds)}</span></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}>
                <strong>Total Deductions:</strong>
                <strong>{formatINR(totalDeductions)}</strong>
              </div>
            </div>
          </div>

          {/* Net Pay & Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', marginTop: '32px' }}>
            <div style={{ flex: 1, marginRight: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                <strong style={{ fontSize: '13px', color: '#334155', marginRight: '8px' }}>Net Pay Amount:</strong>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                  {formatINR(netPay)}
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
        
        <div className="stella-modal-footer hide-on-print" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', padding: '16px', gap: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }} onClick={onClose}>Close</button>
          <button style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handlePrintWrapper}>
            <Printer size={16} style={{marginRight: '6px'}} /> Print Document
          </button>
        </div>
      </div>
    </div>
  );
}
