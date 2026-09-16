import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import AiCommandBar from '../../components/ai/AiCommandBar';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user.first_name}</h1>
          <p className="page-description">Here's what's happening in your workspace today.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">Log Time</button>
        </div>
      </div>

      {/* Prominent AI Command Bar */}
      <AiCommandBar />

      <div style={styles.grid}>
        {/* Placeholder Stat Cards */}
        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <Users size={20} color="var(--accent-hover)" />
            </div>
            <div>
              <p style={styles.statLabel}>Total Employees</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>

        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <CheckCircle size={20} color="var(--success-text)" />
            </div>
            <div>
              <p style={styles.statLabel}>Present Today</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>

        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <Calendar size={20} color="var(--warning-text)" />
            </div>
            <div>
              <p style={styles.statLabel}>On Leave</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>

        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <Clock size={20} color="var(--info-text)" />
            </div>
            <div>
              <p style={styles.statLabel}>Pending Approvals</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="card-body">
             <div className="empty-state" style={{ padding: '40px' }}>
                <p className="empty-state-desc">Activity feed will appear here once modules are connected.</p>
             </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AI Insights</h3>
          </div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: '40px' }}>
                <p className="empty-state-desc">AI recommendations will appear here.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-6)',
    marginBottom: 'var(--space-8)'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)'
  },
  statIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statLabel: {
    margin: '0 0 4px 0',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  statValue: {
    margin: 0,
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-semibold)'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-6)'
  }
};

export default Dashboard;
