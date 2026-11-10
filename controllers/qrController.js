const QRCode = require("qrcode");

async function generateQr(req, res) {
  try {
    const { text, dark = "#111827", light = "#ffffff", errorCorrectionLevel = "H" } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Please enter some content to generate a QR code." });
    }

    if (text.length > 2500) {
      return res.status(400).json({ error: "Content is too long. Please keep it under 2,500 characters." });
    }

    const validColor = /^#[0-9a-fA-F]{6}$/;
    if (!validColor.test(dark) || !validColor.test(light)) {
      return res.status(400).json({ error: "Please choose valid QR colours." });
    }

    const level = ["L", "M", "Q", "H"].includes(errorCorrectionLevel)
      ? errorCorrectionLevel
      : "H";

    const dataUrl = await QRCode.toDataURL(text.trim(), {
      errorCorrectionLevel: level,
      margin: 2,
      width: 640,
      color: { dark, light }
    });

    res.json({ dataUrl, encodedText: text.trim() });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(400).json({ error: "Unable to generate this QR code. Try shorter or simpler content." });
  }
}

async function generateSvg(req, res) {
  try {
    const { text, dark = "#111827", light = "#ffffff" } = req.body || {};
    if (typeof text !== "string" || !text.trim() || text.length > 2500) {
      return res.status(400).json({ error: "Please provide valid QR content under 2,500 characters." });
    }
    const validColor = /^#[0-9a-fA-F]{6}$/;
    if (!validColor.test(dark) || !validColor.test(light)) {
      return res.status(400).json({ error: "Please choose valid QR colours." });
    }
    const svg = await QRCode.toString(text.trim(), {
      type: "svg", errorCorrectionLevel: "H", margin: 2, width: 640,
      color: { dark, light }
    });
    res.json({ svg });
  } catch (error) {
    console.error("SVG generation error:", error);
    res.status(400).json({ error: "Unable to generate SVG for this content." });
  }
}

module.exports = { generateQr, generateSvg };
