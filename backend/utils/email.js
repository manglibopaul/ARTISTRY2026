import nodemailer from 'nodemailer';

const DEFAULT_TIMEOUT_MS = 10000;

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promise(controller.signal);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const sendViaSendGrid = async ({ to, subject, html, text }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!apiKey || !from) {
    return false;
  }

  const response = await withTimeout(async (signal) => {
    return fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [
          { type: 'text/plain', value: text || '' },
          { type: 'text/html', value: html || '' },
        ],
      }),
      signal,
    });
  }, DEFAULT_TIMEOUT_MS, 'SendGrid request timed out');

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SendGrid error ${response.status}${body ? `: ${body}` : ''}`);
  }

  return true;
};

const buildTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secureEnv = String(process.env.SMTP_SECURE || '').toLowerCase();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = secureEnv === 'true' ? true : secureEnv === 'false' ? false : port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Development fallback: create a test account and return transporter so developers can preview messages
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        family: 4,
        auth: { user: testAccount.user, pass: testAccount.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    } catch (err) {
      console.warn('Failed to create nodemailer test account:', err && err.message ? err.message : err);
      return null;
    }
  }

  return null;
};

export const sendResetEmail = async ({ to, subject, html, text }) => {
  try {
    const sendgridSent = await sendViaSendGrid({ to, subject, html, text });
    if (sendgridSent) {
      return true;
    }
  } catch (error) {
    console.warn('SendGrid email send failed, falling back to SMTP:', error && error.message ? error.message : error);
  }

  const transporter = await buildTransporter();
  if (!transporter) {
    throw new Error('SMTP not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or run a local SMTP dev server.');
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  // If using nodemailer test account, log preview URL for developer convenience
  try {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.info('Email preview URL:', preview);
  } catch {}

  return true;
};

// General purpose email sender (alias)
export const sendEmail = sendResetEmail;
