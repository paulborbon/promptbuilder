import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadConfig,validate,openStore,enqueue,drain,purge,messages} from '../core.js';
import {createServer,verifyTurnstile} from '../server.js';
const config = {origins:['http://localhost:8080'],referrers:{'maven-website-builder':{name:'Maven Website Builder',email:'owner@hotmail.com'}},siteKey:'',secret:'',from:'sender@gmail.com',paul:'paul@gmail.com'};
const payload = () => ({requestId:randomUUID(),referenceId:'maven-website-builder',fullName:'Test Customer',email:'customer@yahoo.com',phone:'',business:'Test Bakery',service:'Website Design',requestText:'Please send a website quote.',consent:true,website:'',source:'https://example.com/page?private=secret#fragment'});
test('validation rejects bad recipients, headers, oversized inputs, spam, and missing consent',()=>{
  for(const override of [{referenceId:'attacker'},{referenceId:'__proto__'},{email:'victim@example.com\r\nBcc: bad@example.com'},{email:'a@b.com,c@d.com'},{fullName:'a'.repeat(121)},{requestText:'short'},{service:'bad'},{consent:false},{website:'spam'},{requestId:'bad'}]) assert.throws(()=>validate({...payload(),...override},config));
  assert.equal(validate(payload(),config).source,'https://example.com/page');
});
test('three private email envelopes, correct reply addresses, no arbitrary recipient or reflected confirmation text',()=>{
  const data=validate({...payload(),to:'attacker@evil.com'},config);
  const mail=messages(data,config,'PB-test','2026-09-19');
  assert.deepEqual(mail.map(m=>m.to),['owner@hotmail.com','paul@gmail.com','customer@yahoo.com']);
  assert.equal(mail[0].replyTo,data.email); assert.equal(mail[2].replyTo,'owner@hotmail.com');
  assert.ok(mail[0].text.includes(data.requestText)); assert.ok(!mail[2].text.includes(data.requestText));
  assert.ok(mail.every(m=>!m.cc && !m.bcc && !m.html));
});
test('persistent queue deduplicates requests, retries only failed deliveries, survives restart, purges old records',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'pb-test-')); const path=join(dir,'test.sqlite');
  let db=openStore(path);
  try {
    const data=validate(payload(),config); const id=enqueue(db,data,config);
    assert.equal(enqueue(db,data,config),id); assert.equal(db.prepare('SELECT count(*) n FROM deliveries').get().n,3);
    assert.throws(()=>enqueue(db,{...data,requestText:'Changed inquiry message'},config),/changed/);
    const sent=[];
    await drain(db,async mail=>{if(mail.to===config.paul) throw Object.assign(new Error('temporary'),{code:'ECONNECTION'}); sent.push(mail.to); return {accepted:[mail.to]};});
    assert.equal(sent.length,2); db.close(); db=openStore(path);
    await drain(db,async mail=>{sent.push(mail.to); return {accepted:[mail.to]};},Date.now()+120000);
    assert.deepEqual(sent,['owner@hotmail.com','customer@yahoo.com','paul@gmail.com']);
    assert.equal(db.prepare("SELECT count(*) n FROM deliveries WHERE state='sent'").get().n,3);
    purge(db,Date.now()+31*86400000); assert.equal(db.prepare('SELECT count(*) n FROM deliveries').get().n,0);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
test('repeated delivery failures stop after eight attempts and do not claim sent',async()=>{
  const db=openStore(':memory:'); enqueue(db,validate(payload(),config),config);
  for(let i=0;i<8;i++) await drain(db,async()=>({accepted:[],rejected:['bad']}),Date.now()+i*7200000);
  assert.equal(db.prepare("SELECT count(*) n FROM deliveries WHERE state='failed'").get().n,3);db.close();
});
test('recipient and global throttling roll back rejected submissions',()=>{
  const db=openStore(':memory:'); for(let i=0;i<3;i++) enqueue(db,validate(payload(),config),config);
  assert.throws(()=>enqueue(db,validate(payload(),config),config),/Too many/);
  assert.equal(db.prepare('SELECT count(*) n FROM inquiries').get().n,3);db.close();
});
test('HTTP API: CORS, JSON, unknown routes, limits, spam check, successful queue response',async()=>{
  const db=openStore(':memory:'); const server=createServer({...config,secret:'test-secret'},db,async token=>token==='valid');
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(body,origin=config.origins[0],type='application/json')=>fetch(base+'/api/send-referral',{method:'POST',headers:{Origin:origin,'Content-Type':type},body:typeof body==='string'?body:JSON.stringify(body)});
  try {
    const c=await fetch(base+'/api/referral-config?referenceId=maven-website-builder',{headers:{Origin:config.origins[0]}});assert.deepEqual(await c.json(),{name:'Maven Website Builder',siteKey:''});
    assert.equal((await post(payload(),'https://evil.example')).status,403);
    assert.equal((await post(payload(),config.origins[0],'text/plain')).status,415);
    assert.equal((await post('{')).status,400);
    assert.equal((await post({...payload(),token:'bad'})).status,400);
    assert.equal((await post({...payload(),token:'valid'})).status,202);
    assert.equal((await post('x'.repeat(21000))).status,413);
    assert.equal((await fetch(base+'/.env',{headers:{Origin:config.origins[0]}})).status,404);
    for(let i=0;i<20;i++) await post('{');
    assert.equal((await post('{')).status,429);
  } finally {await new Promise(r=>server.close(r)); db.close();}
});
test('Turnstile verifies action and frontend hostname',async()=>{
  const original=globalThis.fetch;
  try {for(const [response,expected] of [[{success:true,action:'referral',hostname:'localhost'},true],[{success:true,action:'other',hostname:'localhost'},false],[{success:true,action:'referral',hostname:'evil.com'},false],[{success:false},false]]) {
    globalThis.fetch=async()=>({ok:true,json:async()=>response}); assert.equal(await verifyTurnstile('token',config.origins[0],{secret:'test'}),expected);
  }} finally {globalThis.fetch=original;}
});
test('production fails closed without required settings and anti-spam keys',()=>{
  assert.throws(()=>loadConfig({}),/Missing/);
  const env={ALLOWED_ORIGINS:'https://example.com',SMTP_HOST:'smtp.gmail.com',SMTP_USER:'sender@gmail.com',SMTP_PASS:'fake',MAIL_FROM:'sender@gmail.com',PAUL_EMAIL:'paul@gmail.com',REFERRERS_JSON:JSON.stringify(config.referrers)};
  assert.throws(()=>loadConfig(env),/Turnstile/);
  assert.equal(loadConfig({...env,TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'}).production,true);
});
