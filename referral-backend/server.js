import http from 'node:http';
import {pathToFileURL} from 'node:url';
import nodemailer from 'nodemailer';
import {HttpError, loadConfig, validate, openStore, rateLimit, hash, enqueue, drain, purge} from './core.js';

export function createServer(config, db, verify = verifyTurnstile) {
  return http.createServer(async (req,res) => {
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const reply = (code,body) => { res.writeHead(code); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url,'http://localhost');
      if (req.method === 'GET' && url.pathname === '/healthz') return reply(200,{ok:true});
      const origin = req.headers.origin;
      if (!config.origins.includes(origin)) throw new HttpError(403,'This website is not allowed to submit inquiries.');
      res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Vary','Origin');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); return reply(204,{});
      }
      if (req.method === 'GET' && url.pathname === '/api/referral-config') {
        const id = url.searchParams.get('referenceId');
        if (!Object.hasOwn(config.referrers,id)) throw new HttpError(404,'This website reference is not available.');
        return reply(200,{name:config.referrers[id].name,siteKey:config.siteKey});
      }
      if (req.method !== 'POST' || url.pathname !== '/api/send-referral') throw new HttpError(404,'Not found.');
      const ip = config.trustProxy ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim() : req.socket.remoteAddress;
      rateLimit(db,'ip:' + hash(ip || 'unknown'),20,3600000);
      if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new HttpError(415,'Use JSON.');
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 20000) throw new HttpError(413,'Inquiry is too large.'); chunks.push(chunk); }
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400,'Invalid JSON.'); }
      const data = validate(body,config);
      if (config.secret && !await verify(body.token,origin,config)) throw new HttpError(400,'Spam verification expired or failed. Please try again.');
      const referralId = enqueue(db,data,config);
      return reply(202,{ok:true,status:'queued',referralId});
    } catch (error) {
      if (!error.status) console.error('Referral request failed; inspect server configuration and private database.');
      if (!res.headersSent) reply(error.status || 503,{error:error.status ? error.message : 'The inquiry service is temporarily unavailable. Please try again later.'});
    }
  });
}
export async function verifyTurnstile(token, origin, config) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:config.secret,response:token}),signal:AbortSignal.timeout(10000)});
  const data = await response.json();
  return response.ok && data.success === true && data.action === 'referral' && data.hostname === new URL(origin).hostname;
}
async function main() {
  const config = loadConfig();
  const mailer = nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpPort===465,requireTLS:true,
    auth:{user:config.smtpUser,pass:config.smtpPass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,
    disableFileAccess:true,disableUrlAccess:true});
  // Fail startup on invalid credentials rather than accepting inquiries we cannot deliver.
  await mailer.verify();
  const db = openStore(config.dbPath);
  purge(db);
  let running = false;
  const work = async () => { if (running) return; running = true; try { purge(db); await drain(db,mail => mailer.sendMail(mail)); } catch { console.error('Queue worker failed; inspect private database.'); } finally { running = false; } };
  const timer = setInterval(work,15000);
  const server = createServer(config,db);
  server.requestTimeout = 30000; server.headersTimeout = 15000;
  server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',() => { console.log('Prompt Builder referral service ready.'); void work(); });
  const stop = () => { clearInterval(timer); server.close(); const poll = setInterval(() => { if (!running) { clearInterval(poll); db.close(); mailer.close(); } },100); };
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('Startup failed. Check required environment settings, SMTP credentials/network, and database permissions.'); process.exitCode=1; });
