const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // Check for direct Gmail configuration
    const gmailUser = process.env.GMAIL_USER || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_USER : null);
    const rawGmailPass = process.env.GMAIL_APP_PASSWORD || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_PASS : null);
    const gmailPass = rawGmailPass ? rawGmailPass.replace(/\s+/g, '') : null;

    if (gmailUser && gmailPass) {
      console.log(`[EmailService] Initializing Gmail transporter for ${gmailUser}`);
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    } else {
      // Transporter not configured - will report error when attempting to send
      this.transporter = null;
    }
  }

  getTransporter() {
    if (!this.transporter) {
      this.initTransporter();
    }
    return this.transporter;
  }

  /**
   * Send HRMS Onboarding Invitation Email
   */
  async sendOnboardingEmail({ 
    toEmail, 
    employeeName, 
    employeeCode, 
    activationLink, 
    token = null,
    appDownloadUrl = null,
    organizationName = 'Jatta M Kommerce',
    temporaryPassword = null
  }) {
    const gmailUser = process.env.GMAIL_USER || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_USER : null);
    const fromAddress = process.env.SMTP_FROM || (gmailUser ? `"${organizationName} HRMS" <${gmailUser}>` : `"${organizationName} HRMS" <no-reply@jattamkommerce.com>`);
    const subject = `Welcome to ${organizationName} - Your HRMS Account Credentials (${employeeCode})`;

    const appUrl = (process.env.APP_URL || 'https://hrms.jattamkommerce.com').replace(/\/+$/, '');
    const resolvedDownloadUrl = appDownloadUrl || process.env.APP_DOWNLOAD_URL || `${appUrl}/download`;
    const resolvedToken = token || (activationLink && activationLink.includes('token=') ? activationLink.split('token=')[1] : '');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${organizationName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 20px; border: 1px solid #bfdbfe; }
    .instruction { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 20px 0 16px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-activate { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
    .btn-download { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .credentials-card { background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #cbd5e1; text-align: left; }
    .credentials-card h4 { margin: 0 0 14px; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .action-box { background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 13.5px; line-height: 1.6; color: #92400e; }
    .info-card { background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #334155; }
    .info-card strong { color: #0f172a; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
    .warning { font-size: 12px; color: #94a3b8; margin-top: 16px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${organizationName}</h1>
      <p>Human Resource Management System</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${employeeName},</div>
      <p class="instruction">
        Welcome to <strong>${organizationName}</strong>! Your official employee profile and HRMS user account have been activated.
      </p>
      
      <div>
        <span class="badge">Official Employee ID: ${employeeCode}</span>
      </div>

      <div class="credentials-card">
        <h4>Official Login Credentials</h4>
        <div style="font-size: 13.5px; line-height: 2.1;">
          <div><span style="color: #64748b;">Official Login Email:</span> <strong style="color: #0f172a;">${toEmail}</strong></div>
          <div><span style="color: #64748b;">Official Employee ID:</span> <strong style="color: #1d4ed8;">${employeeCode}</strong></div>
          ${temporaryPassword ? `<div><span style="color: #64748b;">Temporary Password:</span> <code style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 14px; font-weight: 700; border: 1px solid #fde68a;">${temporaryPassword}</code></div>` : ''}
          <div><span style="color: #64748b;">Web Portal Login URL:</span> <a href="${appUrl}/login" style="color: #2563eb; font-weight: 600;">${appUrl}/login</a></div>
          <div><span style="color: #64748b;">Mobile App Download:</span> <a href="${resolvedDownloadUrl}" style="color: #2563eb; font-weight: 600;">${resolvedDownloadUrl}</a></div>
        </div>
      </div>

      <div class="action-box">
        <strong>⚠️ Mandatory First-Time Action:</strong><br>
        1. Open the mobile app or visit the web portal at <a href="${appUrl}/login" style="color: #b45309; font-weight: 700;">${appUrl}/login</a>.<br>
        2. Sign in using your <strong>Official Email</strong> (or <strong>Employee ID</strong>) and the <strong>Temporary Password</strong> provided above.<br>
        3. Once signed in, immediately navigate to <strong>Profile / Settings &rarr; Change Password</strong> to establish your permanent confidential password.
      </div>

      <div class="btn-container" style="text-align: center; margin: 24px 0 16px;">
        <a href="${appUrl}/login" class="btn-activate" target="_blank" rel="noopener noreferrer" style="margin: 6px;">
          Log In to HRMS Portal
        </a>
        <a href="${resolvedDownloadUrl}" class="btn-download" target="_blank" rel="noopener noreferrer" style="margin: 6px;">
          📲 Download Mobile App
        </a>
      </div>

      <div class="info-card">
        <strong>📱 Mobile App Installation (Android & iOS):</strong><br>
        1. Open the <strong>Mobile App Download Link</strong> (<a href="${resolvedDownloadUrl}" style="color: #2563eb;">${resolvedDownloadUrl}</a>) on your smartphone.<br>
        2. <strong>Android (Chrome):</strong> Tap the 3 dots (⋮) &rarr; Tap <em>"Install App"</em> or <em>"Add to Home Screen"</em> (or download the production APK directly).<br>
        3. <strong>iPhone / iOS (Safari):</strong> Tap the Share button (<span style="font-size: 15px;">⎋</span>) &rarr; Tap <em>"Add to Home Screen"</em>.<br>
        Once installed, clock in/out daily, request leaves, view company directory, and download payslips directly from your phone!
      </div>

      <div class="info-card">
        <strong>🔒 Security Notice:</strong><br>
        • Never share your login credentials or temporary password with anyone.<br>
        • HR will never ask for your account password.<br>
        • Direct web password set shortcut: <a href="${activationLink}" style="color: #2563eb;">${activationLink}</a>
      </div>

      <div class="warning">
        If the buttons above do not work, copy and paste these links into your browser:<br>
        <strong>HRMS Portal:</strong> <a href="${appUrl}/login" style="color: #2563eb;">${appUrl}/login</a><br>
        <strong>Download Mobile App:</strong> <a href="${resolvedDownloadUrl}" style="color: #2563eb;">${resolvedDownloadUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.<br>
      This is an automated system notification. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Welcome to ${organizationName} HRMS!

Dear ${employeeName},

Your official employee profile and HRMS account have been created.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR HRMS LOGIN CREDENTIALS & ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Official Login Email: ${toEmail}
• Official Employee ID: ${employeeCode}
• Temporary Login Password: ${temporaryPassword || '(Provided by HR administrator)'}
• HRMS Portal Access URL: ${appUrl}/login
• Mobile App Download Link: ${resolvedDownloadUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ MANDATORY ACTION UPON FIRST LOGIN:
1. Open the mobile app or visit ${appUrl}/login
2. Sign in using your Official Email (or Employee ID) and the Temporary Password above
3. Immediately go to Profile / Settings -> Change Password to establish your confidential permanent password.

STEP 2: DOWNLOAD & INSTALL THE MOBILE APP
App Download Link: ${resolvedDownloadUrl}
• Android: Open in Google Chrome, tap 3 dots (⋮) and tap "Install App" or "Add to Home screen" (or download the production APK).
• iPhone (iOS): Open in Safari, tap Share button and tap "Add to Home Screen".

Alternative direct password establishment link:
${activationLink}

If you have any questions, please reach out to your HR department.
`;

    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(textContent.trim())}`;

    // Always log the outgoing invitation attempt for audit trail with tokens redacted
    console.log(`[EmailService] Attempting to send onboarding invitation to ${toEmail} (${employeeCode}) [activation token redacted]`);

    const transporter = this.getTransporter();
    if (!transporter) {
      const errMessage = 'SMTP / Gmail credentials not configured in environment (GMAIL_USER or SMTP_HOST missing)';
      console.warn(`[EmailService] ${errMessage}`);
      return {
        success: false,
        error: errMessage,
        activationLink,
        token: resolvedToken,
        appDownloadUrl: resolvedDownloadUrl,
        gmailComposeUrl
      };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[EmailService] Email sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        activationLink,
        token: resolvedToken,
        appDownloadUrl: resolvedDownloadUrl,
        gmailComposeUrl
      };
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${toEmail}:`, error.message);
      return {
        success: false,
        error: error.message,
        activationLink,
        token: resolvedToken,
        appDownloadUrl: resolvedDownloadUrl,
        gmailComposeUrl
      };
    }
  }
}

module.exports = new EmailService();
