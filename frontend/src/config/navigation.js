import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Umbrella,
  IndianRupee,
  UserPlus,
  Briefcase,
  Target,
  Gift,
  Monitor,
  Receipt,
  FileText,
  Bot,
  Zap,
  BarChart3,
  Settings,
  Building,
  CreditCard,
  Package,
  Activity,
  Shield,
  History,
  User,
  Clock,
  Bell,
  ClipboardList,
  CalendarDays,
  CreditCard as IdCard,
  MessageSquare,
  Layers,
  TrendingDown,
  AlertTriangle,
  UserCheck,
  HeartHandshake,
  LogOut,
  Banknote,
  Megaphone,
} from 'lucide-react';

// ── Employee Portal Navigation ─────────────────────────────────────────────
export const employeeNavigation = [
  {
    group: 'My Workspace',
    items: [
      { label: 'Dashboard',        path: '/app/employee/dashboard',    icon: LayoutDashboard, roles: ['EMPLOYEE'] },
      { label: 'JMK Social',       path: '/app/social',                icon: MessageSquare,   roles: ['EMPLOYEE'] },
      { label: 'Stella AI',        path: '/app/employee/ai',           icon: Bot,             roles: ['EMPLOYEE'] },
      { label: 'My Attendance',    path: '/app/employee/attendance',   icon: Clock,           roles: ['EMPLOYEE'] },
      { label: 'My Leave',         path: '/app/employee/leave',        icon: Umbrella,        roles: ['EMPLOYEE'] },
      { label: 'My Payslips',      path: '/app/employee/payslips',     icon: IndianRupee,      roles: ['EMPLOYEE'] },
      { label: 'My Documents',     path: '/app/employee/documents',    icon: FileText,        roles: ['EMPLOYEE'] },
      { label: 'Announcements',    path: '/app/employee/announcements',icon: Megaphone,       roles: ['EMPLOYEE'] },
      { label: 'My Shift & Roster',path: '/app/employee/roster',       icon: CalendarDays,    roles: ['EMPLOYEE'] },
      { label: 'Company Calendar', path: '/app/employee/calendar',     icon: Calendar,        roles: ['EMPLOYEE'] },
    ],
  },
  {
    group: 'My Information',
    items: [
      { label: 'My Profile',       path: '/app/employee/profile',      icon: User,            roles: ['EMPLOYEE'] },
      { label: 'Directory',        path: '/app/employee/directory',    icon: Users,           roles: ['EMPLOYEE'] },
      { label: 'Notifications',    path: '/app/employee/notifications',icon: Bell,            roles: ['EMPLOYEE'] },
      { label: 'Settings',         path: '/app/employee/settings',     icon: Settings,        roles: ['EMPLOYEE'] },
    ],
  },
];

export const organizationNavigation = [
  {
    group: 'Workspace',
    items: [
      { label: 'Dashboard',    path: '/app/dashboard',   icon: LayoutDashboard, roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'PAYROLL_MANAGER', 'FINANCE'] },
      { label: 'JMK Social',   path: '/app/social',      icon: MessageSquare,   roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'PAYROLL_MANAGER', 'FINANCE'] },
      { label: 'Stella AI',    path: '/app/ai',          icon: Bot,             roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'] },
      { label: 'Onboarding',   path: '/app/employees',   icon: Users,           roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { label: 'Attendance',   path: '/app/attendance',  icon: Calendar,        roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    ]
  },
  {
    group: 'Management',
    items: [
      { label: 'Payroll',     path: '/app/payroll',     icon: IndianRupee, roles: ['ORG_ADMIN', 'PAYROLL_MANAGER', 'FINANCE'] },
    ]
  },
  {
    group: 'Employee Lifecycle',
    items: [
      { label: 'Probation',           path: '/app/lifecycle/probation',  icon: UserCheck,      roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { label: 'Performance & PIP',   path: '/app/lifecycle/performance',icon: TrendingDown,   roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { label: 'Employee Actions',    path: '/app/lifecycle/actions',    icon: Layers,         roles: ['ORG_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { label: 'Employee Relations',  path: '/app/lifecycle/relations',  icon: AlertTriangle,  roles: ['ORG_ADMIN', 'HR_ADMIN'] },
      { label: 'Separation',          path: '/app/lifecycle/separation', icon: LogOut,         roles: ['ORG_ADMIN', 'HR_ADMIN'] },
      { label: 'Full & Final Settlement', path: '/app/lifecycle/settlement', icon: Banknote,   roles: ['ORG_ADMIN', 'HR_ADMIN', 'FINANCE'] },
    ]
  },
  {
    group: 'Operations',
    items: [
      { label: 'Asset Management', path: '/app/assets',       icon: Monitor,    roles: ['ORG_ADMIN', 'HR_ADMIN'] },
      { label: 'Offboarding',      path: '/app/offboarding',  icon: Briefcase,  roles: ['ORG_ADMIN', 'HR_ADMIN'] },
    ]
  }
];

export const platformNavigation = [
  {
    group: 'Platform',
    items: [
      { label: 'Overview', path: '/platform/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
      { label: 'Organizations', path: '/platform/organizations', icon: Building, roles: ['SUPER_ADMIN'] },
      { label: 'Subscriptions', path: '/platform/subscriptions', icon: CreditCard, roles: ['SUPER_ADMIN'] },
      { label: 'Payments', path: '/platform/payments', icon: IndianRupee, roles: ['SUPER_ADMIN'] },
      { label: 'Plans', path: '/platform/plans', icon: Package, roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    group: 'Operations',
    items: [
      { label: 'Feature Management', path: '/platform/features', icon: Shield, roles: ['SUPER_ADMIN'] },
      { label: 'AI Usage', path: '/platform/ai-usage', icon: Bot, roles: ['SUPER_ADMIN'] },
      { label: 'System Health', path: '/platform/health', icon: Activity, roles: ['SUPER_ADMIN'] },
      { label: 'Audit Logs', path: '/platform/audit', icon: History, roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    group: 'System',
    items: [
      { label: 'Settings', path: '/platform/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
    ]
  }
];

export const filterNavigationByRole = (navigationMap, userRoles) => {
  return navigationMap.map(group => {
    const filteredItems = group.items.filter(item => 
      item.roles.some(role => userRoles.includes(role))
    );
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);
};
