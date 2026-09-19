import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = message => { throw new HttpError(400, message); };
export const emailOK = value => typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value);
export const hash = value => createHash('sha256').update(value).digest('hex');
export function loadConfig(env = process.env) {
  const required = ['ALLOWED_ORIGINS','SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM','PAUL_EMAIL','REFERRERS_JSON'];
  for (const key of required) if (!env[key]) throw new Error('Missing server setting: ' + key);
  const production = env.NODE_ENV !== 'development';
  if (production && (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY)) throw new Error('Production requires Turnstile site and secret keys.');
  const origins = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  for (const origin of origins) { const u = new URL(origin); if (u.origin !== origin || (u.protocol !== 'https:' && (production || !['localhost','127.0.0.1'].includes(u.hostname)))) throw new Error('Invalid allowed origin'); }
  const referrers = JSON.parse(env.REFERRERS_JSON);
  if (!referrers || typeof referrers !== 'object' || Array.isArray(referrers) || !Object.keys(referrers).length) throw new Error('Configure at least one referrer.');
  for (const [id, owner] of Object.entries(referrers)) if (!/^[a-z0-9-]{1,80}$/.test(id) || !owner || typeof owner.name !== 'string' || !owner.name.trim() || owner.name.length > 160 || /[\r\n]/.test(owner.name) || !emailOK(owner.email)) throw new Error('Invalid referrer configuration');
  if (!emailOK(env.PAUL_EMAIL) || !emailOK(env.MAIL_FROM)) throw new Error('Invalid sender or Paul email.');
  const smtpPort = Number(env.SMTP_PORT || 465);
  if (![465,587].includes(smtpPort)) throw new Error('Use encrypted SMTP port 465 or STARTTLS port 587.');
  return {origins, referrers, siteKey: env.TURNSTILE_SITE_KEY || '', secret: env.TURNSTILE_SECRET_KEY || '', production,
    from: env.MAIL_FROM, paul: env.PAUL_EMAIL, smtpHost: env.SMTP_HOST, smtpPort, smtpUser: env.SMTP_USER, smtpPass: env.SMTP_PASS,
    dbPath: env.DB_PATH || './data/referrals.sqlite', trustProxy: env.TRUST_PROXY === '1'};
}
export function validate(body, config) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Invalid inquiry.');
  const text = (key, max, min = 0) => {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail('Please check ' + key + '.');
    if (key !== 'requestText' && /[\r\n]/.test(value)) fail('Please check ' + key + '.');
    return value.trim();
  };
  const referenceId = text('referenceId',80,1);
  if (!Object.hasOwn(config.referrers, referenceId)) fail('This website reference is not available.');
  const requestId = text('requestId',36,36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) fail('Invalid submission ID. Please reload the page.');
  const email = text('email',254,3);
  if (!emailOK(email)) fail('Enter a valid email address.');
  const service = text('service',80,1);
  if (!['Website Design','Website Builder Access','Website Updates','Other'].includes(service)) fail('Choose a valid service.');
  if (body.consent !== true) fail('Please agree to share your inquiry.');
  if (text('website',200)) fail('Submission rejected.');
  let source = text('source',1000);
  if (source) { try { const u = new URL(source); if (!['http:','https:'].includes(u.protocol)) fail('Invalid source.'); source = u.origin + u.pathname; } catch { fail('Invalid source.'); } }
  return {requestId, referenceId, email, fullName: text('fullName',120,1), phone: text('phone',40), business: text('business',160), service, requestText: text('requestText',5000,10), source, consent: true};
}
export function messages(data, config, id, submittedAt) {
  const owner = config.referrers[data.referenceId];
  const details = `Name: ${data.fullName}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not supplied'}\nBusiness: ${data.business || 'Not supplied'}\nService: ${data.service}\n\nInquiry:\n${data.requestText}\n\nReference: ${owner.name}\nReference ID: ${data.referenceId}\nReferral ID: ${id}\nSubmitted (UTC): ${submittedAt}\nSource (visitor supplied): ${data.source || 'Not supplied'}\nConsent to sharing: Yes`;
  // Plain-text mail keeps user content out of HTML and headers. Separate envelopes protect recipients.
  return [
    {role:'owner', to:owner.email, replyTo:data.email, subject:'New website inquiry · ' + id, text:`Hello ${owner.name},\n\n${details}\n\nSent through Prompt Builder Beta 2.0.`},
    {role:'paul', to:config.paul, replyTo:data.email, subject:'New Prompt Builder referral · ' + id, text:`New referral for ${owner.name} (${owner.email}).\n\nCustomer: ${data.fullName}\nEmail: ${data.email}\nService: ${data.service}\nReferral ID: ${id}\nSubmitted (UTC): ${submittedAt}\nSource (visitor supplied): ${data.source || 'Not supplied'}`},
    {role:'customer', to:data.email, replyTo:owner.email, subject:'We received your website inquiry · ' + id, text:`Thank you for your inquiry.\n\nYour request for ${owner.name} has been received through Prompt Builder. The owner can contact you using the details you provided. You can reply to this email to contact the owner.\n\nReferral ID: ${id}\n\n— Prompt Builder by Paul Borbon\n\nIf you did not submit an inquiry, you can ignore this confirmation.`}
  ].map(mail => ({...mail, from:config.from, messageId:`<${id}.${mail.role}@${config.from.split('@')[1]}>`}));
}
export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true});
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, created INTEGER NOT NULL, email_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deliveries (id TEXT NOT NULL, role TEXT NOT NULL, message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0, error TEXT, PRIMARY KEY(id,role), FOREIGN KEY(id) REFERENCES inquiries(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  return db;
}
export function rateLimit(db, key, max, windowMs, now = Date.now()) {
  db.prepare('DELETE FROM limits WHERE expires < ?').run(now);
  const row = db.prepare('SELECT count FROM limits WHERE key=?').get(key);
  if (row?.count >= max) throw new HttpError(429,'Too many inquiries. Please try again later.');
  db.prepare('INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+windowMs);
}
export function enqueue(db, data, config) {
  const id = 'PB-' + data.requestId;
  const fingerprint = hash(JSON.stringify(data));
  const existing = db.prepare('SELECT fingerprint FROM inquiries WHERE id=?').get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new HttpError(409,'Submission changed. Please reload before sending another inquiry.');
    return id;
  }
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    rateLimit(db,'email:' + hash(data.email.toLowerCase()),3,3600000,now);
    rateLimit(db,'global',90,86400000,now);
    db.prepare('INSERT INTO inquiries VALUES (?,?,?,?)').run(id,fingerprint,now,hash(data.email.toLowerCase()));
    for (const mail of messages(data,config,id,new Date(now).toISOString())) db.prepare('INSERT INTO deliveries(id,role,message) VALUES (?,?,?)').run(id,mail.role,JSON.stringify(mail));
    db.exec('COMMIT');
    return id;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export async function drain(db, send, now = Date.now()) {
  // One process only: the server serializes calls to this worker.
  const jobs = db.prepare("SELECT * FROM deliveries WHERE state='pending' AND next_at<=? ORDER BY rowid LIMIT 30").all(now);
  for (const job of jobs) {
    try {
      const {role, ...mail} = JSON.parse(job.message);
      const result = await send(mail);
      if (!result?.accepted?.length || result.rejected?.length) throw new Error('Recipient rejected');
      db.prepare("UPDATE deliveries SET state='sent',error=NULL WHERE id=? AND role=?").run(job.id,job.role);
    } catch (error) {
      const attempts = job.attempts + 1;
      const state = attempts >= 8 ? 'failed' : 'pending';
      const code = /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'DELIVERY_FAILED';
      db.prepare('UPDATE deliveries SET state=?,attempts=?,next_at=?,error=? WHERE id=? AND role=?').run(state,attempts,now+Math.min(3600000,30000*2**attempts),code,job.id,job.role);
      console.error(JSON.stringify({event:'email_delivery_failed',id:job.id,role:job.role,state,code}));
    }
  }
}
export function purge(db, now = Date.now()) { db.prepare('DELETE FROM inquiries WHERE created < ?').run(now - 30*86400000); db.prepare('DELETE FROM limits WHERE expires < ?').run(now); }
