const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // 1. Check for standard SMTP configuration or Gmail SMTP
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'hr.jattamkommerce@gmail.com';
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    // Direct Gmail configuration (User: hr.jattamkommerce@gmail.com)
    const defaultAppPass = 'bbbsswkhycjpaweg';
    const rawGmailPass = process.env.GMAIL_APP_PASSWORD || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_PASS : (pass || defaultAppPass));
    const gmailPass = rawGmailPass ? rawGmailPass.replace(/\s+/g, '') : defaultAppPass;
    const isGmail = (user && user.toLowerCase().includes('@gmail.com')) || (!host && (process.env.GMAIL_USER || gmailPass));

    if (isGmail && gmailPass) {
      console.log(`[EmailService] Initializing Gmail transporter for ${user}`);
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: user.trim(),
          pass: gmailPass
        }
      });
      return;
    }

    if (host && pass) {
      console.log(`[EmailService] Initializing SMTP transporter: ${host}:${port} (${user})`);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      return;
    }

    // 3. Fallback to local server sendmail / exim on Linux/cPanel (sends as hr.jattamkommerce@gmail.com)
    if (process.platform === 'linux' || process.env.NODE_ENV === 'production') {
      try {
        console.log(`[EmailService] Initializing local sendmail transport for hr.jattamkommerce@gmail.com`);
        this.transporter = nodemailer.createTransport({
          sendmail: true,
          newline: 'unix',
          path: '/usr/sbin/sendmail'
        });
        return;
      } catch (err) {
        console.warn(`[EmailService] Local sendmail fallback error:`, err.message);
      }
    }

    this.transporter = null;
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
    // Ensure compatible From address for Gmail SMTP
    const gmailUser = process.env.GMAIL_USER || 'hr.jattamkommerce@gmail.com';
    let fromAddress = process.env.SMTP_FROM || `"${organizationName} HR" <hr.jattamkommerce@gmail.com>`;
    if (gmailUser && (!process.env.SMTP_HOST || !process.env.SMTP_PASS)) {
      fromAddress = `"${organizationName} HR" <${gmailUser}>`;
    }
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
    .btn-container { text-align: center; margin: 24px 0 16px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-activate { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
    .btn-download-green { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); }
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
          <div><span style="color: #64748b;">Web Portal URL:</span> <a href="${appUrl}/login" style="color: #2563eb; font-weight: 600;">${appUrl}/login</a></div>
          <div style="margin-top: 6px;"><span style="color: #64748b;">Mobile App Download:</span> <a href="${appUrl}/jmk-hrms.apk" style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 4px 12px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 13px; margin-left: 6px;">📥 Download Android App (APK v1.0)</a></div>
        </div>
      </div>

      <div class="action-box">
        <strong>⚠️ Mandatory First-Time Action:</strong><br>
        1. Download and open the mobile app (or visit the web portal at <a href="${appUrl}/login" style="color: #b45309; font-weight: 700;">${appUrl}/login</a>).<br>
        2. Sign in using your <strong>Official Email</strong> and the <strong>Temporary Password</strong> provided above.<br>
        3. Once signed in, navigate to <strong>Profile / Settings &rarr; Change Password</strong> to set your permanent confidential password.
      </div>

      <!-- Prominent Green Highlighted App Download Button at the top of actions -->
      <div style="text-align: center; margin: 26px 0 18px;">
        <div style="margin-bottom: 12px;">
          <a href="${appUrl}/jmk-hrms.apk" class="btn-download-green" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 10px; font-weight: 800; font-size: 16px; box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);">
            📲 Download Android App (APK v1.0)
          </a>
        </div>
        <div>
          <a href="${appUrl}/login" style="color: #475569; font-size: 13.5px; text-decoration: underline; font-weight: 500;">
            Or log in via Web Portal in browser (${appUrl}/login) &rarr;
          </a>
        </div>
      </div>

      <div class="info-card" style="border-left: 4px solid #059669; background: #f0fdf4;">
        <strong style="color: #065f46;">📱 Mobile App Installation:</strong><br>
        • <strong>Android:</strong> Tap the green <strong>"Download Android App"</strong> button above to download the APK file directly, open it and tap <em>Install</em>.<br>
        • Once installed, clock in/out daily, request leaves, view company directory, and download payslips directly from your phone!
      </div>

      <div class="info-card">
        <strong>🔒 Security Notice:</strong><br>
        • Never share your login credentials or temporary password with anyone.<br>
        • HR will never ask for your account password.<br>
        • Direct web password set shortcut: <a href="${activationLink}" style="color: #2563eb;">${activationLink}</a>
      </div>

      <div class="warning">
        If the button above does not work, copy and paste this link into your phone browser to download the app directly:<br>
        <strong>Direct APK Download:</strong> <a href="${appUrl}/jmk-hrms.apk" style="color: #059669; font-weight: 700;">${appUrl}/jmk-hrms.apk</a><br>
        <strong>Web Portal:</strong> <a href="${appUrl}/login" style="color: #64748b;">${appUrl}/login</a>
      </div>
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
        replyTo: 'hr.jattamkommerce@gmail.com',
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
