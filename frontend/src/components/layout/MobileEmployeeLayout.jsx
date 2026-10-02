import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Bell, Clock, Calendar, IndianRupee, MoreHorizontal,
  ArrowLeft, User, Megaphone, Folder, Users, Settings, Bot, MessageSquare
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { EmployeeProvider, EmployeeContext } from '../../context/EmployeeContext';
import '../../styles/employee-mobile.css';

// Map of routes to their display titles and whether they need a back-arrow
const PAGE_CONFIG = {
  '/app/employee/dashboard':    { title: null,               back: false },
  '/app/employee/attendance':   { title: 'My Attendance',    back: false },
  '/app/employee/social':       { title: 'JMK Social',       back: false },
  '/app/employee/leave':        { title: 'My Leave',         back: true  },
  '/app/employee/leave/apply':  { title: 'Apply Leave',      back: true  },
  '/app/employee/payslips':     { title: 'Payslips',         back: true  },
  '/app/employee/more':         { title: 'More Options',     back: false },
  '/app/employee/profile':      { title: 'My Profile',       back: true  },
  '/app/employee/announcements':{ title: 'Announcements',    back: true  },
  '/app/employee/documents':    { title: 'My Documents',     back: true  },
  '/app/employee/directory':    { title: 'Team Directory',   back: true  },
  '/app/employee/settings':     { title: 'Settings',         back: true  },
  '/app/employee/calendar':     { title: 'Company Calendar', back: true  },
};

const MobileEmployeeLayoutInner = () => {
  const { user } = useContext(AuthContext);
  const empCtx = useContext(EmployeeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = empCtx?.unreadCount || 0;

  const isDashboard = location.pathname === '/app/employee/dashboard' || 
                      location.pathname === '/app/employee/dashboard/';
  const pageConf = PAGE_CONFIG[location.pathname] || { title: 'HRMS', back: true };

  // Greeting based on time
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const employeeFirstName = user?.first_name || (user?.name ? user.name.split(' ')[0] : '') || empCtx?.employee?.first_name || 'Team Member';
  const initial = (user?.first_name?.charAt(0) || user?.name?.charAt(0) || user?.email?.charAt(0) || 'E').toUpperCase();

  return (
    <div className="mobile-app-container">
      {/* Header — Dashboard: greeting + avatar; Sub-pages: title + back arrow */}
      {isDashboard ? (
        <header className="mobile-header">
          <div>
            <div className="mobile-greeting">
              {getGreeting()}, {employeeFirstName} 👋
            </div>
            <div className="mobile-subtitle">Welcome to JMK</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <NavLink to="/app/employee/announcements" style={{ position: 'relative', color: '#1e293b', display: 'flex' }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  backgroundColor: '#ef4444', color: '#fff',
                  fontSize: '9px', fontWeight: '800',
                  width: '15px', height: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: '2px solid #fff'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/app/employee/profile" title="My Profile">
              <div style={{
                width: '36px', height: '36px',
                background: '#2563eb',
                color: '#ffffff',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '15px',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
              }}>
                {initial}
              </div>
            </NavLink>
          </div>
        </header>
      ) : pageConf.title ? (
        <header className="mobile-page-header">
          {pageConf.back ? (
            <button className="mobile-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div style={{ width: '36px' }} />
          )}
          <h1 className="mobile-page-title">{pageConf.title}</h1>
          <div style={{ width: '36px' }} />
        </header>
      ) : null}

      {/* Main Content Area */}
      <main className="mobile-main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation: Home, Attendance, Social, Apply Leave, More */}
      <nav className="bottom-nav">
        <BottomNavItem to="/app/employee/dashboard" icon={Home} label="Home" />
        <BottomNavItem to="/app/employee/attendance" icon={Clock} label="Attendance" />
        <BottomNavItem to="/app/employee/social" icon={MessageSquare} label="Social" />
        <BottomNavItem to="/app/employee/leave/apply" icon={Calendar} label="Apply Leave" />
        <BottomNavItem to="/app/employee/more" icon={MoreHorizontal} label="More" />
      </nav>
    </div>
  );
};

const BottomNavItem = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      end={to === '/app/employee/dashboard'}
      className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
    >
      <div className="bottom-nav-icon-wrap">
        <Icon size={22} strokeWidth={2.2} />
      </div>
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
