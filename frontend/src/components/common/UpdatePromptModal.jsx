import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone, Download, Sparkles, X, ArrowRight } from 'lucide-react';
import api from '../../services/api';

// Current local container build code embedded in this web release
const CURRENT_APP_BUILD_CODE = 2;

export default function UpdatePromptModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check session storage so user isn't spammed after dismissing once in current session
    const isDismissed = sessionStorage.getItem('jmk_update_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
      return;
    }

    const checkAppVersion = async () => {
      try {
        const res = await api.get('/app-version');
        if (res.data?.success && res.data.latestVersionCode > CURRENT_APP_BUILD_CODE) {
          setUpdateInfo(res.data);
        }
      } catch (err) {
        // Silent fail if offline or unreachable
      }
    };

    checkAppVersion();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('jmk_update_dismissed', 'true');
  };

  const handleUpdateClick = () => {
    const apkUrl = updateInfo?.apkUrl || 'https://hrms.jattamkommerce.com/jmk-hrms.apk';
    window.open(apkUrl, '_system');
  };

  const isNative = typeof window !== 'undefined' && (
    Boolean(window.Capacitor?.isNativePlatform?.()) || 
    (window.location.hostname === 'localhost' && !window.location.port)
  );
  const isAppRoute = location.pathname.startsWith('/app') || location.pathname.startsWith('/platform');

  // Do not pop up on public landing page or public website when viewing in a browser
  if (!isNative && !isAppRoute) {
    return null;
  }

  if (!updateInfo || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '440px',
        borderRadius: '24px',
        padding: '28px 24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        textAlign: 'center',
        position: 'relative',
        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close / Later Button */}
        {!updateInfo.forceUpdate && (
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
            title="Dismiss"
          >
            <X size={18} />
          </button>
        )}

        {/* Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)'
        }}>
          <Sparkles size={32} />
        </div>

        {/* Title & Version Pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            App Update Available
          </h3>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            borderRadius: '12px'
          }}>
            v{updateInfo.latestVersion || '1.0.3'}
          </span>
        </div>

        {/* Release Notes / Description */}
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          lineHeight: '1.5',
          margin: '0 0 20px 0'
        }}>
          {updateInfo.releaseNotes || 'A new update with performance speedups, new launcher icons, and social feed enhancements is ready for download.'}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleUpdateClick}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={18} />
            <span>Update Now</span>
            <ArrowRight size={16} />
          </button>

          {!updateInfo.forceUpdate && (
            <button
              onClick={handleDismiss}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Remind Me Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
