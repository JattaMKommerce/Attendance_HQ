/**
 * EmployeeShell
 *
 * Wraps the Employee Portal with its own EmployeeProvider context.
 * Reuses the existing AppShell (Sidebar + Topbar + Outlet) without
 * modifying it — we simply surround it with the provider.
 */

import React from 'react';
import { EmployeeProvider } from '../../context/EmployeeContext';
import AppShell from './AppShell';

const EmployeeShell = () => (
  <EmployeeProvider>
    <AppShell />
  </EmployeeProvider>
);

export default EmployeeShell;
