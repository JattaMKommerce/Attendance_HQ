const leaveService = require('../services/leaveService');
const db = require('../config/db');

exports.getLeaveTypes = async (req, res, next) => {
  try {
    const types = await leaveService.getLeaveTypes(req.user.organization_id);
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};

exports.getLeaveRequests = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      departmentId: req.query.departmentId
    };
    const requests = await leaveService.getLeaveRequests(req.user.organization_id, filters);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.reviewLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, isPaid, comments } = req.body;
    
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await leaveService.reviewLeaveRequest(
      id,
      req.user.organization_id,
      req.user.id,
      action,
      isPaid === true || isPaid === 'true',
      comments
    );

    res.json({ success: true, message: `Leave request ${action} successfully` });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await leaveService.getDashboardMetrics(req.user.organization_id);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

exports.getCalendarLeaves = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const leaves = await leaveService.getCalendarLeaves(req.user.organization_id, startDate, endDate);
    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
};

exports.getAllBalances = async (req, res, next) => {
  try {
    const { search } = req.query;
    const balances = await leaveService.getAllBalances(req.user.organization_id, search);
    res.json({ success: true, data: balances });
  } catch (error) {
    next(error);
  }
};

exports.adjustBalance = async (req, res, next) => {
  try {
    const { employeeId, leaveTypeId, action, amount, reason } = req.body;
    
    if (!employeeId || !leaveTypeId || !amount || !action) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await leaveService.adjustBalance(
      req.user.organization_id,
      employeeId,
      leaveTypeId,
      action,
      parseFloat(amount),
      reason,
      req.user.id
    );

    res.json({ success: true, message: 'Balance adjusted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.createLeaveType = async (req, res, next) => {
  try {
    const { name, description, colorCode, isPaid, requiresAttachment, yearlyAllowance, maxCarryForward, requireAttachmentAfterDays } = req.body;
    const organizationId = req.user.organization_id;
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      const [typeRes] = await connection.query(
        'INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment) VALUES (?, ?, ?, ?, ?, ?)',
        [organizationId, name, description, colorCode || '#3b82f6', isPaid !== false, requiresAttachment === true]
      );
      
      await connection.query(
        'INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, require_attachment_after_days) VALUES (?, ?, ?, ?, ?)',
        [organizationId, typeRes.insertId, yearlyAllowance || 0, maxCarryForward || 0, requireAttachmentAfterDays || null]
      );
      
      await connection.commit();
      res.status(201).json({ success: true, message: 'Leave type created successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

exports.updateLeaveType = async (req, res, next) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};
