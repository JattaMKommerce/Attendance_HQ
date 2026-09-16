import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function MultiStepStatusCard({ steps }) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div className="ai-multistep-card">
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Workflow Execution Steps
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {steps.map((step, idx) => {
          let Icon = Clock;
          let iconClass = 'ai-step-icon-pending';

          if (step.status === 'success') {
            Icon = CheckCircle2;
            iconClass = 'ai-step-icon-success';
          } else if (step.status === 'failed') {
            Icon = XCircle;
            iconClass = 'ai-step-icon-failed';
          }

          return (
            <div key={idx} className="ai-step-row">
              <Icon size={16} className={iconClass} />
              <span style={{ fontWeight: step.status === 'success' ? '500' : 'normal' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
