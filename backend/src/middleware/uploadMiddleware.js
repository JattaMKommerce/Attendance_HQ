const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'photo') {
      cb(null, 'uploads/photos/');
    } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
      cb(null, 'uploads/documents/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    // Generate secure unique filename
    const uniqueName = uuidv4() + path.extname(file.originalname).toLowerCase();
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  if (file.fieldname === 'photo') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid photo format. Only JPG, PNG, WEBP allowed.'), false);
    }
  } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
    if (allowedDocTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only PDF, JPG, PNG allowed.'), false);
    }
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

const upload = multer({ 
  storage: storage,
  // Removed strict 5MB limit based on user request. 
  // Using 50MB as a safety catch-all instead of infinity.
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: fileFilter
});

module.exports = upload;
