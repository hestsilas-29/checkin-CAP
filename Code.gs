/**
 * CAP Cadet Check-In backend (Google Apps Script, bound to a Google Sheet).
 *
 * Sheet tabs (created automatically):
 *   Log    - Date, Time, CAPID, Name   (one row per cadet per day)
 *   Roster - CAPID, Name               (optional; fill in so names show up)
 *
 * Settings (email, send time, admin PIN, station code) live in Script Properties
 * and are edited from config.html, never stored in the public GitHub repo.
 */

const TZ = 'America/New_York';          // change if your squadron is in another time zone
const LOG_HEADERS = ['Date', 'Time', 'CAPID', 'Name'];

/* ---------- one-time setup: run this from the editor ---------- */
function setup() {
  logSheet_();
  rosterSheet_();
  ensureTrigger_();
}

/* ---------- web app entry points ---------- */
function doGet() {
  return json_({ ok: true, service: 'cap-checkin' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'checkin':    return json_(checkin_(req));
      case 'getConfig':  return json_(getConfig_(req));
      case 'saveConfig': return json_(saveConfig_(req));
      case 'sendTest':   return json_(sendTest_(req));
      default:           return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- check-in ---------- */
function checkin_(req) {
  const key = props_().getProperty('STATION_KEY');
  if (!key) return { ok: false, error: 'Not set up yet. Open the config page first.' };
  if (String(req.key) !== key) return { ok: false, error: 'Wrong station code', badKey: true };

  const capid = String(req.capid || '').replace(/\D/g, '');
  if (capid.length < 4 || capid.length > 8) return { ok: false, error: 'Unreadable card, scan again' };

  let when = req.ts ? new Date(req.ts) : new Date();
  if (isNaN(when.getTime())) when = new Date();
  const today = fmt_(when, 'yyyy-MM-dd');
  const time = fmt_(when, 'HH:mm:ss');

  const log = logSheet_();
  const rows = log.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === today && String(rows[i][2]) === capid) {
      return { ok: true, duplicate: true, capid: capid, name: String(rows[i][3] || ''), time: String(rows[i][1]) };
    }
  }

  const name = roster_()[capid] || '';
  const r = log.getLastRow() + 1;
  log.getRange(r, 1, 1, 4).setNumberFormat('@').setValues([[today, time, capid, name]]);
  return { ok: true, duplicate: false, capid: capid, name: name, time: time };
}

/* ---------- config ---------- */
function getConfig_(req) {
  const p = props_();
  if (!p.getProperty('ADMIN_PIN')) {
    return { ok: true, firstRun: true, email: '', time: '20:00', stationKey: '' };
  }
  if (!auth_(req.pin)) return { ok: false, error: 'Wrong admin PIN' };
  return {
    ok: true,
    email: p.getProperty('EMAIL') || '',
    time: p.getProperty('SEND_TIME') || '20:00',
    stationKey: p.getProperty('STATION_KEY') || '',
    lastSent: p.getProperty('LAST_SENT') || ''
  };
}

function saveConfig_(req) {
  const p = props_();
  const hasPin = !!p.getProperty('ADMIN_PIN');
  if (hasPin) {
    if (!auth_(req.pin)) return { ok: false, error: 'Wrong admin PIN' };
  } else if (!req.newPin || String(req.newPin).length < 4) {
    return { ok: false, error: 'Choose an admin PIN of at least 4 characters' };
  }

  const emails = String(req.email || '').split(/[,;\s]+/).filter(Boolean);
  if (!emails.length) return { ok: false, error: 'Enter at least one email address' };
  for (const em of emails) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'Invalid email: ' + em };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(req.time || ''))) return { ok: false, error: 'Invalid time' };
  if (!req.stationKey || String(req.stationKey).length < 4) {
    return { ok: false, error: 'Station code must be at least 4 characters' };
  }

  if (req.newPin) p.setProperty('ADMIN_PIN', String(req.newPin));
  p.setProperty('EMAIL', emails.join(','));
  p.setProperty('SEND_TIME', String(req.time));
  p.setProperty('STATION_KEY', String(req.stationKey));
  ensureTrigger_();
  return { ok: true };
}

function sendTest_(req) {
  if (!auth_(req.pin)) return { ok: false, error: 'Wrong admin PIN' };
  const email = props_().getProperty('EMAIL');
  if (!email) return { ok: false, error: 'Save an email address first' };
  const today = fmt_(new Date(), 'yyyy-MM-dd');
  const rows = todayRows_(today);
  sendReport_(email, today, rows, true);
  return { ok: true, count: rows.length };
}

/* ---------- scheduled report ---------- */
// Runs every 10 minutes. Sends once per day, at or after the configured time,
// and only on days when at least one cadet checked in.
function tick() {
  const p = props_();
  const email = p.getProperty('EMAIL');
  if (!email) return;

  const now = new Date();
  const today = fmt_(now, 'yyyy-MM-dd');
  if (p.getProperty('LAST_SENT') === today) return;

  const parts = (p.getProperty('SEND_TIME') || '20:00').split(':').map(Number);
  const nowMin = Number(fmt_(now, 'H')) * 60 + Number(fmt_(now, 'm'));
  if (nowMin < parts[0] * 60 + parts[1]) return;

  p.setProperty('LAST_SENT', today);
  const rows = todayRows_(today);
  if (!rows.length) return;
  sendReport_(email, today, rows, false);
}

function sendReport_(to, date, rows, isTest) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const trs = rows.map(r =>
    '<tr><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' +
    (r[3] ? esc(r[3]) : '<i>(not on roster)</i>') + '</td></tr>').join('');
  const html =
    '<p>' + (isTest ? '<b>[TEST]</b> ' : '') + '<b>' + rows.length + '</b> checked in on ' + esc(date) + '.</p>' +
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">' +
    '<tr style="background:#eee"><th>Time</th><th>CAPID</th><th>Name</th></tr>' + trs + '</table>' +
    '<p style="color:#666;font-size:12px">CSV copy attached.</p>';

  const csv = 'Date,Time,CAPID,Name\n' + rows.map(r =>
    [r[0], r[1], r[2], '"' + String(r[3] || '').replace(/"/g, '""') + '"'].join(',')).join('\n');

  MailApp.sendEmail({
    to: to,
    subject: (isTest ? '[TEST] ' : '') + 'CAP Attendance ' + date + ' (' + rows.length + ' checked in)',
    htmlBody: html,
    body: rows.length + ' checked in on ' + date + '. See attached CSV.',
    attachments: [Utilities.newBlob(csv, 'text/csv', 'attendance-' + date + '.csv')],
    name: 'CAP Check-In'
  });
}

/* ---------- helpers ---------- */
function props_() { return PropertiesService.getScriptProperties(); }

function auth_(pin) {
  const stored = props_().getProperty('ADMIN_PIN');
  return !!stored && String(pin) === stored;
}

function fmt_(d, pattern) { return Utilities.formatDate(d, TZ, pattern); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function logSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Log');
  if (!sh) {
    sh = ss.insertSheet('Log');
    sh.getRange('A:D').setNumberFormat('@');
    sh.appendRow(LOG_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rosterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Roster');
  if (!sh) {
    sh = ss.insertSheet('Roster');
    sh.getRange('A:A').setNumberFormat('@');
    sh.appendRow(['CAPID', 'Name']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function roster_() {
  const rows = rosterSheet_().getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0]).replace(/\D/g, '');
    if (id) map[id] = String(rows[i][1] || '');
  }
  return map;
}

function todayRows_(today) {
  return logSheet_().getDataRange().getValues().slice(1)
    .filter(r => String(r[0]) === today)
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
}

function ensureTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'tick');
  if (!exists) ScriptApp.newTrigger('tick').timeBased().everyMinutes(10).create();
}
