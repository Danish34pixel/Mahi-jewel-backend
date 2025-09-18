const express = require("express");
const router = express.Router();

// Simple SVG placeholder generator to avoid 404s when frontend requests
// /api/placeholder/:w/:h. Returns a small SVG with dimensions and a neutral bg.
router.get("/:w/:h", (req, res) => {
  const w = Math.max(1, Math.min(2000, parseInt(req.params.w) || 80));
  const h = Math.max(1, Math.min(2000, parseInt(req.params.h) || 80));
  const bg = "#f3f4f6";
  const fg = "#9ca3af";
  const text = `${w}x${h}`;
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='${bg}'/>` +
    `<text x='50%' y='50%' font-family='Arial, Helvetica, sans-serif' font-size='${Math.floor(
      Math.min(w, h) / 4
    )}' fill='${fg}' dominant-baseline='middle' text-anchor='middle'>${text}</text>` +
    `</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
});

module.exports = router;
