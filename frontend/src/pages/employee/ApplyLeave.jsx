import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';
import { leaveApi } from '../../services/leaveApi';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    duration: '',
    durationType: 'full_day', // full_day, first_half, second_half
    reason: '',
    document: null
  });

  useEffect(() => {
    fetchLeaveData();
  }, []);

  useEffect(() => {
    calculateDuration();
  }, [formData.startDate, formData.endDate, formData.durationType]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      
      // In production:
      // const [types, balance] = await Promise.all([
      //   leaveApi.getLeaveTypes(),
      //   employeePortalApi.getMyLeaveBalance()
      // ]);
      
      // Mock data
      const mockTypes = [
        { id: 1, name: 'Casual Leave', code: 'CL', requires_document: false, available: 8 },
        { id: 2, name: 'Sick Leave', code: 'SL', requires_document: true, available: 5 },
        { id: 3, name: 'Earned Leave', code: 'EL', requires_document: false, available: 15 },
        { id: 4, name: 'Comp Off', code: 'CO', requires_document: false, available: 2 }
      ];
      
      setLeaveTypes(mockTypes);
      setLeaveBalance(mockTypes);
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) {
      setFormData(prev => ({ ...prev, duration: '' }));
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      setError('End date cannot be before start date');
      setFormData(prev => ({ ...prev, duration: '' }));
      return;
    }

    let days = 0;
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Adjust for half-day
    if (formData.durationType !== 'full_day' && days === 1) {
      days = 0.5;
    }

    setFormData(prev => ({ ...prev, duration: days }));
    setError(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should not exceed 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      
      setFormData(prev => ({ ...prev, document: file }));
      setError(null);
    }
  };

  const validateForm = () => {
    if (!formData.leaveTypeId) {
      setError('Please select a leave type');
      return false;
    }
    
    if (!formData.startDate || !formData.endDate) {
      setError('Please select start and end dates');
      return false;
    }
    
    if (!formData.duration || formData.duration <= 0) {
      setError('Invalid leave duration');
      return false;
    }
    
    if (!formData.reason || formData.reason.trim().length < 10) {
      setError('Please provide a reason (minimum 10 characters)');
      return false;
    }
    
    const selectedLeaveType = leaveTypes.find(t => t.id === parseInt(formData.leaveTypeId));
    if (selectedLeaveType?.requires_document && !formData.document) {
      setError('Supporting document is required for this leave type');
      return false;
    }
    
    // Check if sufficient balance is available
    const balance = leaveBalance.find(b => b.id === parseInt(formData.leaveTypeId));
    if (balance && formData.duration > balance.available) {
      setError(`Insufficient leave balance. Available: ${balance.available} days`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // In production:
      // const submitData = new FormData();
      // submitData.append('leaveTypeId', formData.leaveTypeId);
      // submitData.append('startDate', formData.startDate);
      // submitData.append('endDate', formData.endDate);
      // submitData.append('duration', formData.duration);
      // submitData.append('durationType', formData.durationType);
      // submitData.append('reason', formData.reason);
      // if (formData.document) {
      //   submitData.append('document', formData.document);
      // }
      // await employeePortalApi.applyLeave(submitData);
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/app/employee/leave');
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting leave:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={48} color="var(--success-text)" />
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 600 }}>
              Leave Request Submitted!
            </h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>
              Your leave request has been submitted successfully and is pending approval.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/app/employee/leave')}
            >
              View My Leaves
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedLeaveType = leaveTypes.find(t => t.id === parseInt(formData.leaveTypeId));
  const selectedBalance = leaveBalance.find(b => b.id === parseInt(formData.leaveTypeId));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="icon-btn"
            onClick={() => navigate('/app/employee/leave')}
            style={{ padding: '8px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Apply for Leave</h1>
            <p className="page-description">Submit a new leave request</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Leave Details</h3>
            </div>
            <div className="card-body">
              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {/* Leave Type */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Leave Type <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input-control"
                  value={formData.leaveTypeId}
                  onChange={(e) => handleInputChange('leaveTypeId', e.target.value)}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code}) - {type.available} days available
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Start Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input-control"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    End Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input-control"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Duration Type (for single day) */}
              {formData.startDate && formData.endDate && formData.startDate === formData.endDate && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Duration Type
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="durationType"
                        value="full_day"
                        checked={formData.durationType === 'full_day'}
                        onChange={(e) => handleInputChange('durationType', e.target.value)}
                      />
                      Full Day
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="durationType"
                        value="first_half"
                        checked={formData.durationType === 'first_half'}
                        onChange={(e) => handleInputChange('durationType', e.target.value)}
                      />
                      First Half
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="durationType"
                        value="second_half"
                        checked={formData.durationType === 'second_half'}
                        onChange={(e) => handleInputChange('durationType', e.target.value)}
                      />
                      Second Half
                    </label>
                  </div>
                </div>
              )}

              {/* Calculated Duration */}
              {formData.duration && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--info-bg)',
                  color: 'var(--info-text)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Calendar size={18} />
                  <span>Total working days: <strong>{formData.duration}</strong></span>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Reason <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  className="input-control"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Please provide a reason for your leave (minimum 10 characters)"
                  rows={4}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {formData.reason.length} characters
                </div>
              </div>

              {/* Document Upload */}
              {selectedLeaveType?.requires_document && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Supporting Document {selectedLeaveType.requires_document && <span style={{ color: 'var(--danger)' }}>*</span>}
                  </label>
                  <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                      {formData.document ? formData.document.name : 'Upload medical certificate or relevant document'}
                    </p>
                    <input
                      type="file"
                      id="document-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="document-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                      Choose File
                    </label>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      PDF, JPG, or PNG (Max 5MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/app/employee/leave')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Sidebar - Leave Balance */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">Your Leave Balance</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {leaveBalance.map(balance => (
                  <div 
                    key={balance.id}
                    style={{
                      padding: '12px',
                      backgroundColor: parseInt(formData.leaveTypeId) === balance.id 
                        ? 'var(--accent-bg)' 
                        : 'var(--bg-surface-hover)',
                      borderRadius: '8px',
                      border: parseInt(formData.leaveTypeId) === balance.id 
                        ? '2px solid var(--accent-hover)' 
                        : '2px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{balance.name}</span>
                      <span style={{ 
                        fontWeight: 600, 
                        color: parseInt(formData.leaveTypeId) === balance.id 
                          ? 'var(--accent-hover)' 
                          : 'var(--text-primary)'
                      }}>
                        {balance.available}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Available days
                    </div>
                  </div>
                ))}
              </div>

              {selectedBalance && formData.duration && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--info-bg)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--info-text)', marginBottom: '4px' }}>
                    After this request:
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--info-text)' }}>
                    {(selectedBalance.available - formData.duration).toFixed(1)} days remaining
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
