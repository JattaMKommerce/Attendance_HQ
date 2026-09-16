const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const organizationId = req.user?.organization_id || req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Organization context missing' });
    }

    // Safely normalize user roles array
    const userRoles = Array.isArray(req.user?.roles) 
      ? req.user.roles 
      : (req.user?.role ? [req.user.role] : []);

    // Find the document within the tenant boundary
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
    const isAdminOrHr = userRoles.some(r => 
      ['ORG_ADMIN', 'HR_ADMIN', 'ADMIN', 'SUPER_ADMIN', 1, 2, '1', '2'].includes(r)
    );
    if (isAdminOrHr) {
      isAuthorized = true;
    } 
    // 2. The employee who owns the document can view it
    else if (doc.employee_user_id && doc.employee_user_id === userId) {
      isAuthorized = true;
    } else if (req.user?.employee_id && doc.employee_id === req.user.employee_id) {
      isAuthorized = true;
    }
    
    // 3. Check explicit access grants in document_access table
    if (!isAuthorized) {
      const [access] = await db.query(
        `SELECT da.can_view FROM document_access da
         LEFT JOIN employees e ON da.employee_id = e.id
         WHERE da.document_id = ? AND (e.user_id = ? OR da.employee_id = ?)`,
        [documentId, userId, req.user?.employee_id || 0]
      );
      if (access.length > 0 && access[0].can_view) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this document' });
    }

    // Prevent directory traversal attacks
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const safeRelativePath = (doc.file_url || '').replace(/^\/+/, '');
    const filePath = path.resolve(__dirname, '../..', safeRelativePath);

    if (!filePath.startsWith(uploadsRoot)) {
      return res.status(403).json({ success: false, message: 'Invalid document file path' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
