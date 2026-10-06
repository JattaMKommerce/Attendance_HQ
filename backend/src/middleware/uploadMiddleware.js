const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist safely without blocking server boot
const uploadBase = path.resolve(__dirname, '../../uploads');
['photos', 'documents', 'social'].forEach(subDir => {
  try {
    const dirPath = path.join(uploadBase, subDir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`[UploadMiddleware] Warning: Could not create upload directory ${subDir}:`, err.message);
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let targetDir = uploadBase;
    if (file.fieldname === 'photo') {
      targetDir = path.join(uploadBase, 'photos');
    } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
      targetDir = path.join(uploadBase, 'documents');
    } else if (file.fieldname === 'media') {
      targetDir = path.join(uploadBase, 'social');
    }

    // Guard: Ensure directory physically exists right before saving
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (err) {
        console.error('[UploadMiddleware] Failed to create directory:', targetDir, err);
      }
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // Generate secure unique filename with resilient extension fallback
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) {
      const mime = (file.mimetype || '').toLowerCase();
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
      else if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('gif')) ext = '.gif';
      else if (mime.includes('heic')) ext = '.heic';
      else if (mime.includes('heif')) ext = '.heif';
      else if (mime.includes('pdf')) ext = '.pdf';
      else ext = '.jpg'; // safe default for mobile camera captures
    }
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif', '.jfif', '.avif'];
  const isImageMime = (mime.startsWith('image/') && mime !== 'image/svg+xml') || mime === 'application/octet-stream';
  const isImageExt = allowedImageExts.includes(ext);

  const allowedDocExts = [
    '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.jfif', 
    '.bmp', '.doc', '.docx', '.odt', '.rtf', '.txt', '.xls', '.xlsx'
  ];
  const allowedDocMimes = [
    'application/pdf', 
    'application/x-pdf',
    'application/acrobat',
    'applications/pdf',
    'text/pdf',
    'text/plain',
    'image/jpeg', 
    'image/pjpeg',
    'image/png', 
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ];

  if (file.fieldname === 'photo') {
    if (allowedImageExts.includes(ext) || mime.startsWith('image/') || isImageMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid photo format. Only JPG, PNG, WEBP allowed.'), false);
    }
  } else if (file.fieldname === 'document' || file.fieldname === 'resume') {
    if (allowedDocExts.includes(ext) || allowedDocMimes.includes(mime) || mime.startsWith('image/') || isImageExt || !ext) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Supported formats: PDF, JPG, PNG, WEBP, DOC, DOCX.'), false);
    }
  } else if (file.fieldname === 'media') {
    if (isImageMime || isImageExt || !ext) {
      cb(null, true);
    } else {
      cb(new Error('Invalid media format. Only image files (JPG, PNG, WEBP, GIF, HEIC, etc.) are allowed.'), false);
    }
  } else {
    // Permissive fallback so legitimate uploads are not rejected
    cb(null, true);
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
    fileSize: 50 * 1024 * 1024,
    files: 5
  },
  fileFilter: fileFilter
});

// Middleware helper that catches Multer errors and returns clean JSON error response
const handleSingleUpload = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        console.error(`[Upload Error on ${fieldName}]:`, err.message);
        return res.status(400).json({
          success: false,
          message: err.message || `Failed to upload ${fieldName}. Ensure the file is under 50MB and in a valid format.`
        });
      }
      next();
    });
  };
};

upload.social = uploadSocial;
upload.uploadSocial = uploadSocial;
upload.handleSingleUpload = handleSingleUpload;

module.exports = upload;
