// Sends emails over HTTPS (no extra package needed).
//   sendResetEmail(to, token)    password reset (link valid 1 hour)
//   sendVerifyEmail(to, token)   sign-up verification (link valid 24 hours)
//
// Two providers are supported. Brevo is used when BREVO_API_KEY is set, otherwise Resend.
//   Brevo  (free: 300 emails/day, any recipient, one verified sender address, no domain needed)
//          env: BREVO_API_KEY, MAIL_FROM = the sender address verified in Brevo
//               MAIL_FROM_NAME (optional, default "ArchiveAuto")
//   Resend (free test sender only reaches the Resend account owner; real users need a verified domain)
//          env: RESEND_API_KEY, MAIL_FROM
// Optional for both: PUBLIC_URL, APP_SCHEME
const APP_SCHEME = process.env.APP_SCHEME || 'archiveauto';

function resetLinks(token) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  return {
    // HTTPS page on this server; it bounces the phone into the app. Works in every mail client.
    web: base ? `${base}/reset-password?token=${encodeURIComponent(token)}` : null,
    app: `${APP_SCHEME}://reset-password?token=${encodeURIComponent(token)}`,
  };
}

// The verification link is a plain HTTPS page on this server, so it works from any device.
function verifyLink(token) {
  const base = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

// "Name <me@example.com>" or just "me@example.com" -> { name, email }
function parseFrom(from) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  if (m) return { name: m[1].replace(/^"|"$/g, '') || 'ArchiveAuto', email: m[2].trim() };
  return { name: process.env.MAIL_FROM_NAME || 'ArchiveAuto', email: String(from || '').trim() };
}

const timeout = () => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15000) : undefined);

// Which provider is configured: 'brevo', 'resend' or null.
function provider() {
  if (!process.env.MAIL_FROM) return null;
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(process.env.MAIL_FROM),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`Brevo failed (${res.status}): ${await res.text()}`);
}

async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
}

async function send({ to, subject, text, html, devNote }) {
  const which = provider();
  if (!which) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Email is not configured: set BREVO_API_KEY (or RESEND_API_KEY) and MAIL_FROM.');
    console.log(`[DEV] ${devNote}`);   // local development only
    return;
  }
  if (which === 'brevo') return sendViaBrevo({ to, subject, text, html });
  return sendViaResend({ to, subject, text, html });
}

async function sendResetEmail(to, token) {
  const { web, app } = resetLinks(token);
  const link = web || app;
  await send({
    to,
    subject: 'Reset your ArchiveAuto password',
    devNote: `Reset link for ${to}: ${link}`,
    text: `We got a request to reset your ArchiveAuto password.\n\nOpen this link on your phone (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
    html: `<p>We got a request to reset your ArchiveAuto password.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Reset password</a></p>
<p>This link is valid for 1 hour. Open it on the phone that has the app installed.</p>
<p style="color:#666">If you didn't ask for this, you can ignore this email.</p>`,
  });
}

async function sendVerifyEmail(to, token) {
  const link = verifyLink(token);
  await send({
    to,
    subject: 'Verify your ArchiveAuto email',
    devNote: `Verification link for ${to}: ${link}`,
    text: `Welcome to ArchiveAuto!\n\nConfirm your email address to finish creating your account (valid for 24 hours):\n${link}\n\nThen go back to the app and log in. If you didn't sign up, ignore this email.`,
    html: `<p>Welcome to ArchiveAuto!</p>
<p>Confirm your email address to finish creating your account.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Verify my email</a></p>
<p>This link is valid for 24 hours. After verifying, go back to the app and log in.</p>
<p style="color:#666">If you didn't sign up, you can ignore this email.</p>`,
  });
}

module.exports = { sendResetEmail, sendVerifyEmail, resetLinks, verifyLink, parseFrom };