import React, { useState, useContext } from 'react';
import { 
  Settings, 
  Lock, 
  Bell,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { employeePortalApi } from '../../services/employeePortalApi';

const MySettings = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your account preferences</p>
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
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <TabButton 
          active={activeTab === 'password'} 
          onClick={() => setActiveTab('password')}
          icon={Lock}
        >
          Change Password
        </TabButton>
        <TabButton 
          active={activeTab === 'notifications'} 
          onClick={() => setActiveTab('notifications')}
          icon={Bell}
        >
          Notifications
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'password' && (
        <PasswordTab setSuccess={setSuccess} setError={setError} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab setSuccess={setSuccess} setError={setError} />
      )}
    </div>
  );
};

// Password Tab
const PasswordTab = ({ setSuccess, setError }) => {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumber) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      
      const res = await employeePortalApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (res.data?.success) {
        setSuccess('Password changed successfully!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: 'var(--danger)' };
    if (strength <= 3) return { label: 'Medium', color: 'var(--warning-text)' };
    return { label: 'Strong', color: 'var(--success-text)' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <div className="card-header">
        <h3 className="card-title">Change Password</h3>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="card-body">
          {/* Info Banner */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--info-bg)',
            color: 'var(--info-text)',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            <strong>Password Requirements:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
              <li>Contains at least one special character</li>
            </ul>
          </div>

          {/* Current Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Current Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                className="input-control"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              New Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                className="input-control"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {passwordStrength && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  flex: 1, 
                  height: '4px', 
                  backgroundColor: 'var(--bg-surface-hover)', 
                  borderRadius: '2px'
                }}>
                  <div style={{
                    width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%',
                    height: '100%',
                    backgroundColor: passwordStrength.color,
                    borderRadius: '2px',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Confirm New Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                className="input-control"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            <Save size={18} />
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Notifications Tab
const NotificationsTab = ({ setSuccess, setError }) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    email: {
      leaveApproval: true,
      attendanceAlert: true,
      payslipReady: true,
      announcements: true,
      documentUpdate: false
    },
    push: {
      leaveApproval: true,
      attendanceAlert: false,
      payslipReady: true,
      announcements: false,
      documentUpdate: false
    }
  });

  const handleToggle = (channel, type) => {
    setPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type]
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // In production:
      // await employeePortalApi.updateNotificationPreferences(preferences);

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Notification preferences updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    { key: 'leaveApproval', label: 'Leave Request Updates', description: 'Get notified when your leave requests are approved or rejected' },
    { key: 'attendanceAlert', label: 'Attendance Reminders', description: 'Daily reminders to mark attendance' },
    { key: 'payslipReady', label: 'Payslip Available', description: 'Notification when new payslip is generated' },
    { key: 'announcements', label: 'Company Announcements', description: 'Important updates and announcements' },
    { key: 'documentUpdate', label: 'Document Status', description: 'Updates on your uploaded documents' }
  ];

  return (
    <div className="card" style={{ maxWidth: '800px' }}>
      <div className="card-header">
        <h3 className="card-title">Notification Preferences</h3>
      </div>
      
      <div className="card-body">
        <div style={{ marginBottom: '24px' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 0', textAlign: 'left', fontWeight: 600 }}>Notification Type</th>
                <th style={{ padding: '12px 0', textAlign: 'center', fontWeight: 600, width: '100px' }}>Email</th>
                <th style={{ padding: '12px 0', textAlign: 'center', fontWeight: 600, width: '100px' }}>Push</th>
              </tr>
            </thead>
            <tbody>
              {notificationTypes.map(type => (
                <tr key={type.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{type.label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{type.description}</div>
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'center' }}>
                    <ToggleSwitch 
                      checked={preferences.email[type.key]}
                      onChange={() => handleToggle('email', type.key)}
                    />
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'center' }}>
                    <ToggleSwitch 
                      checked={preferences.push[type.key]}
                      onChange={() => handleToggle('push', type.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

// Helper Components
const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 20px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: active ? '2px solid var(--accent-hover)' : '2px solid transparent',
      color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
      fontWeight: active ? 600 : 400,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    }}
  >
    <Icon size={18} />
    {children}
  </button>
);

const ToggleSwitch = ({ checked, onChange }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
    <input 
      type="checkbox" 
      checked={checked}
      onChange={onChange}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: checked ? 'var(--accent-hover)' : 'var(--bg-surface-hover)',
      borderRadius: '24px',
      transition: 'background-color 0.2s'
    }}>
      <span style={{
        position: 'absolute',
        left: checked ? '22px' : '2px',
        top: '2px',
        width: '20px',
        height: '20px',
        backgroundColor: 'white',
        borderRadius: '50%',
        transition: 'left 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </span>
  </label>
);

export default MySettings;
