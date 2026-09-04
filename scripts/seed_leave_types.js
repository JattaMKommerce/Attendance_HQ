const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hrms_saas',
  port: process.env.DB_PORT || 3307,
};

const defaultLeaveTypes = [
  { name: 'Casual Leave', description: 'For personal matters or short breaks.', color_code: '#3b82f6', is_paid: true, requires_attachment: false, policy: { yearly_allowance: 12, max_carry_forward: 0, require_attachment_after_days: null } },
  { name: 'Sick/Medical Leave', description: 'For health and medical recovery.', color_code: '#ef4444', is_paid: true, requires_attachment: true, policy: { yearly_allowance: 10, max_carry_forward: 5, require_attachment_after_days: 2 } },
  { name: 'Emergency Leave', description: 'For urgent unforeseen situations.', color_code: '#f59e0b', is_paid: true, requires_attachment: true, policy: { yearly_allowance: 3, max_carry_forward: 0, require_attachment_after_days: 1 } },
  { name: 'Earned Leave', description: 'Accrued over time based on service.', color_code: '#10b981', is_paid: true, requires_attachment: false, policy: { yearly_allowance: 15, max_carry_forward: 15, require_attachment_after_days: null } },
  { name: 'Unpaid Leave', description: 'Leave without pay when balances are exhausted.', color_code: '#6b7280', is_paid: false, requires_attachment: false, policy: { yearly_allowance: 999, max_carry_forward: 0, require_attachment_after_days: null } }
];

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    await connection.beginTransaction();

    // Get all organizations
    const [orgs] = await connection.query('SELECT id FROM organizations');
    
    for (const org of orgs) {
      const orgId = org.id;

      // Check existing types for this org to prevent duplicates
      const [existingTypes] = await connection.query('SELECT name FROM leave_types WHERE organization_id = ?', [orgId]);
      const existingNames = new Set(existingTypes.map(t => t.name));

      for (const lt of defaultLeaveTypes) {
        if (existingNames.has(lt.name)) {
          console.log(`Skipping ${lt.name} for org ${orgId} - already exists`);
          continue;
        }

        const [typeRes] = await connection.query(
          'INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment) VALUES (?, ?, ?, ?, ?, ?)',
          [orgId, lt.name, lt.description, lt.color_code, lt.is_paid, lt.requires_attachment]
        );
        const typeId = typeRes.insertId;

        await connection.query(
          'INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, require_attachment_after_days) VALUES (?, ?, ?, ?, ?)',
          [orgId, typeId, lt.policy.yearly_allowance, lt.policy.max_carry_forward, lt.policy.require_attachment_after_days]
        );

        console.log(`Inserted ${lt.name} for org ${orgId}`);
      }
    }

    await connection.commit();
    console.log('Seed completed successfully.');
  } catch (e) {
    if (connection) await connection.rollback();
    console.error('Error:', e);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
