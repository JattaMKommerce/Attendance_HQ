import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, Filter, ArrowLeft, Mail, 
  ExternalLink, CheckCircle, AlertTriangle, Check, Copy, X, Trash2
} from 'lucide-react';
import { getEmployees, resendInvitation, deleteEmployee } from '../../services/employeeApi';
import '../../styles/components.css';

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Onboarding email status & delete state
  const [resendingId, setResendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployees({ search });
      if (res.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleResendFromList = async (emp) => {
    setResendingId(emp.id);
    setActionAlert(null);
    try {
      const res = await resendInvitation(emp.id);
      if (res.success) {
        const isSent = res.data.email_status === 'SENT';
        setActionAlert({
          type: isSent ? 'success' : 'warning',
          text: isSent 
            ? `Onboarding email sent successfully to ${emp.email} from hr.jattamkommerce@gmail.com!`
            : `Credentials generated for ${emp.first_name}. Email dispatch pending — Gmail link ready below.`,
          data: res.data,
          emp
        });
      }
    } catch (err) {
      setActionAlert({
        type: 'error',
        text: err.response?.data?.message || `Failed to send onboarding email to ${emp.email}`
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete employee "${fullName}" (${emp.employee_code})?\n\nThis will remove their profile, onboarding plan, attendance logs, and leave records.`
    );
    if (!confirmed) return;

    setDeletingId(emp.id);
    setActionAlert(null);
    try {
      const res = await deleteEmployee(emp.id);
      if (res?.success || res?.message) {
        setActionAlert({
          type: 'success',
          text: `Employee "${fullName}" has been permanently deleted.`
        });
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
        fetchEmployees();
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('not found')) {
        setActionAlert({
          type: 'success',
          text: `Employee "${fullName}" has been permanently deleted.`
        });
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
        fetchEmployees();
      } else {
        setActionAlert({
          type: 'error',
          text: err.response?.data?.message || `Failed to delete ${fullName}.`
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* ── Page Header with Back Button ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Employees</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Manage organization employees & onboarding dispatch</p>
          </div>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/app/employees/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {/* ── Action Alert / Feedback Banner ── */}
      {actionAlert && (
        <div style={{
          backgroundColor: actionAlert.type === 'success' ? '#ecfdf5' : actionAlert.type === 'error' ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${actionAlert.type === 'success' ? '#a7f3d0' : actionAlert.type === 'error' ? '#fecaca' : '#fde68a'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: actionAlert.type === 'success' ? '#065f46' : actionAlert.type === 'error' ? '#991b1b' : '#92400e',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13.5px' }}>
              {actionAlert.type === 'success' ? <CheckCircle size={18} color="#10b981" /> : <AlertTriangle size={18} />}
              <span>{actionAlert.text}</span>
            </div>
            <button 
              onClick={() => setActionAlert(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>

          {actionAlert.data && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '12px', marginTop: '4px' }}>
              {actionAlert.data.activation_link && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(actionAlert.data.activation_link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px' }}
                >
                  {copiedLink ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  {copiedLink ? 'Activation Link Copied!' : 'Copy Activation Link'}
                </button>
              )}
              {actionAlert.data.gmail_compose_url && (
                <a
                  href={actionAlert.data.gmail_compose_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', color: '#ea4335', textDecoration: 'none' }}
                >
                  <Mail size={12} color="#ea4335" /> Open in Gmail <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              className="input-control"
              style={{ width: '100%', paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchEmployees()}>
            <Filter size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '16px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', margin: '16px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading employees...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <Users size={48} className="empty-state-icon" />
                      <h3 className="empty-state-title">No employees found</h3>
                      <p className="empty-state-desc">
                        {search ? "No employees match your search criteria." : "Get started by adding your first employee to the organization."}
                      </p>
                      {!search && (
                        <button className="btn btn-primary" onClick={() => navigate('/app/employees/new')}>
                          <Plus size={16} /> Add Employee
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr 
                    key={emp.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/app/employees/${emp.id}`)}
                  >
                    <td><strong>{emp.employee_code}</strong></td>
                    <td style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td>{emp.department_name || '-'}</td>
                    <td>{emp.designation_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          fontWeight: 600,
                          width: 'fit-content',
                          backgroundColor: emp.status === 'active' ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: emp.status === 'active' ? 'var(--success-text)' : 'var(--warning-text)'
                        }}>
                          {emp.status.charAt(0).toUpperCase() + emp.status.slice(1).replace('_', ' ')}
                        </span>
                        {emp.user_status === 'inactive' && (
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                            ⏳ Invite Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleResendFromList(emp)}
                          disabled={resendingId === emp.id}
                          title="Send onboarding email from hr.jattamkommerce@gmail.com"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            padding: '4px 10px',
                            color: '#1d4ed8',
                            borderColor: '#bfdbfe',
                            backgroundColor: '#eff6ff'
                          }}
                        >
                          <Mail size={13} color="#2563eb" />
                          <span>{resendingId === emp.id ? 'Sending...' : 'Send Email'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/app/employees/${emp.id}`)}
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteEmployee(emp)}
                          disabled={deletingId === emp.id}
                          title="Delete employee permanently"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            padding: '4px 8px',
                            color: '#dc2626',
                            borderColor: '#fecaca',
                            backgroundColor: '#fef2f2'
                          }}
                        >
                          <Trash2 size={13} color="#dc2626" />
                          <span>{deletingId === emp.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
