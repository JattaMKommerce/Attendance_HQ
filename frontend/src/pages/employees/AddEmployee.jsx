import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, IndianRupee, Building2, CheckCircle, Send, RefreshCw, Copy, Check, Mail, ExternalLink, AlertTriangle } from 'lucide-react';
import { createEmployee, getLookups, uploadPhoto, uploadDocument, uploadResume, resendInvitation } from '../../services/employeeApi';
import { getIndiaStatesList, getCitiesForIndiaState } from '../../utils/geoService';
import FileUploader from '../../components/common/FileUploader';
import '../../styles/components.css';

const SALARY_FIELD_STYLE = {
  position: 'relative'
};
const RUPEE_PREFIX = {
  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)', fontSize: '14px', pointerEvents: 'none'
};
const PCT_SUFFIX = {
  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)', fontSize: '14px', pointerEvents: 'none'
};

const SalaryInput = ({ label, name, value, onChange, disabled = false, isPercent = false, readOnly = false }) => (
  <div className="input-group">
    <label className="input-label">{label}</label>
    <div style={SALARY_FIELD_STYLE}>
      {!isPercent && <span style={RUPEE_PREFIX}>₹</span>}
      <input
        type="number"
        name={name}
        className="input-control"
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        style={{ paddingLeft: isPercent ? '12px' : '28px', paddingRight: isPercent ? '32px' : '12px', backgroundColor: readOnly ? 'var(--surface-hover)' : undefined }}
        step="0.01"
        min="0"
      />
      {isPercent && <span style={PCT_SUFFIX}>%</span>}
    </div>
  </div>
);

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'save' | 'email'
  const [lookups, setLookups] = useState({ departments: [], designations: [], managers: [] });
  const [lookupsError, setLookupsError] = useState(null);
  const [error, setError] = useState(null);
  const [createdSuccess, setCreatedSuccess] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendFeedback, setResendFeedback] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedDownload, setCopiedDownload] = useState(false);

  const defaultSalary = { gross_salary: '', basic_salary: '', hra: '', special_allowance: '', deductions: '', esi_percentage: '0.75', pf_percentage: '12.00', monthly_paid_leaves: '2', other_allowance: '', professional_tax: '', advances: '', incentives: '' };
  const defaultBank = { bank_name: '', account_number: '', ifsc_code: '' };

  const defaultFormData = {
    first_name: '', last_name: '', email: '', phone: '',
    temporary_password: '',
    employee_code: '', joining_date: new Date().toISOString().split('T')[0],
    gender: '', marital_status: '', blood_group: '', employment_type: 'full_time', date_of_birth: '',
    department_id: '', designation_id: '', manager_id: '',
    current_address: '', permanent_address: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    uan_number: '', experience_type: 'fresher',
    terms_accepted: false, profile_image_url: null, resume_url: null,
    office_state: '', office_city: '',
    experiences: [], education: [], documents: [],
    ...defaultSalary, ...defaultBank
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    if (formData.office_state) {
      getCitiesForIndiaState(formData.office_state).then(setCities);
    } else {
      setCities([]);
    }
  }, [formData.office_state]);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [resumeName, setResumeName] = useState(null);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const res = await getLookups();
        if (res.success) {
          setLookups(res.data);
        } else {
          setLookupsError('Failed to load departments and designations');
        }
      } catch (err) {
        console.error('Lookups error:', err);
        setLookupsError(`Dropdown error: ${err.response?.data?.message || err.message}`);
      }
    };
    fetchLookups();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

      if (name === 'gross_salary' && value) {
        const gross = parseFloat(value) || 0;
        updated.basic_salary = (gross * 0.50).toFixed(2);
        updated.hra = (gross * 0.40 * 0.50).toFixed(2); // HRA = 40% of Basic
        updated.special_allowance = (gross * 0.30).toFixed(2);
      }
      if (name === 'basic_salary' && value) {
        const basic = parseFloat(value) || 0;
        updated.hra = (basic * 0.40).toFixed(2); // HRA = 40% of Basic
        const esi = parseFloat(prev.esi_percentage) || 0.75;
        const pf = parseFloat(prev.pf_percentage) || 12;
        const esiAmt = (basic * esi / 100).toFixed(2);
        const pfAmt = (basic * pf / 100).toFixed(2);
        updated.deductions = (parseFloat(esiAmt) + parseFloat(pfAmt)).toFixed(2);
      }
      return updated;
    });
  };

  const handlePhotoUpload = async (file) => {
    try {
      const res = await uploadPhoto(file);
      if (res.success) {
        setFormData(prev => ({ ...prev, profile_image_url: res.data.file_url }));
        setPhotoPreview(URL.createObjectURL(file));
        setError(null);
      }
    } catch (err) { setError(err.response?.data?.message || 'Photo upload failed'); }
  };

  const handleResumeUpload = async (file) => {
    try {
      const res = await uploadResume(file);
      if (res.success) {
        setFormData(prev => ({ ...prev, resume_url: res.data.file_url }));
        setResumeName(file.name);
        setError(null);
      }
    } catch (err) { setError(err.response?.data?.message || 'Resume upload failed'); }
  };

  const addArrayItem = (key, obj) => setFormData(prev => ({ ...prev, [key]: [...prev[key], obj] }));
  const handleArrayChange = (key, idx, field, value) => setFormData(prev => {
    const arr = [...prev[key]]; arr[idx][field] = value; return { ...prev, [key]: arr };
  });
  const removeArrayItem = (key, idx) => setFormData(prev => {
    const arr = [...prev[key]]; arr.splice(idx, 1); return { ...prev, [key]: arr };
  });

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const res = await uploadDocument(file);
      if (res.success) addArrayItem('documents', { title: res.data.original_name, document_type: 'other', file_url: res.data.file_url });
    } catch (err) { setError(err.response?.data?.message || 'Document upload failed'); }
  };

  const netSalary = () => {
    const gross = parseFloat(formData.gross_salary) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const profTax = parseFloat(formData.professional_tax) || 0;
    const advances = parseFloat(formData.advances) || 0;
    return (gross - deductions - profTax - advances).toFixed(2);
  };

  const handleSubmit = async (e, sendEmail = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setLoadingAction(sendEmail ? 'email' : 'save');
    setError(null);

    if (!formData.terms_accepted) {
      setError('You must accept the terms and conditions.');
      setLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const payload = { ...formData, send_onboarding_email: sendEmail };
      ['department_id', 'designation_id', 'manager_id', 'gender', 'blood_group', 'office_state', 'office_city'].forEach(k => { if (!payload[k]) payload[k] = null; });
      if (payload.experience_type === 'fresher') payload.experiences = [];
      const res = await createEmployee(payload);
      if (res.success) {
        setCreatedSuccess(res.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // If "Send Onboarding Email" was clicked, open Gmail compose in a new tab if URL available
        if (sendEmail && res.data.gmail_compose_url) {
          try {
            window.open(res.data.gmail_compose_url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Could not auto-open Gmail popup window:', e);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleResend = async () => {
    if (!createdSuccess?.id) return;
    setResendingEmail(true);
    setResendFeedback(null);
    try {
      const res = await resendInvitation(createdSuccess.id);
      if (res.success) {
        setCreatedSuccess(prev => ({
          ...prev,
          email_status: res.data.email_status,
          email_error: res.data.email_error,
          token: res.data.token || prev.token,
          app_download_url: res.data.app_download_url || prev.app_download_url,
          activation_link: res.data.activation_link || prev.activation_link,
          gmail_compose_url: res.data.gmail_compose_url || prev.gmail_compose_url
        }));
        if (res.data.gmail_compose_url) {
          try {
            window.open(res.data.gmail_compose_url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Could not auto-open Gmail popup window:', e);
          }
        }
        setResendFeedback({
          type: res.data.email_status === 'SENT' ? 'success' : 'warning',
          text: res.data.email_status === 'SENT' 
            ? 'Onboarding invitation email with login credentials & app download link sent successfully!'
            : 'New activation link and token generated. Direct Gmail link ready below.'
        });
      }
    } catch (err) {
      setResendFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send invitation email.'
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const copyActivationLink = () => {
    if (!createdSuccess?.activation_link) return;
    navigator.clipboard.writeText(createdSuccess.activation_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const copyToken = () => {
    if (!createdSuccess?.token) return;
    navigator.clipboard.writeText(createdSuccess.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const copyPassword = () => {
    if (!createdSuccess?.temporary_password) return;
    navigator.clipboard.writeText(createdSuccess.temporary_password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  const copyDownloadLink = () => {
    if (!createdSuccess?.app_download_url) return;
    navigator.clipboard.writeText(createdSuccess.app_download_url);
    setCopiedDownload(true);
    setTimeout(() => setCopiedDownload(false), 3000);
  };

  const sectionHeader = (title, icon) => (
    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {icon}
      <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={() => navigate('/app/employees')}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="page-title">Add New Employee</h1>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', color: 'var(--danger)', backgroundColor: '#fff1f1', border: '1px solid #fecaca', marginBottom: '20px', borderRadius: '8px' }}>{error}</div>}
      {lookupsError && <div style={{ padding: '12px 16px', color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fde68a', marginBottom: '20px', borderRadius: '8px' }}>⚠️ {lookupsError}</div>}

      {createdSuccess ? (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle size={38} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
            {createdSuccess.email_status === 'SAVED_NO_EMAIL'
              ? 'Employee Record Saved Successfully'
              : 'Employee & Account Created Successfully'}
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 28px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            {createdSuccess.email_status === 'SAVED_NO_EMAIL'
              ? 'The employee profile and official user account have been created and saved. You can dispatch onboarding login credentials now or open directly in Gmail.'
              : 'The employee record has been saved, an official user account has been provisioned, and onboarding credentials have been processed.'}
          </p>

          {/* Details Grid */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '680px',
            margin: '0 auto 24px',
            textAlign: 'left',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Employee Name</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>{createdSuccess.first_name} {createdSuccess.last_name}</strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Official Employee ID</span>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '15px',
                border: '1px solid #bfdbfe'
              }}>
                {createdSuccess.employee_code}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Official Login Email</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{createdSuccess.email}</strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Account & Activation Status</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  border: '1px solid #fde68a'
                }}>
                  Status: {createdSuccess.account_status}
                </span>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  Activation: {createdSuccess.activation_status}
                </span>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Onboarding Email Delivery Status</span>
              {createdSuccess.email_status === 'SENT' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '14px', fontWeight: 600 }}>
                  <CheckCircle size={18} />
                  <span>Onboarding email with login credentials sent successfully to {createdSuccess.email}.</span>
                </div>
              ) : createdSuccess.email_status === 'SAVED_NO_EMAIL' ? (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    <CheckCircle size={18} />
                    <span>Saved in System (No automated email sent yet)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                    The employee record and credentials are fully saved. Click <strong>Send Onboarding Email Now</strong> or <strong>Open in Gmail</strong> below to dispatch credentials.
                  </p>
                </div>
              ) : (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    <AlertTriangle size={18} />
                    <span>Email Delivery Pending / Notice:</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                    {createdSuccess.email_error || 'SMTP/Gmail credentials not active in environment. The account is safely created.'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>
                    💡 You can click <strong>Open in Gmail</strong> below to send the login credentials directly from your Gmail account!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback from resend */}
          {resendFeedback && (
            <div style={{
              maxWidth: '680px',
              margin: '0 auto 20px',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: resendFeedback.type === 'success' ? '#ecfdf5' : '#fffbeb',
              color: resendFeedback.type === 'success' ? '#065f46' : '#92400e',
              border: `1px solid ${resendFeedback.type === 'success' ? '#a7f3d0' : '#fde68a'}`,
              textAlign: 'center'
            }}>
              {resendFeedback.text}
            </div>
          )}

          {/* Activation link for manual / development verification */}
          {createdSuccess.activation_link && (
            <div style={{
              maxWidth: '680px',
              margin: '0 auto 28px',
              padding: '16px 20px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Secure Activation Link (Valid for 48 hours):
                </span>
                <button
                  type="button"
                  onClick={copyActivationLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#2563eb',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={createdSuccess.activation_link}
                className="input-control"
                style={{ fontSize: '12px', backgroundColor: '#ffffff', color: '#475569' }}
                onClick={(e) => e.target.select()}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                The employee creates their own permanent password upon clicking this link. The token is single-use.
              </span>
            </div>
          )}

          {/* Token, Password & App Download Box */}
          {(createdSuccess.temporary_password || createdSuccess.token || createdSuccess.app_download_url) && (
            <div style={{
              maxWidth: '680px',
              margin: '0 auto 28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              textAlign: 'left'
            }}>
              {/* Temporary Password Card */}
              {createdSuccess.temporary_password && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fffbeb',
                  borderRadius: '10px',
                  border: '1.5px solid #fcd34d',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                      🔐 Temporary Login Password:
                    </span>
                    <button
                      type="button"
                      onClick={copyPassword}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#b45309',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {copiedPassword ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      {copiedPassword ? 'Copied!' : 'Copy Password'}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={createdSuccess.temporary_password}
                    className="input-control"
                    style={{ fontSize: '13px', backgroundColor: '#ffffff', color: '#92400e', fontWeight: 700, fontFamily: 'monospace' }}
                    onClick={(e) => e.target.select()}
                  />
                  <span style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', display: 'block' }}>
                    Included in employee onboarding email. Employee should change this after first login.
                  </span>
                </div>
              )}

              {/* Token Card */}
              {createdSuccess.token && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      🔑 Activation Token:
                    </span>
                    <button
                      type="button"
                      onClick={copyToken}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#2563eb',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {copiedToken ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      {copiedToken ? 'Copied!' : 'Copy Token'}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={createdSuccess.token}
                    className="input-control"
                    style={{ fontSize: '12px', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'monospace' }}
                    onClick={(e) => e.target.select()}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                    Cryptographic token valid for 48 hours.
                  </span>
                </div>
              )}

              {/* Mobile App Download Card */}
              {createdSuccess.app_download_url && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      📱 App Download Link:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a
                        href={createdSuccess.app_download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                      >
                        Open <ExternalLink size={12} />
                      </a>
                      <button
                        type="button"
                        onClick={copyDownloadLink}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#2563eb',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {copiedDownload ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        {copiedDownload ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={createdSuccess.app_download_url}
                    className="input-control"
                    style={{ fontSize: '12px', backgroundColor: '#f8fafc', color: '#1e293b' }}
                    onClick={(e) => e.target.select()}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                    Link for employee to install mobile app on phone.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {createdSuccess.gmail_compose_url && (
              <a
                href={createdSuccess.gmail_compose_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  borderColor: '#ea4335',
                  color: '#ea4335',
                  textDecoration: 'none',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(234, 67, 53, 0.1)'
                }}
              >
                <Mail size={16} color="#ea4335" />
                Open in Gmail
                <ExternalLink size={14} color="#ea4335" />
              </a>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={resendingEmail}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              <RefreshCw size={16} className={resendingEmail ? 'spin' : ''} />
              {resendingEmail 
                ? 'Sending Invitation...' 
                : createdSuccess.email_status === 'SAVED_NO_EMAIL' 
                ? 'Send Onboarding Email Now' 
                : 'Resend Onboarding Email'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCreatedSuccess(null);
                setFormData(defaultFormData);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              Add Another Employee
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/app/employees/${createdSuccess.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              View Employee Profile
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

        {/* Photo & Resume */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Profile Photo</h3></div>
            <div className="card-body">
              <FileUploader accept="image/jpeg,image/png,image/webp" onUpload={handlePhotoUpload} previewUrl={photoPreview} onRemove={() => { setPhotoPreview(null); setFormData(p => ({ ...p, profile_image_url: null })); }} helperText="Drag & drop or click. JPG, PNG, WEBP." isImage={true} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Resume / CV</h3></div>
            <div className="card-body">
              <FileUploader accept="application/pdf" onUpload={handleResumeUpload} fileName={resumeName} previewUrl={formData.resume_url} onRemove={() => { setResumeName(null); setFormData(p => ({ ...p, resume_url: null })); }} helperText="Drag & drop or click. PDF only." isImage={false} />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><h3 className="card-title">Personal Information</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group"><label className="input-label">First Name *</label><input type="text" name="first_name" className="input-control" value={formData.first_name} onChange={handleChange} required /></div>
            <div className="input-group"><label className="input-label">Last Name *</label><input type="text" name="last_name" className="input-control" value={formData.last_name} onChange={handleChange} required /></div>
            <div className="input-group"><label className="input-label">Email *</label><input type="email" name="email" className="input-control" value={formData.email} onChange={handleChange} required /></div>
            <div className="input-group"><label className="input-label">Phone</label><input type="text" name="phone" className="input-control" value={formData.phone} onChange={handleChange} /></div>
            <div className="input-group">
              <label className="input-label">
                Initial Temporary Password <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional - leave blank to auto-generate)</span>
              </label>
              <input
                type="text"
                name="temporary_password"
                className="input-control"
                value={formData.temporary_password || ''}
                onChange={handleChange}
                placeholder="Leave blank to auto-generate secure password"
              />
            </div>
            <div className="input-group"><label className="input-label">Date of Birth</label><input type="date" name="date_of_birth" className="input-control" value={formData.date_of_birth} onChange={handleChange} /></div>
            <div className="input-group"><label className="input-label">Gender</label>
              <select name="gender" className="input-control" value={formData.gender} onChange={handleChange}>
                <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="input-group"><label className="input-label">Marital Status</label>
              <select name="marital_status" className="input-control" value={formData.marital_status} onChange={handleChange}>
                <option value="">Select Marital Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="unmarried">Unmarried</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div className="input-group"><label className="input-label">Blood Group</label>
              <select name="blood_group" className="input-control" value={formData.blood_group} onChange={handleChange}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className="input-group"><label className="input-label">Current Address</label><textarea name="current_address" className="input-control" value={formData.current_address} onChange={handleChange} rows="2" /></div>
            <div className="input-group"><label className="input-label">Permanent Address</label><textarea name="permanent_address" className="input-control" value={formData.permanent_address} onChange={handleChange} rows="2" /></div>
            <div className="input-group"><label className="input-label">Emergency Contact Name</label><input type="text" name="emergency_contact_name" className="input-control" value={formData.emergency_contact_name} onChange={handleChange} /></div>
            <div className="input-group"><label className="input-label">Emergency Contact Phone</label><input type="text" name="emergency_contact_phone" className="input-control" value={formData.emergency_contact_phone} onChange={handleChange} /></div>
          </div>
        </div>

        {/* Employment */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><h3 className="card-title">Employment Information</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Employee ID</label>
              <input
                type="text"
                name="employee_code"
                className="input-control"
                value={formData.employee_code}
                onChange={handleChange}
                placeholder="Auto-generated if blank (e.g. EMP-001)"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Leave blank to auto-generate sequentially.
              </span>
            </div>
            <div className="input-group"><label className="input-label">Joining Date *</label><input type="date" name="joining_date" className="input-control" value={formData.joining_date} onChange={handleChange} required /></div>
            <div className="input-group">
              <label className="input-label">Department {lookups.departments.length === 0 && lookupsError ? '⚠️' : ''}</label>
              <select name="department_id" className="input-control" value={formData.department_id} onChange={handleChange}>
                <option value="">Select Department</option>
                {lookups.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {lookups.departments.length === 0 && !lookupsError && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Designation</label>
              <select name="designation_id" className="input-control" value={formData.designation_id} onChange={handleChange}>
                <option value="">Select Designation</option>
                {lookups.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Reporting Manager</label>
              <select name="manager_id" className="input-control" value={formData.manager_id || ''} onChange={handleChange}>
                <option value="">Select Reporting Manager (Optional)</option>
                {lookups.managers && lookups.managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} ({m.employee_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group"><label className="input-label">Employment Type *</label>
              <select name="employment_type" className="input-control" value={formData.employment_type} onChange={handleChange} required>
                <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="intern">Intern</option><option value="consultant">Consultant</option>
              </select>
            </div>
            <div className="input-group"><label className="input-label">Experience Type *</label>
              <select name="experience_type" className="input-control" value={formData.experience_type} onChange={handleChange} required>
                <option value="fresher">Fresher</option><option value="experienced">Experienced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Office Location */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header"><h3 className="card-title">Office Location</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">State</label>
              <select name="office_state" className="input-control" value={formData.office_state} onChange={(e) => {
                setFormData(prev => ({ ...prev, office_state: e.target.value, office_city: '' }));
              }}>
                <option value="">Select State</option>
                {getIndiaStatesList().map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">City</label>
              <select name="office_city" className="input-control" value={formData.office_city} onChange={handleChange} disabled={!formData.office_state}>
                <option value="">Select City</option>
                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Salary & Bank Details ─── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          {sectionHeader(formData.employment_type === 'intern' ? 'Stipend & Bank Details' : 'Salary & Bank Details', <IndianRupee size={18} color="var(--primary-color)" />)}
          <div className="card-body">

            {/* Bank Details */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Bank Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="input-group"><label className="input-label">Bank Name</label><input type="text" name="bank_name" className="input-control" value={formData.bank_name} onChange={handleChange} placeholder="e.g. HDFC Bank" /></div>
                <div className="input-group"><label className="input-label">Account Number</label><input type="text" name="account_number" className="input-control" value={formData.account_number} onChange={handleChange} placeholder="e.g. 501002345678" /></div>
                <div className="input-group"><label className="input-label">IFSC Code</label><input type="text" name="ifsc_code" className="input-control" value={formData.ifsc_code} onChange={handleChange} placeholder="e.g. HDFC0001234" /></div>
              </div>
            </div>

            {formData.employment_type === 'intern' ? (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Stipend Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <SalaryInput label="Monthly Stipend *" name="gross_salary" value={formData.gross_salary} onChange={handleChange} />
                  <div className="input-group"><label className="input-label">Internship Duration (Months)</label><input type="number" name="monthly_paid_leaves" className="input-control" value={formData.monthly_paid_leaves} onChange={handleChange} placeholder="e.g. 6" min="1" /></div>
                </div>
              </>
            ) : formData.employment_type === 'contract' ? (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Contract Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <SalaryInput label="Contract Amount (Monthly) *" name="gross_salary" value={formData.gross_salary} onChange={handleChange} />
                  <SalaryInput label="TDS % (if applicable)" name="professional_tax" value={formData.professional_tax} onChange={handleChange} isPercent />
                  <div className="input-group"><label className="input-label">Contract Tenure (Months)</label><input type="number" name="monthly_paid_leaves" className="input-control" value={formData.monthly_paid_leaves} onChange={handleChange} placeholder="e.g. 12" min="1" /></div>
                </div>
              </>
            ) : (
              <>
                {/* Base Salary & percentages */}
                <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Salary Structure (Auto-calculates on Gross entry)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <SalaryInput label="Gross Salary (Monthly) *" name="gross_salary" value={formData.gross_salary} onChange={handleChange} />
                  <SalaryInput label="Basic Salary (50% of Gross)" name="basic_salary" value={formData.basic_salary} onChange={handleChange} />
                  <SalaryInput label="ESI %" name="esi_percentage" value={formData.esi_percentage} onChange={handleChange} isPercent />
                  <SalaryInput label="PF %" name="pf_percentage" value={formData.pf_percentage} onChange={handleChange} isPercent />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <SalaryInput label="HRA (40% of Basic)" name="hra" value={formData.hra} onChange={handleChange} />
                  <SalaryInput label="Special Allowance (30% Gross)" name="special_allowance" value={formData.special_allowance} onChange={handleChange} />
                  <SalaryInput label="Incentives (Monthly)" name="incentives" value={formData.incentives} onChange={handleChange} />
                  <SalaryInput label="Other Allowance" name="other_allowance" value={formData.other_allowance} onChange={handleChange} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <SalaryInput label="Professional Tax (Monthly)" name="professional_tax" value={formData.professional_tax} onChange={handleChange} />
                  <SalaryInput label="Advances" name="advances" value={formData.advances} onChange={handleChange} />
                  <SalaryInput label="Other Deductions" name="deductions" value={formData.deductions} onChange={handleChange} />
                  <div className="input-group">
                    <label className="input-label">Monthly Paid Leaves</label>
                    <input type="number" name="monthly_paid_leaves" className="input-control" value={formData.monthly_paid_leaves} onChange={handleChange} min="0" />
                  </div>
                </div>
              </>
            )}

            {/* Net Salary Summary */}
            {formData.gross_salary && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--primary-bg, #eff6ff)', borderRadius: '8px', border: '1px solid var(--primary-border, #bfdbfe)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: formData.employment_type === 'intern' ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Gross {formData.employment_type === 'intern' ? 'Stipend' : 'Amount'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-color)' }}>₹{parseFloat(formData.gross_salary || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {formData.employment_type !== 'intern' && formData.employment_type !== 'contract' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Allowances</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>₹{(parseFloat(formData.hra || 0) + parseFloat(formData.special_allowance || 0) + parseFloat(formData.other_allowance || 0) + parseFloat(formData.incentives || 0)).toLocaleString('en-IN')}</div>
                    </div>
                  )}
                  {formData.employment_type !== 'intern' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Deductions</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>₹{(parseFloat(formData.deductions || 0) + parseFloat(formData.professional_tax || 0) + parseFloat(formData.advances || 0)).toLocaleString('en-IN')}</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Net Take-Home</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-color, #4f46e5)' }}>₹{parseFloat(netSalary()).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Education History</h3>
            <button type="button" className="btn btn-secondary" onClick={() => addArrayItem('education', { level: 'Bachelors', degree_name: '', university_name: '', passing_year: '' })} style={{ padding: '4px 10px', fontSize: '12px' }}><Plus size={14} /> Add</button>
          </div>
          <div className="card-body">
            {formData.education.map((edu, idx) => (
              <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '12px', position: 'relative' }}>
                <button type="button" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => removeArrayItem('education', idx)}><Trash2 size={16} /></button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div className="input-group"><label className="input-label">Level</label>
                    <select className="input-control" value={edu.level} onChange={e => handleArrayChange('education', idx, 'level', e.target.value)}>
                      <option value="10th">10th</option><option value="12th">12th</option><option value="Diploma">Diploma</option><option value="Bachelors">Bachelors</option><option value="Masters">Masters</option><option value="PhD">PhD</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="input-group"><label className="input-label">Degree / Stream</label><input type="text" className="input-control" value={edu.degree_name} onChange={e => handleArrayChange('education', idx, 'degree_name', e.target.value)} placeholder="e.g. B.Tech CSE" /></div>
                  <div className="input-group"><label className="input-label">University / Board</label><input type="text" className="input-control" value={edu.university_name} onChange={e => handleArrayChange('education', idx, 'university_name', e.target.value)} /></div>
                  <div className="input-group"><label className="input-label">Passing Year</label><input type="number" className="input-control" value={edu.passing_year} onChange={e => handleArrayChange('education', idx, 'passing_year', e.target.value)} placeholder="2024" /></div>
                </div>
              </div>
            ))}
            {formData.education.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>No education details added. Click Add to begin.</p>}
          </div>
        </div>

        {/* Experience */}
        {formData.experience_type === 'experienced' && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Previous Experience</h3>
              <button type="button" className="btn btn-secondary" onClick={() => addArrayItem('experiences', { company_name: '', previous_designation: '', start_date: '', end_date: '', salary: '', reason_for_leaving: '' })} style={{ padding: '4px 10px', fontSize: '12px' }}><Plus size={14} /> Add</button>
            </div>
            <div className="card-body">
              <div className="input-group" style={{ marginBottom: '16px', maxWidth: '300px' }}><label className="input-label">UAN Number</label><input type="text" name="uan_number" className="input-control" value={formData.uan_number} onChange={handleChange} placeholder="Universal Account Number" /></div>
              {formData.experiences.map((exp, idx) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '12px', position: 'relative' }}>
                  <button type="button" style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => removeArrayItem('experiences', idx)}><Trash2 size={16} /></button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="input-group"><label className="input-label">Company Name *</label><input type="text" className="input-control" value={exp.company_name} onChange={e => handleArrayChange('experiences', idx, 'company_name', e.target.value)} required /></div>
                    <div className="input-group"><label className="input-label">Designation *</label><input type="text" className="input-control" value={exp.previous_designation} onChange={e => handleArrayChange('experiences', idx, 'previous_designation', e.target.value)} required /></div>
                    <div className="input-group"><label className="input-label">Start Date *</label><input type="date" className="input-control" value={exp.start_date} onChange={e => handleArrayChange('experiences', idx, 'start_date', e.target.value)} required /></div>
                    <div className="input-group"><label className="input-label">End Date</label><input type="date" className="input-control" value={exp.end_date} onChange={e => handleArrayChange('experiences', idx, 'end_date', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Previous Employment Documents</h4>
                <div>
                  <input type="file" id="docUpload" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocumentUpload} />
                  <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('docUpload').click()} style={{ padding: '4px 10px', fontSize: '12px' }}>Upload Doc</button>
                </div>
              </div>
              {formData.documents.map((doc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-hover)', borderRadius: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{doc.title}</span>
                  <button type="button" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeArrayItem('documents', idx)}><Trash2 size={14} /></button>
                </div>
              ))}
              {formData.documents.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>No documents uploaded yet.</p>}
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input type="checkbox" name="terms_accepted" checked={formData.terms_accepted} onChange={handleChange} style={{ marginTop: '3px', width: '16px', height: '16px' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-color)', lineHeight: 1.6 }}>
                I confirm that the provided employee information is accurate and I accept the applicable terms and conditions for employee record creation.
              </span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/app/employees')} 
            disabled={loading}
          >
            Cancel
          </button>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={(e) => handleSubmit(e, false)} 
            disabled={loading || !formData.terms_accepted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          >
            <Save size={16} />
            {loading && loadingAction === 'save' ? 'Saving Employee...' : 'Save'}
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={(e) => handleSubmit(e, true)} 
            disabled={loading || !formData.terms_accepted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          >
            <Send size={16} />
            {loading && loadingAction === 'email' ? 'Sending Onboarding Email...' : 'Send Onboarding Email'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default AddEmployee;
