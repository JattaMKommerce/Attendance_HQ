import React, { useState, useEffect, useContext } from 'react';
import { Megaphone, Calendar, Tag, AlertCircle, RefreshCw } from 'lucide-react';
import { employeePortalApi } from '../../services/employeePortalApi';
import { EmployeeContext } from '../../context/EmployeeContext';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { announcements: contextAnnouncements } = useContext(EmployeeContext) || {};

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeePortalApi.getAnnouncements();
      if (res.data?.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Unable to load announcements at this moment.');
      if (contextAnnouncements && contextAnnouncements.length > 0) {
        setAnnouncements(contextAnnouncements);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high' || p === 'urgent') {
      return { bg: '#fee2e2', color: '#dc2626', text: 'Urgent' };
    }
    if (p === 'low') {
      return { bg: '#f1f5f9', color: '#64748b', text: 'Info' };
    }
    return { bg: '#e0e7ff', color: '#4f46e5', text: 'General' };
  };

  return (
    <div className="employee-page-container" style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            Company Announcements
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Official notices and updates from HR & Management
          </p>
        </div>
        <button
          onClick={fetchAnnouncements}
          style={{
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#475569'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="mobile-card" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Megaphone size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b' }}>No Announcements</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            There are currently no company-wide announcements.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {announcements.map((item) => {
            const badge = getPriorityBadge(item.priority);
            return (
              <div
                key={item.id}
                className="mobile-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                    {item.title}
                  </h3>
                  <span style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.04em'
                  }}>
                    {badge.text}
                  </span>
                </div>

                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    {formatDate(item.created_at)}
                  </span>
                  {item.author_name && (
                    <span>By: {item.author_name}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
