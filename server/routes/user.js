const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const auth = require("../middleware/auth");

// GET Profile
router.get("/profile", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, avatar, plan, total_scans, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE Profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, avatar, plan, total_scans",
      [name, req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Stats
router.get("/stats", auth, async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM scans WHERE user_id = $1", [req.user.id]);
    const authentic = await pool.query("SELECT COUNT(*) FROM scans WHERE user_id = $1 AND verdict = 'AUTHENTIC'", [req.user.id]);
    const fraudulent = await pool.query("SELECT COUNT(*) FROM scans WHERE user_id = $1 AND verdict = 'FRAUDULENT'", [req.user.id]);
    const suspicious = await pool.query("SELECT COUNT(*) FROM scans WHERE user_id = $1 AND verdict = 'SUSPICIOUS'", [req.user.id]);

    res.json({
      success: true,
      stats: {
        totalScans: parseInt(total.rows[0].count),
        authentic: parseInt(authentic.rows[0].count),
        fraudulent: parseInt(fraudulent.rows[0].count),
        suspicious: parseInt(suspicious.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE Account
router.delete("/delete", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM scans WHERE user_id = $1", [req.user.id]);
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.json({ success: true, message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;