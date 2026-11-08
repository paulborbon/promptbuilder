import {escapeHtml,sha256} from './security.js';
import {page} from './responses.js';
export async function findByToken(env,rawToken){if(!/^[a-f0-9]{64}$/.test(rawToken||''))return null;return env.DB.prepare("SELECT * FROM testimonials WHERE moderation_token_hash=? AND status='pending' AND token_expires_at>?").bind(await sha256(rawToken),new Date().toISOString()).first()}
export function moderationPage(item,token){
  if(!item)return page('Review testimonial','<p>This moderation link is invalid, expired, or has already been used.</p>');
  return page('Review testimonial',`<p><strong>${escapeHtml(item.display_name)}</strong> · ${item.rating}/5</p><p>${escapeHtml(item.relationship)}</p><blockquote>${escapeHtml(item.comment)}</blockquote><p>${escapeHtml(item.email)}</p><form method="post" action="/moderate"><input type="hidden" name="token" value="${escapeHtml(token)}"><button name="action" value="approve">Approve and publish</button><button class="danger" name="action" value="reject">Reject and permanently delete</button></form>`);
}
export async function moderate(env,request){
  const data=await request.formData(),token=String(data.get('token')||''),action=String(data.get('action')||''),item=await findByToken(env,token);
  if(!item)return moderationPage(null,'');
  if(action==='approve')await env.DB.prepare("UPDATE testimonials SET status='approved',approved_at=?,moderation_token_hash=? WHERE id=?").bind(new Date().toISOString(),`used:${crypto.randomUUID()}`,item.id).run();
  else if(action==='reject')await env.DB.prepare('DELETE FROM testimonials WHERE id=?').bind(item.id).run();
  else return moderationPage(item,token);
  return page('Moderation complete',`<p>${action==='approve'?'The testimonial is now published.':'The testimonial was permanently deleted.'}</p><p>You may close this page.</p>`);
}
