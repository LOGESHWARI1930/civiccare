const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary from process.env
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️ Cloudinary integration configured.');
} else {
  console.log('ℹ️ Cloudinary credentials not fully set in .env. Uploads will use local static storage fallback.');
}

/**
 * Upload a buffer or file path to Cloudinary (or return local file URL if not configured)
 * @param {Object} file Multer file object
 * @param {String} folder Folder name in Cloudinary
 */
async function uploadToCloudinary(file, folder = 'civiccare') {
  if (!file) return null;

  // If Cloudinary is configured, upload to Cloudinary stream/file
  if (isConfigured) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `civiccare/${folder}`,
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
    } catch (err) {
      console.error('Cloudinary Upload Failed, falling back to file URL:', err.message);
    }
  }

  // Fallback: If saved locally by Multer or buffer
  if (file.filename) {
    return `/assets/uploads/${file.filename}`;
  }

  // If buffer, write to disk local fallback directory
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '../../client/assets/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `img_${Date.now()}_${Math.round(Math.random() * 1e9)}.${file.originalname ? file.originalname.split('.').pop() : 'jpg'}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  return `/assets/uploads/${filename}`;
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  isConfigured
};
