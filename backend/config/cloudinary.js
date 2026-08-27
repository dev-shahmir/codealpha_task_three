const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Check if Cloudinary is fully configured
const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                      process.env.CLOUDINARY_API_KEY && 
                      process.env.CLOUDINARY_API_SECRET &&
                      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// High-speed Disk Storage (Fastest response, zero network bottleneck)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, cleanName);
  },
});

const uploadImage = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const uploadVideo = multer({
  storage: diskStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

const uploadAvatar = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadCover = multer({
  storage: diskStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Delete helper
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (hasCloudinary && publicId) {
    try {
      return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (_) {}
  }
};

module.exports = { cloudinary, uploadImage, uploadVideo, uploadAvatar, uploadCover, deleteFromCloudinary, hasCloudinary };
