import fs from 'fs';

const normalizePathToPublicUpload = (filePath, filename, fallbackFolder = 'images') => {
  if (!filePath) return filename ? `/uploads/${fallbackFolder}/${filename}` : null;
  if (String(filePath).startsWith('http')) return filePath;

  const normalized = String(filePath).replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx);

  return filename ? `/uploads/${fallbackFolder}/${filename}` : null;
};



export const resolveStoredImageUrl = (filePath, filename, fallbackFolder = 'images') => {
  return normalizePathToPublicUpload(filePath, filename, fallbackFolder);
};

export const uploadImage = async (file, folder = 'artistry/images') => {
  if (!file) return null;
  const localUrl = normalizePathToPublicUpload(file.path, file.filename, 'images');
  return {
    url: localUrl,
    filename: file.filename || null,
  };
};

// Upload 3D model files (GLB, USDZ) to Cloudinary
export const uploadModel = async (file, folder = 'artistry/models') => {
  if (!file) return null;
  const localUrl = normalizePathToPublicUpload(file.path, file.filename, 'models');
  return {
    url: localUrl,
    filename: file.filename || null,
  };
};
