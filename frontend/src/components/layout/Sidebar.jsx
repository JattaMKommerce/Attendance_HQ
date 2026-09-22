import React, { useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Command } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import {
  organizationNavigation,
  platformNavigation,
  employeeNavigation,
  filterNavigationByRole,
} from '../../config/navigation';

import { EmployeeContext } from '../../context/EmployeeContext';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useContext(AuthContext);
  const empCtx = useContext(EmployeeContext);
  const unreadCount = empCtx?.unreadCount || 0;

  if (!user) return null;

  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  const isOnlyEmployee =
    user.roles.includes('EMPLOYEE') &&
    !user.roles.includes('ORG_ADMIN') &&
    !user.roles.includes('HR_ADMIN') &&
    !user.roles.includes('MANAGER') &&
    !user.roles.includes('PAYROLL_MANAGER') &&
    !user.roles.includes('FINANCE');

  let navConfig;
  if (isSuperAdmin) navConfig = platformNavigation;
  else if (isOnlyEmployee) navConfig = employeeNavigation;
  else navConfig = organizationNavigation;

  const filteredNav = filterNavigationByRole(navConfig, user.roles);

  const NOTIF_PATH = '/app/employee/notifications';

  return (
    <>
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="brand" style={{ display: collapsed ? 'none' : 'flex' }}>
            <Command className="brand-icon" size={24} />
            <span>JMK</span>
          </div>
          <button
            className="icon-btn sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginLeft: collapsed ? '0' : 'auto' }}
            aria-label="Collapse sidebar"
          >
            <Menu size={20} />
          </button>
          <button
            className="icon-btn sidebar-close-mobile-btn"
            onClick={() => setIsMobileOpen(false)}
            style={{ marginLeft: 'auto' }}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          {filteredNav.map((group, idx) => (
            <div key={idx} className="nav-group">
              {!collapsed && <div className="nav-group-title">{group.group}</div>}
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isNotif = item.path === NOTIF_PATH;
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (window.innerWidth <= 768) setIsMobileOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span style={{ position: 'relative', display: 'inline-flex' }}>
                      <Icon className="nav-icon" />
                      {isNotif && unreadCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            minWidth: 16,
                            height: 16,
                            borderRadius: '99px',
                            backgroundColor: 'var(--accent-hover)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 3px',
                            lineHeight: 1,
                          }}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
