import React, { useState, useEffect, useContext } from 'react';
import { 
  IndianRupee, 
  Download, 
  Eye, 
  Calendar, 
  Filter, 
  X, 
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyPayslips = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await employeePortalApi.getMyPayslips({ year: selectedYear });
      if (res.data?.success) {
        setPayslips(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching payslips:', err);
      setError('Unable to fetch payslips at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const handleDownload = async (payslip) => {
    try {
      setDownloadingId(payslip.id);
      const res = await employeePortalApi.downloadPayslip(payslip.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${payslip.monthName || payslip.run_month}_${payslip.run_year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading payslip:', err);
      alert('Failed to download payslip PDF. Please check your connection.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            My Payslips
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            View and download your official monthly salary statements
          </p>
        </div>

        {/* Year Filter & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchPayslips}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontWeight: 600
              }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          Loading your payslips...
        </div>
      ) : payslips.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            No Payslips Available for {selectedYear}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.5 }}>
            Payslips are published once the HR & Payroll team completes and approves the monthly payroll run. When available, they will appear here for instant download.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {payslips.map((ps) => (
            <div
              key={ps.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {ps.monthName} {ps.run_year}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Status: <span style={{ color: '#16a34a', fontWeight: 600 }}>Published</span>
                    </div>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IndianRupee size={20} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                    Net Salary Disbursed
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {formatINR(ps.net_salary)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Gross Pay: </span>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatINR(ps.gross_salary)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Deductions: </span>
                    <div style={{ fontWeight: 600, color: '#dc2626' }}>-{formatINR(ps.total_deductions)}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  onClick={() => setSelectedPayslip(ps)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={15} />
                  <span>Breakdown</span>
                </button>
                <button
                  onClick={() => handleDownload(ps)}
                  disabled={downloadingId === ps.id}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  <Download size={15} />
                  <span>{downloadingId === ps.id ? 'Downloading...' : 'PDF Slip'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payslip Breakdown Modal */}
      {selectedPayslip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000
        }} onClick={() => setSelectedPayslip(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Salary Slip Breakdown
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {selectedPayslip.monthName} {selectedPayslip.run_year}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Summary Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>
                    Net Take-Home Pay
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                    {formatINR(selectedPayslip.net_salary)}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(selectedPayslip)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> PDF
                </button>
              </div>

              {/* Earnings & Deductions Sections */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
                    Earnings
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Basic Salary</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.basic_salary || (selectedPayslip.gross_salary * 0.5))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>HRA</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.hra || (selectedPayslip.gross_salary * 0.2))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Allowances</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.special_allowance || (selectedPayslip.gross_salary * 0.3))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>Gross Earnings</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(selectedPayslip.gross_salary)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
                    Deductions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Provident Fund</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.pf || (selectedPayslip.total_deductions * 0.6))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Tax / TDS</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.tds || (selectedPayslip.total_deductions * 0.3))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Prof. Tax / Other</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(selectedPayslip.breakdown?.professional_tax || (selectedPayslip.total_deductions * 0.1))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>Total Deductions</span>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatINR(selectedPayslip.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPayslip(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPayslips;
