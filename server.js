require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileRoutes = require("./routes/fileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/files", fileRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
