const express = require("express");
const rateLimit = require("express-rate-limit");
const { generateQr, generateSvg } = require("../controllers/qrController");

const router = express.Router();

const qrLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many QR requests. Please wait a minute and try again." }
});

router.post("/generate", qrLimiter, generateQr);
router.post("/svg", qrLimiter, generateSvg);

module.exports = router;
