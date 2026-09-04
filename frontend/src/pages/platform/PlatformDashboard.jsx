import React from 'react';
import { Activity, Building, CreditCard } from 'lucide-react';

const PlatformDashboard = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-description">Manage all tenant organizations and system health.</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <Building size={20} color="var(--accent-hover)" />
            </div>
            <div>
              <p style={styles.statLabel}>Total Organizations</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>

        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <CreditCard size={20} color="var(--success-text)" />
            </div>
            <div>
              <p style={styles.statLabel}>Active Subscriptions</p>
              <h3 style={styles.statValue}>-</h3>
            </div>
          </div>
        </div>

        <div className="card layer-3d">
          <div className="card-body" style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <Activity size={20} color="var(--info-text)" />
            </div>
            <div>
              <p style={styles.statLabel}>System Health</p>
              <h3 style={styles.statValue}>Good</h3>
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
  }
};

export default PlatformDashboard;
