import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { EmployeeProvider } from '../../context/EmployeeContext';

const AppShell = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

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
