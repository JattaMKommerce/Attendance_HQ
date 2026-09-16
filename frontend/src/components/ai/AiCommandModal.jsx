import React, { useEffect } from 'react';
import AiCommandCenter from './AiCommandCenter';
import '../../styles/ai-assistant.css';

export default function AiCommandModal({ isOpen, onClose }) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div 
        className="ai-modal-palette" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '720px', padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}
      >
        <AiCommandCenter onClose={onClose} />
      </div>
    </div>
  );
}
