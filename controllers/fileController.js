const fs = require("fs");
const path = require("path");
const supabase = require("../services/supabaseService");

// Upload a file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const filePath = file.path;
    const fileType = req.body.type || "unknown";

    // Convert file to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString("base64");

    // Insert into Supabase
    const { data, error } = await supabase
      .from("media_files")
      .insert([
        {
          type: fileType,
          file_name: path.basename(file.originalname),
          mime_type: file.mimetype,
          size: file.size,
          file_data: base64File,
        },
      ])
      .select();

    if (error) throw new Error(`Database error: ${error.message}`);

    // Delete temp file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      file_id: data[0].id,
      type: fileType,
      fileName: path.basename(file.originalname),
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Retrieve a file by ID
exports.getFile = async (req, res) => {
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

    res.setHeader("Content-Type", data.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${data.file_name}"`
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("File retrieval error:", error);
    res.status(500).json({ error: error.message });
  }
};
