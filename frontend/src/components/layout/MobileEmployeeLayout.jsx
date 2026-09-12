import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, LogOut, Bell, LayoutGrid, Calendar, Clock, MoreHorizontal, User, DollarSign } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { EmployeeProvider, EmployeeContext } from '../../context/EmployeeContext';
import '../../styles/employee-mobile.css';

const MobileEmployeeLayoutInner = () => {
  const { user } = useContext(AuthContext);
  const empCtx = useContext(EmployeeContext);
  const location = useLocation();
  const unreadCount = empCtx?.unreadCount || 0;

  // We only show the greeting header on the dashboard
  const isDashboard = location.pathname.includes('/employee/dashboard');
  const isMorePage = location.pathname.includes('/employee/more');

  return (
    <div className="mobile-app-container">
      {/* Top Header - specific to Dashboard/General pages */}
      {!isMorePage && (
        <header className="mobile-header">
          <div>
            <div className="mobile-greeting">
              Good Morning, {user?.name?.split(' ')[0] || 'Employee'} 👋
            </div>
            <div className="mobile-subtitle">Let's make it a great day!</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NavLink to="/app/employee/notifications" style={{ position: 'relative', color: '#1e293b' }}>
              <Bell size={24} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  backgroundColor: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 'bold',
                  width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: '2px solid #fff'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/app/employee/profile">
              <div style={{
                width: '36px', height: '36px',
                backgroundColor: '#e0e7ff', color: '#4f46e5',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px'
              }}>
                {user?.name?.charAt(0) || 'E'}
              </div>
            </NavLink>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="mobile-main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <BottomNavItem to="/app/employee/dashboard" icon={Home} label="Home" />
        <BottomNavItem to="/app/employee/attendance" icon={Clock} label="Attendance" />
        <BottomNavItem to="/app/employee/leave" icon={Calendar} label="Leave" />
        <BottomNavItem to="/app/employee/payslips" icon={DollarSign} label="Payslips" />
        <BottomNavItem to="/app/employee/more" icon={MoreHorizontal} label="More" />
      </nav>
    </div>
  );
};

const BottomNavItem = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon size={24} strokeWidth={2.5} />
      <span>{label}</span>
    </NavLink>
  );
};

const MobileEmployeeLayout = () => {
  return (
    <EmployeeProvider>
      <MobileEmployeeLayoutInner />
    </EmployeeProvider>
  );
};

export default MobileEmployeeLayout;
