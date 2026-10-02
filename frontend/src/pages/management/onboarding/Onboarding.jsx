import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash2, Mail, ExternalLink, 
  CheckCircle, AlertCircle, Users, Check, X, ShieldCheck, Laptop
} from 'lucide-react';
import { getEmployees, deleteEmployee, resendInvitation, createEmployee } from '../../../services/employeeApi';
import '../recruitment/Recruitment.css'; // Reusing mgmt-page styles
import './Onboarding.css';

const HR_TASKS = [
  'Send Welcome Email & Credentials',
  'Collect PAN & Aadhaar / Identity Documents',
  'Verify Educational & Experience Certificates',
  'Submit Bank Account & Payroll Direct Deposit Details'
];

const IT_TASKS = [
  'Create Official Email (@jattamkommerce.com)',
  'Assign Laptop / Hardware Equipment',
  'Configure HRMS & Team Workspace Access',
  'Setup Corporate Security Credentials & 2FA'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [hires, setHires] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & action state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  // New hire form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    designation_name: '',
    department_name: '',
    joining_date: new Date().toISOString().split('T')[0]
  });

  const loadHires = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployees();
      const emps = res?.data?.employees || (Array.isArray(res?.data) ? res.data : []);
      
      const mapped = emps.map(emp => {
        // Read persisted task state from localStorage if available
        let savedTasks = null;
        try {
          const raw = localStorage.getItem(`jmk_onboarding_tasks_${emp.id}`);
          if (raw) savedTasks = JSON.parse(raw);
        } catch {
          // ignore parsing error
        }

        const defaultTasks = {
          hr: [emp.user_status === 'active', false, false, false],
          it: [false, false, false, false]
        };

        const startDateFormatted = emp.joining_date 
          ? new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Pending';

        return {
          id: emp.id,
          employee_code: emp.employee_code,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code,
          role: emp.designation_name || 'Team Member',
          department: emp.department_name || 'General',
          email: emp.email,
          status: emp.status || 'active',
          user_status: emp.user_status,
          start_date: startDateFormatted,
          tasks: savedTasks || defaultTasks
        };
      });

      setHires(mapped);
      if (mapped.length > 0) {
        setActiveId(prev => (mapped.some(m => m.id === prev) ? prev : mapped[0].id));
      } else {
        setActiveId(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load onboarding employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHires();
  }, []);

  const activeHire = hires.find(h => h.id === activeId);

  const toggleTask = (category, index) => {
    if (!activeHire) return;
    const newTasks = { ...activeHire.tasks };
    newTasks[category] = [...newTasks[category]];
    newTasks[category][index] = !newTasks[category][index];

    // Persist to localStorage
    try {
      localStorage.setItem(`jmk_onboarding_tasks_${activeHire.id}`, JSON.stringify(newTasks));
    } catch (e) {
      console.warn('Could not persist task state', e);
    }

    setHires(prev => prev.map(h => (h.id === activeHire.id ? { ...h, tasks: newTasks } : h)));
  };

  const calculateProgress = (hire) => {
    if (!hire?.tasks?.hr || !hire?.tasks?.it) return 0;
    const total = hire.tasks.hr.length + hire.tasks.it.length;
    const completed = hire.tasks.hr.filter(Boolean).length + hire.tasks.it.filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  // Delete onboarded employee
  const handleDeleteHire = async (hire) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete employee "${hire.name}" (${hire.employee_code})?\n\nThis will remove their onboarding checklist, attendance records, leaves, and user access.`
    );
    if (!confirmed) return;

    setDeletingId(hire.id);
    setActionAlert(null);
    try {
      const res = await deleteEmployee(hire.id);
      if (res?.success || res?.message) {
        localStorage.removeItem(`jmk_onboarding_tasks_${hire.id}`);
        setActionAlert({
          type: 'success',
          text: `Employee "${hire.name}" was permanently deleted.`
        });
        setHires(prev => prev.filter(h => h.id !== hire.id));
        await loadHires();
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('not found')) {
        localStorage.removeItem(`jmk_onboarding_tasks_${hire.id}`);
        setActionAlert({
          type: 'success',
          text: `Employee "${hire.name}" was permanently deleted.`
        });
        setHires(prev => prev.filter(h => h.id !== hire.id));
        await loadHires();
      } else {
        setActionAlert({
          type: 'error',
          text: err.response?.data?.message || `Failed to delete ${hire.name}`
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Send onboarding email
  const handleSendWelcomeEmail = async (hire) => {
    setResendingId(hire.id);
    setActionAlert(null);
    try {
      const res = await resendInvitation(hire.id);
      if (res.success) {
        const isSent = res.data.email_status === 'SENT';
        
        // Auto-check task 0
        const updatedTasks = { ...hire.tasks };
        updatedTasks.hr[0] = true;
        try {
          localStorage.setItem(`jmk_onboarding_tasks_${hire.id}`, JSON.stringify(updatedTasks));
        } catch {
          // ignore
        }
        setHires(prev => prev.map(h => (h.id === hire.id ? { ...h, tasks: updatedTasks } : h)));

        setActionAlert({
          type: isSent ? 'success' : 'warning',
          text: isSent
            ? `Onboarding email sent successfully to ${hire.email} from hr.jattamkommerce@gmail.com!`
            : `Credentials generated for ${hire.name}. Email dispatch pending — manual link available below.`,
          data: res.data,
          hire
        });
      }
    } catch (err) {
      setActionAlert({
        type: 'error',
        text: err.response?.data?.message || `Failed to send onboarding email to ${hire.email}`
      });
    } finally {
      setResendingId(null);
    }
  };

  // Handle Quick Onboard Modal Submission
  const handleQuickOnboard = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.email) {
      alert('First name and email are required.');
      return;
    }

    setSubmitting(true);
    setActionAlert(null);
    try {
      const res = await createEmployee({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        designation_name: formData.designation_name.trim() || undefined,
        department_name: formData.department_name.trim() || undefined,
        joining_date: formData.joining_date,
        status: 'active',
        terms_accepted: true
      });

      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          designation_name: '',
          department_name: '',
          joining_date: new Date().toISOString().split('T')[0]
        });
        setActionAlert({
          type: 'success',
          text: `Employee "${res.data?.first_name} ${res.data?.last_name || ''}" created successfully! Onboarding checklist initialized.`
        });
        await loadHires();
        if (res.data?.id) {
          setActiveId(res.data.id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to onboard employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mgmt-page">
      {/* ── Page Header ── */}
      <div className="mgmt-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              fontSize: '13px', 
              borderRadius: '6px', 
              border: '1px solid #cbd5e1', 
              background: '#fff', 
              cursor: 'pointer', 
              color: '#334155', 
              fontWeight: 500 
            }}
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Onboarding & IT Setup</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
              Automate workflows across HR, IT, and Provisioning for newly joined employees.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New Onboarding
          </button>
        </div>
      </div>

      {/* ── Alert Notification ── */}
      {actionAlert && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: actionAlert.type === 'success' ? '#f0fdf4' : actionAlert.type === 'warning' ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${actionAlert.type === 'success' ? '#bbf7d0' : actionAlert.type === 'warning' ? '#fef08a' : '#fecaca'}`,
          color: actionAlert.type === 'success' ? '#166534' : actionAlert.type === 'warning' ? '#854d0e' : '#991b1b',
          fontSize: '13px'
        }}>
          <div>
            <strong>{actionAlert.type === 'success' ? 'Success: ' : actionAlert.type === 'warning' ? 'Notice: ' : 'Error: '}</strong>
            {actionAlert.text}
          </div>
          <button 
            type="button" 
            onClick={() => setActionAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Loading / Empty / Content ── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b' }}>Loading onboarding pipeline...</p>
        </div>
      ) : hires.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'var(--surface, #ffffff)',
          borderRadius: '12px',
          border: '1px dashed var(--border-color, #cbd5e1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <Users size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>No Employees in Onboarding Pipeline</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', maxWidth: '420px', fontSize: '14px' }}>
            Your organization currently has 0 active onboardings. Click below to onboard your first team member with an automated HR and IT checklist.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> + Onboard New Employee
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/app/employees/new')}
            >
              Open Full Registration
            </button>
          </div>
        </div>
      ) : (
        <div className="onboarding-grid">
          {/* ── Left Sidebar: Hire List ── */}
          <div className="hire-list">
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Onboardees ({hires.length})
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {hires.map(hire => {
              const progress = calculateProgress(hire);
              const isActive = activeId === hire.id;
              return (
                <div 
                  key={hire.id} 
                  className={`hire-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveId(hire.id)}
                  style={{ position: 'relative' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: 600 }}>{hire.name}</h4>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: progress === 100 ? '#166534' : '#2563eb',
                      backgroundColor: progress === 100 ? '#dcfce7' : '#eff6ff',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {progress}%
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>
                    {hire.role} • {hire.department}
                  </p>
                  <div className="progress-bar-bg" style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${progress}%`, 
                        backgroundColor: progress === 100 ? '#10b981' : '#3b82f6',
                        height: '100%',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right Panel: Active Hire Onboarding Details ── */}
          {activeHire ? (
            <div className="onboarding-details" style={{ backgroundColor: 'var(--surface, #ffffff)', borderRadius: '8px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '18px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{activeHire.name}'s Onboarding Plan</h2>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                      {activeHire.employee_code}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                    {activeHire.role} • {activeHire.department} • Official Email: <strong>{activeHire.email}</strong> • Joined: {activeHire.start_date}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/app/employees/${activeHire.id}`)}
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                  >
                    View Profile
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeleteHire(activeHire)}
                    disabled={deletingId === activeHire.id}
                    title="Delete employee permanently"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      padding: '5px 10px',
                      color: '#dc2626',
                      borderColor: '#fecaca',
                      backgroundColor: '#fef2f2'
                    }}
                  >
                    <Trash2 size={13} color="#dc2626" />
                    <span>{deletingId === activeHire.id ? 'Deleting...' : 'Delete Employee'}</span>
                  </button>
                </div>
              </div>

              {/* Progress Summary Banner */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    Overall Readiness: {calculateProgress(activeHire)}% Completed
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {calculateProgress(activeHire) === 100 
                      ? 'All HR requirements and IT setups have been verified!' 
                      : 'Pending tasks must be completed before the end of the first week.'}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSendWelcomeEmail(activeHire)}
                  disabled={resendingId === activeHire.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Mail size={14} />
                  <span>{resendingId === activeHire.id ? 'Sending...' : 'Send Welcome Email'}</span>
                </button>
              </div>

              {/* Task Group 1: HR Requirements */}
              <div className="task-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                    HR & Compliance Requirements
                  </h3>
                </div>
                {HR_TASKS.map((task, i) => (
                  <div key={i} className="task-item">
                    <input 
                      type="checkbox" 
                      id={`hr-${i}`} 
                      checked={!!activeHire.tasks?.hr?.[i]} 
                      onChange={() => toggleTask('hr', i)} 
                    />
                    <label htmlFor={`hr-${i}`} className={activeHire.tasks?.hr?.[i] ? 'done' : ''}>
                      {task}
                    </label>
                  </div>
                ))}
              </div>

              {/* Task Group 2: IT & Provisioning */}
              <div className="task-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Laptop size={16} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                    IT, Accounts & Hardware Provisioning
                  </h3>
                </div>
                {IT_TASKS.map((task, i) => (
                  <div key={i} className="task-item">
                    <input 
                      type="checkbox" 
                      id={`it-${i}`} 
                      checked={!!activeHire.tasks?.it?.[i]} 
                      onChange={() => toggleTask('it', i)} 
                    />
                    <label htmlFor={`it-${i}`} className={activeHire.tasks?.it?.[i] ? 'done' : ''}>
                      {task}
                    </label>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
              <p style={{ color: '#64748b' }}>Select an employee from the left to view their onboarding checklist.</p>
            </div>
          )}
        </div>
      )}

      {/* ── New Onboarding Modal ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Onboard New Employee</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Register a real team member and set up their HR and IT onboarding plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickOnboard} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Rahul"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Verma"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="employee@jattamkommerce.com"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={formData.designation_name}
                    onChange={(e) => setFormData({ ...formData, designation_name: e.target.value })}
                    placeholder="e.g. Operations Executive"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department_name}
                    onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                    placeholder="e.g. E-Commerce"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                  Joining Date
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    navigate('/app/employees/new');
                  }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Need full form? Click here
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create & Onboard'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
