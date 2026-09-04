const db = require('../config/db');

class HolidayController {
  async getHolidays(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { year, type } = req.query;
      
      let query = `
        SELECT id, name, DATE_FORMAT(holiday_date, '%Y-%m-%d') as holiday_date, description, type, location, is_active, created_at 
        FROM holidays 
        WHERE organization_id = ?
      `;
      const params = [organizationId];

      if (year) {
        query += ` AND YEAR(holiday_date) = ?`;
        params.push(year);
      }
      
      if (type && type !== 'All') {
        query += ` AND type = ?`;
        params.push(type);
      }
      
      query += ` ORDER BY holiday_date ASC`;

      const [holidays] = await db.query(query, params);

      res.status(200).json({
        success: true,
        data: holidays
      });
    } catch (error) {
      next(error);
    }
  }

  async createHoliday(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { name, holiday_date, description, type, location, is_active } = req.body;

      if (!name || !holiday_date || !type) {
        return res.status(400).json({ success: false, message: 'Name, Date, and Type are required.' });
      }

      // Check for duplicate active holidays on the same date
      if (is_active !== false) {
        const [existing] = await db.query(`
          SELECT id FROM holidays 
          WHERE organization_id = ? AND holiday_date = ? AND is_active = TRUE
        `, [organizationId, holiday_date]);

        if (existing.length > 0) {
          return res.status(400).json({ success: false, message: 'An active holiday already exists on this date.' });
        }
      }

      const [result] = await db.query(`
        INSERT INTO holidays (organization_id, name, holiday_date, description, type, location, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [organizationId, name, holiday_date, description || '', type, location || 'All', is_active !== false]);

      res.status(201).json({
        success: true,
        message: 'Holiday created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Create Holiday Error:', error);
      next(error);
    }
  }

  async updateHoliday(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;
      const { name, holiday_date, description, type, location, is_active } = req.body;

      if (!name || !holiday_date || !type) {
        return res.status(400).json({ success: false, message: 'Name, Date, and Type are required.' });
      }

      // Check ownership
      const [holiday] = await db.query(`SELECT id FROM holidays WHERE id = ? AND organization_id = ?`, [id, organizationId]);
      if (holiday.length === 0) {
        return res.status(404).json({ success: false, message: 'Holiday not found' });
      }

      // Check for duplicate active holidays on the same date (excluding self)
      if (is_active !== false) {
        const [existing] = await db.query(`
          SELECT id FROM holidays 
          WHERE organization_id = ? AND holiday_date = ? AND is_active = TRUE AND id != ?
        `, [organizationId, holiday_date, id]);

        if (existing.length > 0) {
          return res.status(400).json({ success: false, message: 'Another active holiday already exists on this date.' });
        }
      }

      await db.query(`
        UPDATE holidays 
        SET name = ?, holiday_date = ?, description = ?, type = ?, location = ?, is_active = ?
        WHERE id = ? AND organization_id = ?
      `, [name, holiday_date, description || '', type, location || 'All', is_active !== false, id, organizationId]);

      res.status(200).json({
        success: true,
        message: 'Holiday updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const [result] = await db.query(`
        DELETE FROM holidays WHERE id = ? AND organization_id = ?
      `, [id, organizationId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Holiday not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Holiday deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HolidayController();
