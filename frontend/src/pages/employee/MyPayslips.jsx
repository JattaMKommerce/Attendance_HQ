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
import { AuthContext } from '../../context/AuthContext';
import OfficialPayslipModal from '../../components/payroll/OfficialPayslipModal';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyPayslips = () => {
  const { employee } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: 'all'
  });

  useEffect(() => {
    fetchPayslips();
  }, [filters.year]); // Only re-fetch on year change since month is just a client-side filter for mock

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

  // Filter payslips based on selected month
  const displayedPayslips = filters.month === 'all' 
    ? payslips 
    : payslips.filter(p => p.id === `${filters.year}-${filters.month}`);

  const monthsList = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payslips</h1>
          <p className="page-description">View and download your salary slips</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-secondary)" />
            <span style={{ fontWeight: 500 }}>Month:</span>
            <select 
              className="input-control"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ width: '150px' }}
            >
              <option value="all">All Months</option>
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--text-secondary)" />
            <span style={{ fontWeight: 500 }}>Year:</span>
            <select 
              className="input-control"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              style={{ width: '120px' }}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          
        </div>
      </div>

      {/* Payslips Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading payslips...
        </div>
      ) : displayedPayslips.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <FileText size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No payslips found</h3>
              <p className="empty-state-desc">
                No payslips available for the selected period
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {displayedPayslips.map(payslip => (
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
        <OfficialPayslipModal 
          payslip={selectedPayslip}
          employee={employee}
          onClose={closeModal}
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
