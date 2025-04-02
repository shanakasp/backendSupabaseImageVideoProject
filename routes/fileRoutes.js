const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadFile, getFile } = require("../controllers/fileController");

const router = express.Router();

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Routes
router.post("/upload", upload.single("file"), uploadFile);
router.get("/:id", getFile);

module.exports = router;
