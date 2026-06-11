const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { pool } = require("../config/db");
const auth = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    if (!process.env.ML_SERVICE_URL) {
      return res.status(500).json({
        message: "ML service not configured. Please set ML_SERVICE_URL environment variable."
      });
    }

    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/analyze`,
      formData,
      { headers: formData.getHeaders(), timeout: 60000 }
    );

    const result = mlResponse.data;

    const scanResult = await pool.query(
      `INSERT INTO scans (user_id, filename, verdict, confidence, fraud_score, document_type, summary, flags, analyses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.user.id,
        req.file.originalname,
        result.verdict,
        result.confidence,
        result.fraud_score,
        result.document_type,
        result.summary,
        JSON.stringify(result.flags || []),
        JSON.stringify(result.analyses || {})
      ]
    );

    await pool.query(
      "UPDATE users SET total_scans = total_scans + 1, updated_at = NOW() WHERE id = $1",
      [req.user.id]
    );

    res.json({ success: true, scan: scanResult.rows[0], result });

  } catch (error) {
    console.error("Scan error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET Scan History
router.get("/history", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    res.json({ success: true, scans: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Single Scan
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM scans WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Scan not found" });
    }
    res.json({ success: true, scan: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;