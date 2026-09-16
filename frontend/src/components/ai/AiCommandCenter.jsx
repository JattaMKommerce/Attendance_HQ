import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  ArrowRight, 
  Bot, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  PanelLeft,
  X
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import aiApi from '../../services/aiApi';
import ConfirmationCard from './ConfirmationCard';
import MultiStepStatusCard from './MultiStepStatusCard';
import ConversationDrawer from './ConversationDrawer';
import AnalyticsDataCard from './AnalyticsDataCard';
import InsightCenter from './InsightCenter';
import '../../styles/ai-assistant.css';

const STORAGE_ACTIVE_CONV = 'hrms_active_ai_conversation_id';

export default function AiCommandCenter({ className = '', onActionComplete, onClose }) {
  const { user } = useContext(AuthContext);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [conversationsList, setConversationsList] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'insights'
  const [unreadInsightsCount, setUnreadInsightsCount] = useState(0);
  const messagesEndRef = useRef(null);

  const isAdmin = user?.roles?.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(r));

  // Fetch insight summary for badge
  const fetchInsightSummary = useCallback(async () => {
    try {
      const res = await aiApi.getInsightSummary();
      if (res.success && res.data) {
        setUnreadInsightsCount(res.data.unread || 0);
      }
    } catch (err) {
      // Ignore if unprivileged
    }
  }, []);

  useEffect(() => {
    fetchInsightSummary();
  }, [fetchInsightSummary]);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingThreads(true);
      const res = await aiApi.getConversations(true);
      if (res.success && Array.isArray(res.data)) {
        setConversationsList(res.data);
        return res.data;
      }
      return [];
    } catch (err) {
      console.warn('Failed to load conversation threads:', err.message);
      return [];
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  // Format historical messages from backend into UI chat bubbles
  const formatBackendMessages = (res) => {
    const rawMessages = res.messages || res.data || [];
    if (!Array.isArray(rawMessages)) return [];

    return rawMessages.map((m, idx, arr) => {
      const isLast = idx === arr.length - 1;
      let status = 'success';
      let rawResponse = null;

      // Restore authoritative server-side confirmation card on the last assistant message
      if (isLast && m.role === 'assistant' && res.active_confirmation) {
        status = 'confirmation';
        rawResponse = {
          requires_confirmation: true,
          confirmation_id: res.active_confirmation.confirmation_id,
          confirmation_prompt: res.active_confirmation.confirmation_prompt || res.active_confirmation.prompt,
          confirmation_details: res.active_confirmation.confirmation_details || res.active_confirmation.details,
          summary: res.active_confirmation.summary
        };
      } else if (isLast && m.role === 'assistant' && res.workflow_state?.step === 'collecting_slots') {
        status = 'slot_filling';
        rawResponse = {
          step: 'collecting_slots',
          slots: res.workflow_state.slots,
          missing_slots: res.workflow_state.missing_slots
        };
      }

      return {
        id: `hist_${m.id}`,
        role: m.role,
        text: m.content,
        status,
        rawResponse,
        timestamp: new Date(m.created_at)
      };
    });
  };

  // Load a specific conversation thread by ID
  const loadConversationThread = useCallback(async (targetId) => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await aiApi.getConversationMessages(targetId);
      if (res.success) {
        setConversationId(targetId);
        sessionStorage.setItem(STORAGE_ACTIVE_CONV, String(targetId));
        const formatted = formatBackendMessages(res);
        setConversation(formatted);
      }
    } catch (err) {
      console.warn(`Failed to load conversation ${targetId}:`, err.message);
      sessionStorage.removeItem(STORAGE_ACTIVE_CONV);
      setConversationId(null);
      setConversation([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount: load suggestions and restore active conversation
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // 1. Fetch suggestions
      try {
        const suggRes = await aiApi.getSuggestions();
        if (isMounted && suggRes.success && suggRes.data) {
          setSuggestions(suggRes.data);
        }
      } catch (e) {
        if (isMounted) {
          setSuggestions(isAdmin ? [
            "Which department has the highest absenteeism this month?",
            "Compare IT and Sales attendance for Q3",
            "What is the average employee tenure?",
            "How many employees joined this month?",
            "Which employees have used more than 50% of their leave balance?",
            "Show department headcount"
          ] : [
            "How many leaves do I have?",
            "Apply leave for Friday",
            "Show my attendance this month",
            "Show my payslip",
            "What's my onboarding status?",
            "Show my profile"
          ]);
        }
      }

      // 2. Fetch conversation threads and restore active conversation
      const threads = await fetchConversations();
      if (!isMounted) return;

      const savedConvId = sessionStorage.getItem(STORAGE_ACTIVE_CONV);
      let targetConvId = null;

      if (savedConvId) {
        const exists = threads.find(t => String(t.id) === String(savedConvId));
        if (exists && exists.status !== 'archived') {
          targetConvId = exists.id;
        }
      }

      // Fallback: pick the most recent active thread if exists
      if (!targetConvId && threads.length > 0) {
        const recentActive = threads.find(t => t.status === 'active' || !t.status);
        if (recentActive) {
          targetConvId = recentActive.id;
        }
      }

      if (targetConvId) {
        await loadConversationThread(targetConvId);
      }
    };

    if (user) {
      initialize();
    }

    return () => { isMounted = false; };
  }, [user, isAdmin, fetchConversations, loadConversationThread]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  // Handle creating a brand-new conversation thread
  const handleNewConversation = async () => {
    try {
      setLoading(true);
      const res = await aiApi.createConversation('New Conversation');
      if (res.success && res.data) {
        const newId = res.data.id;
        setConversationId(newId);
        sessionStorage.setItem(STORAGE_ACTIVE_CONV, String(newId));
        setConversation([]);
        setCommand('');
        await fetchConversations();
        if (window.innerWidth < 768) {
          setIsDrawerOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle switching to a different conversation
  const handleSelectConversation = async (targetId) => {
    if (targetId === conversationId) {
      if (window.innerWidth < 768) setIsDrawerOpen(false);
      return;
    }
    await loadConversationThread(targetId);
    if (window.innerWidth < 768) {
      setIsDrawerOpen(false);
    }
  };

  // Handle manual title rename
  const handleRenameConversation = async (targetId, newTitle) => {
    try {
      const res = await aiApi.updateConversation(targetId, { title: newTitle });
      if (res.success) {
        setConversationsList(prev => prev.map(c => c.id === targetId ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Handle archiving conversation thread
  const handleArchiveConversation = async (targetId) => {
    try {
      const res = await aiApi.archiveConversation(targetId);
      if (res.success) {
        const updatedThreads = await fetchConversations();
        // If active conversation was archived, switch to next active thread or create new
        if (targetId === conversationId) {
          const nextActive = updatedThreads.find(t => (t.status === 'active' || !t.status) && t.id !== targetId);
          if (nextActive) {
            await loadConversationThread(nextActive.id);
          } else {
            sessionStorage.removeItem(STORAGE_ACTIVE_CONV);
            setConversationId(null);
            setConversation([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to archive conversation:', err);
    }
  };

  const handleSubmit = async (e, directText = null) => {
    if (e) e.preventDefault();
    const query = (directText || command).trim();
    if (!query || loading) return;

    const userMessageId = `msg_${Date.now()}_user`;
    const botMessageId = `msg_${Date.now()}_bot`;

    // Append user message immediately
    const userMsg = {
      id: userMessageId,
      role: 'user',
      text: query,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMsg]);
    setCommand('');
    setLoading(true);

    try {
      const res = await aiApi.sendCommand(query, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
        sessionStorage.setItem(STORAGE_ACTIVE_CONV, String(res.conversation_id));
      }

      // Determine state classification
      let status = 'success';
      if (res.requires_confirmation) {
        status = 'confirmation';
      } else if (res.step === 'collecting_slots') {
        status = 'slot_filling';
      } else if (!res.success) {
        if (res.status === 403 || res.message?.toLowerCase().includes('permission') || res.message?.toLowerCase().includes('authorized')) {
          status = 'denied';
        } else {
          status = 'error';
        }
      }

      const botMsg = {
        id: botMessageId,
        role: 'assistant',
        text: res.message || (res.success ? 'Command executed successfully.' : 'Action could not be completed.'),
        status,
        rawResponse: res,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, botMsg]);
      if (onActionComplete) onActionComplete(res);

      // Refresh threads list in background so auto-generated title is immediately visible
      fetchConversations();
    } catch (err) {
      const isForbidden = err.response?.status === 403;
      const errorMsg = err.response?.data?.message || err.message || 'Failed to communicate with AI Assistant.';

      const botMsg = {
        id: botMessageId,
        role: 'assistant',
        text: errorMsg,
        status: isForbidden ? 'denied' : 'error',
        rawResponse: err.response?.data || { success: false, message: errorMsg },
        timestamp: new Date()
      };

      setConversation(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (confirmationId, botMsgId) => {
    setLoading(true);
    try {
      const res = await aiApi.confirmAction(confirmationId, true);

      setConversation(prev => prev.map(msg => {
        if (msg.id === botMsgId) {
          return {
            ...msg,
            status: res.success ? 'success' : 'error',
            text: res.message || 'Action executed successfully.',
            rawResponse: res
          };
        }
        return msg;
      }));

      if (onActionComplete) onActionComplete(res);
      fetchConversations();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to confirm action.';
      setConversation(prev => prev.map(msg => {
        if (msg.id === botMsgId) {
          return { ...msg, status: 'error', text: errorMsg };
        }
        return msg;
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (confirmationId, botMsgId) => {
    setLoading(true);
    try {
      const res = await aiApi.confirmAction(confirmationId, false);

      setConversation(prev => prev.map(msg => {
        if (msg.id === botMsgId) {
          return {
            ...msg,
            status: 'success',
            text: res.message || 'Action was cancelled. No changes were made to HRMS records.',
            rawResponse: res
          };
        }
        return msg;
      }));
      fetchConversations();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to cancel action.';
      setConversation(prev => prev.map(msg => {
        if (msg.id === botMsgId) {
          return { ...msg, status: 'error', text: errorMsg };
        }
        return msg;
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    const nextQuery = `Show details for ${candidate.employee_code}`;
    setCommand(nextQuery);
    handleSubmit(null, nextQuery);
  };

  // Active conversation title preview
  const currentThread = conversationsList.find(c => c.id === conversationId);
  const currentTitle = currentThread?.title || (conversationId ? `Conversation #${conversationId}` : 'New Conversation');

  return (
    <div className={`ai-command-center-wrap ${className}`}>
      {/* Header Banner */}
      <div className="ai-center-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className={`ai-drawer-toggle-btn ${isDrawerOpen ? 'active' : ''}`}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Toggle conversation threads"
          >
            <PanelLeft size={16} />
            <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Threads</span>
          </button>

          <div className="ai-bot-avatar">
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {currentTitle}
              </span>
              <span className={`ai-mode-pill ${isAdmin ? 'ai-mode-admin' : 'ai-mode-employee'}`}>
                {isAdmin ? 'ADMIN OPERATOR' : 'EMPLOYEE ASSISTANT'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isAdmin ? 'Authorized for personnel, attendance, leave, and payroll actions' : 'Self-service queries for your profile, attendance, leaves, and salary'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            type="button" 
            className={`ai-drawer-toggle-btn ${activeView === 'insights' ? 'active' : ''}`}
            title="View proactive HR intelligence alerts"
            onClick={() => setActiveView(activeView === 'insights' ? 'chat' : 'insights')}
          >
            <ShieldAlert size={14} className={unreadInsightsCount > 0 ? 'text-amber-500' : ''} />
            <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Insights</span>
            {unreadInsightsCount > 0 && (
              <span className="insights-header-badge">{unreadInsightsCount}</span>
            )}
          </button>

          <button 
            type="button" 
            className="ai-drawer-toggle-btn" 
            title="Start new conversation"
            onClick={() => {
              setActiveView('chat');
              handleNewConversation();
            }}
          >
            <RotateCcw size={14} />
            <span style={{ fontSize: '11.5px' }}>New Chat</span>
          </button>
          {onClose && (
            <button 
              type="button" 
              className="icon-btn" 
              title="Close"
              onClick={onClose} 
              style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Drawer + Chat Area Layout */}
      <div className="ai-center-body-layout">
        <ConversationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          conversations={conversationsList}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onRenameConversation={handleRenameConversation}
          onArchiveConversation={handleArchiveConversation}
          loading={loadingThreads}
        />

        <div className="ai-center-chat-area">
          {activeView === 'insights' ? (
            <InsightCenter 
              onExplainInChat={(text) => {
                setActiveView('chat');
                handleSubmit(null, text);
              }}
              onClose={() => setActiveView('chat')}
            />
          ) : (
            <>
              {/* Chat Messages Stream */}
              <div className="ai-chat-stream">
            {conversation.length === 0 ? (
              <div className="ai-chat-welcome">
                <div className="ai-welcome-badge">
                  <Bot size={28} />
                </div>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  What would you like me to do?
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px' }}>
                  {isAdmin 
                    ? "You have full administrator clearance to manage employees, process leave reviews, generate payroll, and track organization attendance."
                    : "Ask anything about your personal HR records: view attendance, apply for upcoming leave, check leave balances, or review your salary slip."
                  }
                </p>

                {/* Welcome Suggestions Grid */}
                <div className="ai-welcome-chips">
                  {suggestions.slice(0, 6).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="ai-suggestion-chip"
                      onClick={() => handleSubmit(null, s)}
                    >
                      <ArrowRight size={13} style={{ opacity: 0.6 }} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.map((msg) => (
                <div key={msg.id} className={`ai-chat-row ${msg.role === 'user' ? 'ai-chat-row-user' : 'ai-chat-row-assistant'}`}>
                  <div className={`ai-chat-bubble ${msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'}`}>
                    
                    {/* Assistant Status Badge */}
                    {msg.role === 'assistant' && (
                      <div className="ai-bubble-header">
                        {msg.status === 'success' && (
                          <span className="ai-status-pill ai-status-pill-success">
                            <CheckCircle2 size={13} />
                            <span>Completed</span>
                          </span>
                        )}
                        {msg.status === 'confirmation' && (
                          <span className="ai-status-pill ai-status-pill-warning">
                            <AlertTriangle size={13} />
                            <span>Confirmation Required</span>
                          </span>
                        )}
                        {msg.status === 'denied' && (
                          <span className="ai-status-pill ai-status-pill-denied">
                            <ShieldAlert size={13} />
                            <span>Permission Denied</span>
                          </span>
                        )}
                        {msg.status === 'error' && (
                          <span className="ai-status-pill ai-status-pill-error">
                            <AlertTriangle size={13} />
                            <span>Incomplete</span>
                          </span>
                        )}
                        {msg.status === 'slot_filling' && (
                          <span className="ai-status-pill ai-status-pill-warning">
                            <Sparkles size={13} />
                            <span>Action in Progress</span>
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className={`ai-bubble-text ${msg.status === 'denied' ? 'ai-bubble-text-denied' : ''}`}>
                      {msg.text}
                    </div>

                    {/* Disambiguation Candidates */}
                    {msg.rawResponse?.candidates && msg.rawResponse.candidates.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Select exact employee:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {msg.rawResponse.candidates.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="ai-suggestion-chip"
                              onClick={() => handleSelectCandidate(c)}
                            >
                              <strong>{c.name}</strong> ({c.employee_code}) - {c.department}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Multi-step Workflow Checklist */}
                    {msg.rawResponse?.data?.steps && (
                      <MultiStepStatusCard steps={msg.rawResponse.data.steps} />
                    )}

                    {/* Structured HR Organizational Analytics Card */}
                    {(msg.rawResponse?.data?.analytics || msg.rawResponse?.analytics) && (
                      <AnalyticsDataCard data={msg.rawResponse?.data?.analytics || msg.rawResponse?.analytics} />
                    )}

                    {/* Interactive Dangerous Action Confirmation */}
                    {msg.status === 'confirmation' && msg.rawResponse?.confirmation_id && (
                      <ConfirmationCard
                        confirmationData={msg.rawResponse}
                        onConfirm={(id) => handleConfirm(id, msg.id)}
                        onCancel={(id) => handleCancel(id, msg.id)}
                      />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading Bubble */}
            {loading && (
              <div className="ai-chat-row ai-chat-row-assistant">
                <div className="ai-chat-bubble ai-bubble-assistant ai-bubble-loading">
                  <Loader2 size={16} className="spin-animation" />
                  <span>Processing command...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Suggestions Chips */}
          {conversation.length > 0 && suggestions.length > 0 && (
            <div className="ai-chat-suggestions">
              {suggestions.slice(0, 4).map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-suggestion-chip-small"
                  onClick={() => handleSubmit(null, s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Command Input Bar */}
          <form onSubmit={(e) => handleSubmit(e)} className="ai-chat-input-form">
            <Sparkles size={18} className="ai-input-icon" />
            <input
              type="text"
              className="ai-chat-input-field"
              placeholder="What would you like me to do?"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="ai-chat-send-btn"
              disabled={!command.trim() || loading}
              title="Send command (Enter)"
            >
              {loading ? (
                <Loader2 size={16} className="spin-animation" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

