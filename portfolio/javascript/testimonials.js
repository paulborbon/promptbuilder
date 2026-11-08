(() => {
  'use strict';

  // Replace this after deploying portfolio-testimonials-worker.
  const API_BASE = document.querySelector('meta[name="testimonial-api"]')?.content?.replace(/\/$/, '') || '';
  const grid = document.getElementById('testimonialGrid');
  const loadStatus = document.getElementById('testimonialLoadStatus');
  const form = document.getElementById('testimonialForm');
  const formStatus = document.getElementById('testimonialFormStatus');
  const dialog = document.getElementById('testimonialDialog');
  const viewButton = document.getElementById('viewTestimonials');
  const closeButton = document.getElementById('closeTestimonials');
  const dialogSummary = document.getElementById('testimonialDialogSummary');
  const ratingInput = document.getElementById('testimonialRating');
  const ratingLabel = document.getElementById('ratingLabel');
  const ratingFace = document.getElementById('ratingFace');
  const labels = ['','Poor','Fair','Good','Very good','Excellent'];
  const faces = ['🙂','😞','😕','🙂','😊','😄'];

  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function initials(name) {
    const parts = String(name || 'Anonymous').trim().split(/\s+/).slice(0, 2);
    return parts.map(part => part[0]?.toUpperCase()).join('') || 'A';
  }

  function render(items) {
    grid.replaceChildren();
    items.forEach(item => {
      const card = text('article', 'testimonial-card', '');
      const identity = text('div', 'testimonial-identity', '');
      const avatar = text('span', 'testimonial-avatar', initials(item.displayName));
      avatar.setAttribute('aria-hidden', 'true');
      const details = text('div', '', '');
      details.append(text('h3', '', item.displayName || 'Anonymous'), text('p', '', item.relationship || 'Professional contact'));
      identity.append(avatar, details);
      const rating = Math.max(1, Math.min(5, Number(item.rating) || 1));
      const stars = text('div', 'testimonial-stars', '★'.repeat(rating) + '☆'.repeat(5 - rating));
      stars.setAttribute('aria-label', `${rating} out of 5 stars`);
      const quote = text('blockquote', '', item.comment || '');
      const email = text('p', 'testimonial-email', item.maskedEmail || 'Email kept private');
      card.append(identity, stars, quote, email);
      grid.append(card);
    });
  }

  async function loadTestimonials() {
    grid.setAttribute('aria-busy', 'true');
    if (!API_BASE) {
      loadStatus.textContent = 'The testimonial service is ready for deployment. No approved testimonials are available yet.';
      document.getElementById('testimonialAverage').textContent = '—';
      document.getElementById('testimonialCount').textContent = '0';
      grid.setAttribute('aria-busy', 'false');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/testimonials`, {headers:{Accept:'application/json'}});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Testimonials could not be loaded.');
      const items = Array.isArray(data.items) ? data.items : [];
      render(items);
      const count = Number(data.count ?? items.length);
      const average = data.averageRating ? `${Number(data.averageRating).toFixed(1)} / 5` : '—';
      document.getElementById('testimonialAverage').textContent = average;
      document.getElementById('testimonialCount').textContent = String(count);
      dialogSummary.textContent = `${count} approved ${count === 1 ? 'testimonial' : 'testimonials'} · Average rating ${average}`;
      viewButton.disabled = items.length === 0;
      loadStatus.textContent = items.length ? '' : 'No approved testimonials yet. Be the first to leave feedback.';
    } catch (error) {
      loadStatus.textContent = error.message;
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  viewButton?.addEventListener('click', () => dialog?.showModal());
  closeButton?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll('[data-rating]').forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.rating);
    ratingInput.value = String(selected);
    ratingLabel.textContent = `${selected} ${selected === 1 ? 'star' : 'stars'} · ${labels[selected]}`;
    ratingFace.textContent = faces[selected];
    document.querySelectorAll('[data-rating]').forEach(star => {
      const active = Number(star.dataset.rating) <= selected;
      star.classList.toggle('selected', active);
      star.setAttribute('aria-checked', star === button ? 'true' : 'false');
    });
  }));

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    formStatus.className = 'form-status';
    if (!ratingInput.value) { formStatus.textContent = 'Please choose a star rating.'; formStatus.classList.add('is-error'); return; }
    if (!API_BASE) { formStatus.textContent = 'Local preview only — the form will send submissions after the Cloudflare service is connected.'; formStatus.classList.add('is-preview'); return; }
    const button = form.querySelector('[type="submit"]');
    const payload = Object.fromEntries(new FormData(form));
    payload.rating = Number(payload.rating);
    payload.consent = payload.consent === 'on';
    button.disabled = true;
    button.textContent = 'Sending…';
    formStatus.textContent = '';
    try {
      const response = await fetch(`${API_BASE}/api/testimonials`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The testimonial could not be submitted.');
      form.reset(); ratingInput.value = ''; ratingLabel.textContent = 'Choose a rating'; ratingFace.textContent = faces[0];
      document.querySelectorAll('[data-rating]').forEach(star => { star.classList.remove('selected'); star.setAttribute('aria-checked','false'); });
      formStatus.textContent = 'Thank you. Your testimonial was sent to Paul for approval.';
      formStatus.classList.add('is-success');
    } catch (error) {
      formStatus.textContent = error.message;
      formStatus.classList.add('is-error');
    } finally {
      button.disabled = false; button.textContent = 'Send for approval';
    }
  });

  loadTestimonials();
})();
