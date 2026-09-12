/**
 * EmployeeContext
 *
 * Provides a single live shared data layer for all Employee Portal pages.
 * Directly backed by database APIs via /api/employee endpoints.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { employeePortalApi } from '../services/employeePortalApi';
import { Outlet } from 'react-router-dom';

export const EmployeeContext = createContext(null);

export const EmployeeProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [shift, setShift] = useState(null);
  const [nextHoliday, setNextHoliday] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Derived unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Load aggregated dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      const res = await employeePortalApi.getDashboard();
      if (res.data?.success) {
        const d = res.data.data;
        setTodayAttendance(d.todayAttendance);
        setLeaveBalance(d.leaveBalances || []);
        setShift(d.shift);
        setNextHoliday(d.nextHoliday);
        setAnnouncements(d.announcements || []);
        setLatestPayslip(d.latestPayslip);
        setPendingRequestsCount(d.pendingLeavesCount || 0);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  // Load employee profile
  const loadEmployeeProfile = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyProfile();
      if (res.data?.success) {
        setEmployeeRecord(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load employee profile:', err);
    }
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyNotifications();
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  // Today's attendance refresh
  const loadTodayAttendance = useCallback(async () => {
    try {
      const res = await employeePortalApi.getTodayAttendance();
      if (res.data?.success) {
        setTodayAttendance(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    }
  }, []);

  // Leave balance refresh
  const loadLeaveBalance = useCallback(async () => {
    try {
      const res = await employeePortalApi.getMyLeaveBalance();
      if (res.data?.success) {
        setLeaveBalance(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load leave balance:', err);
    }
  }, []);

  // Check-in action
  const checkIn = useCallback(async (source = 'mobile') => {
    try {
      const now = new Date().toISOString();
      const res = await employeePortalApi.checkIn({ timestamp: now, source });
      if (res.data?.success) {
        setTodayAttendance(res.data.data);
      }
      return res.data;
    } catch (err) {
      console.error('Check-in failed:', err);
      throw err;
    }
  }, []);

  // Check-out action
  const checkOut = useCallback(async (source = 'mobile') => {
    try {
      const now = new Date().toISOString();
      const res = await employeePortalApi.checkOut({ timestamp: now, source });
      if (res.data?.success) {
        setTodayAttendance(res.data.data);
      }
      return res.data;
    } catch (err) {
      console.error('Check-out failed:', err);
      throw err;
    }
  }, []);

  // Mark notification read
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await employeePortalApi.markNotificationRead(id);
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await employeePortalApi.markAllNotificationsRead();
    } catch (_) {}
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;
    const isEmployee = user.roles && user.roles.includes('EMPLOYEE');
    if (!isEmployee) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      await Promise.allSettled([
        loadDashboardData(),
        loadEmployeeProfile(),
        loadNotifications()
      ]);
      setLoading(false);
    })();
  }, [user, loadDashboardData, loadEmployeeProfile, loadNotifications]);

  const value = {
    employeeRecord,
    todayAttendance,
    leaveBalance,
    shift,
    nextHoliday,
    announcements,
    notifications,
    unreadCount,
    latestPayslip,
    pendingRequestsCount,
    loading,
    checkIn,
    checkOut,
    markRead,
    markAllRead,
    refreshDashboard: loadDashboardData,
    refreshAttendance: loadTodayAttendance,
    refreshLeaveBalance: loadLeaveBalance,
    refreshProfile: loadEmployeeProfile,
    refreshNotifications: loadNotifications,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children || <Outlet />}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used inside <EmployeeProvider>');
  return ctx;
};
