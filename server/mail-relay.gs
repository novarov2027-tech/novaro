// Google Apps Script: a tiny free "mail relay" that sends the owner's login code from YOUR Gmail account.
// Paste this in https://script.google.com (New project), set SECRET, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Copy the Web app URL into MAIL_RELAY_URL in server/.env.
// Security: the message can only ever be sent to OWNER_EMAIL below, whatever the request asks for.

const SECRET = 'put-a-long-random-string-here'; // must be identical to MAIL_RELAY_SECRET in server/.env
const OWNER_EMAIL = 'your-address@gmail.com';   // the only address that can receive emails

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return out({ ok: false, error: 'forbidden' });
    const options = { to: OWNER_EMAIL, subject: String(d.subject || '').slice(0, 200), body: String(d.text || '').slice(0, 5000), name: 'Novaro' };
    if (d.html) options.htmlBody = String(d.html).slice(0, 10000);
    MailApp.sendEmail(options);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
