import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { EmployeeProvider } from './context/EmployeeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/auth/Login';
import ActivateAccount from './pages/auth/ActivateAccount';
import AppDownload from './pages/download/AppDownload';
import AppShell from './components/layout/AppShell';
import MobileEmployeeLayout from './components/layout/MobileEmployeeLayout';

// Dashboards
import Dashboard from './pages/dashboard/Dashboard';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import SocialFeed from './pages/social/SocialFeed';

// Employees
import EmployeeList from './pages/employees/EmployeeList';
import AddEmployee from './pages/employees/AddEmployee';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import IdCardStandaloneView from './pages/employees/IdCardStandaloneView';

import Attendance from './pages/attendance/Attendance';
import Roster from './pages/attendance/Roster';
import Leave from './pages/leave/Leave';

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
  MySettings,
  Announcements,
  More
} from './pages/employee';

// Management Modules
import ManagementDashboard from './pages/management/dashboard/Dashboard';
import Recruitment from './pages/management/recruitment/Recruitment';
import Onboarding from './pages/management/onboarding/Onboarding';
import Performance from './pages/management/performance/Performance';

// Payroll V2
import PayrollLayout from './pages/payroll/PayrollLayout';
import PayrollOverview from './pages/payroll/PayrollOverview';
import PayrollRuns from './pages/payroll/PayrollRuns';
import EmployeePayroll from './pages/payroll/EmployeePayroll';
import SalaryStructures from './pages/payroll/SalaryStructures';
import Adjustments from './pages/payroll/Adjustments';
import PayrollSettings from './pages/payroll/PayrollSettings';

// Operations
import Assets from './pages/operations/Assets';
import Offboarding from './pages/operations/Offboarding';

// Employee Lifecycle
import Probation from './pages/lifecycle/Probation';
import PerformancePIP from './pages/lifecycle/PerformancePIP';
import EmployeeActions from './pages/lifecycle/EmployeeActions';
import EmployeeRelations from './pages/lifecycle/EmployeeRelations';
import Separation from './pages/lifecycle/Separation';
import FinalSettlement from './pages/lifecycle/FinalSettlement';

// Placeholders
import Placeholder from './pages/placeholders/Placeholder';
import AiAssistantPage from './pages/ai/AiAssistantPage';

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
  { path: 'incentives', title: 'Incentives' },
  { path: 'expenses', title: 'Expenses' },
  { path: 'documents', title: 'Documents' },
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
  
  const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);

  if (userRoles.includes('SUPER_ADMIN')) {
    return <Navigate to="/platform/dashboard" replace />;
  }
  
  // If user is ONLY an employee (not admin/manager), redirect to employee portal
  const isOnlyEmployee = userRoles.includes('EMPLOYEE') && 
    !userRoles.includes('ORG_ADMIN') && 
    !userRoles.includes('HR_ADMIN') && 
    !userRoles.includes('MANAGER') &&
    !userRoles.includes('PAYROLL_MANAGER') &&
    !userRoles.includes('FINANCE');
  
  if (isOnlyEmployee) {
    return <Navigate to="/app/employee/dashboard" replace />;
  }
  
  return <Navigate to="/app/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/activate" element={<ActivateAccount />} />
      <Route path="/download" element={<AppDownload />} />
      <Route path="/install" element={<AppDownload />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Root redirect based on role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Organization Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'PAYROLL_MANAGER', 'FINANCE']} />}>
        {/* Standalone ID Card View (outside AppShell) */}
        <Route path="/app/employees/:id/id-card" element={<IdCardStandaloneView />} />
        
        <Route path="/app" element={<AppShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="social" element={<SocialFeed />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/new" element={<AddEmployee />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          {/* Payroll V2 */}
          <Route path="payroll" element={<PayrollLayout />}>
            <Route index element={<PayrollOverview />} />
            <Route path="overview" element={<PayrollOverview />} />
            <Route path="runs" element={<PayrollRuns />} />
            <Route path="employees" element={<EmployeePayroll />} />
            <Route path="structures" element={<SalaryStructures />} />
            <Route path="adjustments" element={<Adjustments />} />
            <Route path="settings" element={<PayrollSettings />} />
          </Route>
          <Route path="management" element={<ManagementDashboard />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="performance" element={<Performance />} />
          <Route path="assets" element={<Assets />} />
          <Route path="offboarding" element={<Offboarding />} />
          <Route path="ai" element={<AiAssistantPage />} />
          
          {/* Employee Lifecycle */}
          <Route path="lifecycle/probation" element={<Probation />} />
          <Route path="lifecycle/performance" element={<PerformancePIP />} />
          <Route path="lifecycle/actions" element={<EmployeeActions />} />
          <Route path="lifecycle/relations" element={<EmployeeRelations />} />
          <Route path="lifecycle/separation" element={<Separation />} />
          <Route path="lifecycle/settlement" element={<FinalSettlement />} />
          
          {/* Employee Portal Routes */}
          <Route element={<MobileEmployeeLayout />}>
            <Route path="employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="employee/social" element={<SocialFeed />} />
            <Route path="employee/profile" element={<MyProfile />} />
            <Route path="employee/attendance" element={<MyAttendance />} />
            <Route path="employee/roster" element={<Roster />} />
            <Route path="employee/leave" element={<MyLeave />} />
            <Route path="employee/leave/apply" element={<ApplyLeave />} />
            <Route path="employee/calendar" element={<Placeholder title="Company Calendar" />} />
            <Route path="employee/payslips" element={<MyPayslips />} />
            <Route path="employee/documents" element={<MyDocuments />} />
            <Route path="employee/requests" element={<Placeholder title="My Requests" />} />
            <Route path="employee/directory" element={<EmployeeDirectory />} />
            <Route path="employee/ai" element={<AiAssistantPage />} />
            <Route path="employee/announcements" element={<Announcements />} />
            <Route path="employee/settings" element={<MySettings />} />
            <Route path="employee/more" element={<More />} />
          </Route>
          
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
