const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadBase = path.resolve(__dirname, '../uploads');
['photos', 'documents', 'social'].forEach(subDir => {
  const dirPath = path.join(uploadBase, subDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'photo') {
      cb(null, path.join(uploadBase, 'photos'));
    } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
      cb(null, path.join(uploadBase, 'documents'));
    } else if (file.fieldname === 'media') {
      cb(null, path.join(uploadBase, 'social'));
    } else {
      cb(null, uploadBase);
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
  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const allowedDocExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const allowedDocMimes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.fieldname === 'photo') {
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
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
  } else if (file.fieldname === 'media') {
    if (allowedImageExts.includes(ext) && allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid media format. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed.'), false);
    }
  } else {
    cb(new Error('Unexpected upload field: ' + file.fieldname), false);
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

const uploadSocial = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 5
  },
  fileFilter: fileFilter
});

upload.social = uploadSocial;
upload.uploadSocial = uploadSocial;

module.exports = upload;

