import cloudinary from 'cloudinary';
import fs from 'fs';
import { put, del } from '@vercel/blob';

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
    // Read the file buffer
    const fileBuffer = fs.readFileSync(file.path);
    // Generate a unique filename
    const uniqueName = `${folder}/${Date.now()}-${file.originalname}`;
    // Upload to Vercel Blob
    const { url } = await put(uniqueName, fileBuffer, { access: 'public' });
    // Optionally remove the temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return {
      url,
      filename: file.originalname,
    };
  } catch (err) {
    console.error('Vercel Blob upload error:', err);
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
  if (!isVercelBlobUrl(url)) return false;

  try {
    await del(url);
    return true;
  } catch (err) {
    console.error('Vercel Blob delete error:', err);
    return false;
  }
};
