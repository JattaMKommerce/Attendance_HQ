/**
 * AI Command Assistant Controller (Phase 2)
 */

const aiService = require('../services/ai/aiService');
const conversationService = require('../services/ai/conversationService');
const db = require('../config/db');

class AiController {
  /**
   * Handle natural language command execution
   */
  async handleCommand(req, res, next) {
    try {
      const { command, conversation_id, conversationId } = req.body;

      if (!command || !command.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a natural language command.'
        });
      }

      const activeConvId = conversation_id || conversationId || null;
      const result = await aiService.processCommand(command.trim(), req.user, activeConvId);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle confirmation callback for sensitive actions
   */
  async handleConfirm(req, res, next) {
    try {
      const { confirmation_id, confirmed } = req.body;

      if (!confirmation_id) {
        return res.status(400).json({
          success: false,
          message: 'Confirmation ID is required.'
        });
      }

      const result = await aiService.handleConfirmation(
        confirmation_id,
        confirmed === true || confirmed === 'true',
        req.user
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role-tailored prompt suggestions
   */
  async getSuggestions(req, res, next) {
    try {
      const suggestions = aiService.getSuggestions(req.user);
      return res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent AI command history for this user
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;

      const [rows] = await db.query(
        `SELECT id, action_type, context, result, created_at
         FROM ai_action_logs
         WHERE user_id = ? AND organization_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
        [userId, organizationId]
      );

      const history = rows.map(r => {
        let ctx = {};
        let resData = {};
        try {
          ctx = typeof r.context === 'string' ? JSON.parse(r.context) : r.context || {};
        } catch (e) {}
        try {
          resData = typeof r.result === 'string' ? JSON.parse(r.result) : r.result || {};
        } catch (e) {}

        return {
          id: r.id,
          action: r.action_type,
          command: ctx.original_command || r.action_type,
          status: resData.status || 'completed',
          message: resData.message || null,
          created_at: r.created_at
        };
      });

      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of conversations for current user
   */
  async getConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      const includeArchived = req.query.include_archived === 'true';

      const conversations = await conversationService.listConversations(
        organizationId,
        userId,
        { includeArchived }
      );

      return res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new conversation thread
   */
  async createConversation(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      const { title } = req.body || {};

      const conversation = await conversationService.createConversation(
        organizationId,
        userId,
        title || 'New Conversation'
      );

      return res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages and authoritative state for a specific conversation
   */
  async getConversationMessages(req, res, next) {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const organizationId = req.user.organization_id;

      const details = await conversationService.getConversationDetails(
        conversationId,
        organizationId,
        userId,
        100
      );

      return res.status(200).json({
        success: true,
        data: details.messages,
        conversation: details.conversation,
        workflow_state: details.workflow_state,
        active_confirmation: details.active_confirmation,
        messages: details.messages
      });
    } catch (error) {
      if (error.code === 'CONVERSATION_NOT_FOUND' || error.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found.'
        });
      }
      next(error);
    }
  }

  /**
   * Update conversation metadata (e.g. rename title)
   */
  async updateConversation(req, res, next) {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      const { title } = req.body || {};

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required.'
        });
      }

      const updated = await conversationService.updateConversation(
        conversationId,
        organizationId,
        userId,
        { title: title.trim() }
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      if (error.code === 'CONVERSATION_NOT_FOUND' || error.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found.'
        });
      }
      next(error);
    }
  }

  /**
   * Archive a conversation thread (soft delete)
   */
  async archiveConversation(req, res, next) {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const organizationId = req.user.organization_id;

      const result = await conversationService.archiveConversation(
        conversationId,
        organizationId,
        userId
      );

      return res.status(200).json(result);
    } catch (error) {
      if (error.code === 'CONVERSATION_NOT_FOUND' || error.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found.'
        });
      }
      next(error);
    }
  }
}

module.exports = new AiController();
