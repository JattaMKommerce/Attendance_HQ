import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, User } from 'lucide-react';
import './Recruitment.css';

const STAGES = ['Sourced', 'Screening', 'Interview', 'Offered', 'Hired'];

export default function Recruitment() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    stage: 'Sourced',
    rating: '⭐⭐⭐⭐'
  });

  // Load from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jmk_recruitment_candidates');
      if (saved) {
        setCandidates(JSON.parse(saved));
      } else {
        setCandidates([]);
      }
    } catch {
      setCandidates([]);
    }
  }, []);

  const saveCandidates = (newList) => {
    setCandidates(newList);
    try {
      localStorage.setItem('jmk_recruitment_candidates', JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  const handleDragStart = (e, candidate) => {
    setDraggedItem(candidate);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (!draggedItem) return;

    const updated = candidates.map(c =>
      c.id === draggedItem.id ? { ...c, stage } : c
    );
    saveCandidates(updated);
    setDraggedItem(null);
  };

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;

    const newCandidate = {
      id: Date.now(),
      name: formData.name.trim(),
      role: formData.role.trim(),
      stage: formData.stage,
      rating: formData.rating,
      appliedAt: 'Just now'
    };

    saveCandidates([...candidates, newCandidate]);
    setFormData({ name: '', role: '', stage: 'Sourced', rating: '⭐⭐⭐⭐' });
    setIsModalOpen(false);
  };

  const handleDeleteCandidate = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Remove candidate from recruitment pipeline?')) {
      saveCandidates(candidates.filter(c => c.id !== id));
    }
  };

  return (
    <div className="mgmt-page">
      <div className="mgmt-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#334155', fontWeight: 500 }}
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Recruitment & ATS</h1>
            <p style={{ margin: '4px 0 0' }}>Track candidates through the hiring pipeline.</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      <div className="kanban-board">
        {STAGES.map(stage => {
          const stageCandidates = candidates.filter(c => c.stage === stage);
          return (
            <div 
              key={stage} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="kanban-column-header">
                <span>{stage}</span>
                <span className="count">{stageCandidates.length}</span>
              </div>
              <div className="kanban-cards">
                {stageCandidates.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                    No candidates
                  </div>
                ) : (
                  stageCandidates.map(candidate => (
                    <div 
                      key={candidate.id} 
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, candidate)}
                      style={{ position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: '0 0 4px 0' }}>{candidate.name}</h4>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                          title="Delete Candidate"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p>{candidate.role}</p>
                      <div className="kanban-meta">
                        <span className="kanban-rating">{candidate.rating}</span>
                        <span>{candidate.appliedAt || 'Active'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Candidate Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Candidate</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                  Candidate Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ananya Rao"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                  Position / Role *
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Initial Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Rating
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="⭐⭐⭐⭐⭐">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="⭐⭐⭐⭐">⭐⭐⭐⭐ (4/5)</option>
                    <option value="⭐⭐⭐">⭐⭐⭐ (3/5)</option>
                    <option value="⭐⭐">⭐⭐ (2/5)</option>
                    <option value="⭐">⭐ (1/5)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
