import React, { useState, useContext } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AuthContext } from '../../context/AuthContext';
import { EmployeeProvider } from '../../context/EmployeeContext';

const AppShell = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const userRoles = user?.roles || [];
  const isOnlyEmployee = userRoles.includes('EMPLOYEE') && 
    !userRoles.includes('ORG_ADMIN') && 
    !userRoles.includes('HR_ADMIN') && 
    !userRoles.includes('SUPER_ADMIN');

  const isEmployeePortal = location.pathname === '/app/employee' || location.pathname.startsWith('/app/employee/');

  // If only employee visits /app/social or other direct routes, redirect to employee portal
  if (isOnlyEmployee && !isEmployeePortal) {
    if (location.pathname === '/app/social') {
      return <Navigate to="/app/employee/social" replace />;
    }
    return <Navigate to="/app/employee/dashboard" replace />;
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // In employee portal, do not render desktop Topbar or Sidebar (no 3 lines)
  if (isEmployeePortal) {
    return (
      <EmployeeProvider>
        <Outlet />
      </EmployeeProvider>
    );
  }

  return (
    <EmployeeProvider>
      <div className="app-shell">
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        <div className="main-content-wrapper">
          <Topbar toggleMobileSidebar={toggleMobileSidebar} />
          
          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </EmployeeProvider>
  );
};

export default AppShell;
