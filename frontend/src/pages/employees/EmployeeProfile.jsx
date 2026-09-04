import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Edit2, Download, FileText, Briefcase, FileBadge2, GraduationCap } from 'lucide-react';
import { getEmployeeById, updateEmployee, updateEmployeeStatus, getLookups, getEmployeeIdCardUrl } from '../../services/employeeApi';
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

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={() => navigate('/app/employees')}><ArrowLeft size={20} /></button>
          
          {employee.profile_image_url ? (
             <img src={`http://localhost:5001${employee.profile_image_url}`} alt="Profile" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
             <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-muted)' }}>{employee.first_name[0]}{employee.last_name[0]}</span>
             </div>
          )}

          <div>
            <h1 className="page-title">{employee.first_name} {employee.last_name}</h1>
            <p className="page-description">{employee.employee_code} • {employee.department_name || 'No Department'} • {employee.organization_name || 'HRMS'}</p>
          </div>
        </div>
        <div className="page-actions">
          {!editMode ? (
            <>
              {employee.resume_url && (
                <a href={`http://localhost:5001${employee.resume_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                  <FileText size={16} /> View Resume
                </a>
              )}
              <button onClick={() => {
                const token = localStorage.getItem('accessToken');
                window.open(`${getEmployeeIdCardUrl(id)}?token=${token}`, '_blank');
              }} className="btn btn-secondary" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <FileBadge2 size={16} /> View ID Card
              </button>
              <button className="btn btn-primary" onClick={() => setEditMode(true)}><Edit2 size={16} /> Edit Profile</button>
            </>
          ) : (
             <button className="btn btn-secondary" onClick={() => { setEditMode(false); setFormData(employee); }}>Cancel Edit</button>
          )}
        </div>
      </div>

      {error && editMode && <div style={{ padding: '16px', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', marginBottom: '24px', borderRadius: '8px' }}>{error}</div>}

      <form onSubmit={handleSave}>
        
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

          {/* Right Column */}
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header"><h3 className="card-title">Employment Information</h3></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group"><label className="input-label">Employee Code</label><input type="text" name="employee_code" className="input-control" value={formData.employee_code} onChange={handleChange} disabled={!editMode} required /></div>
                <div className="input-group"><label className="input-label">Joining Date</label><input type="date" name="joining_date" className="input-control" value={formData.joining_date ? formData.joining_date.split('T')[0] : ''} onChange={handleChange} disabled={!editMode} /></div>
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
                <div className="input-group"><label className="input-label">UAN Number</label><input type="text" name="uan_number" className="input-control" value={formData.uan_number || ''} onChange={handleChange} disabled={!editMode} /></div>
                <div className="input-group"><label className="input-label">Type</label><input type="text" className="input-control" value={employee.experience_type.toUpperCase()} disabled /></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header"><h3 className="card-title"><GraduationCap size={16} style={{ display: 'inline', marginRight: '8px' }}/> Education</h3></div>
              <div className="card-body">
                {formData.education && formData.education.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {formData.education.map((edu, idx) => (
                      <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        {editMode ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                             <select className="input-control" value={edu.level} onChange={e => handleArrayChange('education', idx, 'level', e.target.value)}><option value="10th">10th</option><option value="12th">12th</option><option value="Bachelors">Bachelors</option><option value="Masters">Masters</option><option value="PhD">PhD</option><option value="Diploma">Diploma</option><option value="Other">Other</option></select>
                             <input type="text" className="input-control" placeholder="Degree" value={edu.degree_name || ''} onChange={e => handleArrayChange('education', idx, 'degree_name', e.target.value)} />
                             <input type="text" className="input-control" placeholder="University" value={edu.university_name || ''} onChange={e => handleArrayChange('education', idx, 'university_name', e.target.value)} />
                             <input type="number" className="input-control" placeholder="Year" value={edu.passing_year || ''} onChange={e => handleArrayChange('education', idx, 'passing_year', e.target.value)} />
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{edu.level} {edu.degree_name ? `- ${edu.degree_name}` : ''}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{edu.university_name} {edu.passing_year ? `(${edu.passing_year})` : ''}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No education records.</p>}
              </div>
            </div>

            {employee.experience_type === 'experienced' && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header"><h3 className="card-title"><Briefcase size={16} style={{ display: 'inline', marginRight: '8px' }}/> Experience</h3></div>
                <div className="card-body">
                  {employee.experiences && employee.experiences.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {employee.experiences.map(exp => (
                        <div key={exp.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{exp.previous_designation}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>{exp.company_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No previous experience records.</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {editMode && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EmployeeProfile;
