import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AppShell = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div className="app-shell">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      
      <div className="main-content-wrapper">
        <Topbar toggleMobileSidebar={toggleMobileSidebar} />
        
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
