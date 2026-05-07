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

  // If SMTP is not configured or blocked, use test account as fallback so OTP emails still work
  try {
    console.warn('SMTP not configured or blocked. Using Nodemailer test account for OTP emails.');
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
    console.warn('Test account fallback failed:', err && err.message ? err.message : err);
  }

  return null;
};

const sendWithTestAccount = async ({ to, subject, html, text }) => {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    family: 4,
    auth: { user: testAccount.user, pass: testAccount.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.info('Email preview URL:', preview);
  return true;
};

export const sendResetEmail = async ({ to, subject, html, text }) => {
  const transporter = await buildTransporter();
  if (!transporter) {
    return sendWithTestAccount({ to, subject, html, text });
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.info('Email preview URL:', preview);
    return true;
  } catch (smtpError) {
    console.warn('SMTP send failed, falling back to Nodemailer test account:', smtpError && smtpError.message ? smtpError.message : smtpError);
    return sendWithTestAccount({ to, subject, html, text });
  }
};

// General purpose email sender (alias)
export const sendEmail = sendResetEmail;
