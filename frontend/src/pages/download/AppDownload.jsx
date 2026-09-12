import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Smartphone, Download, CheckCircle, ArrowRight, Share2, 
  PlusSquare, MoreVertical, ShieldCheck, Clock, FileText, 
  Sparkles, ExternalLink, Laptop, Apple
} from 'lucide-react';
import '../../styles/components.css';

export default function AppDownload() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState('auto'); // 'android' | 'ios' | 'desktop'
  const [detectedOS, setDetectedOS] = useState('unknown');

  useEffect(() => {
    // 1. Detect OS
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDetectedOS('ios');
      setActiveTab('ios');
    } else if (/android/i.test(userAgent)) {
      setDetectedOS('android');
      setActiveTab('android');
    } else {
      setDetectedOS('desktop');
      setActiveTab('desktop');
    }

    // 2. Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    // 3. Listen for PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install, use the browser menu (⋮ in Chrome or Share in Safari) and select "Add to Home Screen" or "Install App".');
      return;
    }
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Container */}
      <div style={{ width: '100%', maxWidth: '580px', margin: '0 auto' }}>

        {/* Top Header Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '36px 24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {/* Logo Badge */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            backgroundColor: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
          }}>
            <Smartphone size={36} />
          </div>

          <div style={{
            display: 'inline-block',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            marginBottom: '12px',
            border: '1px solid #bfdbfe'
          }}>
            JATTA M KOMMERCE
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', color: '#0f172a' }}>
            JMK HRMS Mobile App
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 auto 24px', lineHeight: 1.6, maxWidth: '440px' }}>
            Install our lightweight, mobile-first employee portal on your smartphone for 1-tap daily attendance, leaves, payslips, and self-service.
          </p>

          {/* Direct Native Install Button (if browser supports PWA prompt) */}
          {deferredPrompt && !isInstalled && (
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleInstallClick}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                }}
              >
                <Download size={20} />
                Install JMK HRMS App Now
              </button>
            </div>
          )}

          {isInstalled && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <CheckCircle size={18} color="#10b981" />
              JMK HRMS is installed on this device!
            </div>
          )}

          {/* Quick Portal Access Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              Open Web Portal <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/activate')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
            >
              Activate Account
            </button>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#e2e8f0',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'android' ? '#ffffff' : 'transparent',
              color: activeTab === 'android' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'android' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={16} /> Android
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'ios' ? '#ffffff' : 'transparent',
              color: activeTab === 'ios' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'ios' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Apple size={16} /> iPhone / iOS
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'desktop' ? '#ffffff' : 'transparent',
              color: activeTab === 'desktop' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'desktop' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Laptop size={16} /> Laptop / PC
          </button>
        </div>

        {/* Step-by-Step Instructions Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          marginBottom: '24px'
        }}>
          {activeTab === 'android' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>How to Install on Android</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Open <strong>Google Chrome</strong> on your Android smartphone and make sure you are on this HRMS link.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Tap the <strong>three vertical dots (⋮)</strong> in the top-right corner of Chrome.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong> from the menu.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Confirm by tapping <strong>Install</strong>. The JMK HRMS icon will appear directly on your home screen!
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Apple size={20} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>How to Install on iPhone / iPad</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Open this page in <strong>Safari</strong> on your iPhone or iPad.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Tap the <strong>Share button</strong> (the square icon with an arrow pointing up <Share2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />) at the bottom toolbar.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong> (<PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Tap <strong>"Add"</strong> in the top-right corner. You can now launch JMK HRMS like a native app without browser bars!
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Laptop size={20} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>How to Install on Laptop / Desktop</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Open this portal in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Look at the right side of the address bar at the top: click the <strong>Install icon (⊕)</strong> or open the browser menu (⋮).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#334155' }}>
                    Click <strong>Install</strong>. JMK HRMS will launch in its own standalone window and appear in your Applications / Start Menu!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Highlight */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            What you can do in the Mobile App:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <Clock size={16} color="#2563eb" /> Quick Clock-In / Out
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <FileText size={16} color="#2563eb" /> Monthly Payslips (PDF)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <Sparkles size={16} color="#2563eb" /> 1-Tap Leave Requests
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <ShieldCheck size={16} color="#2563eb" /> Company Directory & ID
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          &copy; {new Date().getFullYear()} Jatta M Kommerce. All rights reserved.
        </div>

      </div>
    </div>
  );
}
