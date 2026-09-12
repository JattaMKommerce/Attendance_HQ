import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Folder, 
  Megaphone,
  Users,
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  Building,
  X
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { EmployeeContext } from '../../context/EmployeeContext';

export default function More() {
  const { user, logout } = useContext(AuthContext);
  const { employeeRecord } = useContext(EmployeeContext);
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'My Profile', path: '/app/employee/profile', icon: User },
    { label: 'Announcements & Notices', path: '/app/employee/announcements', icon: Megaphone },
    { label: 'My Documents', path: '/app/employee/documents', icon: Folder },
    { label: 'Team Directory', path: '/app/employee/directory', icon: Users },
    { label: 'Account & Security Settings', path: '/app/employee/settings', icon: Settings },
  ];

  const designation = employeeRecord?.designation_name || user?.roles?.[0] || 'Employee';
  const employeeCode = employeeRecord?.employee_code || user?.employee_code || 'EMP';

  return (
    <div className="more-list-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' }}>
        More Options
      </h2>
      
      {/* Profile Header Card */}
      <div 
        className="more-profile-card"
        onClick={() => navigate('/app/employee/profile')}
        style={{
          cursor: 'pointer',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div className="more-avatar" style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: 700,
          flexShrink: 0
        }}>
          {user?.name?.charAt(0) || 'E'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
            {user?.name || 'Employee Name'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {employeeCode} • {designation}
          </div>
        </div>
        <ChevronRight size={20} color="#94a3b8" />
      </div>

      {/* Menu List */}
      <div style={{
        marginTop: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink 
              key={index} 
              to={item.path} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: index < menuItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                textDecoration: 'none',
                color: '#1e293b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#2563eb' }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
              </div>
              <ChevronRight size={18} color="#cbd5e1" />
            </NavLink>
          );
        })}

        {/* Help & Support Button in list */}
        <div 
          onClick={() => setShowHelpModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: '1px solid #f1f5f9',
            cursor: 'pointer',
            color: '#1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ color: '#0891b2' }}>
              <HelpCircle size={20} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Help & HR Support</span>
          </div>
          <ChevronRight size={18} color="#cbd5e1" />
        </div>
      </div>

      {/* Logout Button */}
      <button 
        onClick={() => setShowLogoutConfirm(true)}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}
      >
        <LogOut size={20} />
        <span>Log Out</span>
      </button>

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setShowHelpModal(false)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>HR Support Desk</h3>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Need assistance with payroll, leaves, or personal records? Contact our HR department:
            </p>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Mail size={16} color="#2563eb" />
                <span>hr@jattamkommerce.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Phone size={16} color="#2563eb" />
                <span>+91 (080) 4567-8900 (Ext. 104)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Building size={16} color="#2563eb" />
                <span>HR Office, Floor 3, Main Building</span>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '10px',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '28px 24px',
            width: '100%', maxWidth: '320px', textAlign: 'center',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '56px', height: '56px', backgroundColor: '#fef2f2', color: '#ef4444',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>Log Out?</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              Are you sure you want to end your current session?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleLogout}
                style={{
                  backgroundColor: '#dc2626', color: '#fff', border: 'none',
                  padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Yes, Sign Out
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  backgroundColor: '#f1f5f9', color: '#475569', border: 'none',
                  padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
