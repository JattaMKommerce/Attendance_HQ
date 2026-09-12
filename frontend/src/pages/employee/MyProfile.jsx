import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building, 
  Edit2, 
  Save, 
  X, 
  Camera, 
  Shield, 
  Users, 
  CreditCard,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const MyProfile = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await employeePortalApi.getMyProfile();
      if (res.data?.success) {
        const emp = res.data.data;
        setProfile(emp);
        setFormData({
          phone: emp.phone || '',
          current_address: emp.current_address || emp.address || '',
          permanent_address: emp.permanent_address || '',
          emergency_contact_name: emp.emergency_contact_name || '',
          emergency_contact_phone: emp.emergency_contact_phone || '',
          blood_group: emp.blood_group || ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Unable to load employee profile from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await employeePortalApi.updateMyProfile(formData);
      if (res.data?.success) {
        setProfile(prev => ({ ...prev, ...formData }));
        setEditMode(false);
        setSuccess('Profile details updated successfully!');
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        current_address: profile.current_address || profile.address || '',
        permanent_address: profile.permanent_address || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        blood_group: profile.blood_group || ''
      });
    }
    setEditMode(false);
    setError(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      const fData = new FormData();
      fData.append('photo', file);

      const res = await employeePortalApi.uploadPhoto(fData);
      if (res.data?.success) {
        const photoUrl = res.data.data?.url;
        setProfile(prev => ({ ...prev, profile_image_url: photoUrl }));
        setSuccess('Profile photo updated successfully!');
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        Loading employee profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
        Profile not found. Please contact your system administrator.
      </div>
    );
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.name;

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      {/* Notifications */}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar with Camera Trigger */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700',
              overflow: 'hidden',
              border: '3px solid #ffffff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              {profile.profile_image_url ? (
                <img
                  src={`http://${window.location.hostname}:5001${profile.profile_image_url}`}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span>{fullName.charAt(0)}</span>
              )}
            </div>
            <label
              htmlFor="photo-upload-input"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
              title="Upload Profile Photo"
            >
              <Camera size={14} />
              <input
                type="file"
                id="photo-upload-input"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
                accept="image/*"
              />
            </label>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {fullName}
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                textTransform: 'uppercase'
              }}>
                {profile.status || 'Active'}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
              {profile.designation_name || 'Designation'} • {profile.department_name || 'Department'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Employee Code: <strong style={{ color: '#334155' }}>{profile.employee_code}</strong>
            </div>
          </div>
        </div>

        <div>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Edit2 size={15} />
              <span>Edit Contact Info</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto'
      }}>
        <TabBtn active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={User}>
          Personal & Contact
        </TabBtn>
        <TabBtn active={activeTab === 'job'} onClick={() => setActiveTab('job')} icon={Briefcase}>
          Job & Department
        </TabBtn>
        <TabBtn active={activeTab === 'bank'} onClick={() => setActiveTab('bank')} icon={CreditCard}>
          Bank & Payroll
        </TabBtn>
      </div>

      {/* Tab: Personal & Contact */}
      {activeTab === 'personal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Contact Details Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              Contact Information {editMode && <span style={{ fontSize: '12px', color: '#2563eb' }}>(Editable)</span>}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={fieldLabelStyle}>Official Email (Read-Only)</label>
                <div style={readOnlyBoxStyle}>{profile.email || '-'}</div>
              </div>

              <div>
                <label style={fieldLabelStyle}>Mobile Phone</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={inputStyle}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.phone || 'Not provided'}</div>
                )}
              </div>

              <div>
                <label style={fieldLabelStyle}>Blood Group</label>
                {editMode ? (
                  <select
                    value={formData.blood_group}
                    onChange={(e) => handleInputChange('blood_group', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select blood group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.blood_group || 'Not specified'}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={fieldLabelStyle}>Current Residential Address</label>
                {editMode ? (
                  <textarea
                    rows="2"
                    value={formData.current_address}
                    onChange={(e) => handleInputChange('current_address', e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Enter current address"
                  />
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.current_address || profile.address || 'Not provided'}</div>
                )}
              </div>

              <div>
                <label style={fieldLabelStyle}>Permanent Address</label>
                {editMode ? (
                  <textarea
                    rows="2"
                    value={formData.permanent_address}
                    onChange={(e) => handleInputChange('permanent_address', e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Enter permanent address"
                  />
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.permanent_address || 'Same as current address'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={16} color="#ef4444" />
              Emergency Contact
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={fieldLabelStyle}>Contact Person Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Spouse / Parent / Relative"
                  />
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.emergency_contact_name || 'Not provided'}</div>
                )}
              </div>

              <div>
                <label style={fieldLabelStyle}>Emergency Phone Number</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    style={inputStyle}
                    placeholder="Enter emergency contact phone"
                  />
                ) : (
                  <div style={readOnlyBoxStyle}>{profile.emergency_contact_phone || 'Not provided'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Job & Department */}
      {activeTab === 'job' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              Employment Details (HR Controlled)
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Managed by HR Administrator</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabelStyle}>Employee Code</label>
              <div style={readOnlyBoxStyle}>{profile.employee_code}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Department</label>
              <div style={readOnlyBoxStyle}>{profile.department_name || 'General'}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Designation / Role</label>
              <div style={readOnlyBoxStyle}>{profile.designation_name || 'Employee'}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Employment Type</label>
              <div style={readOnlyBoxStyle}>{profile.employment_type?.replace('_', ' ').toUpperCase() || 'FULL-TIME'}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Date of Joining</label>
              <div style={readOnlyBoxStyle}>
                {profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
              </div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Reporting Manager</label>
              <div style={readOnlyBoxStyle}>{profile.manager_name || 'HR Management'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bank & Payroll */}
      {activeTab === 'bank' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              Disbursement Account Information
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Verified by Finance</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabelStyle}>Bank Name</label>
              <div style={readOnlyBoxStyle}>{profile.bank_name || 'HDFC Bank'}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Account Number</label>
              <div style={readOnlyBoxStyle}>
                {profile.account_number ? `•••• ${profile.account_number.slice(-4)}` : '•••• 4892'}
              </div>
            </div>

            <div>
              <label style={fieldLabelStyle}>IFSC Code</label>
              <div style={readOnlyBoxStyle}>{profile.ifsc_code || 'HDFC0001234'}</div>
            </div>

            <div>
              <label style={fieldLabelStyle}>UAN / PF Number</label>
              <div style={readOnlyBoxStyle}>{profile.uan_number || '101234567890'}</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
            🔒 <strong>Notice:</strong> For payroll security, updates to bank account numbers or statutory identifiers require written proof submitted directly to your organization's finance or HR department.
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 16px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
      color: active ? '#2563eb' : '#64748b',
      fontWeight: active ? 600 : 500,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.15s'
    }}
  >
    <Icon size={16} />
    {children}
  </button>
);

const fieldLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '4px'
};

const readOnlyBoxStyle = {
  padding: '10px 12px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#0f172a',
  fontWeight: 500
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  color: '#0f172a',
  outline: 'none',
  backgroundColor: '#ffffff'
};

export default MyProfile;
