(() => {
  'use strict';
  const form = document.getElementById('referralForm');
  const fields = document.getElementById('inquiryFields');
  const status = document.getElementById('sendStatus');
  const button = document.getElementById('sendInquiry');
  const base = (window.PB_CONFIG?.referralBackendUrl || '').replace(/\/$/, '');
  const referenceId = new URLSearchParams(location.search).get('referenceId') || 'maven-website-builder';
  let widget, pending, busy = false;
  function sourcePage() { try { const u = new URL(document.referrer || location.href); return u.origin + u.pathname; } catch { return ''; } }
  async function json(url, options = {}) {
    const response = await fetch(url, {...options, signal: AbortSignal.timeout(options.method === 'POST' ? 90000 : 20000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The inquiry service is unavailable. Please try again later.');
    return data;
  }
  async function init() {
    if (!base) throw new Error('Online inquiries are not available yet. The site owner needs to connect the email service.');
    const data = await json(base + '/api/referral-config?referenceId=' + encodeURIComponent(referenceId));
    document.getElementById('referenceLabel').textContent = data.name;
    if (data.siteKey) {
      await new Promise((resolve, reject) => {
        window.pbTurnstileReady = resolve;
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=pbTurnstileReady&render=explicit';
        script.onerror = () => reject(new Error('Spam verification could not load. Please reload the page.'));
        document.head.append(script);
      });
      widget = window.turnstile.render('#spamCheck', {sitekey: data.siteKey, action: 'referral'});
    }
    fields.disabled = false;
    status.textContent = 'The owner receives your full inquiry, Paul receives a referral notice, and you receive a confirmation.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const payload = {referenceId, fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(), business: values.business.trim(), service: values.service, requestText: values.requestText.trim(), consent: !!values.consent, website: values.website, source: sourcePage()};
    const signature = JSON.stringify(payload);
    // Reuse the key on uncertain failures. Editing starts a new inquiry.
    if (!pending || pending.signature !== signature) pending = {signature, id: crypto.randomUUID()};
    const token = widget !== undefined ? window.turnstile.getResponse(widget) : '';
    if (widget !== undefined && !token) { status.textContent = 'Please complete the spam verification first.'; return; }
    busy = true; fields.disabled = true; button.textContent = 'Submitting…'; status.textContent = 'Securely submitting your inquiry…';
    try {
      const data = await json(base + '/api/send-referral', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...payload, requestId: pending.id, token})});
      if (data.ok !== true || !['sent', 'queued'].includes(data.status) || data.referralId !== 'PB-' + pending.id) throw new Error('The service returned an unexpected confirmation. Keep this form open and contact the site owner.');
      status.textContent = data.status === 'sent'
        ? 'Thank you! Your inquiry and all three email notifications have been sent. Reference: ' + data.referralId + '. Please check your inbox and spam folder for your confirmation.'
        : 'Thank you! Your inquiry has been received and the email notifications are queued. Reference: ' + data.referralId + '. Please check your inbox and spam folder for your confirmation.';
      form.reset(); pending = null; window.PB_DIRTY = false;
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError' ? 'We could not confirm receipt. Your details are still here. Please retry without changing them to avoid a duplicate inquiry.' : error.message;
    } finally {
      busy = false; fields.disabled = false; button.textContent = 'Send Inquiry';
      if (widget !== undefined) window.turnstile.reset(widget);
    }
  });
  init().catch(error => { status.textContent = error.message; });
})();
