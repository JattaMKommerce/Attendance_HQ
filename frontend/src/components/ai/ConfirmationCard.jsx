import React, { useState } from 'react';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';

export default function ConfirmationCard({ confirmationData, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  if (!confirmationData) return null;

  const summary = confirmationData.summary || confirmationData.confirmation_details?.summary;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(confirmationData.confirmation_id);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(confirmationData.confirmation_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-confirm-card">
      <div className="ai-confirm-header">
        <AlertTriangle size={20} />
        <span>Confirmation Required</span>
      </div>

      <div className="ai-confirm-body">
        <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-line' }}>
          {confirmationData.confirmation_prompt}
        </p>

        {summary && (
          <div className="ai-pre-summary" style={{
            margin: '10px 0',
            padding: '10px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            fontSize: '13px',
            border: '1px solid #e2e8f0',
            color: '#334155'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>Pre-Execution Summary:</div>
            {summary.name && <div><strong>Name:</strong> {summary.name}</div>}
            {summary.department && <div><strong>Department:</strong> {summary.department}</div>}
            {summary.designation && <div><strong>Designation:</strong> {summary.designation}</div>}
            {summary.joining_date && <div><strong>Joining Date:</strong> {summary.joining_date}</div>}
            {summary.email && <div><strong>Email:</strong> {summary.email}</div>}
            {summary.employee_code_preview && <div><strong>Employee Code:</strong> {summary.employee_code_preview}</div>}
            {summary.default_password_notice && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                Note: {summary.default_password_notice}
              </div>
            )}
            {Array.isArray(summary.checklist) && summary.checklist.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong>Workflow Steps:</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                  {summary.checklist.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {confirmationData.confirmation_details?.impact && (
          <div style={{ fontSize: '12px', color: '#9f1239', backgroundColor: 'rgba(254, 205, 211, 0.5)', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
            <strong>Impact:</strong> {confirmationData.confirmation_details.impact}
          </div>
        )}
      </div>

      <div className="ai-confirm-actions">
        <button
          className="ai-btn-confirm"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="spin-animation" /> : <Check size={14} />}
          <span>Confirm Action</span>
        </button>

        <button
          className="ai-btn-cancel"
          onClick={handleCancel}
          disabled={loading}
        >
          <X size={14} />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
