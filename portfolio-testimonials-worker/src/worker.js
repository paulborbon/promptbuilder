import {maskEmail,randomToken,sha256,validateSubmission} from './security.js';
import {allowedOrigin,cors,json} from './responses.js';
import {sendApprovalEmail} from './email.js';
import {findByToken,moderate,moderationPage} from './moderation.js';

async function enforceRateLimit(env,request){
  const fingerprint=await sha256(request.headers.get('CF-Connecting-IP')||'local'),now=Date.now(),windowMs=3600000;
  const row=await env.DB.prepare('SELECT window_started_at,submission_count FROM submission_limits WHERE fingerprint=?').bind(fingerprint).first();
  if(row&&now-Number(row.window_started_at)<windowMs&&Number(row.submission_count)>=5)throw new Error('Too many submissions. Please try again later.');
  if(!row||now-Number(row.window_started_at)>=windowMs)await env.DB.prepare('INSERT INTO submission_limits(fingerprint,window_started_at,submission_count) VALUES(?,?,1) ON CONFLICT(fingerprint) DO UPDATE SET window_started_at=excluded.window_started_at,submission_count=1').bind(fingerprint,now).run();
  else await env.DB.prepare('UPDATE submission_limits SET submission_count=submission_count+1 WHERE fingerprint=?').bind(fingerprint).run();
}
async function publicFeed(env){
  const result=await env.DB.prepare("SELECT id,display_name,email,relationship,rating,comment,approved_at FROM testimonials WHERE status='approved' ORDER BY approved_at DESC LIMIT 100").all();
  const items=(result.results||[]).map(row=>({id:row.id,displayName:row.display_name,maskedEmail:maskEmail(row.email),relationship:row.relationship,rating:row.rating,comment:row.comment,approvedAt:row.approved_at}));
  return {items,count:items.length,averageRating:items.length?items.reduce((sum,item)=>sum+item.rating,0)/items.length:null};
}
async function submit(env,request){
  const headers=cors(env,request);
  if(!allowedOrigin(env,request))return json({error:'This website is not allowed to submit testimonials.'},403,headers);
  if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({error:'Use JSON.'},415,headers);
  try{await enforceRateLimit(env,request)}catch(error){return json({error:error.message},429,headers)}
  let input;try{input=await request.json()}catch{return json({error:'Invalid submission.'},400,headers)}
  let item;try{item=validateSubmission(input)}catch(error){return json({error:error.message},400,headers)}
  const duplicate=await env.DB.prepare("SELECT id FROM testimonials WHERE lower(email)=? AND lower(comment)=? AND status IN ('pending','approved') LIMIT 1").bind(item.email,item.comment.toLowerCase()).first();
  if(duplicate)return json({error:'This testimonial has already been submitted.'},409,headers);
  const id=crypto.randomUUID(),token=randomToken(),hash=await sha256(token),now=new Date(),expires=new Date(now.getTime()+604800000);
  await env.DB.prepare("INSERT INTO testimonials(id,display_name,email,relationship,rating,comment,status,moderation_token_hash,token_expires_at,created_at) VALUES(?,?,?,?,?,?,'pending',?,?,?)").bind(id,item.displayName,item.email,item.relationship,item.rating,item.comment,hash,expires.toISOString(),now.toISOString()).run();
  try{await sendApprovalEmail(env,item,token,request.url)}catch{await env.DB.prepare('DELETE FROM testimonials WHERE id=?').bind(id).run();return json({error:'The approval notification could not be sent. Please try again later.'},503,headers)}
  return json({ok:true,status:'pending'},202,headers);
}
export default {async fetch(request,env){
  const url=new URL(request.url),headers=cors(env,request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
    if(request.method==='GET'&&url.pathname==='/api/testimonials')return json(await publicFeed(env),200,headers);
    if(request.method==='POST'&&url.pathname==='/api/testimonials')return await submit(env,request);
    if(request.method==='GET'&&url.pathname==='/moderate'){const token=url.searchParams.get('token')||'';return moderationPage(await findByToken(env,token),token)}
    if(request.method==='POST'&&url.pathname==='/moderate')return moderate(env,request);
    if(request.method==='GET'&&url.pathname==='/healthz')return json({ok:true},200,headers);
    return json({error:'Not found.'},404,headers);
  }catch(error){console.error('Testimonial service error',error);return json({error:'The testimonial service is temporarily unavailable.'},503,headers)}
}};
