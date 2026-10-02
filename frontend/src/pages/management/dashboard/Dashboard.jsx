import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Target, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Award,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { getEmployees } from '../../../services/employeeApi';
import './Dashboard.css';

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        setLoading(true);
        const res = await getEmployees();
        const list = res?.data?.employees || (Array.isArray(res?.data) ? res.data : []);
        setEmployees(list);
      } catch (e) {
        console.warn('Management dashboard error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgData();
  }, []);

  const handleActionClick = (e, path) => {
    e.stopPropagation();
    navigate(path);
  };

  const activeCount = employees.filter(e => e.status === 'active').length;

  return (
    <div className="v3-dashboard-container">
      {/* Dynamic Header */}
      <div className="v3-header-area">
        <div className="v3-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#334155', fontWeight: 600 }}
              title="Go Back"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <div className="v3-badge-pill">Enterprise Command Center</div>
          </div>
          <h1>Management Hub</h1>
          <p>Real-time organizational analytics and strategic operations.</p>
        </div>
        <div className="v3-quick-stats">
          <div className="v3-stat-item">
            <span className="v3-stat-val">{loading ? '--' : activeCount}</span>
            <span className="v3-stat-lbl">Active Headcount</span>
          </div>
          <div className="v3-stat-divider"></div>
          <div className="v3-stat-item">
            <span className="v3-stat-val text-emerald">{activeCount > 0 ? '100%' : '100%'}</span>
            <span className="v3-stat-lbl">Retention Rate</span>
          </div>
        </div>
      </div>

      {/* Bento Box Grid */}
      <div className="v3-bento-grid">
        
        {/* Alerts Bento - Spans 2 columns */}
        <div className="v3-bento-card col-span-2 alert-bento">
          <div className="v3-card-header">
            <div className="v3-title-group">
              <div className="v3-icon-box alert-box">
                <AlertTriangle size={18} />
              </div>
              <h3>Action Required</h3>
            </div>
            <div className="v3-pulsing-dot"></div>
          </div>
          
          <div className="v3-alerts-list">
            {employees.length === 0 ? (
              <div style={{ padding: '16px 0', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>All systems normal. 0 pending alerts or required actions.</span>
              </div>
            ) : (
              <div className="v3-alert-row">
                <div className="v3-alert-info">
                  <strong>Organization Active</strong>
                  <span>{activeCount} active employee profiles currently managed.</span>
                </div>
                <button className="v3-btn-outline" onClick={(e) => handleActionClick(e, '/app/employees')}>View Team</button>
              </div>
            )}
          </div>
        </div>

        {/* Performance Bento */}
        <div className="v3-bento-card interactive-bento" onClick={() => navigate('/app/lifecycle/performance')}>
          <div className="v3-card-header">
            <div className="v3-title-group">
              <div className="v3-icon-box perf-box">
                <Target size={18} />
              </div>
              <h3>Performance & PIP</h3>
            </div>
            <ArrowRight size={16} className="v3-arrow" />
          </div>
          <div className="v3-perf-visual">
            <div className="v3-gauge-container">
              <div className="v3-gauge-bg"></div>
              <div className="v3-gauge-fill" style={{ transform: 'rotate(0deg)' }}></div>
              <div className="v3-gauge-center">
                <span className="v3-gauge-perc">{activeCount > 0 ? '100%' : '0%'}</span>
                <span className="v3-gauge-lbl">Compliance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recruitment Funnel Bento - Spans 2 columns */}
        <div className="v3-bento-card col-span-2 interactive-bento" onClick={() => navigate('/app/recruitment')}>
          <div className="v3-card-header">
            <div className="v3-title-group">
              <div className="v3-icon-box rec-box">
                <Users size={18} />
              </div>
              <h3>Recruitment Pipeline</h3>
            </div>
            <ArrowRight size={16} className="v3-arrow" />
          </div>
          
          <div className="v3-funnel-chart">
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{ width: '0%', background: '#3b82f6' }}></div>
              <span className="v3-funnel-text">Sourced (0)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{ width: '0%', background: '#6366f1' }}></div>
              <span className="v3-funnel-text">Screening (0)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{ width: '0%', background: '#8b5cf6' }}></div>
              <span className="v3-funnel-text">Interview (0)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{ width: '0%', background: '#a855f7' }}></div>
              <span className="v3-funnel-text">Offer (0)</span>
            </div>
          </div>
        </div>

        {/* Onboarding Timeline Bento */}
        <div className="v3-bento-card interactive-bento" onClick={() => navigate('/app/onboarding')}>
          <div className="v3-card-header">
            <div className="v3-title-group">
              <div className="v3-icon-box onb-box">
                <Briefcase size={18} />
              </div>
              <h3>Onboarding Pipeline</h3>
            </div>
            <ArrowRight size={16} className="v3-arrow" />
          </div>
          
          <div className="v3-timeline">
            {employees.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No active onboardings in progress.
              </div>
            ) : (
              employees.slice(0, 3).map((emp, idx) => (
                <div key={emp.id} className="v3-timeline-item">
                  <div className={`v3-dot ${idx === 0 ? 'active' : 'pending'}`}></div>
                  <div className="v3-tl-content">
                    <h4>{emp.first_name} {emp.last_name || ''} ({emp.department_name || 'General'})</h4>
                    <p>{emp.designation_name || 'Team Member'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
