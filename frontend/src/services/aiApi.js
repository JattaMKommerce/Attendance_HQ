/**
 * Frontend AI Assistant Service API (Phase 3A)
 */

import api from './api';

export const aiApi = {
  /**
   * Send natural language command to AI Assistant
   * @param {string} command
   * @param {number|null} conversationId
   */
  async sendCommand(command, conversationId = null) {
    const res = await api.post('/ai/command', {
      command,
      conversation_id: conversationId
    });
    return res.data;
  },

  /**
   * Confirm or cancel a dangerous action
   * @param {string} confirmationId
   * @param {boolean} confirmed
   */
  async confirmAction(confirmationId, confirmed) {
    const res = await api.post('/ai/confirm', {
      confirmation_id: confirmationId,
      confirmed
    });
    return res.data;
  },

  /**
   * Get role-aware prompt suggestions
   */
  async getSuggestions() {
    const res = await api.get('/ai/suggestions');
    return res.data;
  },

  /**
   * Get recent command history
   */
  async getHistory() {
    const res = await api.get('/ai/history');
    return res.data;
  },

  /**
   * Get list of conversations for current user
   * @param {boolean} includeArchived
   */
  async getConversations(includeArchived = false) {
    const res = await api.get('/ai/conversations', {
      params: { include_archived: includeArchived }
    });
    return res.data;
  },

  /**
   * Create a new conversation thread
   * @param {string} [title='New Conversation']
   */
  async createConversation(title = 'New Conversation') {
    const res = await api.post('/ai/conversations', { title });
    return res.data;
  },

  /**
   * Get messages and authoritative state for a specific conversation
   * @param {number|string} conversationId
   */
  async getConversationMessages(conversationId) {
    const res = await api.get(`/ai/conversations/${conversationId}/messages`);
    return res.data;
  },

  /**
   * Update conversation metadata (e.g. rename title)
   * @param {number|string} conversationId
   * @param {object} updates - { title }
   */
  async updateConversation(conversationId, updates) {
    const res = await api.patch(`/ai/conversations/${conversationId}`, updates);
    return res.data;
  },

  /**
   * Archive conversation thread
   * @param {number|string} conversationId
   */
  async archiveConversation(conversationId) {
    const res = await api.post(`/ai/conversations/${conversationId}/archive`);
    return res.data;
  },

  /**
   * Proactive HR Insights API (Phase 3C)
   */
  async getInsights(filters = {}) {
    const res = await api.get('/ai/insights', { params: filters });
    return res.data;
  },

  async getInsightSummary() {
    const res = await api.get('/ai/insights/summary');
    return res.data;
  },

  async markInsightRead(id) {
    const res = await api.post(`/ai/insights/${id}/read`);
    return res.data;
  },

  async dismissInsight(id) {
    const res = await api.post(`/ai/insights/${id}/dismiss`);
    return res.data;
  },

  async explainInsight(id) {
    const res = await api.post(`/ai/insights/${id}/explain`);
    return res.data;
  },

  async triggerInsightDetection() {
    const res = await api.post('/ai/insights/detect');
    return res.data;
  }
};

export default aiApi;

