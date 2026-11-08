import {escapeHtml} from './security.js';
export async function sendApprovalEmail(env,item,rawToken,requestUrl){
  if(!env.RESEND_API_KEY||!env.OWNER_EMAIL||!env.EMAIL_FROM)throw new Error('Approval email is not configured.');
  const reviewUrl=`${new URL(requestUrl).origin}/moderate?token=${encodeURIComponent(rawToken)}`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.OWNER_EMAIL],subject:`Testimonial awaiting approval from ${item.displayName}`,html:`<h2>New portfolio testimonial</h2><p><strong>Name:</strong> ${escapeHtml(item.displayName)}</p><p><strong>Email:</strong> ${escapeHtml(item.email)}</p><p><strong>Relationship:</strong> ${escapeHtml(item.relationship)}</p><p><strong>Rating:</strong> ${item.rating} / 5</p><blockquote>${escapeHtml(item.comment)}</blockquote><p><a href="${reviewUrl}">Review this testimonial</a></p><p>This secure link expires in 7 days.</p>`})});
  if(!response.ok){
    const details=await response.text();
    console.error('Resend rejected approval email',{status:response.status,details});
    throw new Error('Approval email could not be sent.');
  }
}
