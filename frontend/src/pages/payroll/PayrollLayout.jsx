import React from 'react';
import { Outlet } from 'react-router-dom';
import './PayrollLayout.css';

export default function PayrollLayout() {
  return (
    <div className="payroll-v2-container" style={{ padding: 0 }}>
      <Outlet />
    </div>
  );
}
