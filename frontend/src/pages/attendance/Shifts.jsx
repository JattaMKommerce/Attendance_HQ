import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/attendanceApi';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', startTime: '', endTime: '', breakDurationMinutes: 60 });

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getShifts();
      if (res.data.success) {
        setShifts(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch shifts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceApi.createShift(formData);
      if (res.data.success) {
        alert('Shift created successfully');
        setShowModal(false);
        setFormData({ name: '', startTime: '', endTime: '', breakDurationMinutes: 60 });
        fetchShifts();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create shift');
    }
  };

  return (
    <div className="attendance-shifts">
      <div className="page-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          + Add Shift
        </button>
      </div>

      {loading ? (
        <p>Loading shifts...</p>
      ) : (
        <div className="metrics-grid">
          {shifts.length > 0 ? shifts.map(shift => (
            <div key={shift.id} className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>{shift.name}</div>
              <div style={{ fontSize: '14px', color: '#4b5563' }}>
                <ClockIcon /> {shift.start_time} - {shift.end_time}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Break: {shift.break_duration_minutes} mins
              </div>
            </div>
          )) : (
            <p style={{ color: '#6b7280' }}>No shifts defined for this organization.</p>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Create New Shift</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Shift Name</label>
                <input required type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Morning Shift" />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Start Time</label>
                  <input required type="time" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>End Time</label>
                  <input required type="time" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Break Duration (mins)</label>
                <input required type="number" min="0" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.breakDurationMinutes} onChange={e => setFormData({...formData, breakDurationMinutes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export default Shifts;
