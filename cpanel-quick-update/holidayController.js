const db = require('../config/db');

class HolidayController {
  async getHolidays(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { year, type } = req.query;
      
      let query = `
        SELECT h.id, h.name, DATE_FORMAT(h.holiday_date, '%Y-%m-%d') as holiday_date, h.description, h.type, h.location, h.is_active, h.created_at 
        FROM holidays h
        INNER JOIN (
          SELECT MIN(id) as id
          FROM holidays
          WHERE organization_id = ?
          GROUP BY holiday_date, name
        ) u ON h.id = u.id
        WHERE h.organization_id = ?
      `;
      const params = [organizationId, organizationId];

      if (year) {
        query += ` AND YEAR(h.holiday_date) = ?`;
        params.push(year);
      }
      
      if (type && type !== 'All') {
        query += ` AND h.type = ?`;
        params.push(type);
      }
      
      query += ` ORDER BY h.holiday_date ASC`;

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

      // Check if a holiday already exists on this date for this organization
      const [existing] = await db.query(`
        SELECT id FROM holidays 
        WHERE organization_id = ? AND (holiday_date = ? OR name = ?)
      `, [organizationId, holiday_date, name]);

      if (existing.length > 0) {
        await db.query(`
          UPDATE holidays 
          SET name = ?, holiday_date = ?, description = ?, type = ?, location = ?, is_active = ?
          WHERE id = ? AND organization_id = ?
        `, [name, holiday_date, description || '', type, location || 'All', is_active !== false, existing[0].id, organizationId]);

        return res.status(200).json({
          success: true,
          message: 'Holiday updated successfully',
          data: { id: existing[0].id }
        });
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

  async seedIndianHolidays(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const targetYear = parseInt(req.body.year, 10) || new Date().getFullYear();

      const indianHolidaysTemplate = [
        { name: 'Republic Day', date: `${targetYear}-01-26`, type: 'National', desc: 'National Holiday celebrating the Constitution of India' },
        { name: 'Maha Shivratri', date: `${targetYear}-02-15`, type: 'Festival', desc: 'Celebration of Lord Shiva' },
        { name: 'Holi (Festival of Colors)', date: `${targetYear}-03-04`, type: 'Festival', desc: 'Festival of Colors and Spring' },
        { name: 'Id-ul-Fitr (Ramzan Eid)', date: `${targetYear}-03-20`, type: 'Festival', desc: 'Islamic festival marking the end of Ramadan' },
        { name: 'Mahavir Jayanti', date: `${targetYear}-03-31`, type: 'Gazetted', desc: 'Birth anniversary of Lord Mahavira' },
        { name: 'Good Friday', date: `${targetYear}-04-03`, type: 'Gazetted', desc: 'Christian holiday commemorating the crucifixion of Jesus' },
        { name: 'Dr. B.R. Ambedkar Jayanti', date: `${targetYear}-04-14`, type: 'Gazetted', desc: 'Birth anniversary of Dr. B.R. Ambedkar' },
        { name: 'May Day (Labour Day)', date: `${targetYear}-05-01`, type: 'National', desc: 'International Workers Day' },
        { name: 'Eid-ul-Adha (Bakrid)', date: `${targetYear}-05-27`, type: 'Festival', desc: 'Feast of the Sacrifice' },
        { name: 'Muharram', date: `${targetYear}-06-26`, type: 'Gazetted', desc: 'First month of Islamic calendar' },
        { name: 'Independence Day', date: `${targetYear}-08-15`, type: 'National', desc: 'Indian Independence Day' },
        { name: 'Milad-un-Nabi (Id-e-Milad)', date: `${targetYear}-08-26`, type: 'Gazetted', desc: 'Birthday of Prophet Muhammad' },
        { name: 'Ganesh Chaturthi', date: `${targetYear}-09-14`, type: 'Festival', desc: 'Celebration of Lord Ganesha' },
        { name: 'Mahatma Gandhi Jayanti', date: `${targetYear}-10-02`, type: 'National', desc: 'Birth anniversary of Father of the Nation Mahatma Gandhi' },
        { name: 'Dussehra (Vijay Dashami)', date: `${targetYear}-10-20`, type: 'Festival', desc: 'Celebration of triumph of Good over Evil' },
        { name: 'Diwali (Deepavali)', date: `${targetYear}-11-08`, type: 'Festival', desc: 'Festival of Lights' },
        { name: 'Govardhan Puja / Bhai Dooj', date: `${targetYear}-11-10`, type: 'Festival', desc: 'Post-Diwali Festival' },
        { name: 'Guru Nanak Jayanti', date: `${targetYear}-11-24`, type: 'Gazetted', desc: 'Birth anniversary of Guru Nanak Dev Ji' },
        { name: 'Christmas Day', date: `${targetYear}-12-25`, type: 'Festival', desc: 'Celebration of the birth of Jesus Christ' }
      ];

      let addedCount = 0;
      for (const h of indianHolidaysTemplate) {
        const [existing] = await db.query(
          "SELECT id FROM holidays WHERE organization_id = ? AND (holiday_date = ? OR name = ?)",
          [organizationId, h.date, h.name]
        );
        if (existing.length === 0) {
          await db.query(
            "INSERT INTO holidays (organization_id, name, holiday_date, type, location, description, is_active) VALUES (?, ?, ?, ?, 'All', ?, 1)",
            [organizationId, h.name, h.date, h.type, h.desc]
          );
          addedCount++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Successfully populated ${addedCount} Indian National and Festival holidays for ${targetYear}`,
        addedCount
      });
    } catch (error) {
      console.error('Seed Indian Holidays Error:', error);
      next(error);
    }
  }
}

module.exports = new HolidayController();
