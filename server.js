// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors());
app.use(express.json());

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "uploads");
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
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  },
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const filePath = file.path;
    const fileType = req.body.type || "unknown";

    // Determine bucket based on file type
    const bucketName = file.mimetype.startsWith("image") ? "images" : "videos";

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `${fileType}/${path.basename(filePath)}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Clean up temporary file
    fs.unlinkSync(filePath);

    // Store metadata in database
    const { data: metaData, error: dbError } = await supabase
      .from("media_uploads")
      .insert([
        {
          type: fileType,
          file_name: fileName,
          mime_type: file.mimetype,
          size: file.size,
          url: urlData.publicUrl,
          bucket: bucketName,
        },
      ]);

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      type: fileType,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
