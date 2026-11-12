const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const emailPort = process.env.EMAIL_PORT || process.env.SMTP_PORT || 587;
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (emailUser && emailPass) {
    if (emailUser.includes('@gmail.com') && !emailHost) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort, 10),
        secure: parseInt(emailPort, 10) === 465,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    }
  } else {
    // Development fallback using Ethereal test account or dummy transport
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('📧 Nodemailer: Using Ethereal test mail service for development.');
    } catch (err) {
      // Stream fallback if offline
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      console.log('📧 Nodemailer: Offline mode active. Verification codes will print to terminal console.');
    }
  }

  return transporter;
}

/**
 * Send Password Reset OTP Email
 */
async function sendPasswordResetEmail(toEmail, otpCode, userName = 'Citizen') {
  try {
    const mailTransporter = await getTransporter();

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"CivicCare Support" <no-reply@civiccare.gov.in>';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #176B87 0%, #0F4C5C 100%); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">CivicCare</h1>
          <p style="color: #e0f2fe; margin: 6px 0 0 0; font-size: 13px;">Smart City Public Grievance Management System</p>
        </div>
        <div style="padding: 32px 28px; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Password Reset Request</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">We received a request to reset your password for your CivicCare portal account. Use the verification code below to reset your password:</p>
          
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 8px; padding: 14px 32px;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #047857; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">This code will expire in <strong>15 minutes</strong>.</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #64748b;">If you did not request a password reset, please ignore this email or contact CivicCare city administration immediately.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} CivicCare Smart City Grievance Management System. All rights reserved.
        </div>
      </div>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[CivicCare] Password Reset Verification Code: ${otpCode}`,
      text: `Hello ${userName},\n\nYour CivicCare password reset code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: htmlContent
    });

    console.log(`\n======================================================`);
    console.log(`🔑 [CivicCare] PASSWORD RESET OTP GENERATED`);
    console.log(`📧 Recipient: ${toEmail}`);
    console.log(`🔢 Verification Code: ${otpCode}`);
    console.log(`⏱️  Expires in: 15 minutes`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`🌐 Ethereal Web Email Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log(`======================================================\n`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || null
    };
  } catch (error) {
    console.error('Nodemailer Send Error:', error);
    // Still log OTP in terminal so development/testing never gets blocked
    console.log(`\n⚠️ Failed to send via SMTP, but verification code was generated:`);
    console.log(`👉 Verification Code for ${toEmail}: ${otpCode}\n`);
    return {
      success: false,
      error: error.message,
      fallbackOtp: otpCode
    };
  }
}

module.exports = {
  sendPasswordResetEmail
};
