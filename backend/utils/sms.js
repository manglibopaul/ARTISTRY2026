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

export const normalizePhoneNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const cleaned = raw.replace(/[\s().-]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : '';
  }

  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('63') && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }

  return '';
};

export const sendSms = async ({ to, body }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.');
  }

  const response = await withTimeout(async (signal) => {
    return fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: String(to || '').trim(),
        Body: String(body || ''),
      }),
      signal,
    });
  }, DEFAULT_TIMEOUT_MS, 'Twilio SMS request timed out');

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Twilio SMS error ${response.status}${bodyText ? `: ${bodyText}` : ''}`);
  }

  return true;
};