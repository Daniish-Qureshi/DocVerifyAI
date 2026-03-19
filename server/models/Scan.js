const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  verdict: {
    type: String,
    enum: ["AUTHENTIC", "SUSPICIOUS", "FRAUDULENT"],
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
  },
  fraudScore: {
    type: Number,
    default: 0,
  },
  documentType: {
    type: String,
    default: "Unknown",
  },
  summary: {
    type: String,
    default: "",
  },
  flags: {
    type: [String],
    default: [],
  },
  analyses: {
    type: Object,
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model("Scan", scanSchema);