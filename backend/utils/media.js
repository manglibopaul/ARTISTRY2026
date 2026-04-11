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
    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
    });
    console.log('uploadModel: Cloudinary upload result:', result);
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    console.error('Cloudinary model upload error:', err);
    if (file && file.path) {
      console.error('File path:', file.path);
      if (fs.existsSync(file.path)) {
        console.error('File exists on disk.');
      } else {
        console.error('File does NOT exist on disk.');
      }
    }
    return null;
  }
};
