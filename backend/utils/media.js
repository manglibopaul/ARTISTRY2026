import cloudinary from 'cloudinary';
import fs from 'fs';

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
    // Optionally remove local file after upload
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
  if (!file) return null;
  try {
    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
    });
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('Cloudinary model upload error:', err);
    return null;
  }
};
