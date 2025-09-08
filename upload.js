const multer = require("multer");

// Use memory storage so we can upload buffers directly to Cloudinary.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6 MB per file
    files: 5,
  },
});

module.exports = upload;
