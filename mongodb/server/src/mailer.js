// Sends emails through Resend's HTTPS API (no extra package needed).
//   sendResetEmail(to, token)    password reset (link valid 1 hour)
//   sendVerifyEmail(to, token)   sign-up verification (link valid 24 hours)
// Required env: RESEND_API_KEY, MAIL_FROM   Optional: PUBLIC_URL, APP_SCHEME
// Note: with Resend's test sender you can only email your own address. To email real users,
// verify a domain in Resend and use an address on it as MAIL_FROM.
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

async function send({ to, subject, text, html, devNote }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('RESEND_API_KEY and MAIL_FROM must be set in production.');
    console.log(`[DEV] ${devNote}`);   // local development only
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
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

module.exports = { sendResetEmail, sendVerifyEmail, resetLinks, verifyLink };