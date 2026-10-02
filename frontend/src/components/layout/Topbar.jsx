import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Menu, Bell, Search, LogOut, User, Sparkles, 
  Calendar, Clock, IndianRupee, UserPlus, CheckCircle2, 
  X, ChevronRight, AlertCircle, ShieldAlert, ArrowLeft,
  Moon, Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AiCommandModal from '../ai/AiCommandModal';
import { leaveApi } from '../../services/leaveApi';
import { attendanceApi } from '../../services/attendanceApi';

const Topbar = ({ toggleMobileSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [rawNotifications, setRawNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jmk_dismissed_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Dark / Light Theme state with local persistence
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('jmk_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('jmk_theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('jmk_theme', 'light');
      }
    } catch (e) {
      console.warn('Failed to update theme storage', e);
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Helper to format live India Time and Date (IST, UTC+5:30)
  const getIndiaDateTime = () => {
    const now = new Date();
    const dOpts = { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    const rawDate = now.toLocaleDateString('en-GB', dOpts).replace(/Sept/g, 'Sep');
    const rawTime = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return { dateFormatted: rawDate, timeFormatted: rawTime };
  };

  const [indiaDateTime, setIndiaDateTime] = useState(getIndiaDateTime);

  // Auto-update India Time & Date every second
  useEffect(() => {
    const timer = setInterval(() => {
      setIndiaDateTime(getIndiaDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset expansion when closing notifications
  useEffect(() => {
    if (!showNotifications) {
      setShowAllNotifications(false);
    }
  }, [showNotifications]);

  // Keyboard shortcut ⌘K for Stella AI
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAiModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Fetch actionable notifications from backend
  useEffect(() => {
    let isMounted = true;
    const todayStr = new Date().toISOString().split('T')[0];

    const loadActionItems = async () => {
      try {
        const [leavesRes, attRes] = await Promise.allSettled([
          leaveApi.getRequests({ status: 'pending' }),
          attendanceApi.getRecords({ date: todayStr })
        ]);

        const items = [];

        // 1. Specific Pending Leave Requests with Direct Deep Linking
        if (leavesRes.status === 'fulfilled') {
          const reqs = leavesRes.value?.data?.data || leavesRes.value?.data || [];
          if (Array.isArray(reqs)) {
            reqs.forEach((r) => {
              const empName = `${r.first_name || 'Employee'} ${r.last_name || ''}`.trim();
              items.push({
                id: `leave-${r.id}`,
                app: 'JMK Leave',
                icon: Calendar,
                iconBg: '#d97706',
                title: `Leave Request: ${empName}`,
                desc: `${r.leave_type || 'Casual'} leave requested (${r.start_date ? new Date(r.start_date).toLocaleDateString() : 'Upcoming'}). Reason: "${r.reason || 'Personal'}"`,
                time: 'Pending Review',
                actionLabel: 'Review',
                actionPath: `/app/leave?tab=requests&requestId=${r.id}&employee=${encodeURIComponent(empName)}`
              });
            });
          }
        }

        // 2. Specific Late Attendance Punch-ins with Filtered View
        if (attRes.status === 'fulfilled') {
          const records = attRes.value?.data?.data || attRes.value?.data || [];
          if (Array.isArray(records)) {
            const lateRecs = records.filter(rec => (rec.status === 'late' || (rec.late_minutes && rec.late_minutes > 0)));
            lateRecs.slice(0, 8).forEach((rec) => {
              const formatTime = (dt) => {
                if (!dt) return 'Late check-in';
                try {
                  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                } catch {
                  return 'Late check-in';
                }
              };
              const empName = `${rec.first_name} ${rec.last_name}`.trim();

              items.push({
                id: `late-${rec.employee_id || rec.id}`,
                app: 'JMK Attendance',
                icon: Clock,
                iconBg: '#ea580c',
                title: `Late Punch: ${empName}`,
                desc: `Checked in at ${formatTime(rec.check_in_time)} (${rec.late_minutes ? `${rec.late_minutes}m late` : 'After cutoff'}). Regularization may be required.`,
                time: 'Today',
                actionLabel: 'View Log',
                actionPath: `/app/attendance?date=${todayStr}&status=late&search=${encodeURIComponent(empName)}&employeeId=${rec.employee_id}`
              });
            });
          }
        }

        if (isMounted) {
          setRawNotifications(items);
        }
      } catch (err) {
        console.warn('Notification fetch warning:', err);
      }
    };

    loadActionItems();
    return () => { isMounted = false; };
  }, []);

  // Filter active notifications
  const activeNotifications = useMemo(() => {
    return rawNotifications.filter(n => !dismissedIds.includes(n.id));
  }, [rawNotifications, dismissedIds]);

  const unreadCount = activeNotifications.length;

  const handleDismiss = (id, e) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('jmk_dismissed_notifs', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = () => {
    const allIds = rawNotifications.map(n => n.id);
    setDismissedIds(allIds);
    try {
      localStorage.setItem('jmk_dismissed_notifs', JSON.stringify(allIds));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = (item, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Dismiss item from notification list
    handleDismiss(item.id);
    // Close notification dropdown
    setShowNotifications(false);
    // Redirect user to the corresponding operational view
    if (item.actionPath) {
      navigate(item.actionPath);
    }
  };

  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="icon-btn topbar-mobile-menu-btn" 
          onClick={toggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <button 
          type="button"
          className="topbar-back-btn" 
          onClick={() => navigate(-1)}
          title="Go back to previous page"
          aria-label="Go back"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        
        {/* Live Auto-Updating India Time & Date Widget */}
        <div className="topbar-india-time" title="Current Live Indian Standard Time (IST, UTC+5:30)">
          <span className="india-time-indicator"></span>
          <Calendar size={14} className="india-time-icon" />
          <span className="india-date-text">{indiaDateTime.dateFormatted}</span>
          <span className="india-time-divider">|</span>
          <Clock size={14} className="india-time-icon" />
          <span className="india-time-text">{indiaDateTime.timeFormatted}</span>
          <span className="india-tz-pill">IST</span>
        </div>
      </div>

      <div className="topbar-right" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }} ref={notifRef}>
        {/* Dark / Light Mode Toggle Button */}
        <button 
          type="button"
          className="icon-btn topbar-theme-btn" 
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          onClick={toggleTheme}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg-surface, #ffffff)',
            color: isDark ? '#fbbf24' : '#64748b',
            transition: 'all 0.2s ease'
          }}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Actionable Notification Center Trigger with Gmail-style Badge */}
        <button 
          className="icon-btn topbar-notif-btn" 
          title="Actionable Notifications" 
          onClick={() => setShowNotifications(prev => !prev)}
          style={{ 
            position: 'relative',
            backgroundColor: showNotifications ? 'rgba(255, 255, 255, 0.95)' : undefined,
            borderColor: showNotifications ? 'rgba(37, 99, 235, 0.4)' : undefined
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="gmail-notif-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* iPhone-style Frosted Glass Notification Bar / Center */}
        {showNotifications && (
          <div className="ios-notif-bar">
            {/* iOS Bar Header */}
            <div className="ios-notif-header">
              <div className="ios-notif-title-group">
                <span className="ios-notif-title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ios-notif-count-pill">{unreadCount} pending</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button className="ios-notif-clear-btn" onClick={handleClearAll}>
                  Clear All
                </button>
              )}
            </div>

            {/* iOS Stacked Notification Cards */}
            <div className="ios-notif-body">
              {activeNotifications.length > 0 ? (
                <>
                  {(showAllNotifications ? activeNotifications : activeNotifications.slice(0, 6)).map((item) => {
                    const IconComp = item.icon || AlertCircle;
                    return (
                      <div 
                        key={item.id} 
                        className="ios-notif-card"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleAction(item, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleAction(item, e);
                          }
                        }}
                      >
                        <div className="ios-card-top">
                          <div className="ios-card-app">
                            <div 
                              className="ios-card-app-icon" 
                              style={{ backgroundColor: item.iconBg || '#2563eb' }}
                            >
                              <IconComp size={11} color="#ffffff" />
                            </div>
                            <span className="ios-card-app-name">{item.app}</span>
                          </div>
                          <span className="ios-card-time">{item.time}</span>
                        </div>

                        <div className="ios-card-content">
                          <div className="ios-card-title">{item.title}</div>
                          <div className="ios-card-desc">{item.desc}</div>
                        </div>

                        <div className="ios-card-actions">
                          <button 
                            type="button"
                            className="ios-action-primary"
                            onClick={(e) => handleAction(item, e)}
                          >
                            <span>{item.actionLabel}</span>
                            <ChevronRight size={13} />
                          </button>
                          <button 
                            type="button"
                            className="ios-action-dismiss" 
                            title="Dismiss notification"
                            onClick={(e) => handleDismiss(item.id, e)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {activeNotifications.length > 6 && (
                    <button 
                      type="button"
                      className="ios-notif-footer-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowAllNotifications(prev => !prev);
                      }}
                    >
                      {showAllNotifications ? 'Show Less' : 'More'}
                    </button>
                  )}
                </>
              ) : (
                <div className="ios-notif-empty">
                  <CheckCircle2 size={38} color="#10b981" />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    All Caught Up!
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    No pending employee requests or attendance alerts right now.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Initial Avatar & Logout Button */}
        <div style={styles.profileMenu}>
          <div 
            style={styles.avatar} 
            title={`${user?.name || user?.email || 'User'}`}
            onClick={() => navigate(user?.roles?.includes('EMPLOYEE') && !user?.roles?.includes('ORG_ADMIN') ? '/app/employee/profile' : '/app/dashboard')}
          >
            {(user?.first_name?.charAt(0) || user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
          </div>
          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Global AI Command Palette Modal */}
      <AiCommandModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
    </header>
  );
};

const styles = {
  profileMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.22)'
  },
  profileDropdown: {
    display: 'flex'
  }
};

export default Topbar;
