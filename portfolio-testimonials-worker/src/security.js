const encoder=new TextEncoder();
export function maskEmail(value){
  const [local,domain='']=String(value).toLowerCase().split('@'),parts=domain.split('.'),host=parts.shift()||'',suffix=parts.length?`.${parts.join('.')}`:'';
  const mask=(text,start=2,stars=6)=>{if(text.length<=2)return `${text[0]||'*'}*`;const a=text.slice(0,Math.min(start,text.length-1)),b=text.slice(-1);return `${a}${'*'.repeat(stars)}${b}`};
  return `${mask(local)}@${mask(host,1,4)}${suffix}`;
}
export function validateSubmission(input){
  const clean=(value,max)=>String(value??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,max);
  if(clean(input.website,200))throw new Error('Submission could not be accepted.');
  const value={displayName:clean(input.displayName,80),email:clean(input.email,254).toLowerCase(),relationship:clean(input.relationship,100),rating:Number(input.rating),comment:clean(input.comment,1200)};
  if(value.displayName.length<2)throw new Error('Please enter your name or alias.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email))throw new Error('Please enter a valid email address.');
  if(value.relationship.length<2)throw new Error('Please describe your professional relationship.');
  if(!Number.isInteger(value.rating)||value.rating<1||value.rating>5)throw new Error('Please choose a rating from 1 to 5.');
  if(value.comment.length<20)throw new Error('Please write at least 20 characters.');
  if(input.consent!==true)throw new Error('Publication consent is required.');
  if(/(https?:\/\/|www\.|\b[a-z0-9-]+\s*(?:\.|\bdot\b)\s*(?:com|net|org|ph|io)\b)/i.test(value.comment))throw new Error('Links and advertisements are not accepted.');
  if(/<\/?(?:script|iframe|object|embed|style)|javascript:/i.test(String(input.comment)))throw new Error('Unsupported content was detected.');
  return value;
}
export async function sha256(value){const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
