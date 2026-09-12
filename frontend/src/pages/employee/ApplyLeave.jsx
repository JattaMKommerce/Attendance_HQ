import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
      setError(null);
      
      const [typesRes, balanceRes] = await Promise.all([
        employeePortalApi.getLeaveTypes(),
        employeePortalApi.getMyLeaveBalance()
      ]);

      const types = typesRes.data?.data || [];
      const balance = balanceRes.data?.data || [];

      setLeaveTypes(types);
      setLeaveBalance(balance);

      if (types.length > 0) {
        setFormData(prev => ({ ...prev, leaveTypeId: types[0].id.toString() }));
      }
    } catch (err) {
      console.error('Error fetching leave options:', err);
      setError('Failed to load leave types from server');
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
      // Exclude weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Adjust for half-day
    if (formData.durationType !== 'full_day' && days === 1) {
      days = 0.5;
    }

    setFormData(prev => ({ ...prev, duration: days || 1 }));
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
    
    if (!formData.reason || formData.reason.trim().length < 5) {
      setError('Please provide a reason for your leave request (minimum 5 characters)');
      return false;
    }
    
    // Check if sufficient balance is available
    const balance = leaveBalance.find(b => b.leave_type_id === parseInt(formData.leaveTypeId) || b.id === parseInt(formData.leaveTypeId));
    if (balance && formData.duration > (balance.available_days != null ? balance.available_days : balance.available)) {
      const avail = balance.available_days != null ? balance.available_days : balance.available;
      setError(`Insufficient leave balance. Available: ${avail} day(s)`);
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
      
      const submitData = new FormData();
      submitData.append('leaveTypeId', formData.leaveTypeId);
      submitData.append('startDate', formData.startDate);
      submitData.append('endDate', formData.endDate);
      submitData.append('duration', formData.duration);
      submitData.append('durationType', formData.durationType);
      submitData.append('reason', formData.reason.trim());
      if (formData.document) {
        submitData.append('document', formData.document);
      }
      
      const res = await employeePortalApi.applyLeave(submitData);
      
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/app/employee/leave');
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting leave:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        Loading leave application form...
      </div>
    );
  }

  const selectedBalance = leaveBalance.find(b => 
    b.leave_type_id === parseInt(formData.leaveTypeId) || b.id === parseInt(formData.leaveTypeId)
  );

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/app/employee/leave')}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#334155'
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px 0' }}>
            Apply for Leave
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Submit an official time-off request for HR approval
          </p>
        </div>
      </div>

      {success && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          color: '#16a34a',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px'
        }}>
          <CheckCircle size={20} />
          <span>Leave request submitted successfully! Redirecting...</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '14px',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Leave Type Select */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Leave Type *
          </label>
          <select
            value={formData.leaveTypeId}
            onChange={(e) => handleInputChange('leaveTypeId', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              outline: 'none'
            }}
            required
          >
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.code})
              </option>
            ))}
          </select>

          {/* Balance info callout */}
          {selectedBalance && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>
              Available balance: <strong>{selectedBalance.available_days != null ? selectedBalance.available_days : selectedBalance.available} days</strong>
            </div>
          )}
        </div>

        {/* Date Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none'
              }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none'
              }}
              required
            />
          </div>
        </div>

        {/* Duration Type & Days */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Day Type
            </label>
            <select
              value={formData.durationType}
              onChange={(e) => handleInputChange('durationType', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                color: '#0f172a'
              }}
            >
              <option value="full_day">Full Day</option>
              <option value="first_half">First Half (0.5)</option>
              <option value="second_half">Second Half (0.5)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Calculated Days
            </label>
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '15px',
              color: '#0f172a',
              border: '1px solid #e2e8f0'
            }}>
              {formData.duration ? `${formData.duration} day(s)` : '--'}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Reason for Leave *
          </label>
          <textarea
            rows="3"
            placeholder="Please detail why you are requesting leave..."
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              fontFamily: 'inherit',
              color: '#0f172a',
              outline: 'none',
              resize: 'vertical'
            }}
            required
          />
        </div>

        {/* Optional Attachment */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Supporting Document (Optional)
          </label>
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={24} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#2563eb' }}>
                {formData.document ? formData.document.name : 'Upload medical certificate or proof'}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                PDF, PNG, JPG up to 5MB
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/app/employee/leave')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '14px',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplyLeave;
