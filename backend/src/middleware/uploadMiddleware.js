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
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];

  const allowedDocExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const allowedDocMimes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.fieldname === 'photo') {
    if (allowedImageExts.includes(ext) && allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid photo format. Only JPG, PNG, WEBP allowed.'), false);
    }
  } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
    if (allowedDocExts.includes(ext) && allowedDocMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only PDF, JPG, PNG, DOC, DOCX allowed.'), false);
    }
  } else {
    cb(new Error('Unexpected upload field'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10) || (50 * 1024 * 1024),
    files: 5
  },
  fileFilter: fileFilter
});

module.exports = upload;
