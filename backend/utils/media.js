import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const normalizePathToPublicUpload = (filePath, filename, fallbackFolder = 'images') => {
  if (!filePath) return filename ? `/uploads/${fallbackFolder}/${filename}` : null;
  if (String(filePath).startsWith('http')) return filePath;

  const normalized = String(filePath).replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx);

  return filename ? `/uploads/${fallbackFolder}/${filename}` : null;
};

const hasCloudinaryConfig = () => {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
};

const ensureCloudinaryConfigured = () => {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

export const resolveStoredImageUrl = (filePath, filename, fallbackFolder = 'images') => {
  return normalizePathToPublicUpload(filePath, filename, fallbackFolder);
};

export const uploadImage = async (file, folder = 'artistry/images') => {
  if (!file) return null;

  const localUrl = normalizePathToPublicUpload(file.path, file.filename, 'images');

  if (!hasCloudinaryConfig()) {
    return {
      url: localUrl,
      filename: file.filename || null,
    };
  }

  try {
    ensureCloudinaryConfigured();
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'image',
    });

    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }

    return {
      url: uploaded.secure_url,
      filename: uploaded.public_id,
    };
  } catch {
    return {
      url: localUrl,
      filename: file.filename || null,
    };
  }
};

// Upload 3D model files (GLB, USDZ) to Cloudinary
export const uploadModel = async (file, folder = 'artistry/models') => {
  if (!file) return null;

  const localUrl = normalizePathToPublicUpload(file.path, file.filename, 'models');

  if (!hasCloudinaryConfig()) {
    return {
      url: localUrl,
      filename: file.filename || null,
    };
  }

  try {
    ensureCloudinaryConfigured();
    // Upload as 'raw' resource type to preserve file format
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'raw',
      type: 'upload',
    });

    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }

    return {
      url: uploaded.secure_url,
      filename: uploaded.public_id,
    };
  } catch (error) {
    console.error('Model upload error:', error);
    return {
      url: localUrl,
      filename: file.filename || null,
    };
  }
};
