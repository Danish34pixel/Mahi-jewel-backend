const multer = require("multer");

// Use memory storage for direct upload to ImageKit
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = upload;
