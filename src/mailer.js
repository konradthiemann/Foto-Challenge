import nodemailer from 'nodemailer';

/**
 * Transactional-email sender with three transports, chosen in order (same
 * pattern as Doewe):
 *  1. SMTP (nodemailer) when SMTP_HOST/USER/PASS are set — e.g. Gmail
 *     (smtp.gmail.com:465 with a 16-char App Password). Note: Railway blocks
 *     outbound SMTP on Free/Trial/Hobby plans (Pro+ only).
 *  2. Resend REST API when RESEND_API_KEY is set (HTTPS, works on any plan).
 *  3. Dev/test fallback: log the message to the console (no network).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Knips <onboarding@resend.dev>';

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendViaSmtp({ to, subject, html, text }) {
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  // Gmail requires the From address to match the authenticated account (or a
  // configured "Send mail as" alias); fall back to SMTP_USER otherwise.
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });
}

async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}

async function sendEmail(input) {
  if (smtpConfigured()) {
    await sendViaSmtp(input);
    return;
  }
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(input);
    return;
  }
  // Dev / test fallback: never hit the network, just surface the content.
  console.info(`[mailer] No SMTP/Resend configured — email not sent.\n  to: ${input.to}\n  subject: ${input.subject}\n  ${input.text}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sends the host a summary email right after event creation: join link + code,
 * host dashboard link, printable QR poster link and the auto-delete date.
 */
export async function sendEventCreatedEmail({
  to, eventName, joinCode, joinUrl, hostUrl, printUrl, expiresAt, retentionDays,
}) {
  const name = escapeHtml(eventName);
  const code = escapeHtml(joinCode);
  const expiry = new Date(expiresAt).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const row = (label, url) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#9aa0b5;white-space:nowrap;vertical-align:top;padding-right:12px;">${label}</td>
      <td style="padding:6px 0;font-size:13px;"><a href="${escapeHtml(url)}" style="color:#c9a44e;word-break:break-all;">${escapeHtml(url)}</a></td>
    </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0f1119;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#e8eaf2;">
    <div style="max-width:520px;margin:0 auto;background:#161826;border-radius:16px;padding:32px;border:1px solid #262a3d;">
      <h1 style="font-size:20px;margin:0 0 4px;color:#e2c479;">Knips</h1>
      <p style="font-size:13px;color:#9aa0b5;margin:0 0 24px;">Knips den Moment.</p>
      <h2 style="font-size:17px;margin:0 0 12px;">Deine Feier „${name}“ ist startklar!</h2>
      <p style="font-size:14px;line-height:1.5;margin:0 0 20px;">Hier sind alle wichtigen Links für deine Session — heb dir diese E-Mail gut auf.</p>
      <div style="background:#0f1119;border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:center;">
        <div style="font-size:12px;color:#9aa0b5;margin-bottom:4px;">Beitritts-Code für deine Gäste</div>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;color:#e2c479;">${code}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        ${row('Gäste-Link', joinUrl)}
        ${row('Dein Host-Menü', hostUrl)}
        ${row('QR-Plakat (drucken)', printUrl)}
      </table>
      <p style="font-size:13px;line-height:1.5;color:#9aa0b5;margin:0 0 8px;">Du kommst außerdem jederzeit mit Beitritts-Code + deinem Host-Passwort zurück ins Host-Menü.</p>
      <p style="font-size:13px;line-height:1.5;color:#9aa0b5;margin:0;">Alle Fotos und die Galerie werden am <strong style="color:#e8eaf2;">${expiry}</strong> automatisch gelöscht (${retentionDays} Tage nach Erstellung). Lade sie vorher herunter.</p>
    </div>
  </body>
</html>`;

  const text = [
    `Deine Feier „${eventName}“ ist startklar!`,
    '',
    `Beitritts-Code: ${joinCode}`,
    `Gäste-Link: ${joinUrl}`,
    `Host-Menü: ${hostUrl}`,
    `QR-Plakat (drucken): ${printUrl}`,
    '',
    'Du kommst jederzeit mit Beitritts-Code + Host-Passwort zurück ins Host-Menü.',
    `Alle Fotos werden am ${expiry} automatisch gelöscht (${retentionDays} Tage). Lade sie vorher herunter.`,
  ].join('\n');

  await sendEmail({ to, subject: `Knips — „${eventName}“ ist startklar`, html, text });
}
