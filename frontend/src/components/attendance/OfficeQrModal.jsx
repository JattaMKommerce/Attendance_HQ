import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, QrCode, ShieldCheck, MapPin } from 'lucide-react';
import './OfficeQrModal.css';

export default function OfficeQrModal({ isOpen, onClose, organization }) {
  const standeeRef = useRef(null);

  if (!isOpen) return null;

  const orgId = organization?.id || 1;
  const orgName = organization?.name || 'Jatta M Kommerce HRMS';
  
  const appOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') 
    ? window.location.origin 
    : 'https://hrms.jattamkommerce.com';
  
  // Real HTTPS URL recognized by regular smartphone cameras (Apple Camera / Google Lens) & In-App Scanner
  const qrPayload = `${appOrigin}/qr/attendance?code=JMK-ATT-HQ-${orgId}&org=${orgId}&location=${encodeURIComponent('Main Office HQ')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svg = standeeRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 50, 50, 500, 500);

      const a = document.createElement('a');
      a.download = `Office-Attendance-QR-${orgId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="office-qr-overlay" onClick={onClose}>
      <div className="office-qr-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="office-qr-modal-header">
          <div className="office-qr-modal-title">
            <QrCode size={20} color="#2563eb" />
            <span>Office Attendance QR Standee</span>
          </div>
          <button className="office-qr-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Standee Card */}
        <div className="office-qr-standee-container" ref={standeeRef}>
          <div className="office-qr-standee-card">
            <div className="standee-header">
              <div className="standee-org-badge">
                <span className="standee-pulse" />
                OFFICIAL ATTENDANCE PUNCH POINT
              </div>
              <h2 className="standee-org-name">{orgName}</h2>
              <div className="standee-location-row">
                <MapPin size={14} color="#64748b" />
                <span>Main Office Reception / HQ</span>
              </div>
            </div>

            {/* QR Code Presentation */}
            <div className="standee-qr-frame">
              <div className="qr-corner-tl" />
              <div className="qr-corner-tr" />
              <div className="qr-corner-bl" />
              <div className="qr-corner-br" />
              <QRCodeSVG 
                value={qrPayload}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Scanning Instructions */}
            <div className="standee-instructions">
              <div className="standee-step">
                <span className="step-num">1</span>
                <span>Scan with <strong>Phone Camera</strong> or <strong>JMK App</strong></span>
              </div>
              <div className="standee-step">
                <span className="step-num">2</span>
                <span>Open link to <strong>Download App</strong> or <strong>Punch</strong></span>
              </div>
              <div className="standee-step">
                <span className="step-num">3</span>
                <span>Instant <strong>Attendance Punch</strong> verified</span>
              </div>
            </div>

            <div className="standee-footer">
              <div className="standee-secure-badge">
                <ShieldCheck size={14} color="#16a34a" />
                <span>GPS & Office Geofence Verified</span>
              </div>
              <span className="standee-code-tag">ID: JMK-ATT-HQ-{orgId}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="office-qr-modal-actions">
          <button className="btn-standee-download" onClick={handleDownload}>
            <Download size={16} />
            <span>Download PNG</span>
          </button>
          <button className="btn-standee-print" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Standee (A4)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
