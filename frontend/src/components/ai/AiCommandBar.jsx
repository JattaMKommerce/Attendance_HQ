import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import aiApi from '../../services/aiApi';
import AiResponseView from './AiResponseView';
import '../../styles/ai-assistant.css';

export default function AiCommandBar({ defaultOpen = false, className = '' }) {
  const { user } = useContext(AuthContext);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadSuggestions = async () => {
      try {
        const res = await aiApi.getSuggestions();
        if (isMounted && res.success && res.data) {
          setSuggestions(res.data);
        }
      } catch (err) {
        // Fallback default suggestions based on role
        if (isMounted) {
          const isAdmin = user?.roles?.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(r));
          if (isAdmin) {
            setSuggestions([
              "Onboard Rahul Sharma as a Software Engineer",
              "Show employees absent today",
              "Show attendance for the IT department",
              "Generate this month's payroll report",
              "Show employees whose documents are missing"
            ]);
          } else {
            setSuggestions([
              "Show my attendance this month",
              "Show my leave balance",
              "Apply leave for Friday",
              "Show my salary slip",
              "What's my onboarding status?"
            ]);
          }
        }
      }
    };

    if (user) {
      loadSuggestions();
    }
    return () => { isMounted = false; };
  }, [user]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!command.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await aiApi.sendCommand(command.trim());
      setResponse(res);
    } catch (err) {
      setResponse({
        success: false,
        message: err.response?.data?.message || 'Failed to communicate with AI assistant. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (suggestionText) => {
    setCommand(suggestionText);
  };

  const handleConfirm = async (confirmationId) => {
    setLoading(true);
    try {
      const res = await aiApi.confirmAction(confirmationId, true);
      setResponse(res);
    } catch (err) {
      setResponse({
        success: false,
        message: err.response?.data?.message || 'Failed to confirm action.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (confirmationId) => {
    setLoading(true);
    try {
      const res = await aiApi.confirmAction(confirmationId, false);
      setResponse(res);
    } catch (err) {
      setResponse({
        success: false,
        message: err.response?.data?.message || 'Failed to cancel action.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    // If the previous command was about an ambiguous employee, replace with exact code
    setCommand(`Show details for ${candidate.employee_code}`);
  };

  return (
    <div className={`ai-command-container ${className}`}>
      <div className="ai-command-header">
        <div className="ai-command-title-wrap">
          <div className="ai-badge-pill">
            <Sparkles size={12} />
            <span>AI Command Center</span>
          </div>
        </div>
      </div>

      <h2 className="ai-command-title">
        ✨ What would you like me to do?
      </h2>
      <p className="ai-command-subtitle" style={{ marginBottom: '14px' }}>
        Control HRMS operations naturally without clicking through multiple screens.
      </p>

      {/* Main Input Bar */}
      <form onSubmit={handleSubmit} className="ai-input-form">
        <Sparkles size={18} className="ai-input-icon" />
        <input
          type="text"
          className="ai-input-field"
          placeholder="Ask AI to manage employees, attendance, leave, payroll, onboarding, documents, or your profile..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="ai-submit-btn"
          disabled={!command.trim() || loading}
          title="Send command"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin-animation" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <span>Execute</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="ai-suggestions-tray">
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
            Suggestions:
          </span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="ai-suggestion-chip"
              onClick={() => handleChipClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* AI Response Output Area */}
      {response && (
        <AiResponseView
          response={response}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onSelectCandidate={handleSelectCandidate}
        />
      )}
    </div>
  );
}
