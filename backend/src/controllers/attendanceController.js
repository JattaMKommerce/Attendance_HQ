const attendanceService = require('../services/attendanceService');

class AttendanceController {
  async getOverview(req, res, next) {
    try {
      const { date, department, search, shift } = req.query;
      const filters = { department, search, shift };
      const overview = await attendanceService.getOverview(req.user.organization_id, date || new Date().toISOString().split('T')[0], filters);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async getRecords(req, res, next) {
    try {
      const filters = {
        date: req.query.date,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        department: req.query.department || req.query.departmentId, // align with service's filters.department key
        status: req.query.status,
        search: req.query.search,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };
      
      const result = await attendanceService.getRecords(req.user.organization_id, filters);
      res.json({ success: true, data: result.records, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { year, month } = req.query;
      const result = await attendanceService.getEmployeeAttendanceHistory(req.user.organization_id, id, year, month);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addManualRecord(req, res, next) {
    try {
      const result = await attendanceService.addManualRecord(req.user.organization_id, req.body);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async getRegularizationRequests(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        employeeId: req.query.employeeId
      };
      const result = await attendanceService.getRegularizationRequests(req.user.organization_id, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createRegularizationRequest(req, res, next) {
    try {
      const result = await attendanceService.createRegularizationRequest(req.user.organization_id, req.body);
      res.status(201).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async updateRegularizationRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await attendanceService.updateRegularizationRequest(
        req.user.organization_id, 
        id, 
        status, 
        req.user.id, 
        rejectionReason
      );
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async getShifts(req, res, next) {
    try {
      const result = await attendanceService.getShifts(req.user.organization_id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createShift(req, res, next) {
    try {
      const result = await attendanceService.createShift(req.user.organization_id, req.body);
      res.status(201).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttendanceController();
