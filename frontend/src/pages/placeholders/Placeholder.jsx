import React from 'react';
import { Settings } from 'lucide-react';

const Placeholder = ({ title }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      
      <div className="empty-state">
        <Settings className="empty-state-icon" size={48} />
        <h3 className="empty-state-title">{title} Module</h3>
        <p className="empty-state-desc">
          The routing, navigation, and layout for this module are established. 
          Database integration and functional UI will be built in the upcoming phase.
        </p>
      </div>
    </div>
  );
};

export default Placeholder;
