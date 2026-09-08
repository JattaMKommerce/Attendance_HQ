import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Users, CheckSquare, AlertCircle, Calendar, Clock, X, FileText
} from 'lucide-react';
import { attendanceApi } from '../../services/attendanceApi';

// Helper to get a default date range: current month
function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { startDate: fmt(firstDay), endDate: fmt(lastDay) };
}

export default function AttendanceIssuesView({ activeTab, onBack }) {
  const [currentTab, setCurrentTab] = useState(activeTab || 'unapproved_absence');
  const [selectedRow, setSelectedRow] = useState(null);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate]     = useState(defaultRange.endDate);
  const [departments, setDepartments]         = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees]             = useState([]);
  const [searchText, setSearchText]           = useState('');

  // ─── Data state ───────────────────────────────────────────────────────────
  const [issues, setIssues]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [kpi, setKpi]           = useState({ pending: 0, approved: 0, rejected: 0 });

  // ─── Action state ─────────────────────────────────────────────────────────
  const [selectedAction, setSelectedAction] = useState(null); // 'approved' | 'rejected'
  const [comment, setComment]               = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [toast, setToast]                   = useState(null); // { type: 'success'|'error', msg }

  // ─── Pagination ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'unapproved_absence', label: 'Unapproved Absence' },
    { id: 'missing_checkout',   label: 'Missing Check-out' },
    { id: 'correction',         label: 'Attendance Correction' },
  ];
  const currentTabLabel = tabs.find(t => t.id === currentTab)?.label || 'Issues';

  // ─── Load lookups (departments + employees) ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch('http://localhost:5001/api/employees/lookups', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.data?.departments) setDepartments(res.data.departments);
      })
      .catch(() => {});

    // Also load employees for dropdown
    fetch('http://localhost:5001/api/employees?status=active&limit=500', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.employees || []);
        setEmployees(list);
      })
      .catch(() => {});
  }, []);

  // ─── Fetch issues from API ─────────────────────────────────────────────────
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      // Map tab to request_type / status query
      const tabToType = {
        correction:         'correction',
        missing_checkout:   'missing_checkout',
        unapproved_absence: null, // fetch all and filter by absence/no-check-in
      };

      const filters = {
        startDate,
        endDate,
      };
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedEmployeeId) filters.employeeId = selectedEmployeeId;

      // Use regularization endpoint for correction & missing checkout
      // For unapproved_absence, also use regularization with a wider query
      const res = await attendanceApi.getRegularizationRequests(filters);
      if (!res.data?.success) return;

      let all = res.data.data || [];

      // Tab-specific type filtering
      if (currentTab === 'correction') {
        all = all.filter(i => i.request_type === 'correction');
      } else if (currentTab === 'missing_checkout') {
        all = all.filter(i => i.request_type === 'missing_checkout');
      }
      // unapproved_absence shows all types

      // Text search
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        all = all.filter(i =>
          `${i.first_name} ${i.last_name}`.toLowerCase().includes(q) ||
          (i.employee_code || '').toLowerCase().includes(q) ||
          (i.attendance_date || '').includes(q)
        );
      }

      // Build KPIs from the full unfiltered set scoped to this tab
      setKpi({
        pending:  all.filter(i => i.status === 'pending').length,
        approved: all.filter(i => i.status === 'approved').length,
        rejected: all.filter(i => i.status === 'rejected').length,
      });

      setIssues(all);
      setPage(1);
    } catch (e) {
      console.error('Failed to load issues:', e);
    } finally {
      setLoading(false);
    }
  }, [currentTab, startDate, endDate, selectedDepartment, selectedEmployeeId, searchText]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Reset action state when sidebar row changes
  useEffect(() => {
    setSelectedAction(null);
    setComment('');
  }, [selectedRow]);

  // ─── Show toast helper ────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Submit action ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedAction) {
      showToast('error', 'Please select Approve or Reject before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await attendanceApi.updateRegularizationRequest(selectedRow.id, {
        status: selectedAction,
        rejectionReason: comment.trim() || null,
      });
      if (res.data?.success) {
        showToast('success', `Request ${selectedAction} successfully.`);
        setSelectedRow(null);
        fetchIssues();
      } else {
        showToast('error', res.data?.message || 'Action failed.');
      }
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Failed to process request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Pagination helpers ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(issues.length / PAGE_SIZE));
  const pagedIssues = issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Format date for display ───────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };
  const fmtDay = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }); }
    catch { return ''; }
  };
  const fmtDateTime = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  // ─── Avatar initials ───────────────────────────────────────────────────────
  const avatar = (row) =>
    `${(row.first_name || '').charAt(0)}${(row.last_name || '').charAt(0)}`.toUpperCase();

  // ─── Status badge ─────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      pending:  { bg: '#fef3c7', color: '#d97706' },
      approved: { bg: '#dcfce7', color: '#059669' },
      rejected: { bg: '#fee2e2', color: '#ef4444' },
    };
    const s = map[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
      <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  // ─── Month label for date range picker ────────────────────────────────────
  const monthLabel = (() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
      return `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
    } catch { return 'This Month'; }
  })();

  // ─── Navigate month ───────────────────────────────────────────────────────
  const shiftMonth = (dir) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + dir);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const fmt = (x) => x.toISOString().split('T')[0];
    setStartDate(fmt(first));
    setEndDate(fmt(last));
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif', boxSizing: 'border-box', minHeight: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#059669' : '#ef4444',
          border: `1px solid ${toast.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b', fontWeight: 500, padding: 0, fontSize: '13px' }}
          >
            <ChevronLeft size={16} /> Back to Attendance
          </button>
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{currentTabLabel}</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Review and take action on attendance issues.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Main List ─────────────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => { setCurrentTab(tab.id); setSelectedRow(null); }}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: currentTab === tab.id ? '2px solid #ef4444' : '2px solid transparent',
                  color: currentTab === tab.id ? '#ef4444' : '#64748b',
                  fontWeight: currentTab === tab.id ? 600 : 500,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  whiteSpace: 'nowrap', flexShrink: 0, fontSize: '14px'
                }}
              >
                {tab.label}
                <span style={{
                  backgroundColor: currentTab === tab.id ? '#fee2e2' : '#f1f5f9',
                  color: currentTab === tab.id ? '#ef4444' : '#64748b',
                  padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
                }}>
                  {currentTab === tab.id ? issues.length : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fef3c7', color: '#d97706', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{kpi.pending}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Pending Review</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#dcfce7', color: '#10b981', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{kpi.approved}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Approved</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{kpi.rejected}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Rejected</div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>

            {/* ── Filters ───────────────────────────────────────────────────── */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Date Range — month navigator */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => shiftMonth(-1)}
                  style={{ padding: '8px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', borderRight: '1px solid #e2e8f0' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ padding: '8px 12px', fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', minWidth: '160px', textAlign: 'center' }}>
                  {monthLabel}
                </span>
                <button
                  onClick={() => shiftMonth(1)}
                  style={{ padding: '8px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', borderLeft: '1px solid #e2e8f0' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Department filter */}
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', minWidth: '140px', color: '#0f172a' }}
              >
                <option value=''>All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Employee filter */}
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', minWidth: '140px', color: '#0f172a' }}
              >
                <option value=''>All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>

              {/* Text search */}
              <div style={{ position: 'relative', flex: '1 1 180px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  type='text'
                  placeholder='Search by name, ID, or date...'
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => { setSelectedDepartment(''); setSelectedEmployeeId(''); setSearchText(''); const r = getDefaultDateRange(); setStartDate(r.startDate); setEndDate(r.endDate); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                Clear Filters
              </button>
            </div>

            {/* ── Table ─────────────────────────────────────────────────────── */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px', width: '30px' }}><input type='checkbox' /></th>
                    <th style={{ padding: '12px 8px' }}>Employee</th>
                    <th style={{ padding: '12px 8px' }}>Date</th>
                    <th style={{ padding: '12px 8px' }}>Type</th>
                    <th style={{ padding: '12px 8px' }}>Reason</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Requested On</th>
                    <th style={{ padding: '12px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='8' style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : pagedIssues.length === 0 ? (
                    <tr><td colSpan='8' style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found for the selected filters.</td></tr>
                  ) : pagedIssues.map(issue => (
                    <tr key={issue.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: selectedRow?.id === issue.id ? '#f1f5f9' : '#fff' }}>
                      <td style={{ padding: '12px 8px' }}><input type='checkbox' /></td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#475569', flexShrink: 0, fontSize: '12px' }}>
                            {avatar(issue)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{issue.first_name} {issue.last_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{issue.employee_code} | {issue.department_name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmtDate(issue.attendance_date)}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{fmtDay(issue.attendance_date)}</div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                          {(issue.request_type || 'correction').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={issue.reason}>
                        {issue.reason || '—'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{statusBadge(issue.status)}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>{fmtDate(issue.created_at)}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{issue.created_at ? new Date(issue.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedRow(issue)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: issue.status === 'pending' ? '#ffedd5' : '#f1f5f9',
                            color: issue.status === 'pending' ? '#ea580c' : '#64748b',
                            border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                          }}
                        >
                          {issue.status === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '13px' }}>
              <span>
                {issues.length === 0 ? 'No records' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, issues.length)} of ${issues.length}`}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', backgroundColor: page === 1 ? '#f8fafc' : '#fff', borderRadius: '4px', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#cbd5e1' : '#64748b' }}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${page === p ? '#3b82f6' : '#e2e8f0'}`, backgroundColor: page === p ? '#eff6ff' : '#fff', color: page === p ? '#3b82f6' : '#64748b', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', backgroundColor: page === totalPages ? '#f8fafc' : '#fff', borderRadius: '4px', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? '#cbd5e1' : '#64748b' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar: Request Details & Actions ────────────────────────────── */}
        {selectedRow && (
          <div style={{ flex: '0 0 340px', minWidth: '320px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', height: 'fit-content', position: 'sticky', top: '16px' }}>

            {/* Sidebar header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Absence Request Details</h3>
              <button onClick={() => setSelectedRow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>

              {/* Employee Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                  {avatar(selectedRow)}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{selectedRow.first_name} {selectedRow.last_name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedRow.employee_code} | {selectedRow.department_name || '—'}</div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {[
                  { icon: <Calendar size={15} />, label: 'Date',              value: `${fmtDate(selectedRow.attendance_date)} (${fmtDay(selectedRow.attendance_date)})` },
                  { icon: <AlertCircle size={15} />, label: 'Type',           value: (selectedRow.request_type || 'correction').replace(/_/g, ' ') },
                  { icon: <Clock size={15} />, label: 'Check-in Requested',   value: selectedRow.check_in_time || '—' },
                  { icon: <Clock size={15} />, label: 'Check-out Requested',  value: selectedRow.check_out_time || '—' },
                  { icon: <Calendar size={15} />, label: 'Requested On',      value: fmtDateTime(selectedRow.created_at) },
                  { icon: <FileText size={15} />, label: 'Status',            value: statusBadge(selectedRow.status) },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', minWidth: '160px', paddingTop: '1px' }}>
                      {icon} {label}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  <FileText size={16} /> Reason
                </div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  {selectedRow.reason || 'No reason provided.'}
                </div>
              </div>

              {/* Actions — only show if pending */}
              {selectedRow.status === 'pending' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                    <CheckSquare size={16} /> Action
                  </div>

                  {/* Approve / Reject toggle */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={() => setSelectedAction(a => a === 'approved' ? null : 'approved')}
                      style={{
                        flex: 1, padding: '10px',
                        backgroundColor: selectedAction === 'approved' ? '#059669' : '#ecfdf5',
                        color: selectedAction === 'approved' ? '#fff' : '#059669',
                        border: `2px solid ${selectedAction === 'approved' ? '#059669' : '#34d399'}`,
                        borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      onClick={() => setSelectedAction(a => a === 'rejected' ? null : 'rejected')}
                      style={{
                        flex: 1, padding: '10px',
                        backgroundColor: selectedAction === 'rejected' ? '#e11d48' : '#fef2f2',
                        color: selectedAction === 'rejected' ? '#fff' : '#e11d48',
                        border: `2px solid ${selectedAction === 'rejected' ? '#e11d48' : '#fda4af'}`,
                        borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>

                  {/* Action required hint */}
                  {!selectedAction && (
                    <p style={{ fontSize: '12px', color: '#f59e0b', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> Please select Approve or Reject before submitting.
                    </p>
                  )}

                  {/* Comment */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                      Add Comment (Optional)
                    </label>
                    <textarea
                      placeholder='Add a comment or reason for your decision...'
                      rows={4}
                      maxLength={500}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      style={{ boxSizing: 'border-box', width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{comment.length}/500</div>
                  </div>

                  {/* Submit / Cancel */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setSelectedRow(null)}
                      style={{ flex: 1, padding: '10px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !selectedAction}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '6px',
                        color: '#fff', fontSize: '14px', fontWeight: 600, cursor: submitting || !selectedAction ? 'not-allowed' : 'pointer',
                        backgroundColor: !selectedAction ? '#94a3b8' : selectedAction === 'approved' ? '#059669' : '#e11d48',
                        opacity: submitting ? 0.75 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Already processed — show result */
                <div style={{ backgroundColor: selectedRow.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${selectedRow.status === 'approved' ? '#6ee7b7' : '#fca5a5'}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  {selectedRow.status === 'approved'
                    ? <><CheckCircle2 size={24} color='#059669' style={{ marginBottom: '8px' }} /><div style={{ color: '#059669', fontWeight: 600 }}>Approved</div></>
                    : <><XCircle size={24} color='#e11d48' style={{ marginBottom: '8px' }} /><div style={{ color: '#e11d48', fontWeight: 600 }}>Rejected</div></>
                  }
                  {selectedRow.rejection_reason && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>{selectedRow.rejection_reason}</div>
                  )}
                  <button onClick={() => setSelectedRow(null)} style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
