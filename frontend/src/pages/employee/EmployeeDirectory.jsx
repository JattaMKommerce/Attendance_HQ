import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  MapPin, 
  Filter,
  RefreshCw
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const EmployeeDirectory = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedDepartment !== 'all') params.department = selectedDepartment;

      const res = await employeePortalApi.getDirectory(params);
      if (res.data?.success) {
        const emps = res.data.data || [];
        setEmployees(emps);

        // Extract departments
        const depts = [...new Set(emps.map(e => e.department_name))].filter(Boolean);
        if (departments.length === 0 && depts.length > 0) {
          setDepartments(depts);
        }
      }
    } catch (err) {
      console.error('Error fetching directory:', err);
      setError('Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDepartment]);

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            Company Directory
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Find colleagues, department contacts, and team members
          </p>
        </div>

        <button
          onClick={fetchDirectory}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Department Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              color: '#0f172a',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748b" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#0f172a',
              backgroundColor: '#ffffff',
              fontWeight: 500
            }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Directory Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          Loading team directory...
        </div>
      ) : employees.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <Users size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
            No Colleagues Found
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Try adjusting your search criteria or department filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {employees.map((emp) => {
            const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
            return (
              <div
                key={emp.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {emp.profile_image_url ? (
                      <img
                        src={`http://${window.location.hostname}:5001${emp.profile_image_url}`}
                        alt={empName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span>{emp.first_name?.charAt(0) || 'E'}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {empName}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.designation_name || 'Team Member'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                      {emp.department_name || 'General'}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {emp.email && (
                    <a
                      href={`mailto:${emp.email}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', textDecoration: 'none' }}
                    >
                      <Mail size={14} color="#64748b" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</span>
                    </a>
                  )}
                  {emp.phone && (
                    <a
                      href={`tel:${emp.phone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', textDecoration: 'none' }}
                    >
                      <Phone size={14} color="#64748b" />
                      <span>{emp.phone}</span>
                    </a>
                  )}
                  {emp.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <MapPin size={14} color="#94a3b8" />
                      <span>{emp.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
