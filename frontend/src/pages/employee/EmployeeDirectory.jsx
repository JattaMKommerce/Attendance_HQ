import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Briefcase,
  Building,
  MapPin,
  Filter
} from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';

const EmployeeDirectory = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDirectory();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [search, selectedDepartment, employees]);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      
      // In production:
      // const response = await employeePortalApi.getEmployeeDirectory();
      // setEmployees(response.data.employees);
      
      // Mock data
      const mockEmployees = generateMockDirectory();
      setEmployees(mockEmployees);
      
      // Extract unique departments
      const uniqueDepts = [...new Set(mockEmployees.map(e => e.department))].filter(Boolean);
      setDepartments(uniqueDepts);
      
      setFilteredEmployees(mockEmployees);
    } catch (error) {
      console.error('Error fetching directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.designation?.toLowerCase().includes(searchLower) ||
        emp.department?.toLowerCase().includes(searchLower)
      );
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }

    setFilteredEmployees(filtered);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-description">Search and connect with your colleagues</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="text"
                placeholder="Search by name, email, designation..."
                className="input-control"
                style={{ width: '100%', paddingLeft: '40px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Department Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--text-secondary)" />
              <select
                className="input-control"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ minWidth: '200px' }}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <Users size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">No employees found</h3>
              <p className="empty-state-desc">
                {search || selectedDepartment !== 'all' 
                  ? "Try adjusting your search or filters" 
                  : "No employees in the directory"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredEmployees.map(employee => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}
    </div>
  );
};

// Employee Card Component
const EmployeeCard = ({ employee }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="card">
      <div className="card-body">
        {/* Profile Section */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {/* Avatar */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: employee.photo ? 'transparent' : 'var(--accent-bg)',
            backgroundImage: employee.photo ? `url(${employee.photo})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--accent-hover)',
            flexShrink: 0
          }}>
            {!employee.photo && getInitials(employee.name)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '16px', 
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {employee.name}
            </h3>
            <p style={{ 
              margin: '0 0 4px 0', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {employee.designation}
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {employee.employeeCode}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)'
        }}>
          {/* Email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <a 
              href={`mailto:${employee.email}`}
              style={{ 
                fontSize: '14px',
                color: 'var(--accent-hover)',
                textDecoration: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {employee.email}
            </a>
          </div>

          {/* Phone */}
          {employee.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <a 
                href={`tel:${employee.phone}`}
                style={{ 
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  textDecoration: 'none'
                }}
              >
                {employee.phone}
              </a>
            </div>
          )}

          {/* Department */}
          {employee.department && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span style={{ 
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {employee.department}
              </span>
            </div>
          )}

          {/* Location */}
          {employee.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span style={{ 
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {employee.location}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <a 
            href={`mailto:${employee.email}`}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '14px', padding: '8px', textDecoration: 'none', textAlign: 'center' }}
          >
            <Mail size={16} />
            Email
          </a>
          {employee.phone && (
            <a 
              href={`tel:${employee.phone}`}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '14px', padding: '8px', textDecoration: 'none', textAlign: 'center' }}
            >
              <Phone size={16} />
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock data generator
const generateMockDirectory = () => {
  const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rahul', 'Pooja', 'Arjun', 'Divya', 
                     'Karan', 'Meera', 'Rohan', 'Nisha', 'Sanjay', 'Kavya', 'Aditya', 'Riya', 'Vivek', 'Shreya'];
  const lastNames = ['Kumar', 'Sharma', 'Singh', 'Patel', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Rao', 'Mehta'];
  
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product', 'Design'];
  
  const designations = {
    'Engineering': ['Software Engineer', 'Senior Engineer', 'Tech Lead', 'Engineering Manager'],
    'Marketing': ['Marketing Manager', 'Content Writer', 'SEO Specialist', 'Brand Manager'],
    'Sales': ['Sales Executive', 'Account Manager', 'Sales Manager', 'Business Development'],
    'HR': ['HR Manager', 'HR Executive', 'Recruiter', 'HR Business Partner'],
    'Finance': ['Financial Analyst', 'Accountant', 'Finance Manager', 'Controller'],
    'Operations': ['Operations Manager', 'Operations Executive', 'Logistics Manager'],
    'Product': ['Product Manager', 'Product Owner', 'Product Analyst'],
    'Design': ['UI Designer', 'UX Designer', 'Graphic Designer', 'Design Lead']
  };

  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai'];

  const employees = [];
  
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const department = departments[Math.floor(Math.random() * departments.length)];
    const designation = designations[department][Math.floor(Math.random() * designations[department].length)];
    
    employees.push({
      id: i + 1,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      phone: Math.random() > 0.3 ? `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}` : null,
      employeeCode: `EMP${String(i + 1).padStart(4, '0')}`,
      designation,
      department,
      location: locations[Math.floor(Math.random() * locations.length)],
      photo: null // Can add photo URLs if needed
    });
  }

  // Sort by name
  return employees.sort((a, b) => a.name.localeCompare(b.name));
};

export default EmployeeDirectory;
