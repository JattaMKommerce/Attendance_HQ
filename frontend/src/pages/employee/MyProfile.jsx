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
  FileText
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';
import { getEmployeeById } from '../../services/employeeApi';

const MyProfile = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch full employee profile using existing API
      const response = await getEmployeeById(user.employee_id || user.id);
      
      if (response.success) {
        setProfileData(response.data.employee);
        setFormData(response.data.employee);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // In production: await employeePortalApi.updateMyProfile(formData);
      
      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfileData(formData);
      setEditMode(false);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData);
    setEditMode(false);
    setError(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      // In production: upload photo and update profile
      // const response = await uploadPhoto(file);
      // setProfileData(prev => ({ ...prev, photo_url: response.data.url }));
      
      setSuccess('Photo will be uploaded when backend endpoint is connected');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to upload photo');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-description">View and manage your personal information</p>
        </div>
        <div className="page-actions">
          {!editMode ? (
            <button 
              className="btn btn-primary"
              onClick={() => setEditMode(true)}
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={16} />
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success-text)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Profile Sidebar */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-body" style={{ textAlign: 'center' }}>
            {/* Profile Photo */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: 600,
                color: 'var(--accent-hover)',
                backgroundImage: profileData?.photo_url ? `url(${profileData.photo_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {!profileData?.photo_url && (profileData?.first_name?.[0] || 'U')}
              </div>
              
              {editMode && (
                <label style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-hover)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  <Camera size={18} />
                  <input 
                    type="file" 
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>

            {/* Name & Code */}
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 600 }}>
              {profileData?.first_name} {profileData?.last_name}
            </h2>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              {profileData?.employee_code}
            </p>
            <span style={{
              padding: '4px 12px',
              backgroundColor: profileData?.status === 'active' ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: profileData?.status === 'active' ? 'var(--success-text)' : 'var(--warning-text)',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}>
              {profileData?.status || 'Active'}
            </span>

            <div style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'left'
            }}>
              <InfoItem icon={Briefcase} label="Designation" value={profileData?.designation_name || 'N/A'} />
              <InfoItem icon={Building} label="Department" value={profileData?.department_name || 'N/A'} />
              <InfoItem icon={Calendar} label="Join Date" value={profileData?.date_of_joining ? new Date(profileData.date_of_joining).toLocaleDateString() : 'N/A'} />
              <InfoItem icon={Users} label="Reports To" value={profileData?.manager_name || 'N/A'} />
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setActiveTab('personal')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'personal' ? '2px solid var(--accent-hover)' : '2px solid transparent',
                color: activeTab === 'personal' ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'personal' ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              Personal Details
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'contact' ? '2px solid var(--accent-hover)' : '2px solid transparent',
                color: activeTab === 'contact' ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'contact' ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              Contact & Address
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'emergency' ? '2px solid var(--accent-hover)' : '2px solid transparent',
                color: activeTab === 'emergency' ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'emergency' ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              Emergency Contact
            </button>
            <button
              onClick={() => setActiveTab('work')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'work' ? '2px solid var(--accent-hover)' : '2px solid transparent',
                color: activeTab === 'work' ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'work' ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              Work Information
            </button>
          </div>

          {/* Tab Content */}
          <div className="card">
            <div className="card-body">
              {activeTab === 'personal' && (
                <PersonalDetailsTab 
                  data={formData} 
                  editMode={editMode}
                  onChange={handleInputChange}
                />
              )}
              
              {activeTab === 'contact' && (
                <ContactAddressTab 
                  data={formData} 
                  editMode={editMode}
                  onChange={handleInputChange}
                />
              )}
              
              {activeTab === 'emergency' && (
                <EmergencyContactTab 
                  data={formData} 
                  editMode={editMode}
                  onChange={handleInputChange}
                />
              )}
              
              {activeTab === 'work' && (
                <WorkInformationTab 
                  data={formData} 
                  editMode={editMode}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const InfoItem = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
    <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  </div>
);

const FormField = ({ label, value, editMode, onChange, type = 'text', field, disabled = false }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
      {label}
    </label>
    {editMode && !disabled ? (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className="input-control"
        style={{ width: '100%' }}
      />
    ) : (
      <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '6px' }}>
        {value || 'Not provided'}
      </div>
    )}
  </div>
);

const PersonalDetailsTab = ({ data, editMode, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
    <FormField label="First Name" value={data?.first_name} editMode={editMode} onChange={onChange} field="first_name" />
    <FormField label="Last Name" value={data?.last_name} editMode={editMode} onChange={onChange} field="last_name" />
    <FormField label="Date of Birth" value={data?.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : ''} editMode={editMode} onChange={onChange} field="date_of_birth" type="date" />
    <FormField label="Gender" value={data?.gender} editMode={editMode} onChange={onChange} field="gender" />
    <FormField label="Marital Status" value={data?.marital_status} editMode={editMode} onChange={onChange} field="marital_status" />
    <FormField label="Blood Group" value={data?.blood_group} editMode={editMode} onChange={onChange} field="blood_group" />
    <FormField label="Personal Email" value={data?.personal_email} editMode={editMode} onChange={onChange} field="personal_email" type="email" />
    <FormField label="Personal Phone" value={data?.personal_phone} editMode={editMode} onChange={onChange} field="personal_phone" type="tel" />
  </div>
);

const ContactAddressTab = ({ data, editMode, onChange }) => (
  <div>
    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Current Address</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField label="Address Line" value={data?.current_address} editMode={editMode} onChange={onChange} field="current_address" />
      </div>
      <FormField label="City" value={data?.current_city} editMode={editMode} onChange={onChange} field="current_city" />
      <FormField label="State" value={data?.current_state} editMode={editMode} onChange={onChange} field="current_state" />
      <FormField label="PIN Code" value={data?.current_pincode} editMode={editMode} onChange={onChange} field="current_pincode" />
      <FormField label="Country" value={data?.current_country} editMode={editMode} onChange={onChange} field="current_country" />
    </div>

    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Permanent Address</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField label="Address Line" value={data?.permanent_address} editMode={editMode} onChange={onChange} field="permanent_address" />
      </div>
      <FormField label="City" value={data?.permanent_city} editMode={editMode} onChange={onChange} field="permanent_city" />
      <FormField label="State" value={data?.permanent_state} editMode={editMode} onChange={onChange} field="permanent_state" />
      <FormField label="PIN Code" value={data?.permanent_pincode} editMode={editMode} onChange={onChange} field="permanent_pincode" />
      <FormField label="Country" value={data?.permanent_country} editMode={editMode} onChange={onChange} field="permanent_country" />
    </div>
  </div>
);

const EmergencyContactTab = ({ data, editMode, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
    <FormField label="Contact Name" value={data?.emergency_contact_name} editMode={editMode} onChange={onChange} field="emergency_contact_name" />
    <FormField label="Relationship" value={data?.emergency_contact_relationship} editMode={editMode} onChange={onChange} field="emergency_contact_relationship" />
    <FormField label="Phone Number" value={data?.emergency_contact_phone} editMode={editMode} onChange={onChange} field="emergency_contact_phone" type="tel" />
    <FormField label="Alternate Phone" value={data?.emergency_contact_phone_alternate} editMode={editMode} onChange={onChange} field="emergency_contact_phone_alternate" type="tel" />
    <div style={{ gridColumn: '1 / -1' }}>
      <FormField label="Address" value={data?.emergency_contact_address} editMode={editMode} onChange={onChange} field="emergency_contact_address" />
    </div>
  </div>
);

const WorkInformationTab = ({ data, editMode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
    <FormField label="Employee Code" value={data?.employee_code} editMode={false} disabled={true} />
    <FormField label="Official Email" value={data?.email} editMode={false} disabled={true} />
    <FormField label="Department" value={data?.department_name} editMode={false} disabled={true} />
    <FormField label="Designation" value={data?.designation_name} editMode={false} disabled={true} />
    <FormField label="Date of Joining" value={data?.date_of_joining ? new Date(data.date_of_joining).toLocaleDateString() : 'N/A'} editMode={false} disabled={true} />
    <FormField label="Employment Type" value={data?.employment_type} editMode={false} disabled={true} />
    <FormField label="Reports To" value={data?.manager_name} editMode={false} disabled={true} />
    <FormField label="Work Location" value={data?.work_location || 'Office'} editMode={false} disabled={true} />
    
    <div style={{ gridColumn: '1 / -1', padding: '16px', backgroundColor: 'var(--info-bg)', borderRadius: '8px', color: 'var(--info-text)' }}>
      <strong>Note:</strong> Work information fields are managed by HR and cannot be edited by employees. Please contact HR for any updates.
    </div>
  </div>
);

export default MyProfile;
