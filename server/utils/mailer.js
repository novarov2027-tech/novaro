// Sends email over HTTPS (SMTP ports are blocked on Render's free plan). Three modes, in this order:
//  1. MAIL_RELAY_URL: a free Google Apps Script web app that sends from your own Gmail (see mail-relay.gs)
//  2. BREVO_API_KEY: Brevo's HTTPS API
//  3. neither (local development only): the message is printed in the server console
const prod = process.env.NODE_ENV === 'production';
const fail = (status, message) => Object.assign(new Error(message), { status });

export async function sendMail({ to, subject, text, html }) {
  if (process.env.MAIL_RELAY_URL) {
    const res = await fetch(process.env.MAIL_RELAY_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: process.env.MAIL_RELAY_SECRET, to, subject, text, html }),
      redirect: 'follow', // Apps Script answers through a redirect
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      console.error('Mail relay error', res.status, data);
      throw fail(502, "Impossible d'envoyer l'email. Réessayez dans un instant.");
    }
    return;
  }
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    if (prod) throw fail(500, "L'envoi d'email n'est pas configuré (BREVO_API_KEY).");
    console.log(`\n[email non configuré : affiché ici en local]\nÀ : ${to}\nObjet : ${subject}\n${text}\n`);
    return;
  }
  if (!process.env.MAIL_FROM) throw fail(500, 'MAIL_FROM est manquant dans la configuration.');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Novaro' },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error('Brevo error', res.status, await res.text().catch(() => ''));
    throw fail(502, "Impossible d'envoyer l'email. Réessayez dans un instant.");
  }
}
