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
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  }
};

export default Topbar;
