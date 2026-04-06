import nodemailer from 'nodemailer';

const buildTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendResetEmail = async ({ to, subject, html, text }) => {
  const transporter = buildTransporter();
  if (!transporter) {
    console.warn('SMTP not configured. Skipping email send.');
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return true;
};

// General purpose email sender (alias)
export const sendEmail = sendResetEmail;
