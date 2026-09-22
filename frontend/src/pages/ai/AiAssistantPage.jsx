import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, Bot, History, CheckCircle, Clock, ShieldCheck, Terminal } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import AiCommandCenter from '../../components/ai/AiCommandCenter';
import aiApi from '../../services/aiApi';

export default function AiAssistantPage() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isAdmin = user?.roles?.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(r));

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await aiApi.getHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load command history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={26} color="var(--accent-hover)" />
              <span>Stella AI Assistant</span>
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isAdmin ? 'var(--accent-soft)' : '#e0e7ff',
              color: isAdmin ? 'var(--accent-hover)' : '#4338ca'
            }}>
              {isAdmin ? 'ADMIN OPERATOR' : 'EMPLOYEE ASSISTANT'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Unified AI Command Center */}
      <AiCommandCenter className="layer-3d" onActionComplete={fetchHistory} />

      {/* Capability Guides & Audit History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
        
        {/* Capabilities Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-hover)" />
            <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
              {isAdmin ? 'Authorized Admin Capabilities' : 'Authorized Employee Capabilities'}
            </h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {isAdmin ? (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                <li><strong>Onboard Employees:</strong> Multi-step workflows creating profiles, IDs, designations, checklists, and access credentials.</li>
                <li><strong>Department & Roles:</strong> Move or assign employees to departments and designations.</li>
                <li><strong>Attendance:</strong> View department attendance and identify employees absent today.</li>
                <li><strong>Leave Management:</strong> Approve or reject pending leave requests by employee name.</li>
                <li><strong>Payroll Reports:</strong> Instant organization-wide monthly salary and headcount summaries.</li>
                <li><strong>Document Audits:</strong> Find employees with missing documents or unverified contracts.</li>
                <li><strong>Safe Operations:</strong> Sensitive actions (e.g. employee removal) pause for confirmation.</li>
              </ul>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                <li><strong>Self Attendance:</strong> View your monthly attendance history, working hours, and clock in/out.</li>
                <li><strong>Leave Management:</strong> Check available leave balances, submit leave applications, or cancel pending requests.</li>
                <li><strong>Compensation:</strong> View your salary breakdowns and download payslips.</li>
                <li><strong>Personal Profile:</strong> View your details and update phone numbers and emergency contacts.</li>
                <li><strong>Tasks & Onboarding:</strong> Check your pending onboarding checklists and company tasks.</li>
                <li><strong>Strict Privacy:</strong> Your data is isolated; other employees' records are not accessible.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Recent Command Activity */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--accent-hover)" />
              <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>Recent AI Commands</h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{history.length} logged</span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px', maxHeight: '280px', overflowY: 'auto' }}>
            {historyLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent commands yet. Try running your first command above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-hover)',
                    fontSize: '12.5px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Terminal size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {h.command}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '600',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: h.status === 'success' ? '#dcfce7' : '#fee2e2',
                      color: h.status === 'success' ? '#15803d' : '#b91c1c',
                      flexShrink: 0
                    }}>
                      {h.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
