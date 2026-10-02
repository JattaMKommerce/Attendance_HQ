import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Phone, MapPin, Briefcase, Calendar as CalendarIcon, Send, CheckCircle, AlertTriangle, ExternalLink, Copy, Check, Camera, Loader, Download, FileText, Building2, Plus, Trash2 } from 'lucide-react';
import { getEmployeeById, updateEmployee, getLookups, resendInvitation, uploadPhoto, uploadDocument } from '../../services/employeeApi';
import EmployeeIdCard from '../../components/EmployeeIdCard';
import { getFileUrl } from '../../services/api';
import { getIndiaStatesList, getCitiesForIndiaState, getIndiaStateName } from '../../utils/geoService';
import '../../styles/components.css';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [lookups, setLookups] = useState({ departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedDownload, setCopiedDownload] = useState(false);
  const [error, setError] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [showIdModal, setShowIdModal] = useState(false);
  const [cities, setCities] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (formData.office_state) {
      getCitiesForIndiaState(formData.office_state).then(setCities);
    } else {
      setCities([]);
    }
  }, [formData.office_state]);

  const sanitizeDate = (val) => {
    if (!val) return '';
    return String(val).split('T')[0];
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      const res = await uploadPhoto(file);
      if (res.success && res.data?.file_url) {
        const newPhotoUrl = res.data.file_url;
        setEmployee(prev => ({ ...prev, profile_image_url: newPhotoUrl }));
        setFormData(prev => ({ ...prev, profile_image_url: newPhotoUrl }));
        await updateEmployee(id, { profile_image_url: newPhotoUrl });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(id);
      if (res.success && res.data) {
        const sanitized = {
          ...res.data,
          date_of_birth: sanitizeDate(res.data.date_of_birth),
          joining_date: sanitizeDate(res.data.joining_date)
        };
        setEmployee(sanitized);
        setFormData(sanitized);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const res = await getLookups();
      if (res.success) setLookups(res.data);
    } catch (err) {
      console.error('Error fetching lookups', err);
    }
  };

  useEffect(() => {
    fetchEmployee();
    fetchLookups();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Auto-uppercase IFSC
  const handleIFSCChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData(prev => ({ ...prev, ifsc_code: val }));
  };

  // Handle document upload for profile
  const handleProfileDocUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      setUploadingDoc(true);
      const res = await uploadDocument(file);
      if (res.success) {
        const newDoc = { title: res.data.original_name, document_type: 'other', file_url: res.data.file_url };
        // Save to employee documents through update
        const updatedDocs = [...(formData.documents || []), newDoc];
        setFormData(prev => ({ ...prev, documents: updatedDocs }));
        await updateEmployee(id, { documents: updatedDocs });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleStateChange = (e) => {
    const stateIso = e.target.value;
    setFormData(prev => ({
      ...prev,
      office_state: stateIso,
      office_city: ''
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        date_of_birth: sanitizeDate(formData.date_of_birth) || null,
        joining_date: sanitizeDate(formData.joining_date) || null
      };
      const res = await updateEmployee(id, payload);
      if (res.success) {
        const sanitized = {
          ...res.data,
          date_of_birth: sanitizeDate(res.data?.date_of_birth),
          joining_date: sanitizeDate(res.data?.joining_date)
        };
        setEmployee(sanitized);
        setFormData(sanitized);
        setEditMode(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee details');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      const res = await resendInvitation(id);
      if (res.success) {
        setResendStatus({
          type: res.data.email_status === 'SENT' ? 'success' : 'warning',
          text: res.data.email_status === 'SENT' 
            ? `Onboarding invitation email with credentials sent to ${employee.email} from hr.jattamkommerce@gmail.com!`
            : 'New activation link & token generated. Direct Gmail link ready below.',
          data: res.data
        });
        if (res.data.gmail_compose_url) {
          try {
            window.open(res.data.gmail_compose_url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Could not auto-open Gmail popup window:', e);
          }
        }
      }
    } catch (err) {
      setResendStatus({
        type: 'error',
        text: err.response?.data?.message || 'Failed to resend invitation'
      });
    } finally {
      setResending(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading employee details...</div>;
  if (error && !employee) return <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>;
  if (!employee) return null;

  const joinDate = new Date(employee.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="profile-container">
      {/* Breadcrumbs / Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
         <span style={{ cursor: 'pointer' }} onClick={() => navigate('/app/employees')}>Employees</span> &gt;
         <span style={{ cursor: 'pointer' }} onClick={() => navigate('/app/employees')}>Employee List</span> &gt;
         <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{employee.first_name} {employee.last_name}</span>
      </div>

      {resendStatus && (
        <div style={{
          padding: '16px 20px',
          marginBottom: '20px',
          borderRadius: '10px',
          fontSize: '13px',
          backgroundColor: resendStatus.type === 'success' ? '#ecfdf5' : '#fffbeb',
          color: resendStatus.type === 'success' ? '#065f46' : '#92400e',
          border: `1px solid ${resendStatus.type === 'success' ? '#a7f3d0' : '#fde68a'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: resendStatus.data ? '12px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              {resendStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{resendStatus.text}</span>
            </div>

            {resendStatus.data?.gmail_compose_url && (
              <a
                href={resendStatus.data.gmail_compose_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  borderColor: '#ea4335',
                  color: '#ea4335',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: '6px 12px'
                }}
              >
                <Mail size={14} color="#ea4335" /> Open in Gmail <ExternalLink size={12} />
              </a>
            )}
          </div>

          {resendStatus.data && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              color: '#334155'
            }}>
              {resendStatus.data.activation_link && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span><strong>Activation Link:</strong> <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{resendStatus.data.activation_link}</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resendStatus.data.activation_link);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    {copiedLink ? <Check size={13} color="#16a34a" /> : <Copy size={13} />} {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {resendStatus.data.token && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span><strong>Activation Token:</strong> <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{resendStatus.data.token}</code></span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resendStatus.data.token);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2500);
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    {copiedToken ? <Check size={13} color="#16a34a" /> : <Copy size={13} />} {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {resendStatus.data.app_download_url && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span><strong>App Download Link:</strong> <a href={resendStatus.data.app_download_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{resendStatus.data.app_download_url}</a></span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resendStatus.data.app_download_url);
                      setCopiedDownload(true);
                      setTimeout(() => setCopiedDownload(false), 2500);
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    {copiedDownload ? <Check size={13} color="#16a34a" /> : <Copy size={13} />} {copiedDownload ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
         <button className="btn btn-secondary" onClick={() => navigate('/app/employees')}><ArrowLeft size={16} /> Back to List</button>
         <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResendInvite}
              disabled={resending}
              title="Send Onboarding Credentials Email from hr.jattamkommerce@gmail.com"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
            >
              <Mail size={14} /> {resending ? 'Sending...' : 'Send Onboarding Email Again'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowIdModal(true)}>View ID Card</button>
            {editMode ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); setFormData(employee); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setEditMode(true)}><Save size={16} /> Edit Employee</button>
            )}
         </div>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
         <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
            {formData.profile_image_url || employee.profile_image_url ? (
               <img 
                 src={getFileUrl(formData.profile_image_url || employee.profile_image_url)} 
                 alt="Profile" 
                 className="profile-avatar-large" 
                 style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0', display: 'block' }}
               />
            ) : (
               <div className="profile-avatar-placeholder" style={{ width: '96px', height: '96px', borderRadius: '50%', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {employee.first_name[0]}{employee.last_name[0]}
               </div>
            )}
            
            {/* Clickable Camera / Upload Overlay */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/png, image/jpeg, image/jpg, image/webp" 
              onChange={handlePhotoUpload} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Click to upload or update profile photo"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
                zIndex: 2
              }}
            >
              {uploadingPhoto ? <Loader size={16} className="spin" /> : <Camera size={16} />}
            </button>
         </div>
         
         <div className="profile-header-info">
            <div className="profile-header-top">
               <h1 className="profile-name">{employee.first_name} {employee.last_name}</h1>
               <span className={`status-pill ${employee.status === 'active' ? 'active' : 'inactive'}`}>
                  {employee.status === 'active' ? 'Active' : 'Inactive'}
               </span>
            </div>
            
            <p className="profile-designation">
               {employee.employee_code} | {employee.designation_name || 'No Designation'}
            </p>
            
            <div className="profile-meta-grid">
               <div className="profile-meta-item"><Briefcase size={16} /> {employee.department_name || 'No Department'}</div>
               <div className="profile-meta-item"><MapPin size={16} /> {employee.office_city && employee.office_state ? `${employee.office_city}, ${getIndiaStateName(employee.office_state) || employee.office_state}` : 'Not set'}</div>
               <div className="profile-meta-item"><CalendarIcon size={16} /> Joined {joinDate}</div>
               <div className="profile-meta-item"><Mail size={16} /> {employee.email}</div>
               <div className="profile-meta-item"><Phone size={16} /> {employee.phone || '+91 -'}</div>
            </div>
         </div>
      </div>

      {/* Forms */}
      <div className="profile-tab-content">
         <form onSubmit={handleSave}>
            {error && editMode && <div style={{ padding: '16px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', marginBottom: '24px', borderRadius: '8px' }}>{error}</div>}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                 {/* Left Column */}
                 <div>
                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header"><h3 className="card-title">Personal Information</h3></div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group"><label className="input-label">First Name</label><input type="text" name="first_name" className="input-control" value={formData.first_name} onChange={handleChange} disabled={!editMode} required /></div>
                       <div className="input-group"><label className="input-label">Last Name</label><input type="text" name="last_name" className="input-control" value={formData.last_name} onChange={handleChange} disabled={!editMode} required /></div>
                       <div className="input-group"><label className="input-label">Email</label><input type="email" name="email" className="input-control" value={formData.email} onChange={handleChange} disabled={!editMode} required /></div>
                       <div className="input-group"><label className="input-label">Phone</label><input type="text" name="phone" className="input-control" value={formData.phone || ''} onChange={handleChange} disabled={!editMode} /></div>
                     </div>
                   </div>

                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header"><h3 className="card-title">Contact & Addresses</h3></div>
                     <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       <div className="input-group"><label className="input-label">Current Address</label><textarea name="current_address" className="input-control" value={formData.current_address || ''} onChange={handleChange} disabled={!editMode} rows="2" /></div>
                       <div className="input-group"><label className="input-label">Permanent Address</label><textarea name="permanent_address" className="input-control" value={formData.permanent_address || ''} onChange={handleChange} disabled={!editMode} rows="2" /></div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                         <div className="input-group"><label className="input-label">Emergency Name</label><input type="text" name="emergency_contact_name" className="input-control" value={formData.emergency_contact_name || ''} onChange={handleChange} disabled={!editMode} /></div>
                         <div className="input-group"><label className="input-label">Emergency Phone</label><input type="text" name="emergency_contact_phone" className="input-control" value={formData.emergency_contact_phone || ''} onChange={handleChange} disabled={!editMode} /></div>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Right Column */}
                 <div>
                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header"><h3 className="card-title">Employment Information</h3></div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group"><label className="input-label">Employee Code</label><input type="text" name="employee_code" className="input-control" value={formData.employee_code} onChange={handleChange} disabled={!editMode} required /></div>
                       <div className="input-group"><label className="input-label">Joining Date</label><input type="date" name="joining_date" className="input-control" value={formData.joining_date ? formData.joining_date.split('T')[0] : ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">Gender</label>
                      <select name="gender" className="input-control" value={formData.gender || ''} onChange={handleChange} disabled={!editMode}>
                        <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="input-group"><label className="input-label">Marital Status</label>
                      <select name="marital_status" className="input-control" value={formData.marital_status || ''} onChange={handleChange} disabled={!editMode}>
                        <option value="">Select Marital Status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="unmarried">Unmarried</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="input-group"><label className="input-label">Blood Group</label>
                      <select name="blood_group" className="input-control" value={formData.blood_group || ''} onChange={handleChange} disabled={!editMode}>
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    </div>
                       <div className="input-group"><label className="input-label">Department</label>
                         <select name="department_id" className="input-control" value={formData.department_id || ''} onChange={handleChange} disabled={!editMode}>
                           <option value="">Select Department</option>{lookups.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                       </div>
                       <div className="input-group"><label className="input-label">Designation</label>
                         <select name="designation_id" className="input-control" value={formData.designation_id || ''} onChange={handleChange} disabled={!editMode}>
                           <option value="">Select Designation</option>{lookups.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                       </div>
                     </div>
                   </div>

                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header"><h3 className="card-title">Office Location</h3></div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group">
                         <label className="input-label">State</label>
                         <select name="office_state" className="input-control" value={formData.office_state || ''} onChange={(e) => {
                           setFormData(prev => ({ ...prev, office_state: e.target.value, office_city: '' }));
                         }} disabled={!editMode}>
                            <option value="">Select State</option>
                            {getIndiaStatesList().map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="input-label">City</label>
                          <select name="office_city" className="input-control" value={formData.office_city || ''} onChange={handleChange} disabled={!editMode || !formData.office_state}>
                            <option value="">Select City</option>
                            {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                       </div>
                     </div>
                   </div>

                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header"><h3 className="card-title">Salary Details</h3></div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group"><label className="input-label">Gross Salary <span style={{color:'var(--danger)'}}>*</span></label><input type="number" name="gross_salary" className="input-control" value={formData.gross_salary || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">Basic Salary</label><input type="number" name="basic_salary" className="input-control" value={formData.basic_salary || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">HRA</label><input type="number" name="hra" className="input-control" value={formData.hra || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">Deductions</label><input type="number" name="deductions" className="input-control" value={formData.deductions || ''} onChange={handleChange} disabled={!editMode} /></div>
                     </div>
                   </div>

                   {/* Bank Details */}
                   <div className="card" style={{ marginBottom: '24px' }}>
                     <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Building2 size={16} color="var(--primary-color)" />
                       <h3 className="card-title" style={{ margin: 0 }}>Bank Details</h3>
                     </div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group">
                         <label className="input-label">Bank Name <span style={{color:'var(--danger)'}}>*</span></label>
                         <input type="text" name="bank_name" className="input-control" value={formData.bank_name || ''} onChange={handleChange} disabled={!editMode} placeholder="e.g. HDFC Bank" />
                       </div>
                       <div className="input-group">
                         <label className="input-label">Account Number <span style={{color:'var(--danger)'}}>*</span></label>
                         <input type="text" name="account_number" className="input-control" value={formData.account_number || ''} onChange={handleChange} disabled={!editMode} placeholder="e.g. 501002345678" />
                       </div>
                       <div className="input-group">
                         <label className="input-label">IFSC Code <span style={{color:'var(--danger)'}}>*</span></label>
                         <input
                           type="text"
                           name="ifsc_code"
                           className="input-control"
                           value={formData.ifsc_code || ''}
                           onChange={editMode ? handleIFSCChange : undefined}
                           disabled={!editMode}
                           placeholder="e.g. HDFC0001234"
                           maxLength={11}
                           style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                         />
                         {editMode && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-formatted to UPPERCASE</span>}
                       </div>
                       <div className="input-group">
                         <label className="input-label">UAN Number</label>
                         <input type="text" name="uan_number" className="input-control" value={formData.uan_number || ''} onChange={handleChange} disabled={!editMode} placeholder="Universal Account Number" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Documents & Certificates Section */}
               <div className="card" style={{ marginBottom: '24px' }}>
                 <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <FileText size={16} color="var(--primary-color)" />
                     <h3 className="card-title" style={{ margin: 0 }}>Documents &amp; Certificates</h3>
                   </div>
                   <div>
                     <input type="file" id="profileDocUpload" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleProfileDocUpload} />
                     <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('profileDocUpload').click()} disabled={uploadingDoc} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '5px 12px' }}>
                       <Plus size={14} /> {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                     </button>
                   </div>
                 </div>
                 <div className="card-body">
                   {(!formData.documents || formData.documents.length === 0) ? (
                     <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>No documents uploaded. Click Upload Document to add.</p>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       {(formData.documents || []).map((doc, idx) => (
                         <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <FileText size={16} color="var(--primary-color)" />
                             <div>
                               <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.title || doc.document_type}</div>
                               <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.document_type || 'Document'}</div>
                             </div>
                           </div>
                           {doc.file_url && (
                             <a href={getFileUrl(doc.file_url) ? `${getFileUrl(doc.file_url)}${getFileUrl(doc.file_url).includes("?") ? "&" : "?"}download=1` : "#"} target="_blank" rel="noopener noreferrer" download={doc.title || "document"} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px', textDecoration: 'none', color: '#2563eb' }}>
                               <Download size={13} /> Download
                             </a>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                   {employee.education && employee.education.length > 0 && (
                     <div style={{ marginTop: '20px' }}>
                       <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Education History &amp; Certificates</p>
                       {employee.education.map((edu, idx) => (
                         <div key={idx} style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                           <div>
                             <strong style={{ fontSize: '13px' }}>{edu.level} — {edu.degree_name}</strong>
                             <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{edu.university_name}{edu.passing_year ? ' (' + edu.passing_year + ')' : ''}</div>
                           </div>
                           <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                             {edu.edu_documents && edu.edu_documents.map((d, dIdx) => (
                               <a key={dIdx} href={getFileUrl(d.file_url) ? `${getFileUrl(d.file_url)}${getFileUrl(d.file_url).includes("?") ? "&" : "?"}download=1` : "#"} target="_blank" rel="noopener noreferrer" download={d.title || "education_document"} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', textDecoration: 'none', color: '#2563eb' }}>
                                 <Download size={12} /> {d.title}
                               </a>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>

            {editMode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResendInvite}
                  disabled={resending}
                  title="Dispatch fresh onboarding credentials to employee email"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                >
                  <Mail size={14} /> {resending ? 'Sending...' : 'Send Onboarding Email Again (hr.jattamkommerce@gmail.com)'}
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); setFormData(employee); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            )}
         </form>
      </div>

      {/* ID Card Modal */}
      {showIdModal && (
        <div className="modal-overlay" onClick={() => setShowIdModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowIdModal(false)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
            <EmployeeIdCard employee={employee} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
