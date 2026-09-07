import React, { useState } from 'react';
import './Recruitment.css';

const INITIAL_CANDIDATES = [
  { id: 1, name: 'Alice Smith', role: 'Senior Frontend Engineer', stage: 'Sourced', rating: '⭐⭐⭐⭐' },
  { id: 2, name: 'Bob Johnson', role: 'Product Manager', stage: 'Screening', rating: '⭐⭐⭐' },
  { id: 3, name: 'Charlie Davis', role: 'UX Designer', stage: 'Interview', rating: '⭐⭐⭐⭐⭐' },
  { id: 4, name: 'Diana Evans', role: 'Backend Engineer', stage: 'Offered', rating: '⭐⭐⭐⭐' },
  { id: 5, name: 'Eve Foster', role: 'HR Manager', stage: 'Sourced', rating: '⭐⭐' }
];

const STAGES = ['Sourced', 'Screening', 'Interview', 'Offered', 'Hired'];

export default function Recruitment() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, candidate) => {
    setDraggedItem(candidate);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    setCandidates(prev => prev.map(c => 
      c.id === draggedItem.id ? { ...c, stage } : c
    ));
    setDraggedItem(null);
  };

  return (
    <div className="mgmt-page">
      <div className="mgmt-header">
        <div>
          <h1>Recruitment & ATS</h1>
          <p>Track candidates through the hiring pipeline.</p>
        </div>
        <button className="btn btn-primary">+ Add Candidate</button>
      </div>

      <div className="kanban-board">
        {STAGES.map(stage => (
          <div 
            key={stage} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="kanban-column-header">
              <span>{stage}</span>
              <span className="count">{candidates.filter(c => c.stage === stage).length}</span>
            </div>
            <div className="kanban-cards">
              {candidates.filter(c => c.stage === stage).map(candidate => (
                <div 
                  key={candidate.id} 
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate)}
                >
                  <h4>{candidate.name}</h4>
                  <p>{candidate.role}</p>
                  <div className="kanban-meta">
                    <span className="kanban-rating">{candidate.rating}</span>
                    <span>Applied 2d ago</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
