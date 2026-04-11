import cloudinary from 'cloudinary';
import fs from 'fs';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadModel = async (file, folder = 'artistry/models') => {
  if (!file) {
    console.error('uploadModel: No file provided');
    return null;
  }
  try {
    // Save the file to /uploads/models/ with a unique name
    const uploadsDir = './uploads/models';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const destPath = `${uploadsDir}/${Date.now()}-${file.originalname}`;
    fs.copyFileSync(file.path, destPath);
    // Optionally remove the temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    // Return the public URL (assuming /uploads is served statically)
    const publicUrl = `/uploads/models/${destPath.split('/').pop()}`;
    return {
      url: publicUrl,
      filename: file.originalname,
    };
  } catch (err) {
    console.error('Local model upload error:', err);
    return null;
  }
};
