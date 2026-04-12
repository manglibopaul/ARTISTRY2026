import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = file.fieldname === 'model' || file.fieldname === 'iosModel' ? 'models' : 'images';
    const folder = path.join(uploadDir, fileType);
    
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'image' || file.fieldname === 'images' || file.fieldname === 'proofOfArtisan') {
    // Accept image files for both 'image' and 'proofOfArtisan' fields
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for images and proof of artisan'), false);
    }
  } else if (file.fieldname === 'model' || file.fieldname === 'iosModel') {
    // Accept 3D model files
    const allowedMimes = ['model/gltf+json', 'model/gltf-binary', 'application/octet-stream', 'application/json'];
    const allowedExts = ['.glb', '.gltf', '.usdz'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only 3D model files (glb, gltf, usdz) are allowed'), false);
    }
  } else {
    cb(new Error('Unknown file type'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});
