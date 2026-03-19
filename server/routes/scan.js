const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const Scan = require("../models/Scan");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Multer setup - memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed!"));
    }
  },
});

// ANALYZE DOCUMENT
router.post("/analyze", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Send image to Python ML Service
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/analyze`,
      formData,
      { headers: formData.getHeaders(), timeout: 60000 }
    );

    const result = mlResponse.data;

    // Save to MongoDB
    const scan = await Scan.create({
      user: req.user.id,
      filename: req.file.originalname,
      verdict: result.verdict,
      confidence: result.confidence,
      fraudScore: result.fraud_score,
      documentType: result.document_type,
      summary: result.summary,
      flags: result.flags,
      analyses: result.analyses,
    });

    // Update user scan count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalScans: 1 } });

    res.json({ success: true, scan, result });

  } catch (error) {
    console.error("Scan error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET Scan History
router.get("/history", auth, async (req, res) => {
  try {
    const scans = await Scan.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, scans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Single Scan
router.get("/:id", auth, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }
    res.json({ success: true, scan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;