/**
 * EmployeeContext
 *
 * Provides a single shared data layer for all Employee Portal pages.
 * Avoids each page making the same API calls independently.
 *
 * Data sourced here:
 *   - Employee record (from /employees/:id using auth middleware employee_id)
 *   - Today's attendance status (check-in/out times)
 *   - Leave balances
 *   - Current shift assignment
 *   - Unread notification count
 *   - Next upcoming holiday
 *
 * Pages that need additional data (e.g. full attendance history) fetch
 * it locally — this context only carries the lightweight "always-needed" state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { employeePortalApi } from '../services/employeePortalApi';

export const EmployeeContext = createContext(null);

// ─── Static mock payloads (used when backend endpoint doesn't exist yet) ──────
const MOCK_TODAY_ATTENDANCE = {
  status: null,           // null | 'checked_in' | 'checked_out' | 'absent' | 'leave'
  checkInTime: null,      // ISO string
  checkOutTime: null,
  workDurationMinutes: 0,
  isLate: false,
  lateMinutes: 0,
  date: new Date().toISOString().split('T')[0],
};

const MOCK_LEAVE_BALANCE = [
  { id: 1, name: 'Casual Leave',   code: 'CL', allocated: 12, used: 4,  balance: 8,  color: '#3b82f6' },
  { id: 2, name: 'Sick Leave',     code: 'SL', allocated: 10, used: 5,  balance: 5,  color: '#10b981' },
  { id: 3, name: 'Earned Leave',   code: 'EL', allocated: 15, used: 0,  balance: 15, color: '#f59e0b' },
  { id: 4, name: 'Emergency Leave',code: 'EM', allocated: 2,  used: 0,  balance: 2,  color: '#ef4444' },
];

const MOCK_SHIFT = {
  id: 1,
  name: 'General Shift',
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
};

const MOCK_NEXT_HOLIDAY = {
  name: 'Gandhi Jayanti',
  date: '2026-10-02',
  dayName: 'Friday',
  daysAway: null, // computed below
};

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Leave Request Approved',
    message: 'Your casual leave for Sep 15–17 has been approved.',
    type: 'leave',
    isRead: false,
    actionUrl: '/app/employee/leave',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    title: 'Payslip Available',
    message: 'Your August 2026 payslip is now ready.',
    type: 'payslip',
    isRead: false,
    actionUrl: '/app/employee/payslips',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Helper: compute days away for a given date string ─────────────────────
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const EmployeeProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(MOCK_TODAY_ATTENDANCE);
  const [leaveBalance, setLeaveBalance] = useState(MOCK_LEAVE_BALANCE);
  const [shift, setShift] = useState(MOCK_SHIFT);
  const [nextHoliday, setNextHoliday] = useState({
    ...MOCK_NEXT_HOLIDAY,
    daysAway: daysUntil(MOCK_NEXT_HOLIDAY.date),
  });
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(1);
  const [loading, setLoading] = useState(true);

  // Derived
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ─── Load employee record ─────────────────────────────────────────────────
  const loadEmployeeRecord = useCallback(async () => {
    if (!user?.employee_id) return;
    try {
      const res = await employeePortalApi.getMyEmployee(user.employee_id);
      if (res.data?.success) setEmployeeRecord(res.data.data.employee);
    } catch (_) {
      // employee_id may be null for admin users; silently ignore
    }
  }, [user]);

  // ─── Load today's attendance ──────────────────────────────────────────────
  const loadTodayAttendance = useCallback(async () => {
    try {
      const res = await employeePortalApi.getTodayAttendance();
      if (res.data?.success) setTodayAttendance(res.data.data);
    } catch (_) {
      // [BACKEND REQUIRED] – keep mock
    }
  }, []);

  // ─── Load leave balance ───────────────────────────────────────────────────
  const loadLeaveBalance = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyLeaveBalance();
      if (res.data?.success) setLeaveBalance(res.data.data);
    } catch (_) {
      // [BACKEND REQUIRED] – keep mock
    }
  }, []);

  // ─── Load shift ───────────────────────────────────────────────────────────
  const loadShift = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyShift();
      if (res.data?.success) setShift(res.data.data);
    } catch (_) {
      // [BACKEND REQUIRED] – keep mock
    }
  }, []);

  // ─── Load notifications ───────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyNotifications();
      if (res.data?.success) setNotifications(res.data.data);
    } catch (_) {
      // [BACKEND REQUIRED] – keep mock
    }
  }, []);

  // ─── Load next holiday ────────────────────────────────────────────────────
  const loadNextHoliday = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await employeePortalApi.getHolidays({ limit: 1, after: today });
      if (res.data?.success && res.data.data?.length > 0) {
        const h = res.data.data[0];
        setNextHoliday({
          name: h.name,
          date: h.holiday_date,
          dayName: new Date(h.holiday_date).toLocaleDateString('en-US', { weekday: 'long' }),
          daysAway: daysUntil(h.holiday_date),
        });
      }
    } catch (_) {
      // keep mock
    }
  }, []);

  // ─── Load latest payslip ──────────────────────────────────────────────────
  const loadLatestPayslip = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyPayslips({ limit: 1 });
      if (res.data?.success && res.data.data?.length > 0) {
        setLatestPayslip(res.data.data[0]);
      }
    } catch (_) {
      // [BACKEND REQUIRED]
    }
  }, []);

  // ─── Check-in action (called by Dashboard / Attendance pages) ────────────
  const checkIn = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await employeePortalApi.checkIn({ timestamp: now });
      setTodayAttendance((prev) => ({
        ...prev,
        status: 'checked_in',
        checkInTime: now,
      }));
      return { success: true, time: now };
    } catch (err) {
      // [BACKEND REQUIRED] – optimistic local update
      const now = new Date().toISOString();
      setTodayAttendance((prev) => ({
        ...prev,
        status: 'checked_in',
        checkInTime: now,
      }));
      return { success: true, time: now, mock: true };
    }
  }, []);

  // ─── Check-out action ────────────────────────────────────────────────────
  const checkOut = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await employeePortalApi.checkOut({ timestamp: now });
      setTodayAttendance((prev) => {
        const inTime = prev.checkInTime ? new Date(prev.checkInTime) : null;
        const outTime = new Date(now);
        const mins = inTime ? Math.round((outTime - inTime) / 60000) : 0;
        return {
          ...prev,
          status: 'checked_out',
          checkOutTime: now,
          workDurationMinutes: mins,
        };
      });
      return { success: true, time: now };
    } catch (err) {
      const now = new Date().toISOString();
      setTodayAttendance((prev) => {
        const inTime = prev.checkInTime ? new Date(prev.checkInTime) : null;
        const outTime = new Date(now);
        const mins = inTime ? Math.round((outTime - inTime) / 60000) : 0;
        return {
          ...prev,
          status: 'checked_out',
          checkOutTime: now,
          workDurationMinutes: mins,
        };
      });
      return { success: true, time: now, mock: true };
    }
  }, []);

  // ─── Mark notification read ───────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await employeePortalApi.markNotificationRead(id);
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await employeePortalApi.markAllNotificationsRead();
    } catch (_) {}
  }, []);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const isEmployee =
      user.roles.includes('EMPLOYEE') &&
      !user.roles.includes('ORG_ADMIN') &&
      !user.roles.includes('HR_ADMIN');
    if (!isEmployee) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await Promise.allSettled([
        loadEmployeeRecord(),
        loadTodayAttendance(),
        loadLeaveBalance(),
        loadShift(),
        loadNotifications(),
        loadNextHoliday(),
        loadLatestPayslip(),
      ]);
      setLoading(false);
    })();
  }, [user]);

  const value = {
    // Data
    employeeRecord,
    todayAttendance,
    leaveBalance,
    shift,
    nextHoliday,
    notifications,
    unreadCount,
    latestPayslip,
    pendingRequestsCount,
    loading,
    // Actions
    checkIn,
    checkOut,
    markRead,
    markAllRead,
    // Refresh individual slices
    refreshAttendance: loadTodayAttendance,
    refreshLeaveBalance: loadLeaveBalance,
    refreshNotifications: loadNotifications,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

/** Convenience hook */
export const useEmployee = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used inside <EmployeeProvider>');
  return ctx;
};
