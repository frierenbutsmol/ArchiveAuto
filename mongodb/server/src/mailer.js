// Sends the password-reset email through Resend's HTTPS API (no extra package needed).
// Required env: RESEND_API_KEY, MAIL_FROM   Optional: PUBLIC_URL, APP_SCHEME
const APP_SCHEME = process.env.APP_SCHEME || 'archiveauto';

function resetLinks(token) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  return {
    // HTTPS page on this server; it bounces the phone into the app. Works in every mail client.
    web: base ? `${base}/reset-password?token=${encodeURIComponent(token)}` : null,
    app: `${APP_SCHEME}://reset-password?token=${encodeURIComponent(token)}`,
  };
}

async function sendResetEmail(to, token) {
  const { web, app } = resetLinks(token);
  const link = web || app;

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('RESEND_API_KEY and MAIL_FROM must be set in production.');
    console.log(`[DEV] Reset link for ${to}: ${link}`);   // local development only
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject: 'Reset your ArchiveAuto password',
      text: `We got a request to reset your ArchiveAuto password.\n\nOpen this link on your phone (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
      html: `<p>We got a request to reset your ArchiveAuto password.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Reset password</a></p>
<p>This link is valid for 1 hour. Open it on the phone that has the app installed.</p>
<p style="color:#666">If you didn't ask for this, you can ignore this email.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
}

module.exports = { sendResetEmail, resetLinks };