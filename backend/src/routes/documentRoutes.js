const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Securely fetch a document file by its ID
router.get('/:id/download', documentController.downloadDocument);

// Other document management routes could go here
// router.get('/', documentController.getDocuments);
// router.post('/', documentController.uploadDocument);

module.exports = router;
