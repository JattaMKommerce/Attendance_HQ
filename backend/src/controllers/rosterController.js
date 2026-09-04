const rosterService = require('../services/rosterService');

class RosterController {
  async getRoster(req, res, next) {
    try {
      const { startDate, endDate, departmentId, search, limit, offset } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const filters = { departmentId, search, limit, offset };
      const result = await rosterService.getRoster(req.user.organization_id, startDate, endDate, filters);
      
      res.json({ success: true, data: result.employees, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async bulkAssign(req, res, next) {
    try {
      const result = await rosterService.bulkAssign(req.user.organization_id, req.body, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async updateIndividual(req, res, next) {
    try {
      const { id } = req.params;
      const result = await rosterService.updateIndividual(req.user.organization_id, id, req.body, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async publishRoster(req, res, next) {
    try {
      const result = await rosterService.publishRoster(req.user.organization_id, req.body, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async copyRoster(req, res, next) {
    try {
      const result = await rosterService.copyRoster(req.user.organization_id, req.body, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async getTemplates(req, res, next) {
    try {
      const result = await rosterService.getTemplates(req.user.organization_id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async applyTemplate(req, res, next) {
    try {
      const result = await rosterService.applyTemplate(req.user.organization_id, req.body, req.user.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RosterController();
