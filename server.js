const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors());
app.use(express.json());

// Create Supabase client with service role key
// IMPORTANT: The service role key bypasses RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Make sure this is the service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for temporary file uploads
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

// Upload endpoint - saving directly to database
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const filePath = file.path;
    const fileType = req.body.type || "unknown";

    // Convert file to base64 string
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString("base64");

    // Insert into database
    const { data, error } = await supabase
      .from("media_files")
      .insert([
        {
          type: fileType,
          file_name: path.basename(file.originalname),
          mime_type: file.mimetype,
          size: file.size,
          file_data: base64File, // storing file as base64 in the database
        },
      ])
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Clean up temporary file
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      file_id: data[0].id,
      type: fileType,
      fileName: path.basename(file.originalname),
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint to retrieve a file by ID
app.get("/file/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("media_files")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "File not found" });
    }

    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(data.file_data, "base64");

    // Set the correct content type
    res.setHeader("Content-Type", data.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${data.file_name}"`
    );

    // Send the file data
    res.send(fileBuffer);
  } catch (error) {
    console.error("File retrieval error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
