import React, { useContext, useState, useEffect } from 'react';
import { Menu, Bell, Search, LogOut, User, ScanLine, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { AuthContext } from '../../context/AuthContext';
import AiCommandModal from '../ai/AiCommandModal';

const Topbar = ({ toggleMobileSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const [showScanner, setShowScanner] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const navigate = useNavigate();

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

  if (!user) return null;

  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const scannedValue = detectedCodes[0].rawValue;
      if (scannedValue) {
        setShowScanner(false);
        // If it's a URL within the same origin, navigate to the path
        if (scannedValue.startsWith(window.location.origin)) {
          const path = scannedValue.replace(window.location.origin, '');
          navigate(path);
        } else {
          // External URL (fallback)
          window.location.href = scannedValue;
        }
      }
    }
  };

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
        
        {/* Global AI Command Trigger */}
        <div className="search-trigger" style={styles.searchTrigger} onClick={() => setShowAiModal(true)}>
          <Sparkles size={16} color="var(--accent-hover)" />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ask AI Assistant...</span>
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

        <button 
          className="icon-btn" 
          title="AI Assistant (⌘K)" 
          onClick={() => setShowAiModal(true)}
          style={{ color: 'var(--accent-hover)', background: 'var(--bg-surface-hover)' }}
        >
          <Sparkles size={18} />
        </button>
        
        <button className="icon-btn" title="Scan ID Card QR" onClick={() => setShowScanner(true)}>
          <ScanLine size={18} />
        </button>
        
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

      {/* Global AI Command Palette Modal */}
      <AiCommandModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />

      {showScanner && (
        <div style={styles.modalOverlay} onClick={() => setShowScanner(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Scan Employee ID</h3>
              <button className="icon-btn" onClick={() => setShowScanner(false)}>✕</button>
            </div>
            <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
              <Scanner onScan={handleScan} onError={(error) => console.log(error?.message)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const styles = {
  searchTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '7px 14px',
    borderRadius: '12px',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    cursor: 'pointer',
    width: '250px',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
  },
  searchShortcut: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: '2px 7px',
    borderRadius: '6px',
    border: '1px solid rgba(226, 232, 240, 0.8)'
  },
  orgBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    color: '#2563eb',
    border: '1px solid rgba(37, 99, 235, 0.18)',
    borderRadius: '20px'
  },
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
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1.5px solid rgba(255, 255, 255, 0.85)',
    padding: '24px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
  }
};

export default Topbar;
