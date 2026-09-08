import React, { useState, useEffect } from 'react';
import {
  Monitor, Plus, Search, Filter, X, CheckCircle,
  Edit2, RotateCcw, Laptop, Smartphone, Car, Package,
  Armchair, Printer as PrinterIcon, Wifi, HardDrive, AlertCircle
} from 'lucide-react';

// ── Asset type config ──────────────────────────────────────────────────────
const ASSET_TYPES = [
  { value: 'Laptop',          label: 'Laptop',           Icon: Laptop },
  { value: 'Desktop',         label: 'Desktop',          Icon: Monitor },
  { value: 'Mobile Phone',    label: 'Mobile Phone',     Icon: Smartphone },
  { value: 'Vehicle',         label: 'Vehicle',          Icon: Car },
  { value: 'Furniture',       label: 'Furniture',        Icon: Armchair },
  { value: 'Printer',         label: 'Printer',          Icon: PrinterIcon },
  { value: 'Network Device',  label: 'Network Device',   Icon: Wifi },
  { value: 'Storage Device',  label: 'Storage Device',   Icon: HardDrive },
  { value: 'Other',           label: 'Other',            Icon: Package },
];

const CONDITIONS   = ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged'];
const STATUSES     = ['Assigned', 'Available', 'Under Maintenance', 'Damaged', 'Lost'];

const STORAGE_KEY  = 'hrms_assets_v1';

function loadAssets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveAssets(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

const nextId = (list) => `AST-${String((list.length + 1)).padStart(4, '0')}`;

function statusColor(s) {
  if (s === 'Assigned')           return { bg: '#dbeafe', color: '#2563eb' };
  if (s === 'Available')          return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Under Maintenance')  return { bg: '#fef3c7', color: '#d97706' };
  if (s === 'Damaged')            return { bg: '#ffedd5', color: '#ea580c' };
  if (s === 'Lost')               return { bg: '#fee2e2', color: '#ef4444' };
  return { bg: '#f1f5f9', color: '#64748b' };
}

function conditionColor(c) {
  if (c === 'Excellent' || c === 'Good') return '#059669';
  if (c === 'Fair')                      return '#d97706';
  return '#ef4444';
}

const emptyForm = {
  assetType: 'Laptop', assetName: '', serialNo: '', employeeName: '',
  employeeId: '', department: '', dateIssued: new Date().toISOString().split('T')[0],
  dateReturned: '', condition: 'Good', status: 'Assigned', notes: ''
};

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:'20px', right:'24px', zIndex:9999, padding:'12px 20px',
      borderRadius:'8px', fontSize:'14px', fontWeight:500, backgroundColor:'#dcfce7', color:'#059669',
      border:'1px solid #6ee7b7', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:'8px' }}>
      <CheckCircle size={16} /> {message}
    </div>
  );
}

// ── AssetForm Modal ────────────────────────────────────────────────────────
function AssetFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial?.id;

  const handleSave = () => {
    if (!form.assetName.trim()) { alert('Asset name is required.'); return; }
    if (form.status === 'Assigned' && !form.employeeName.trim()) { alert('Employee name is required when status is Assigned.'); return; }
    onSave(form);
  };

  const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' };
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'560px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#0f172a' }}>{isEdit ? 'Edit Asset' : 'Add New Asset'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', padding:'4px' }}><X size={20} /></button>
        </div>

        <div style={{ padding:'24px', display:'grid', gap:'16px' }}>
          {/* Asset Type */}
          <div>
            <label style={labelStyle}>Asset Type *</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {ASSET_TYPES.map(({ value, label, Icon }) => (
                <button key={value} onClick={() => set('assetType', value)}
                  style={{ padding:'8px 12px', border:`2px solid ${form.assetType === value ? '#2563eb' : '#e5e7eb'}`,
                    borderRadius:'8px', background: form.assetType === value ? '#eff6ff' : '#fff',
                    color: form.assetType === value ? '#2563eb' : '#374151',
                    fontSize:'12px', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={labelStyle}>Asset Name *</label>
              <input style={inputStyle} placeholder="e.g. MacBook Pro 14" value={form.assetName} onChange={e => set('assetName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Serial / Tag No.</label>
              <input style={inputStyle} placeholder="e.g. SN-20240001" value={form.serialNo} onChange={e => set('serialNo', e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Employee details — shown when Assigned */}
          {form.status === 'Assigned' && (
            <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px', display:'grid', gap:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:'6px' }}>
                <Monitor size={14} /> Assigned To
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={labelStyle}>Employee Name *</label>
                  <input style={inputStyle} placeholder="Full name" value={form.employeeName} onChange={e => set('employeeName', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Employee ID</label>
                  <input style={inputStyle} placeholder="e.g. EMP001" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input style={inputStyle} placeholder="e.g. Engineering" value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={labelStyle}>Date Issued</label>
              <input type="date" style={inputStyle} value={form.dateIssued} onChange={e => set('dateIssued', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Date Returned</label>
              <input type="date" style={inputStyle} value={form.dateReturned} onChange={e => set('dateReturned', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Condition</label>
            <select style={inputStyle} value={form.condition} onChange={e => set('condition', e.target.value)}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize:'vertical' }} rows={3} placeholder="Any remarks about this asset…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ padding:'16px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:'12px' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:500 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'10px 20px', border:'none', borderRadius:'8px', background:'#2563eb', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
            {isEdit ? 'Update Asset' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Assets page ───────────────────────────────────────────────────────
export default function Assets() {
  const [assets,       setAssets]       = useState(loadAssets);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal,    setShowModal]    = useState(false);
  const [editAsset,    setEditAsset]    = useState(null);
  const [toast,        setToast]        = useState(null);
  const [viewAsset,    setViewAsset]    = useState(null);

  const showToast = (msg) => setToast(msg);

  const persist = (list) => { setAssets(list); saveAssets(list); };

  const handleAdd = (form) => {
    const newAsset = { ...form, id: nextId(assets), createdAt: new Date().toISOString() };
    persist([...assets, newAsset]);
    setShowModal(false);
    showToast(`Asset "${form.assetName}" added successfully.`);
  };

  const handleEdit = (form) => {
    persist(assets.map(a => a.id === editAsset.id ? { ...a, ...form } : a));
    setEditAsset(null);
    showToast(`Asset "${form.assetName}" updated.`);
  };

  const handleReturn = (id) => {
    persist(assets.map(a => a.id === id ? { ...a, status: 'Available', employeeName: '', employeeId: '', department: '', dateReturned: new Date().toISOString().split('T')[0] } : a));
    showToast('Asset marked as returned.');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this asset record?')) return;
    persist(assets.filter(a => a.id !== id));
    showToast('Asset deleted.');
  };

  // Filter
  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.assetName.toLowerCase().includes(q) || a.employeeName?.toLowerCase().includes(q) || a.serialNo?.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchType   = typeFilter   === 'All' || a.assetType   === typeFilter;
    const matchStatus = statusFilter === 'All' || a.status      === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // KPIs
  const kpiTotal    = assets.length;
  const kpiAssigned = assets.filter(a => a.status === 'Assigned').length;
  const kpiAvail    = assets.filter(a => a.status === 'Available').length;
  const kpiIssue    = assets.filter(a => ['Damaged','Lost','Under Maintenance'].includes(a.status)).length;

  const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; } catch { return d || '—'; } };

  return (
    <div style={{ padding:'24px', fontFamily:'"Inter", sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Add/Edit modal */}
      {showModal && <AssetFormModal onSave={handleAdd}  onClose={() => setShowModal(false)} />}
      {editAsset  && <AssetFormModal initial={editAsset} onSave={handleEdit} onClose={() => setEditAsset(null)} />}

      {/* Detail sidebar */}
      {viewAsset && (() => {
        const a = viewAsset;
        const sc = statusColor(a.status);
        const TypeIcon = ASSET_TYPES.find(t => t.value === a.assetType)?.Icon || Package;
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:900, display:'flex', justifyContent:'flex-end' }} onClick={() => setViewAsset(null)}>
            <div style={{ width:'360px', background:'#fff', height:'100%', overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,0.12)', padding:'24px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
                <h3 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#0f172a' }}>Asset Details</h3>
                <button onClick={() => setViewAsset(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280' }}><X size={20} /></button>
              </div>
              {/* Asset icon + name */}
              <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                <div style={{ width:'56px', height:'56px', borderRadius:'12px', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <TypeIcon size={28} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize:'18px', fontWeight:700, color:'#0f172a' }}>{a.assetName}</div>
                  <div style={{ fontSize:'13px', color:'#64748b' }}>{a.assetType} · {a.id}</div>
                </div>
              </div>
              <span style={{ ...sc, padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600, marginBottom:'20px', display:'inline-block' }}>{a.status}</span>
              {/* Fields */}
              {[
                ['Serial / Tag No.', a.serialNo || '—'],
                ['Condition', a.condition],
                ['Assigned To', a.employeeName || '—'],
                ['Employee ID', a.employeeId || '—'],
                ['Department', a.department || '—'],
                ['Date Issued', fmtDate(a.dateIssued)],
                ['Date Returned', fmtDate(a.dateReturned)],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:'13px' }}>
                  <span style={{ color:'#64748b' }}>{label}</span>
                  <span style={{ fontWeight:500, color:'#0f172a', textAlign:'right', maxWidth:'180px' }}>{value}</span>
                </div>
              ))}
              {a.notes && (
                <div style={{ marginTop:'16px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Notes</div>
                  <div style={{ fontSize:'13px', color:'#475569', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'10px' }}>{a.notes}</div>
                </div>
              )}
              <div style={{ marginTop:'24px', display:'flex', gap:'8px' }}>
                <button onClick={() => { setEditAsset(a); setViewAsset(null); }}
                  style={{ flex:1, padding:'10px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <Edit2 size={14} /> Edit
                </button>
                {a.status === 'Assigned' && (
                  <button onClick={() => { handleReturn(a.id); setViewAsset(null); }}
                    style={{ flex:1, padding:'10px', border:'none', borderRadius:'8px', background:'#059669', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                    <RotateCcw size={14} /> Mark Returned
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:800, color:'#0f172a' }}>Asset Management</h1>
          <p style={{ margin:0, color:'#64748b', fontSize:'14px' }}>Track company assets — what's assigned to whom, when, and in what condition.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ padding:'10px 20px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'24px' }}>
        {[
          { label:'Total Assets',   value:kpiTotal,    bg:'#eff6ff', color:'#2563eb', Icon:Monitor },
          { label:'Assigned',       value:kpiAssigned, bg:'#dbeafe', color:'#1d4ed8', Icon:Monitor },
          { label:'Available',      value:kpiAvail,    bg:'#dcfce7', color:'#059669', Icon:CheckCircle },
          { label:'Issues',         value:kpiIssue,    bg:'#fee2e2', color:'#ef4444', Icon:AlertCircle },
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

      {/* ── Filters & Table ──────────────────────────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'12px', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Filter bar */}
        <div style={{ padding:'16px', borderBottom:'1px solid #e5e7eb', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          {/* Search */}
          <div style={{ position:'relative', flex:'1 1 200px' }}>
            <Search size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
            <input type="text" placeholder="Search by name, employee, serial…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px 9px 36px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', outline:'none' }} />
          </div>
          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', minWidth:'140px', color:'#374151' }}>
            <option value="All">All Types</option>
            {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', minWidth:'140px', color:'#374151' }}>
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {/* Clear */}
          {(search || typeFilter !== 'All' || statusFilter !== 'All') && (
            <button onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); }}
              style={{ background:'none', border:'none', color:'#2563eb', fontSize:'13px', cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>Clear Filters</button>
          )}
          <span style={{ marginLeft:'auto', fontSize:'13px', color:'#64748b' }}>{filtered.length} records</span>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb', textAlign:'left' }}>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Asset</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Type</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Assigned To</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Department</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Date Issued</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Condition</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600 }}>Status</th>
                <th style={{ padding:'12px 16px', color:'#6b7280', fontWeight:600, textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign:'center', padding:'48px', color:'#9ca3af' }}>
                  {assets.length === 0 ? 'No assets yet. Click "Add Asset" to get started.' : 'No assets match your filters.'}
                </td></tr>
              ) : filtered.map(a => {
                const sc       = statusColor(a.status);
                const TypeIcon = ASSET_TYPES.find(t => t.value === a.assetType)?.Icon || Package;
                return (
                  <tr key={a.id} style={{ borderBottom:'1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <TypeIcon size={18} color="#2563eb" />
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'#0f172a' }}>{a.assetName}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af' }}>{a.id}{a.serialNo ? ` · ${a.serialNo}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#374151' }}>{a.assetType}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {a.employeeName
                        ? <div><div style={{ fontWeight:500, color:'#0f172a' }}>{a.employeeName}</div><div style={{ fontSize:'11px', color:'#9ca3af' }}>{a.employeeId || ''}</div></div>
                        : <span style={{ color:'#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px', color:'#374151' }}>{a.department || '—'}</td>
                    <td style={{ padding:'12px 16px', color:'#374151', whiteSpace:'nowrap' }}>{fmtDate(a.dateIssued)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ color: conditionColor(a.condition), fontWeight:500, fontSize:'12px' }}>● {a.condition}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ ...sc, padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, whiteSpace:'nowrap' }}>{a.status}</span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}>
                      <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}>
                        <button onClick={() => setViewAsset(a)} title="View"
                          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:'6px', background:'#fff', cursor:'pointer', fontSize:'12px', color:'#374151', display:'flex', alignItems:'center', gap:'4px' }}>
                          View
                        </button>
                        <button onClick={() => setEditAsset(a)} title="Edit"
                          style={{ padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:'6px', background:'#fff', cursor:'pointer', color:'#374151' }}>
                          <Edit2 size={14} />
                        </button>
                        {a.status === 'Assigned' && (
                          <button onClick={() => handleReturn(a.id)} title="Mark as Returned"
                            style={{ padding:'6px 8px', border:'1px solid #6ee7b7', borderRadius:'6px', background:'#dcfce7', cursor:'pointer', color:'#059669' }}>
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(a.id)} title="Delete"
                          style={{ padding:'6px 8px', border:'1px solid #fca5a5', borderRadius:'6px', background:'#fee2e2', cursor:'pointer', color:'#ef4444' }}>
                          <X size={14} />
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
