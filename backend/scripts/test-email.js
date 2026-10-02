const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('--- Testing HRMS Email Configuration ---');
  console.log('GMAIL_USER:', process.env.GMAIL_USER || '(not set)');
  console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '****** (length ' + process.env.GMAIL_APP_PASSWORD.length + ')' : '(not set)');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '(not set)');
  console.log('SMTP_USER:', process.env.SMTP_USER || '(not set)');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****** (length ' + process.env.SMTP_PASS.length + ')' : '(not set)');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || '(not set)');

  let transporter = null;

  if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
    console.log('\nTesting cPanel SMTP connection...');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('\nTesting Gmail connection...');
    const pass = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: pass
      }
    });
  } else {
    console.error('\nERROR: Neither SMTP nor GMAIL credentials are fully configured in .env!');
    process.exit(1);
  }

  try {
    await transporter.verify();
    console.log('\nSUCCESS: Email server connection and credentials are valid and verified!');
  } catch (err) {
    console.error('\nFAILED: Verification failed with error:');
    console.error(err.message);
    if (err.message.includes('Username and Password not accepted') || err.message.includes('BadCredentials')) {
      console.log('\nHINT: Google rejected the password. Google requires a 16-character "App Password", not your normal login password.');
      console.log('Generate one here: https://myaccount.google.com/apppasswords');
    }
  }
}

testEmail();
