require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileRoutes = require("./routes/fileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS with specific options
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Routes
app.use("/api/files", fileRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
