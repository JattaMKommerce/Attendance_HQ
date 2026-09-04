import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Download, 
  Eye,
  Calendar,
  TrendingUp,
  Filter,
  X,
  FileText
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyPayslips = () => {
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchPayslips();
  }, [filters]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      
      // In production:
      // const response = await employeePortalApi.getMyPayslips(filters);
      // setPayslips(response.data.payslips);
      
      // Mock data
      const mockPayslips = generateMockPayslips(filters.year);
      setPayslips(mockPayslips);
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payslipId) => {
    try {
      // In production:
      // const response = await employeePortalApi.downloadPayslip(payslipId);
      // const blob = new Blob([response.data], { type: 'application/pdf' });
      // const url = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `Payslip_${payslipId}.pdf`;
      // link.click();
      // window.URL.revokeObjectURL(url);
      
      alert('Download functionality will be connected to backend API');
    } catch (error) {
      console.error('Error downloading payslip:', error);
    }
  };

  const handleView = (payslip) => {
    setSelectedPayslip(payslip);
  };

  const closeModal = () => {
    setSelectedPayslip(null);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payslips</h1>
          <p className="page-description">View and download your salary slips</p>
        </div>
      </div>

      {/* Year Filter */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <span style={{ fontWeight: 500 }}>Year:</span>
          <select 
            className="input-control"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            style={{ width: '150px' }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Payslips Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading payslips...
        </div>
      ) : payslips.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <FileText size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No payslips found</h3>
              <p className="empty-state-desc">
                No payslips available for {filters.year}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {payslips.map(payslip => (
            <PayslipCard 
              key={payslip.id}
              payslip={payslip}
              onView={() => handleView(payslip)}
              onDownload={() => handleDownload(payslip.id)}
            />
          ))}
        </div>
      )}

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <PayslipModal 
          payslip={selectedPayslip}
          onClose={closeModal}
          onDownload={() => handleDownload(selectedPayslip.id)}
        />
      )}
    </div>
  );
};

// Payslip Card Component
const PayslipCard = ({ payslip, onView, onDownload }) => {
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onView}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>
              {payslip.month}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              {payslip.period}
            </p>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: 'var(--success-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={24} color="var(--success-text)" />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Net Pay
          </div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--success-text)' }}>
            ₹{payslip.netPay.toLocaleString()}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Gross Pay
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              ₹{payslip.grossPay.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Deductions
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--danger)' }}>
              -₹{payslip.totalDeductions.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button 
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '14px', padding: '8px' }}
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            <Eye size={16} />
            View
          </button>
          <button 
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '14px', padding: '8px' }}
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// Payslip Detail Modal
const PayslipModal = ({ payslip, onClose, onDownload }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div 
        className="card"
        style={{ 
          maxWidth: '800px', 
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Payslip - {payslip.month}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="card-body">
          {/* Header Info */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'var(--bg-surface-hover)', 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Pay Period
                </div>
                <div style={{ fontWeight: 600 }}>{payslip.period}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Pay Date
                </div>
                <div style={{ fontWeight: 600 }}>{payslip.payDate}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Working Days
                </div>
                <div style={{ fontWeight: 600 }}>{payslip.workingDays} days</div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Earnings</h4>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                {payslip.earnings.map((earning, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>
                      {earning.component}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 500 }}>
                      ₹{earning.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 600, fontSize: '15px' }}>
                  <td style={{ padding: '12px 0' }}>Gross Earnings</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--success-text)' }}>
                    ₹{payslip.grossPay.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Deductions</h4>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                {payslip.deductions.map((deduction, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>
                      {deduction.component}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 500, color: 'var(--danger)' }}>
                      -₹{deduction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 600, fontSize: '15px' }}>
                  <td style={{ padding: '12px 0' }}>Total Deductions</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--danger)' }}>
                    -₹{payslip.totalDeductions.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Pay */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'var(--success-bg)', 
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--success-text)' }}>
              Net Pay
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success-text)' }}>
              ₹{payslip.netPay.toLocaleString()}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Close
            </button>
            <button className="btn btn-primary" onClick={onDownload} style={{ flex: 1 }}>
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock data generator
const generateMockPayslips = (year) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const payslips = [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < 12; i++) {
    // Only show payslips up to current month for current year
    if (year === currentYear && i > currentMonth) break;
    
    const baseSalary = 50000;
    const hra = baseSalary * 0.4;
    const ta = 5000;
    const bonus = i === 11 ? 20000 : 0; // Year-end bonus
    
    const grossPay = baseSalary + hra + ta + bonus;
    
    const pf = baseSalary * 0.12;
    const tax = grossPay * 0.1;
    const insurance = 2000;
    
    const totalDeductions = pf + tax + insurance;
    const netPay = grossPay - totalDeductions;
    
    payslips.push({
      id: `${year}-${i + 1}`,
      month: `${months[i]} ${year}`,
      period: `01 ${months[i]} - ${new Date(year, i + 1, 0).getDate()} ${months[i]} ${year}`,
      payDate: `${new Date(year, i + 1, 5).toLocaleDateString()}`,
      workingDays: 22,
      grossPay: Math.round(grossPay),
      totalDeductions: Math.round(totalDeductions),
      netPay: Math.round(netPay),
      earnings: [
        { component: 'Basic Salary', amount: baseSalary },
        { component: 'House Rent Allowance (HRA)', amount: hra },
        { component: 'Transport Allowance', amount: ta },
        ...(bonus > 0 ? [{ component: 'Year-End Bonus', amount: bonus }] : [])
      ],
      deductions: [
        { component: 'Provident Fund (PF)', amount: Math.round(pf) },
        { component: 'Income Tax (TDS)', amount: Math.round(tax) },
        { component: 'Health Insurance', amount: insurance }
      ]
    });
  }
  
  return payslips.reverse(); // Show most recent first
};

export default MyPayslips;
