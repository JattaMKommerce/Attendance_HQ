import React, { useState, useEffect } from 'react';
import {
  UserX, Plus, Search, X, CheckCircle, CheckCircle2,
  Circle, Clock, AlertCircle, ChevronRight, ChevronLeft,
  FileText, Shield, Package, IndianRupee, Mail, Briefcase,
  Award, Users, Calendar, Trash2, RotateCcw
} from 'lucide-react';

// ── Offboarding checklist template ────────────────────────────────────────
const CHECKLIST_TEMPLATE = [
  { id: 'resignation',    icon: FileText,   label: 'Resignation Letter Received',        description: 'Formal resignation letter collected and filed.', category: 'Documentation' },
  { id: 'exit_interview', icon: Users,      label: 'Exit Interview Scheduled',           description: 'Exit interview scheduled and completed by HR.', category: 'Documentation' },
  { id: 'kt',            icon: Briefcase,  label: 'Knowledge Transfer Completed',       description: 'All ongoing tasks, documentation and access transferred to team.', category: 'Knowledge' },
  { id: 'assets',        icon: Package,    label: 'Company Assets Returned',            description: 'Laptop, mobile, access cards and all assigned assets returned.', category: 'Assets' },
  { id: 'access',        icon: Shield,     label: 'System Access Revoked',              description: 'Email, Slack, JIRA, GitHub and all system accounts deactivated.', category: 'IT & Security' },
  { id: 'email',         icon: Mail,       label: 'Official Email Deactivated',         description: 'Corporate email account disabled and auto-reply set.', category: 'IT & Security' },
  { id: 'payroll',       icon: IndianRupee, label: 'Final Payroll Processed',            description: 'Full and final settlement including LOP, notice pay, and pending leaves.', category: 'Finance' },
  { id: 'pf',            icon: IndianRupee, label: 'PF / Gratuity Settlement',           description: 'Provident Fund transfer and gratuity payment processed if applicable.', category: 'Finance' },
  { id: 'relieving',     icon: Award,      label: 'Relieving / Experience Letter Issued', description: 'Official relieving letter and experience certificate issued.', category: 'Documentation' },
  { id: 'noc',           icon: FileText,   label: 'NOC / Clearance Certificate Issued', description: 'No-objection certificate from all departments collected and issued.', category: 'Documentation' },
];

const OFFBOARDING_TYPES   = ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Layoff'];
const OFFBOARDING_REASONS = ['Personal reasons', 'Better opportunity', 'Relocation', 'Health reasons', 'End of contract', 'Performance', 'Company restructuring', 'Other'];

const STORAGE_KEY = 'hrms_offboarding_v1';
function load()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function save(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
let nextId = 1;

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; } catch { return d || '—'; } };

function daysLeft(lastDate) {
  const diff = new Date(lastDate) - new Date();
  const days = Math.round(diff / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} days ago`, color: '#64748b' };
  if (days === 0) return { label: 'Today', color: '#ef4444' };
  if (days <= 7) return { label: `${days} days left`, color: '#ef4444' };
  if (days <= 14) return { label: `${days} days left`, color: '#f59e0b' };
  return { label: `${days} days left`, color: '#059669' };
}

function overallStatus(checklist) {
  const done  = checklist.filter(i => i.done).length;
  const total = checklist.length;
  if (done === total) return { label: 'Completed',   color: '#059669', bg: '#dcfce7' };
  if (done === 0)     return { label: 'Not Started', color: '#64748b', bg: '#f1f5f9' };
  return                    { label: 'In Progress',  color: '#d97706', bg: '#fef3c7' };
}

const CATEGORIES = [...new Set(CHECKLIST_TEMPLATE.map(i => i.category))];

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:'20px', right:'24px', zIndex:9999, padding:'12px 20px',
      borderRadius:'8px', fontSize:'14px', fontWeight:500, background:'#dcfce7', color:'#059669',
      border:'1px solid #6ee7b7', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:'8px' }}>
      <CheckCircle size={16} /> {msg}
    </div>
  );
}

// ── Add Offboarding Modal ──────────────────────────────────────────────────
function AddOffboardingModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    employeeName: '', employeeId: '', department: '', designation: '',
    type: 'Resignation', reason: 'Personal reasons',
    lastWorkingDate: '', noticeDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ls  = { fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px', display:'block' };
  const is  = { width:'100%', boxSizing:'border-box', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'6px', fontSize:'13px', outline:'none', fontFamily:'inherit' };

  const handleSave = () => {
    if (!form.employeeName.trim()) { alert('Employee name is required.'); return; }
    if (!form.lastWorkingDate)     { alert('Last working date is required.'); return; }
    onSave(form);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'540px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#0f172a' }}>Initiate Offboarding</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280' }}><X size={20} /></button>
        </div>
        <div style={{ padding:'24px', display:'grid', gap:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div><label style={ls}>Employee Name *</label><input style={is} placeholder="Full name" value={form.employeeName} onChange={e => set('employeeName', e.target.value)} /></div>
            <div><label style={ls}>Employee ID</label><input style={is} placeholder="e.g. EMP001" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div><label style={ls}>Department</label><input style={is} placeholder="e.g. Engineering" value={form.department} onChange={e => set('department', e.target.value)} /></div>
            <div><label style={ls}>Designation</label><input style={is} placeholder="e.g. Senior Developer" value={form.designation} onChange={e => set('designation', e.target.value)} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={ls}>Offboarding Type</label>
              <select style={is} value={form.type} onChange={e => set('type', e.target.value)}>
                {OFFBOARDING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={ls}>Reason</label>
              <select style={is} value={form.reason} onChange={e => set('reason', e.target.value)}>
                {OFFBOARDING_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div><label style={ls}>Notice Date</label><input type="date" style={is} value={form.noticeDate} onChange={e => set('noticeDate', e.target.value)} /></div>
            <div><label style={ls}>Last Working Date *</label><input type="date" style={is} value={form.lastWorkingDate} onChange={e => set('lastWorkingDate', e.target.value)} /></div>
          </div>
          <div><label style={ls}>Notes</label><textarea style={{ ...is, resize:'vertical' }} rows={3} placeholder="Any remarks…" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:'12px' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:500 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'10px 20px', border:'none', borderRadius:'8px', background:'#ef4444', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
            Initiate Offboarding
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Checklist Panel ────────────────────────────────────────────────────────
function ChecklistPanel({ record, onUpdate, onClose }) {
  const status = overallStatus(record.checklist);
  const done   = record.checklist.filter(i => i.done).length;
  const pct    = Math.round((done / record.checklist.length) * 100);
  const dl     = daysLeft(record.lastWorkingDate);

  const toggle = (id) => {
    const updated = { ...record, checklist: record.checklist.map(i => i.id === id ? { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : null } : i) };
    onUpdate(updated);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:900, display:'flex', justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ width:'420px', background:'#fff', height:'100%', overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <div>
              <h3 style={{ margin:'0 0 2px', fontSize:'18px', fontWeight:700, color:'#0f172a' }}>{record.employeeName}</h3>
              <div style={{ fontSize:'13px', color:'#64748b' }}>{record.designation} · {record.department}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280' }}><X size={20} /></button>
          </div>
          {/* Status & dates */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
            <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:status.bg, color:status.color }}>{status.label}</span>
            <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:'#f1f5f9', color:'#64748b' }}>{record.type}</span>
            <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:'#f1f5f9', color:dl.color }}>{dl.label}</span>
          </div>
          {/* Progress bar */}
          <div style={{ marginBottom:'4px', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#64748b' }}>
            <span>Checklist Progress</span><span>{done}/{record.checklist.length} ({pct}%)</span>
          </div>
          <div style={{ height:'6px', background:'#e5e7eb', borderRadius:'4px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background: pct === 100 ? '#059669' : pct > 50 ? '#f59e0b' : '#ef4444', borderRadius:'4px', transition:'width 0.3s ease' }} />
          </div>
        </div>

        {/* Checklist by category */}
        <div style={{ flex:1, padding:'16px 24px', overflowY:'auto' }}>
          {CATEGORIES.map(cat => {
            const items = record.checklist.filter(i => i.category === cat);
            return (
              <div key={cat} style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>{cat}</div>
                {items.map(item => {
                  const Icon = CHECKLIST_TEMPLATE.find(t => t.id === item.id)?.icon || CheckCircle;
                  return (
                    <div key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{ display:'flex', gap:'12px', alignItems:'flex-start', padding:'12px', borderRadius:'8px', marginBottom:'6px', cursor:'pointer', border:`1px solid ${item.done ? '#6ee7b7' : '#e5e7eb'}`, background: item.done ? '#f0fdf4' : '#fff', transition:'all 0.15s ease' }}>
                      <div style={{ marginTop:'1px', flexShrink:0 }}>
                        {item.done
                          ? <CheckCircle2 size={20} color="#059669" />
                          : <Circle size={20} color="#d1d5db" />}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color: item.done ? '#059669' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</div>
                        <div style={{ fontSize:'12px', color:'#64748b', marginTop:'2px' }}>{item.description}</div>
                        {item.done && item.doneAt && (
                          <div style={{ fontSize:'11px', color:'#6ee7b7', marginTop:'4px' }}>Completed {fmtDate(item.doneAt)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Notes */}
          {record.notes && (
            <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px', marginTop:'8px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px' }}>NOTES</div>
              <div style={{ fontSize:'13px', color:'#374151' }}>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #e5e7eb', background:'#f9fafb' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'12px', color:'#64748b' }}>
            <div><strong style={{ color:'#374151' }}>Notice Date:</strong> {fmtDate(record.noticeDate)}</div>
            <div><strong style={{ color:'#374151' }}>Last Day:</strong> {fmtDate(record.lastWorkingDate)}</div>
            <div><strong style={{ color:'#374151' }}>Reason:</strong> {record.reason}</div>
            <div><strong style={{ color:'#374151' }}>Employee ID:</strong> {record.employeeId || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Offboarding page ──────────────────────────────────────────────────
export default function Offboarding() {
  const [records,     setRecords]     = useState(() => { const d = load(); nextId = d.length + 1; return d; });
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('All');
  const [statusFilterVal, setStatusFilterVal] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [toast,       setToast]       = useState(null);

  const persist = (list) => { setRecords(list); save(list); };

  const handleAdd = (form) => {
    const id       = `OB-${String(nextId++).padStart(4,'0')}`;
    const checklist = CHECKLIST_TEMPLATE.map(t => ({ id: t.id, category: t.category, label: t.label, done: false, doneAt: null }));
    persist([...records, { ...form, id, checklist, createdAt: new Date().toISOString() }]);
    setShowAddModal(false);
    setToast(`Offboarding initiated for ${form.employeeName}.`);
  };

  const handleUpdate = (updated) => {
    persist(records.map(r => r.id === updated.id ? updated : r));
    setActiveRecord(updated);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Remove this offboarding record?')) return;
    if (activeRecord?.id === id) setActiveRecord(null);
    persist(records.filter(r => r.id !== id));
    setToast('Offboarding record removed.');
  };

  // KPIs
  const kpiTotal     = records.length;
  const kpiInProg    = records.filter(r => overallStatus(r.checklist).label === 'In Progress').length;
  const kpiCompleted = records.filter(r => overallStatus(r.checklist).label === 'Completed').length;
  const kpiPending   = records.filter(r => overallStatus(r.checklist).label === 'Not Started').length;

  // Filter
  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.employeeName.toLowerCase().includes(q) || (r.employeeId||'').toLowerCase().includes(q) || (r.department||'').toLowerCase().includes(q);
    const matchType   = typeFilter === 'All' || r.type === typeFilter;
    const matchStatus = statusFilterVal === 'All' || overallStatus(r.checklist).label === statusFilterVal;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div style={{ padding:'24px', fontFamily:'"Inter", sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      {showAddModal && <AddOffboardingModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />}
      {activeRecord  && <ChecklistPanel record={activeRecord} onUpdate={handleUpdate} onClose={() => setActiveRecord(null)} />}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:800, color:'#0f172a', display:'flex', alignItems:'center', gap:'10px' }}>
            <UserX size={26} color="#ef4444" /> Offboarding
          </h1>
          <p style={{ margin:0, color:'#64748b', fontSize:'14px' }}>Manage employee exits — track every step from resignation to final clearance.</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding:'10px 20px', background:'#ef4444', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
          <Plus size={16} /> Initiate Offboarding
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
        {[
          { label:'Total',        value:kpiTotal,     bg:'#eff6ff', color:'#2563eb', Icon:UserX },
          { label:'In Progress',  value:kpiInProg,    bg:'#fef3c7', color:'#d97706', Icon:Clock },
          { label:'Completed',    value:kpiCompleted, bg:'#dcfce7', color:'#059669', Icon:CheckCircle2 },
          { label:'Not Started',  value:kpiPending,   bg:'#f1f5f9', color:'#64748b', Icon:Circle },
        ].map(({ label, value, bg, color, Icon }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'16px', display:'flex', alignItems:'center', gap:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize:'24px', fontWeight:800, color:'#0f172a' }}>{value}</div>
              <div style={{ fontSize:'12px', color:'#64748b' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Checklist Reference Banner ────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#1e3a8a,#2563eb)', borderRadius:'12px', padding:'20px 24px', marginBottom:'24px', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'4px' }}>Offboarding Checklist ({CHECKLIST_TEMPLATE.length} steps)</div>
            <div style={{ fontSize:'13px', opacity:0.85 }}>Each offboarding case has a full checklist. Click "Open Checklist" on any record to manage it.</div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {CATEGORIES.map(cat => (
              <span key={cat} style={{ padding:'4px 10px', background:'rgba(255,255,255,0.15)', borderRadius:'20px', fontSize:'12px', fontWeight:500 }}>{cat}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters & Table ──────────────────────────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'12px', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Filter bar */}
        <div style={{ padding:'16px', borderBottom:'1px solid #e5e7eb', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:'1 1 200px' }}>
            <Search size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
            <input type="text" placeholder="Search by name, ID, department…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px 9px 36px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', outline:'none' }} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', minWidth:'140px', color:'#374151' }}>
            <option value="All">All Types</option>
            {OFFBOARDING_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilterVal} onChange={e => setStatusFilterVal(e.target.value)}
            style={{ padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', minWidth:'140px', color:'#374151' }}>
            <option value="All">All Statuses</option>
            <option>Not Started</option><option>In Progress</option><option>Completed</option>
          </select>
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#64748b' }}>{filtered.length} records</span>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb', textAlign:'left' }}>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Employee</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Type</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Last Working Date</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Progress</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Status</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600, textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign:'center', padding:'56px', color:'#9ca3af' }}>
                  {records.length === 0
                    ? <div><UserX size={40} style={{ marginBottom:'12px', opacity:0.3 }} /><br/>No offboarding records yet.<br/><br/><span style={{ fontSize:'13px' }}>Click "Initiate Offboarding" to add the first record.</span></div>
                    : 'No records match your filters.'}
                </td></tr>
              ) : filtered.map(r => {
                const status  = overallStatus(r.checklist);
                const done    = r.checklist.filter(i => i.done).length;
                const total   = r.checklist.length;
                const pct     = Math.round((done / total) * 100);
                const dl      = daysLeft(r.lastWorkingDate);
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#ef4444', flexShrink:0, fontSize:'14px' }}>
                          {r.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'#0f172a' }}>{r.employeeName}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af' }}>{r.employeeId || r.id} · {r.designation || r.department || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:'20px', background:'#f1f5f9', color:'#475569', fontSize:'12px', fontWeight:500 }}>{r.type}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:500, color:'#0f172a' }}>{fmtDate(r.lastWorkingDate)}</div>
                      <div style={{ fontSize:'11px', color:dl.color, fontWeight:500 }}>{dl.label}</div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ flex:1, height:'6px', background:'#e5e7eb', borderRadius:'4px', overflow:'hidden', minWidth:'80px' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'#059669':pct>50?'#f59e0b':'#ef4444', borderRadius:'4px' }} />
                        </div>
                        <span style={{ fontSize:'12px', color:'#64748b', minWidth:'32px' }}>{done}/{total}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:status.bg, color:status.color }}>{status.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}>
                      <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}>
                        <button onClick={() => setActiveRecord(r)}
                          style={{ padding:'6px 12px', border:'1px solid #2563eb', borderRadius:'6px', background:'#eff6ff', color:'#2563eb', cursor:'pointer', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', gap:'4px' }}>
                          Open Checklist <ChevronRight size={12} />
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          style={{ padding:'6px 8px', border:'1px solid #fca5a5', borderRadius:'6px', background:'#fee2e2', cursor:'pointer', color:'#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
