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

const toBase64Url = (value) => Buffer.from(value)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const buildMimeMessage = ({ from, to, subject, html, text }) => {
  const messageBody = html || text || '';
  const contentType = html ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"';
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
    '',
    messageBody,
  ].join('\r\n');
};

const getGmailAccessToken = async () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await withTimeout(async (signal) => {
    return fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal,
    });
  }, DEFAULT_TIMEOUT_MS, 'Gmail OAuth token request timed out');

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gmail OAuth token error ${response.status}${body ? `: ${body}` : ''}`);
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new Error('Gmail OAuth token response did not include an access token');
  }

  return data.access_token;
};

const sendViaGmailApi = async ({ to, subject, html, text }) => {
  const userEmail = process.env.GMAIL_USER_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM;
  if (!userEmail) {
    return false;
  }

  const accessToken = await getGmailAccessToken();
  if (!accessToken) {
    return false;
  }

  const rawMessage = buildMimeMessage({
    from: userEmail,
    to,
    subject,
    html,
    text,
  });

  const response = await withTimeout(async (signal) => {
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: toBase64Url(rawMessage) }),
      signal,
    });
  }, DEFAULT_TIMEOUT_MS, 'Gmail API request timed out');

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gmail API error ${response.status}${body ? `: ${body}` : ''}`);
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
    const gmailSent = await sendViaGmailApi({ to, subject, html, text });
    if (gmailSent) {
      return true;
    }
  } catch (error) {
    console.warn('Gmail API send failed, falling back to SMTP:', error && error.message ? error.message : error);
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
