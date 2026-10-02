import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, X, Check, ChevronDown } from 'lucide-react';
import { getEmployees } from '../../services/employeeApi';

const EmployeePicker = ({
  selectedEmployee = null,
  onSelect,
  onClear,
  label = 'Select Employee *',
  placeholder = 'Click to search and select employee…',
  required = false,
  disabled = false,
  style = {}
}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getEmployees({ status: 'active' })
      .then(res => {
        if (mounted && res?.success) {
          setEmployees(res.data?.employees || []);
        }
      })
      .catch(err => {
        console.warn('[EmployeePicker] Could not fetch employees:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const dept = (emp.department_name || '').toLowerCase();
    const des = (emp.designation_name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    return fullName.includes(q) || code.includes(q) || dept.includes(q) || des.includes(q) || email.includes(q);
  });

  const handleSelect = (emp) => {
    if (onSelect) onSelect(emp);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    if (onClear) onClear();
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={dropdownRef}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {selectedEmployee && (selectedEmployee.first_name || selectedEmployee.name || selectedEmployee.employee_code) ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '10px 14px',
          border: '1.5px solid #2563eb',
          borderRadius: '8px',
          background: '#eff6ff',
          transition: 'all 0.2s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#1d4ed8',
              fontSize: '14px',
              flexShrink: 0
            }}>
              {(selectedEmployee.first_name?.[0] || selectedEmployee.name?.[0] || 'E').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedEmployee.first_name ? `${selectedEmployee.first_name} ${selectedEmployee.last_name || ''}` : (selectedEmployee.name || selectedEmployee.employeeName)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedEmployee.employee_code || selectedEmployee.employeeId || `ID: ${selectedEmployee.id}`}</span>
                {(selectedEmployee.department_name || selectedEmployee.department) && ` · ${selectedEmployee.department_name || selectedEmployee.department}`}
                {(selectedEmployee.designation_name || selectedEmployee.designation) && ` · ${selectedEmployee.designation_name || selectedEmployee.designation}`}
              </div>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '13px',
            background: '#ffffff',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Users size={16} color="#6b7280" />
            <span>{loading ? 'Loading employees…' : placeholder}</span>
          </div>
          <ChevronDown size={16} color="#9ca3af" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          zIndex: 1050,
          overflow: 'hidden'
        }}>
          {/* Search Box */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', position: 'relative', background: '#f8fafc' }}>
            <Search size={14} style={{ position: 'absolute', left: '22px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, employee code, or department…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 32px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>

          {/* List of Employees */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Loading employees…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                {employees.length === 0 ? 'No active employees found' : 'No matching employees found'}
              </div>
            ) : (
              filtered.map(emp => {
                const isSelected = selectedEmployee && (selectedEmployee.id === emp.id || selectedEmployee.employee_code === emp.employee_code);
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = '#ffffff')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {(emp.first_name?.[0] || 'E').toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.first_name} {emp.last_name || ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>{emp.employee_code}</span>
                          {emp.department_name && ` · ${emp.department_name}`}
                          {emp.designation_name && ` · ${emp.designation_name}`}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePicker;
