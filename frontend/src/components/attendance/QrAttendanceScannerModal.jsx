import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, QrCode, CheckCircle2, AlertCircle, Camera, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import employeePortalApi from '../../services/employeePortalApi';
import './QrAttendanceScannerModal.css';

export default function QrAttendanceScannerModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  isCheckedIn = false,
  isCheckedOut = false,
  employee
}) {
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const cameraBoxRef = useRef(null);

  // Auto-play enforcement: keep video active and eliminate mobile play button pause
  useEffect(() => {
    if (!isOpen) return;

    const playWatcher = setInterval(() => {
      if (cameraBoxRef.current) {
        const video = cameraBoxRef.current.querySelector('video');
        if (video) {
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          if (video.paused) {
            video.play().catch(() => {});
          }
        }
      }
    }, 250);

    return () => clearInterval(playWatcher);
  }, [isOpen]);

  if (!isOpen) return null;

  const requestPermissionManually = async () => {
    try {
      setHasPermissionError(false);
      setScanError(null);
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        // Release track so react-qr-scanner can bind cleanly
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      console.warn('Manual camera permission check:', err);
      setHasPermissionError(true);
      setScanError('Camera permission was blocked. Please enable camera access in your browser or phone app settings.');
    }
  };

  const handleContainerTap = () => {
    const video = cameraBoxRef.current?.querySelector('video');
    if (video && video.paused) {
      video.play().catch(() => {});
    }
  };

  const handleScan = async (detectedCodes) => {
    if (processing || scanResult) return;
    if (!detectedCodes || detectedCodes.length === 0) return;

    const rawValue = detectedCodes[0]?.rawValue || '';
    if (!rawValue) return;

    // Validate QR code payload (Supports direct web URLs, JSON, and raw attendance IDs)
    let isValid = false;
    let locationLabel = 'Office HQ';
    let attendanceCode = rawValue;

    try {
      if (rawValue.startsWith('{') && (rawValue.includes('JMK_') || rawValue.includes('STATIC_OFFICE_QR'))) {
        const parsed = JSON.parse(rawValue);
        if (parsed.app === 'JMK_HRMS' || parsed.type === 'STATIC_OFFICE_QR') {
          isValid = true;
          locationLabel = parsed.location || 'Office HQ';
          attendanceCode = parsed.code || rawValue;
        }
      } else if (
        rawValue.includes('JMK-ATT') || 
        rawValue.includes('JMK_ATTENDANCE') || 
        rawValue.includes('qr/attendance') || 
        rawValue.includes('attendance/punch')
      ) {
        isValid = true;
        // Parse code parameter if scanned as URL
        if (rawValue.includes('code=')) {
          const match = rawValue.match(/[?&]code=([^&]+)/);
          if (match) attendanceCode = decodeURIComponent(match[1]);
        }
        if (rawValue.includes('location=')) {
          const match = rawValue.match(/[?&]location=([^&]+)/);
          if (match) locationLabel = decodeURIComponent(match[1]);
        }
      }
    } catch (e) {
      if (rawValue.includes('JMK-ATT') || rawValue.includes('attendance')) {
        isValid = true;
      }
    }

    if (!isValid) {
      setScanError('Unrecognized QR Code. Please scan the official JMK Office Attendance Standee.');
      setTimeout(() => setScanError(null), 4000);
      return;
    }

    // Process Attendance Punch
    setProcessing(true);
    setScanError(null);

    try {
      let res;
      const punchType = isCheckedIn ? 'check-out' : 'check-in';

      if (isCheckedIn) {
        res = await employeePortalApi.checkOut({ 
          source: 'qr', 
          qr_code: attendanceCode,
          timestamp: new Date().toISOString()
        });
      } else {
        res = await employeePortalApi.checkIn({ 
          source: 'qr', 
          qr_code: attendanceCode,
          timestamp: new Date().toISOString()
        });
      }

      const punchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setScanResult({
        type: punchType,
        time: punchTime,
        location: locationLabel,
        message: res.data?.message || (punchType === 'check-out' ? 'Clocked out successfully!' : 'Clocked in successfully!')
      });

      if (onSuccess) {
        onSuccess(res.data);
      }

      // Auto close after celebration
      setTimeout(() => {
        handleClose();
      }, 2500);

    } catch (err) {
      console.error('QR Punch Error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to record attendance punch.';
      setScanError(msg);
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setProcessing(false);
    setScanResult(null);
    setScanError(null);
    setHasPermissionError(false);
    onClose();
  };

  return (
    <div className="qr-scanner-overlay" onClick={handleClose}>
      <div className="qr-scanner-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-scanner-header">
          <div className="qr-scanner-title">
            <Camera size={18} color="#2563eb" />
            <span>Scan Office QR Attendance</span>
          </div>
          <button className="qr-scanner-close" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="qr-scanner-body" onClick={handleContainerTap}>
          {scanResult ? (
            <div className="qr-scanner-success">
              <div className="qr-success-icon-wrap">
                <CheckCircle2 size={54} color="#16a34a" />
                <Sparkles size={24} color="#eab308" className="qr-sparkle-1" />
              </div>
              <h3>{scanResult.type === 'check-out' ? 'Clocked Out Successfully!' : 'Clocked In Successfully!'}</h3>
              <div className="qr-success-time-badge">
                {scanResult.time} · {scanResult.location}
              </div>
              <p className="qr-success-note">
                Verified via Office Contactless QR Standee
              </p>
            </div>
          ) : hasPermissionError ? (
            <div className="qr-permission-card">
              <div className="qr-permission-icon">
                <Camera size={28} />
              </div>
              <div className="qr-permission-title">Camera Permission Needed</div>
              <div className="qr-permission-text">
                Please grant camera access to scan your office attendance standee.
              </div>
              <button className="btn-camera-grant" onClick={requestPermissionManually}>
                <RefreshCw size={16} /> Allow Camera Access
              </button>
            </div>
          ) : (
            <div className="qr-camera-container" ref={cameraBoxRef}>
              <Scanner
                onScan={handleScan}
                onError={(err) => {
                  console.warn('Scanner warning:', err?.message);
                  if (err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission')) {
                    setHasPermissionError(true);
                  }
                }}
                constraints={{
                  facingMode: 'environment'
                }}
                styles={{
                  container: { width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }
                }}
              />

              {/* Viewfinder Target Overlays */}
              <div className="qr-target-box">
                <div className="qr-target-corner corner-tl" />
                <div className="qr-target-corner corner-tr" />
                <div className="qr-target-corner corner-bl" />
                <div className="qr-target-corner corner-br" />
                <div className="qr-scan-laser" />
              </div>

              {processing && (
                <div className="qr-processing-overlay">
                  <Loader2 size={32} className="spin" color="#ffffff" />
                  <span>Verifying QR & Recording Punch...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error / Alert notice */}
        {scanError && (
          <div className="qr-scanner-error">
            <AlertCircle size={16} />
            <span>{scanError}</span>
          </div>
        )}

        {/* Footer Guidance */}
        {!scanResult && (
          <div className="qr-scanner-footer">
            <div className="qr-instruction-badge">
              <QrCode size={14} />
              <span>Point camera at the Office Attendance QR standee</span>
            </div>
            <div className="qr-status-indicator">
              Next Action: <strong>{isCheckedIn ? 'Clock Out' : 'Clock In'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
