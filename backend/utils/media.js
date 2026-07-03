import cloudinary from 'cloudinary';
import fs from 'fs';
import { del } from '@vercel/blob';

const VERCEL_BLOB_HOST_FRAGMENT = 'blob.vercel-storage.com';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (file, folder = 'artistry/images') => {
  if (!file) return null;
  try {
    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder,
      resource_type: 'image',
    });
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return null;
  }
};

export const uploadModel = async (file, folder = 'artistry/models') => {
  if (!file) {
    console.error('uploadModel: No file provided');
    return null;
  }
  try {
    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder,
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true,
    });

    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      filename: file.originalname,
    };
  } catch (err) {
    console.error('Model upload error:', err);
    return null;
  }
};

const isCloudinaryUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.hostname.includes('res.cloudinary.com');
  } catch {
    return false;
  }
};

const extractCloudinaryPublicId = (value) => {
  if (!isCloudinaryUrl(value)) return null;

  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.findIndex((segment) => segment === 'upload');
    if (uploadIndex < 0) return null;

    const afterUpload = segments.slice(uploadIndex + 1);
    if (afterUpload.length === 0) return null;

    const versionFirst = /^v\d+$/.test(afterUpload[0]);
    const publicIdSegments = versionFirst ? afterUpload.slice(1) : afterUpload;
    if (publicIdSegments.length === 0) return null;

    const last = publicIdSegments[publicIdSegments.length - 1];
    const dotIndex = last.lastIndexOf('.');
    if (dotIndex > 0) {
      publicIdSegments[publicIdSegments.length - 1] = last.slice(0, dotIndex);
    }

    return publicIdSegments.join('/');
  } catch {
    return null;
  }
};

export const isVercelBlobUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.hostname.includes(VERCEL_BLOB_HOST_FRAGMENT);
  } catch {
    return false;
  }
};

export const deleteBlobByUrl = async (url) => {
  if (isCloudinaryUrl(url)) {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) return false;

    try {
      await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: 'raw',
        invalidate: true,
      });
      return true;
    } catch (err) {
      console.error('Cloudinary delete error:', err);
      return false;
    }
  }

  if (!isVercelBlobUrl(url)) return false;

  try {
    await del(url);
    return true;
  } catch (err) {
    console.error('Vercel Blob delete error:', err);
    return false;
  }
};
