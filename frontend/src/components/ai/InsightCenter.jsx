import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Check, 
  X, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  CheckCheck,
  Building,
  User,
  Clock
} from 'lucide-react';
import aiApi from '../../services/aiApi';

export default function InsightCenter({ onExplainInChat, onClose }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [summary, setSummary] = useState({ total: 0, unread: 0, critical: 0, warning: 0, info: 0 });
  const [explainingId, setExplainingId] = useState(null);
  const [explanationModal, setExplanationModal] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);

      const filterParams = {};
      if (activeFilter === 'Unread') {
        filterParams.status = 'unread';
      } else if (activeFilter === 'Critical') {
        filterParams.severity = 'CRITICAL';
      } else if (activeFilter === 'Warning') {
        filterParams.severity = 'WARNING';
      } else if (activeFilter === 'Info') {
        filterParams.severity = 'INFO';
      }

      const [listRes, summaryRes] = await Promise.all([
        aiApi.getInsights(filterParams),
        aiApi.getInsightSummary()
      ]);

      if (listRes.success && Array.isArray(listRes.data)) {
        setInsights(listRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
      setActionError(err.response?.data?.message || 'Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleMarkRead = async (id) => {
    try {
      const res = await aiApi.markInsightRead(id);
      if (res.success) {
        setInsights(prev => prev.map(item => item.id === id ? { ...item, status: 'read', read_at: new Date().toISOString() } : item));
        setSummary(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      }
    } catch (err) {
      console.error('Failed to mark insight as read:', err);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const res = await aiApi.dismissInsight(id);
      if (res.success) {
        setInsights(prev => prev.filter(item => item.id !== id));
        setSummary(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
    }
  };

  const handleExplain = async (insight) => {
    try {
      setExplainingId(insight.id);
      const res = await aiApi.explainInsight(insight.id);
      if (res.success && res.data) {
        setExplanationModal(res.data);
      }
    } catch (err) {
      console.error('Failed to explain insight:', err);
      setActionError('Could not generate AI explanation.');
    } finally {
      setExplainingId(null);
    }
  };

  const handleTriggerDetection = async () => {
    try {
      setDetecting(true);
      setActionError(null);
      await aiApi.triggerInsightDetection();
      await fetchInsights();
    } catch (err) {
      console.error('Detection trigger failed:', err);
      setActionError(err.response?.data?.message || 'Failed to run detection scan.');
    } finally {
      setDetecting(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="insight-badge badge-critical">
            <ShieldAlert size={13} className="mr-1" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="insight-badge badge-warning">
            <AlertTriangle size={13} className="mr-1" />
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="insight-badge badge-info">
            <Info size={13} className="mr-1" />
            INFO
          </span>
        );
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="insight-center-container">
      {/* Header bar */}
      <div className="insight-header">
        <div className="insight-title-group">
          <div className="insight-header-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="insight-title">HR Proactive Intelligence</h3>
            <p className="insight-subtitle">Autonomous detection & verified HR policy alerts</p>
          </div>
        </div>

        <div className="insight-header-actions">
          <button 
            type="button"
            className="insight-btn-scan"
            onClick={handleTriggerDetection}
            disabled={detecting}
            title="Scan current organizational records for new anomalies"
          >
            <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
            {detecting ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="insight-filters">
        {['All', 'Unread', 'Critical', 'Warning', 'Info'].map(tab => {
          let count = null;
          if (tab === 'Unread') count = summary.unread;
          else if (tab === 'Critical') count = summary.critical;
          else if (tab === 'Warning') count = summary.warning;
          else if (tab === 'Info') count = summary.info;

          return (
            <button
              key={tab}
              type="button"
              className={`insight-filter-tab ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
              {count !== null && count > 0 && (
                <span className={`filter-count-badge badge-${tab.toLowerCase()}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="insight-error-banner">
          <AlertTriangle size={15} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Insight List */}
      <div className="insight-list-scroll">
        {loading ? (
          <div className="insight-loading">
            <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
            <p>Analyzing organizational patterns...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="insight-empty">
            <CheckCheck size={36} className="text-emerald-500 mb-2" />
            <h4>No {activeFilter !== 'All' ? activeFilter : ''} Alerts</h4>
            <p>All organizational policies and attendance metrics are currently within thresholds.</p>
          </div>
        ) : (
          insights.map(item => {
            const isUnread = item.status === 'unread';
            const source = item.source_data || {};
            const entityLabel = source.employee_name || source.department_name || (item.entity_type === 'department' ? 'Department' : 'Employee');

            return (
              <div 
                key={item.id} 
                className={`insight-card severity-${item.severity?.toLowerCase()} ${isUnread ? 'is-unread' : ''}`}
              >
                <div className="insight-card-top">
                  <div className="insight-card-badges">
                    {getSeverityBadge(item.severity)}
                    <span className="insight-type-tag">
                      {item.type ? item.type.replace(/_/g, ' ') : 'INSIGHT'}
                    </span>
                    {isUnread && <span className="unread-dot-badge">New</span>}
                  </div>
                  <div className="insight-timestamp">
                    <Clock size={12} />
                    <span>{formatRelativeTime(item.detected_at)}</span>
                  </div>
                </div>

                <div className="insight-card-body">
                  <h4 className="insight-item-title">{item.title}</h4>
                  <p className="insight-item-summary">{item.summary}</p>

                  <div className="insight-entity-meta">
                    {item.entity_type === 'department' ? (
                      <span className="entity-chip">
                        <Building size={12} />
                        {entityLabel}
                      </span>
                    ) : (
                      <span className="entity-chip">
                        <User size={12} />
                        {entityLabel}
                        {source.department_name && <span className="entity-sub">({source.department_name})</span>}
                      </span>
                    )}
                  </div>
                </div>

                <div className="insight-card-actions">
                  <div className="left-actions">
                    <button
                      type="button"
                      className="btn-explain-ai"
                      onClick={() => handleExplain(item)}
                      disabled={explainingId === item.id}
                    >
                      <Sparkles size={13} className="text-purple-600" />
                      {explainingId === item.id ? 'Explaining...' : 'Explain with AI'}
                    </button>
                  </div>

                  <div className="right-actions">
                    {isUnread && (
                      <button
                        type="button"
                        className="btn-action-read"
                        onClick={() => handleMarkRead(item.id)}
                        title="Mark as Read"
                      >
                        <Check size={14} />
                        Mark Read
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-action-dismiss"
                      onClick={() => handleDismiss(item.id)}
                      title="Dismiss insight"
                    >
                      <X size={14} />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Grounded AI Explanation Modal */}
      {explanationModal && (
        <div className="insight-modal-overlay" onClick={() => setExplanationModal(null)}>
          <div className="insight-modal-card" onClick={e => e.stopPropagation()}>
            <div className="insight-modal-header">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                <h4 className="font-semibold text-gray-900">AI Grounded Explanation</h4>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setExplanationModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="insight-modal-body">
              <div className="modal-section mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Alert Title
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {explanationModal.title}
                </div>
              </div>

              <div className="modal-section mb-3">
                <div className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Sparkles size={12} />
                  Verified Natural Language Summary
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900 leading-relaxed font-sans">
                  "{explanationModal.ai_explanation}"
                </div>
              </div>

              <div className="modal-section mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Deterministic Business Rule Detail
                </div>
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-200">
                  {explanationModal.detailed_explanation}
                </p>
              </div>

              <div className="modal-section">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Underlying MySQL Verified Facts
                </div>
                <pre className="text-xs bg-slate-900 text-emerald-400 p-2.5 rounded overflow-x-auto font-mono">
                  {JSON.stringify(explanationModal.verified_facts, null, 2)}
                </pre>
              </div>
            </div>

            <div className="insight-modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setExplanationModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
