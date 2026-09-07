import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Target, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';
import './Dashboard.css';

export default function ManagementDashboard() {
  const navigate = useNavigate();

  const handleActionClick = (e, path) => {
    e.stopPropagation(); // Prevents clicking the parent panel
    navigate(path);
  };

  return (
    <div className="v3-dashboard-container">
      {/* Dynamic Header */}
      <div className="v3-header-area">
        <div className="v3-header-text">
          <div className="v3-badge-pill">Enterprise Command Center</div>
          <h1>Management Hub</h1>
          <p>Real-time organizational analytics and strategic operations.</p>
        </div>
        <div className="v3-quick-stats">
          <div className="v3-stat-item">
            <span className="v3-stat-val">542</span>
            <span className="v3-stat-lbl">Active Headcount</span>
          </div>
          <div className="v3-stat-divider"></div>
          <div className="v3-stat-item">
            <span className="v3-stat-val text-emerald">94%</span>
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
            <div className="v3-alert-row">
              <div className="v3-alert-info">
                <strong>Offer Approval Pending</strong>
                <span>Senior Frontend Engineer (Sarah Jenkins)</span>
              </div>
              <button className="v3-btn-outline" onClick={(e) => handleActionClick(e, '/app/recruitment')}>Review Offer</button>
            </div>
            <div className="v3-alert-row">
              <div className="v3-alert-info">
                <strong>Manager Reviews Missing</strong>
                <span>Engineering Dept: 4 reviews pending for Q3</span>
              </div>
              <button className="v3-btn-outline" onClick={(e) => handleActionClick(e, '/app/performance')}>Send Nudge</button>
            </div>
          </div>
        </div>

        {/* Performance Bento */}
        <div className="v3-bento-card interactive-bento" onClick={() => navigate('/app/performance')}>
          <div className="v3-card-header">
            <div className="v3-title-group">
              <div className="v3-icon-box perf-box">
                <Target size={18} />
              </div>
              <h3>Performance</h3>
            </div>
            <ArrowRight size={16} className="v3-arrow" />
          </div>
          <div className="v3-perf-visual">
            <div className="v3-gauge-container">
              {/* CSS Half-Circle Gauge */}
              <div className="v3-gauge-bg"></div>
              <div className="v3-gauge-fill" style={{transform: 'rotate(65deg)'}}></div>
              <div className="v3-gauge-center">
                <span className="v3-gauge-perc">65%</span>
                <span className="v3-gauge-lbl">Q3 Completion</span>
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
              <div className="v3-funnel-fill" style={{width: '100%', background: '#3b82f6'}}></div>
              <span className="v3-funnel-text">Sourced (142)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{width: '60%', background: '#6366f1'}}></div>
              <span className="v3-funnel-text">Screening (85)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{width: '25%', background: '#8b5cf6'}}></div>
              <span className="v3-funnel-text">Interview (35)</span>
            </div>
            <div className="v3-funnel-bar">
              <div className="v3-funnel-fill" style={{width: '10%', background: '#a855f7'}}></div>
              <span className="v3-funnel-text">Offer (14)</span>
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
              <h3>Onboarding</h3>
            </div>
            <ArrowRight size={16} className="v3-arrow" />
          </div>
          
          <div className="v3-timeline">
            <div className="v3-timeline-item">
              <div className="v3-dot active"></div>
              <div className="v3-tl-content">
                <h4>Jane Doe (Product)</h4>
                <p>IT Setup Complete</p>
              </div>
            </div>
            <div className="v3-timeline-item">
              <div className="v3-dot pending"></div>
              <div className="v3-tl-content">
                <h4>Michael Chen (Data)</h4>
                <p>Pending I-9 Docs</p>
              </div>
            </div>
            <div className="v3-timeline-item">
              <div className="v3-dot upcoming"></div>
              <div className="v3-tl-content">
                <h4>Alex Smith (Sales)</h4>
                <p>Joins in 5 days</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
