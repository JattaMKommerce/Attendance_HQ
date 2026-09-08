import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { State } from 'country-state-city';
import './EmployeeIdCard.css';

const EmployeeIdCard = ({ employee }) => {
  if (!employee) return null;

  const joinDate = employee.joining_date 
    ? new Date(employee.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const qrData = `${window.location.origin}/app/employees/${employee.id}/id-card`;
  
  const locationString = employee.office_city && employee.office_state 
    ? `${employee.office_city}, ${State.getStateByCodeAndCountry(employee.office_state, 'IN')?.name || employee.office_state}`
    : '-';

  return (
    <div className="id-card-container">
      <div className="id-card">
        {/* Background Waves */}
        <div className="id-card-bg-wave-top"></div>
        <div className="id-card-bg-wave-bottom"></div>

        {/* Header */}
        <div className="id-card-header">
          <div className="id-card-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#F43F5E" />
              <circle cx="12" cy="12" r="3" fill="#FFF" />
            </svg>
          </div>
          <div className="id-card-company">
            <h2 className="company-name">Acme Corp</h2>
            <p className="company-tagline">People | Progress | Together</p>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="id-card-avatar-container">
          {employee.profile_image_url ? (
            <img 
              src={`http://localhost:5001${employee.profile_image_url}`} 
              alt="Profile" 
              className="id-card-avatar"
            />
          ) : (
            <div className="id-card-avatar placeholder">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
          )}
        </div>

        {/* Name & Designation */}
        <div className="id-card-employee-info">
          <h1 className="employee-name">{employee.first_name} {employee.last_name}</h1>
          <p className="employee-designation">{employee.designation_name || 'Employee'}</p>
        </div>

        {/* QR Code */}
        <div className="id-card-qr-container">
          <QRCodeSVG value={qrData} size={64} level="M" />
        </div>

        {/* Details Grid */}
        <div className="id-card-details">
          <div className="detail-row">
            <span className="detail-label">Employee ID</span>
            <span className="detail-separator">:</span>
            <span className="detail-value">{employee.employee_code}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Department</span>
            <span className="detail-separator">:</span>
            <span className="detail-value">{employee.department_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Blood Group</span>
            <span className="detail-separator">:</span>
            <span className="detail-value">{employee.blood_group || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Location</span>
            <span className="detail-separator">:</span>
            <span className="detail-value">{locationString}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date of Joining</span>
            <span className="detail-separator">:</span>
            <span className="detail-value">{joinDate}</span>
          </div>
        </div>

        {/* Signature */}
        <div className="id-card-signature-container">
          <div className="signature-line">
            <svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg" className="signature-svg">
              {/* Blank for physical signature */}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeIdCard;
