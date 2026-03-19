const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Scan = require("../models/Scan");
const auth = require("../middleware/auth");

// GET Profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE Profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
  req.user.id,
  { name },
  { returnDocument: 'after' }
).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Stats
router.get("/stats", auth, async (req, res) => {
  try {
    const totalScans = await Scan.countDocuments({ user: req.user.id });
    const authentic = await Scan.countDocuments({ user: req.user.id, verdict: "AUTHENTIC" });
    const fraudulent = await Scan.countDocuments({ user: req.user.id, verdict: "FRAUDULENT" });
    const suspicious = await Scan.countDocuments({ user: req.user.id, verdict: "SUSPICIOUS" });

    res.json({
      success: true,
      stats: { totalScans, authentic, fraudulent, suspicious }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// DELETE Account
router.delete("/delete", auth, async (req, res) => {
  try {
    await Scan.deleteMany({ user: req.user.id });
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;