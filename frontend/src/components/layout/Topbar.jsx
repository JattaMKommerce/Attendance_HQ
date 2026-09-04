import React, { useContext } from 'react';
import { Menu, Bell, Search, LogOut, User } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const Topbar = ({ toggleMobileSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="icon-btn" 
          onClick={toggleMobileSidebar}
          style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
        >
          <Menu size={20} />
        </button>
        
        {/* Placeholder Global Search Trigger */}
        <div className="search-trigger" style={styles.searchTrigger}>
          <Search size={16} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Search...</span>
          <span style={styles.searchShortcut}>⌘K</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Organization Badge if applicable */}
        {user.organization && (
          <div style={styles.orgBadge}>
            {user.organization.name}
          </div>
        )}
        
        <button className="icon-btn" title="Notifications">
          <Bell size={18} />
        </button>
        
        <div style={styles.profileMenu}>
          <div style={styles.avatar}>
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div style={styles.profileDropdown}>
             <button className="icon-btn" onClick={logout} title="Logout">
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const styles = {
  searchTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-surface-hover)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    width: '240px',
  },
  searchShortcut: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-surface)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid var(--border)'
  },
  orgBadge: {
    fontSize: '12px',
    fontWeight: '500',
    padding: '4px 8px',
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent-hover)',
    borderRadius: 'var(--radius-sm)'
  },
  profileMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  profileDropdown: {
    display: 'flex'
  }
};

export default Topbar;
