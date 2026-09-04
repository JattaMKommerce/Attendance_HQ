import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';

const LeaveSettings = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // New leave type form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    colorCode: '#3b82f6',
    isPaid: true,
    requiresAttachment: false,
    yearlyAllowance: 0,
    maxCarryForward: 0,
    requireAttachmentAfterDays: ''
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await leaveApi.getLeaveTypes();
      if (res.data.success) {
        setTypes(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.requireAttachmentAfterDays === '') {
        payload.requireAttachmentAfterDays = null;
      } else {
        payload.requireAttachmentAfterDays = parseInt(payload.requireAttachmentAfterDays);
      }
      
      const res = await leaveApi.createLeaveType(payload);
      if (res.data.success) {
        setShowForm(false);
        fetchTypes();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create leave type');
    }
  };

  return (
    <div className="leave-settings">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Leave Policies & Types</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : 'Create New Type'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Create Leave Type</h4>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Name</label>
              <input type="text" required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Color Code</label>
              <input type="color" required style={{ width: '100%', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', height: '36px' }}
                value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description</label>
              <textarea style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Yearly Allowance (Days)</label>
              <input type="number" required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={formData.yearlyAllowance} onChange={e => setFormData({...formData, yearlyAllowance: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Max Carry Forward (Days)</label>
              <input type="number" required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={formData.maxCarryForward} onChange={e => setFormData({...formData, maxCarryForward: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Require Medical Doc After (Days)</label>
              <input type="number" placeholder="Leave blank for none" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                value={formData.requireAttachmentAfterDays} onChange={e => setFormData({...formData, requireAttachmentAfterDays: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <input type="checkbox" checked={formData.isPaid} onChange={e => setFormData({...formData, isPaid: e.target.checked})} />
                Is Paid Leave
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <input type="checkbox" checked={formData.requiresAttachment} onChange={e => setFormData({...formData, requiresAttachment: e.target.checked})} />
                Always Require Doc
              </label>
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Leave Type</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading policies...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {types.map(t => (
            <div key={t.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${t.color_code}` }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{t.name}</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280', minHeight: '38px' }}>{t.description || 'No description'}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>Yearly Allowance:</span>
                  <span style={{ fontWeight: 500 }}>{t.yearly_allowance} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>Carry Forward:</span>
                  <span style={{ fontWeight: 500 }}>{t.max_carry_forward} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>Paid Type:</span>
                  <span style={{ fontWeight: 500 }}>{t.is_paid ? 'Paid' : 'Unpaid'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>Medical Doc:</span>
                  <span style={{ fontWeight: 500 }}>
                    {t.requires_attachment ? 'Always Required' : 
                     (t.require_attachment_after_days ? `After ${t.require_attachment_after_days} days` : 'Not Required')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveSettings;
