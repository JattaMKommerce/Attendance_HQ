import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Edit2, 
  Check, 
  X, 
  Archive, 
  Clock, 
  ChevronLeft,
  Search
} from 'lucide-react';

/**
 * Format timestamp into relative activity label
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationDrawer({
  isOpen,
  onClose,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onArchiveConversation,
  loading = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = !searchTerm || c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showArchived ? c.status === 'archived' : (c.status === 'active' || !c.status);
    return matchesSearch && matchesStatus;
  });

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'New Conversation');
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    if (editTitle.trim() && onRenameConversation) {
      await onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleArchive = async (e, convId) => {
    e.stopPropagation();
    if (window.confirm('Archive this conversation thread? It will be moved to archived history.')) {
      if (onArchiveConversation) {
        await onArchiveConversation(convId);
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="ai-drawer-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`ai-drawer-sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Top Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-header-title">
            <MessageSquare size={16} className="ai-drawer-icon" />
            <span>Conversations</span>
          </div>
          <button 
            type="button" 
            className="ai-drawer-close-btn" 
            onClick={onClose} 
            title="Close drawer"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Action Button: New Conversation */}
        <div className="ai-drawer-action-wrap">
          <button 
            type="button" 
            className="ai-new-chat-btn" 
            onClick={onNewConversation}
            disabled={loading}
          >
            <Plus size={15} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="ai-drawer-search-wrap">
          <div className="ai-drawer-search-box">
            <Search size={13} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ai-drawer-search-input"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="clear-search-btn"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="ai-drawer-tabs">
            <button 
              type="button" 
              className={`ai-tab-pill ${!showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(false)}
            >
              Active
            </button>
            <button 
              type="button" 
              className={`ai-tab-pill ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="ai-drawer-list">
          {filteredConversations.length === 0 ? (
            <div className="ai-drawer-empty">
              <Clock size={20} style={{ opacity: 0.4, marginBottom: '6px' }} />
              <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {showArchived ? 'No archived conversations' : 'No conversations yet'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {showArchived ? 'Archived threads will appear here' : 'Start a new chat to begin'}
              </div>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = activeConversationId === conv.id;
              const isEditing = editingId === conv.id;

              return (
                <div 
                  key={conv.id} 
                  className={`ai-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="ai-drawer-item-content">
                    {isEditing ? (
                      <div className="ai-drawer-rename-form" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(e, conv.id);
                            if (e.key === 'Escape') handleCancelRename(e);
                          }}
                          className="ai-drawer-rename-input"
                          autoFocus
                        />
                        <button 
                          type="button" 
                          className="rename-save-btn" 
                          onClick={(e) => handleSaveRename(e, conv.id)}
                          title="Save"
                        >
                          <Check size={12} />
                        </button>
                        <button 
                          type="button" 
                          className="rename-cancel-btn" 
                          onClick={handleCancelRename}
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="ai-drawer-item-title-row">
                          <span className="ai-drawer-item-title" title={conv.title}>
                            {conv.title || 'New Conversation'}
                          </span>
                          <span className="ai-drawer-item-time">
                            {formatRelativeTime(conv.updated_at || conv.created_at)}
                          </span>
                        </div>

                        {conv.last_message && (
                          <div className="ai-drawer-item-snippet">
                            {conv.last_message}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="ai-drawer-item-actions">
                      <button 
                        type="button" 
                        className="item-action-btn" 
                        title="Rename conversation"
                        onClick={(e) => handleStartRename(e, conv)}
                      >
                        <Edit2 size={12} />
                      </button>
                      {conv.status !== 'archived' && (
                        <button 
                          type="button" 
                          className="item-action-btn archive-btn" 
                          title="Archive conversation"
                          onClick={(e) => handleArchive(e, conv.id)}
                        >
                          <Archive size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
