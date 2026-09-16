/**
 * AI Insight Controller (Phase 3C)
 * 
 * Provides REST endpoints for Proactive HR Insights and Alert Center.
 * Strictly derives organization_id from authenticated req.user context.
 */

const insightTools = require('../services/ai/tools/insightTools');

class InsightController {
  /**
   * GET /api/ai/insights
   * Fetch insights with status, severity, and type filters
   */
  async getInsights(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'No active organization context associated with user.'
        });
      }

      const result = await insightTools.getInsights(organizationId, req.user, req.query);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/insights/summary
   * Fetch summary count of insights (unread, critical, warning, info)
   */
  async getSummary(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'No active organization context associated with user.'
        });
      }

      const result = await insightTools.getInsightSummary(organizationId, req.user);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/insights/:id/read
   * Mark an insight as read
   */
  async markRead(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await insightTools.markInsightRead(organizationId, req.user, id);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/insights/:id/dismiss
   * Dismiss an insight
   */
  async dismiss(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await insightTools.dismissInsight(organizationId, req.user, id);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/insights/:id/explain
   * Formulate verified natural language explanation for an insight
   */
  async explain(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await insightTools.explainInsight(organizationId, req.user, id);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/insights/detect
   * Trigger immediate detection run for current organization (Admin/HR only)
   */
  async detect(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'No active organization context associated with user.'
        });
      }

      const result = await insightTools.triggerDetection(organizationId, req.user);
      const httpStatus = result.status || (result.success === false ? 400 : 200);
      return res.status(httpStatus).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InsightController();
