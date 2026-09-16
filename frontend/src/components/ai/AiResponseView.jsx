import React from 'react';
import { CheckCircle, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import ConfirmationCard from './ConfirmationCard';
import MultiStepStatusCard from './MultiStepStatusCard';

export default function AiResponseView({ response, onConfirm, onCancel, onSelectCandidate }) {
  if (!response) return null;

  const isDenied = response.success === false && response.message?.includes("permission");
  const isError = response.success === false && !isDenied && !response.requires_confirmation;
  const isConfirmation = Boolean(response.requires_confirmation);

  let statusClass = 'ai-status-success';
  let StatusIcon = CheckCircle;
  let statusText = 'Completed';

  if (isConfirmation) {
    statusClass = 'ai-status-warning';
    StatusIcon = AlertCircle;
    statusText = 'Action Pending Confirmation';
  } else if (isDenied) {
    statusClass = 'ai-status-error';
    StatusIcon = ShieldAlert;
    statusText = 'Permission Denied';
  } else if (isError) {
    statusClass = 'ai-status-error';
    StatusIcon = AlertCircle;
    statusText = 'Action Incomplete';
  }

  const steps = response.data?.steps;
  const candidates = response.candidates;

  return (
    <div className="ai-response-card">
      <div className="ai-response-meta">
        <div className={`ai-status-indicator ${statusClass}`}>
          <StatusIcon size={16} />
          <span>{statusText}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Sparkles size={12} />
          <span>HRMS Operator</span>
        </div>
      </div>

      <div className="ai-response-body">
        {response.message}
      </div>

      {/* Ambiguous Candidate Selector Chips */}
      {candidates && Array.isArray(candidates) && candidates.length > 0 && onSelectCandidate && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Select Employee:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {candidates.map((c) => (
              <button
                key={c.id}
                className="ai-suggestion-chip"
                style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => onSelectCandidate(c)}
              >
                <span>{c.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--accent-hover)', backgroundColor: 'var(--accent-soft)', padding: '2px 6px', borderRadius: '4px' }}>
                  {c.employee_code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-step Workflow Progress */}
      {steps && <MultiStepStatusCard steps={steps} />}

      {/* Dangerous Action Confirmation Card */}
      {isConfirmation && (
        <ConfirmationCard
          confirmationData={response}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
