import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/auth/Login';
import AppShell from './components/layout/AppShell';

// Dashboards
import Dashboard from './pages/dashboard/Dashboard';
import PlatformDashboard from './pages/platform/PlatformDashboard';

// Employees
import EmployeeList from './pages/employees/EmployeeList';
import AddEmployee from './pages/employees/AddEmployee';
import EmployeeProfile from './pages/employees/EmployeeProfile';

import Attendance from './pages/attendance/Attendance';
import Leave from './pages/leave/Leave';
import Payroll from './payroll/Payroll';

// Employee Portal
import { 
  EmployeeDashboard, 
  MyProfile, 
  MyAttendance, 
  MyLeave, 
  ApplyLeave,
  MyPayslips,
  MyDocuments,
  EmployeeDirectory,
  MySettings
} from './pages/employee';

// Placeholders
import Placeholder from './pages/placeholders/Placeholder';

const Unauthorized = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h1>403 - Unauthorized</h1>
    <p>You do not have permission to view this page.</p>
  </div>
);

// Route configuration mapper
const mapPlaceholderRoutes = (routes, base) => {
  return routes.map(route => (
    <Route key={route.path} path={route.path} element={<Placeholder title={route.title} />} />
  ));
};

const appPlaceholders = [
  { path: 'recruitment', title: 'Recruitment' },
  { path: 'onboarding', title: 'Onboarding' },
  { path: 'performance', title: 'Performance' },
  { path: 'incentives', title: 'Incentives' },
  { path: 'assets', title: 'Assets' },
  { path: 'expenses', title: 'Expenses' },
  { path: 'documents', title: 'Documents' },
  { path: 'ai', title: 'AI Assistant' },
  { path: 'automation', title: 'Automation' },
  { path: 'reports', title: 'Reports' },
  { path: 'settings', title: 'Settings' }
];

const platformPlaceholders = [
  { path: 'organizations', title: 'Organizations' },
  { path: 'subscriptions', title: 'Subscriptions' },
  { path: 'payments', title: 'Payments' },
  { path: 'plans', title: 'Plans' },
  { path: 'features', title: 'Feature Management' },
  { path: 'ai-usage', title: 'AI Usage' },
  { path: 'health', title: 'System Health' },
  { path: 'audit', title: 'Audit Logs' },
  { path: 'settings', title: 'Settings' }
];

const RootRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.roles.includes('SUPER_ADMIN')) {
    return <Navigate to="/platform/dashboard" replace />;
  }
  
  // If user is ONLY an employee (not admin/manager), redirect to employee portal
  const isOnlyEmployee = user.roles.includes('EMPLOYEE') && 
    !user.roles.includes('ORG_ADMIN') && 
    !user.roles.includes('HR_ADMIN') && 
    !user.roles.includes('MANAGER') &&
    !user.roles.includes('PAYROLL_MANAGER') &&
    !user.roles.includes('FINANCE');
  
  if (isOnlyEmployee) {
    return <Navigate to="/app/employee/dashboard" replace />;
  }
  
  return <Navigate to="/app/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Root redirect based on role */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RootRedirect />} />
      </Route>

      {/* Organization Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'PAYROLL_MANAGER', 'FINANCE']} />}>
        <Route path="/app" element={<AppShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/new" element={<AddEmployee />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="payroll" element={<Payroll />} />
          
          {/* Employee Portal Routes */}
          <Route path="employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="employee/profile" element={<MyProfile />} />
          <Route path="employee/attendance" element={<MyAttendance />} />
          <Route path="employee/leave" element={<MyLeave />} />
          <Route path="employee/leave/apply" element={<ApplyLeave />} />
          <Route path="employee/payslips" element={<MyPayslips />} />
          <Route path="employee/documents" element={<MyDocuments />} />
          <Route path="employee/directory" element={<EmployeeDirectory />} />
          <Route path="employee/settings" element={<MySettings />} />
          
          {mapPlaceholderRoutes(appPlaceholders)}
        </Route>
      </Route>

      {/* Platform Routes */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
        <Route path="/platform" element={<AppShell />}>
          <Route path="dashboard" element={<PlatformDashboard />} />
          {mapPlaceholderRoutes(platformPlaceholders)}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
