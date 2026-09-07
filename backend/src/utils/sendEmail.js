import nodemailer from 'nodemailer';

/**
 * Send email via Resend REST API
 */
async function sendViaResend({ to, subject, text, html, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = from || process.env.EMAIL_FROM || 'PizzaSlice <onboarding@resend.dev>';

  console.log(`[OTP] Email provider request started (Resend API)`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`[OTP Error] Resend rejected email:`, data);
    throw new Error(data.message || `Resend error code ${response.status}`);
  }

  console.log(`[OTP] Email provider accepted message. MessageId: ${data.id}`);
  return { success: true, messageId: data.id, provider: 'resend' };
}

/**
 * Send email via Nodemailer SMTP (Gmail, SendGrid, Amazon SES, Mailtrap)
 */
async function sendViaSmtp({ to, subject, text, html, from }) {
  const isProd = process.env.NODE_ENV === 'production';
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().includes('@gmail.com');
  const isLiveConfigured = user && pass && !user.includes('dummy');

  let transporter;

  if (isLiveConfigured) {
    const providerName = isGmail ? 'Gmail SMTP' : `SMTP (${host})`;
    console.log(`[OTP] Email provider request started (${providerName})`);

    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  } else {
    // Check if user is trying to test real delivery
    console.warn(`[OTP Warning] Real email credentials not configured in backend/.env (SMTP_USER=${user || 'empty'}). Falling back to development test account.`);
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[OTP] Email provider request started (Ethereal test account: ${testAccount.user})`);
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (etherealErr) {
      console.error(`[OTP Error] Failed to create test transport:`, etherealErr.message);
      throw new Error('Email credentials not configured. Please set your Gmail SMTP (SMTP_USER and SMTP_PASS) or RESEND_API_KEY in backend/.env.');
    }
  }

  const fromAddress = from || process.env.EMAIL_FROM || '"PizzaSlice" <noreply@pizzaslice.com>';

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[OTP] Email provider accepted message. MessageId: ${info.messageId}`);

  if (!isProd && !isLiveConfigured) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[OTP Dev Notice] Email preview URL: ${previewUrl}`);
    }
  }

  return { success: true, messageId: info.messageId, provider: isLiveConfigured ? 'smtp' : 'ethereal' };
}

/**
 * General purpose sendEmail dispatcher
 */
export const sendEmail = async ({ to, subject, text, html, from, actionUrl }) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.log(`[Email] Dispatching to: ${to} | Subject: ${subject}`);
    if (actionUrl) {
      console.log(`[Email Link]: ${actionUrl}`);
    }
  }

  try {
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('dummy')) {
      return await sendViaResend({ to, subject, text, html, from });
    }

    return await sendViaSmtp({ to, subject, text, html, from });
  } catch (error) {
    console.error(`[OTP Error] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Specialized branded OTP verification email sender
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.otp - 6-digit verification code
 * @param {number} [params.expiryMinutes=10] - Expiry window in minutes
 * @param {string} [params.appName='PizzaSlice'] - App or Restaurant name
 */
export const sendOtpEmail = async ({ to, otp, expiryMinutes = 10, appName = 'PizzaSlice' }) => {
  const subject = 'Your PizzaSlice verification code';

  const text = `Your ${appName} verification code is:\n\n${otp}\n\nThis code expires in ${expiryMinutes} minutes.\nDo not share this code with anyone.\n\nThank you,\n${appName} Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;background:linear-gradient(135deg, rgba(248,96,21,0.15), rgba(234,88,12,0.05));border-bottom:1px solid #334155;">
              <div style="font-size:38px;line-height:1;margin-bottom:8px;">🍕</div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#f86015;letter-spacing:-0.5px;">${appName}</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#94a3b8;">Authentic Artisanal Wood-Fired Pizza</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#f1f5f9;text-align:center;">Email Verification Code</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#cbd5e1;text-align:center;">
                Use the 6-digit verification code below to verify your email address:
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="padding:22px;background:#0f172a;border:2px dashed #f86015;border-radius:12px;">
                    <div style="font-family:'Courier New',Courier,monospace,sans-serif;font-size:38px;font-weight:800;color:#f86015;letter-spacing:10px;text-indent:10px;user-select:all;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Warning / Expiry Notices -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:13px;line-height:1.6;color:#94a3b8;">
                    ⏱️ <strong>Expires in ${expiryMinutes} minutes:</strong> This code is valid for single use only.<br/>
                    🔒 <strong>Security Warning:</strong> Do not share this code with anyone. Our team will never ask for your verification code.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">
                If you did not request this verification code, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#0f172a;border-top:1px solid #334155;text-align:center;font-size:12px;color:#64748b;">
              &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br/>
              Delivering fresh, artisanal pizzas straight to your door.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return await sendEmail({
    to,
    subject,
    text,
    html,
  });
};


