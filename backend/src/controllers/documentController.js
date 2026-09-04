const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const userRole = req.user.role; // Assume 1: Admin, 2: HR, 3: Manager, 4: Employee

    // Find the document
    const [docs] = await db.query(
      `SELECT d.*, e.user_id as employee_user_id 
       FROM documents d
       LEFT JOIN employees e ON d.employee_id = e.id
       WHERE d.id = ? AND d.organization_id = ?`,
      [documentId, organizationId]
    );

    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = docs[0];

    // RBAC: Check if the user is authorized to view this document
    let isAuthorized = false;
    
    // 1. HR or Admin can view all documents in their organization
    if (userRole === 1 || userRole === 2) {
      isAuthorized = true;
    } 
    // 2. The employee who owns the document can view it
    else if (doc.employee_user_id === userId) {
      isAuthorized = true;
    }
    
    // Additional check if there's explicit access in document_access table
    if (!isAuthorized) {
      const [access] = await db.query(
        `SELECT can_view FROM document_access da
         LEFT JOIN employees e ON da.employee_id = e.id
         WHERE da.document_id = ? AND e.user_id = ?`,
        [documentId, userId]
      );
      if (access.length > 0 && access[0].can_view) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this document' });
    }

    // Serve the file
    const filePath = path.join(__dirname, '../..', doc.file_url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
