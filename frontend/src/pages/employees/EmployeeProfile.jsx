import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Phone, MapPin, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { getEmployeeById, updateEmployee, getLookups } from '../../services/employeeApi';
import api from '../../services/api';
import EmployeeIdCard from '../../components/EmployeeIdCard';
import '../../styles/components.css';



const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [lookups, setLookups] = useState({ departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [showIdModal, setShowIdModal] = useState(false);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployeeById(id);
      if (res.success) {
        setEmployee(res.data);
        const fetchedData = { ...res.data };
        if (fetchedData.date_of_birth) fetchedData.date_of_birth = fetchedData.date_of_birth.split('T')[0];
        if (fetchedData.joining_date) fetchedData.joining_date = fetchedData.joining_date.split('T')[0];
        setFormData(fetchedData);
        fetchIdCard(res.data.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employee details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
    const fetchLookups = async () => {
      try {
        const res = await getLookups();
        if (res.success) setLookups(res.data);
      } catch (err) {
        console.error("Failed to fetch lookups", err);
      }
    };
    fetchLookups();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'gross_salary' && value) {
        const gross = parseFloat(value);
        if (!isNaN(gross)) {
          updated.basic_salary = (gross * 0.5).toFixed(2);
          updated.hra = (gross * 0.2).toFixed(2);
        }
      }
      return updated;
    });
  };

  const handleArrayChange = (key, index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev[key] || [])];
      updated[index][field] = value;
      return { ...prev, [key]: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...formData };
      delete payload.department_name;
      delete payload.designation_name;
      delete payload.documents;
      ['department_id', 'designation_id', 'gender', 'blood_group'].forEach(k => { if (!payload[k]) payload[k] = null; });
      
      const res = await updateEmployee(id, payload);
      if (res.success) {
        setEditMode(false);
        fetchEmployee();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
         <button className="btn btn-secondary" onClick={() => navigate('/app/employees')}><ArrowLeft size={16} /> Back to List</button>
         <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowIdModal(true)}>View ID Card</button>
            <button className="btn btn-secondary" onClick={() => navigate('/app/employees')}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setEditMode(true); }}><Save size={16} /> Edit Employee</button>
         </div>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
         {employee.profile_image_url ? (
            <img src={`http://localhost:5001${employee.profile_image_url}`} alt="Profile" className="profile-avatar-large" />
         ) : (
            <div className="profile-avatar-placeholder">
               {employee.first_name[0]}{employee.last_name[0]}
            </div>
         )}
         
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
               <div className="profile-meta-item"><MapPin size={16} /> Mumbai, India</div>
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
                     <div className="card-header"><h3 className="card-title">Salary Details</h3></div>
                     <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div className="input-group"><label className="input-label">Gross Salary</label><input type="number" name="gross_salary" className="input-control" value={formData.gross_salary || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">Basic Salary</label><input type="number" name="basic_salary" className="input-control" value={formData.basic_salary || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">HRA</label><input type="number" name="hra" className="input-control" value={formData.hra || ''} onChange={handleChange} disabled={!editMode} /></div>
                       <div className="input-group"><label className="input-label">Deductions</label><input type="number" name="deductions" className="input-control" value={formData.deductions || ''} onChange={handleChange} disabled={!editMode} /></div>
                     </div>
                   </div>
                 </div>
               </div>

            {editMode && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); setFormData(employee); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
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
