(() => {
  'use strict';
  const grid = document.getElementById('testimonialGrid');
  if (!grid) return;
  const status = document.getElementById('testimonialStatus');
  const summary = document.getElementById('testimonialSummary');
  const retry = document.getElementById('testimonialRetry');
  const referenceId = new URLSearchParams(location.search).get('referenceId');
  // Only public display fields are rendered. Treat all supplied text as text,
  // and redact email addresses even if someone includes one in their comment.
  const publicText = value => typeof value === 'string'
    ? value.replace(/[^\s<>"'@]+@[^\s<>"'@]+/g, '[email hidden]') : '';
  function displayName(item) {
    const preference = String(item.displayName || '').toLowerCase();
    if (preference === 'anonymous') return 'Anonymous';
    const name = publicText(item.fullName || item.name || '').trim();
    if (preference === 'full name') return name || 'Anonymous';
    if (preference === 'first name + last initial') {
      const parts = name.split(/\s+/);
      return name ? parts[0] + (parts.length > 1 ? ' ' + parts.at(-1)[0] + '.' : '') : 'Anonymous';
    }
    return publicText(item.displayName || item.alias || name).trim() || 'Anonymous';
  }
  const ratingOf = item => {
    const n = Number(item.rating);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  };
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  if (referenceId) {
    document.getElementById('testimonialTitle').textContent = 'Site Reference Testimonials';
    const action = document.getElementById('testimonialAction');
    action.href = 'site-references.html';
    action.textContent = 'Back to Site References';
  }
  async function load() {
    retry.hidden = true;
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading testimonials…';
    summary.textContent = 'Average rating: — · Total votes: —';
    try {
      const data = await window.PBSiteServices.get(referenceId ? 'referenceTestimonials' : 'testimonials', referenceId ? { referenceId } : {});
      const items = Array.isArray(data) ? data : data?.items ?? data?.testimonials;
      if (!Array.isArray(items)) throw new Error('Invalid testimonial feed');
      const visible = items.filter(item => item && typeof item === 'object' &&
        (!referenceId || !item.referenceId || item.referenceId === referenceId) &&
        (!item.moderationStatus || String(item.moderationStatus).toLowerCase() === 'approved') &&
        (!item.status || String(item.status).toLowerCase() === 'approved') &&
        item.testimonialConsent !== false);
      const ratings = visible.map(ratingOf).filter(n => n !== null);
      const stats = data.summary || data;
      const rawCount = stats.totalVotes ?? stats.voteCount ?? stats.count;
      const rawAverage = stats.averageRating ?? stats.average;
      const count = rawCount != null && Number.isInteger(Number(rawCount)) && Number(rawCount) >= 0 ? Number(rawCount) : ratings.length;
      const average = rawAverage != null && Number.isFinite(Number(rawAverage)) && Number(rawAverage) >= 0 && Number(rawAverage) <= 5
        ? Number(rawAverage) : (rawCount == null && ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null);
      summary.textContent = `Average rating: ${count && average !== null ? average.toFixed(1) + ' / 5' : '—'} · Total votes: ${count}`;
      visible.forEach(item => {
        const card = element('article', 'testimonial-card', '');
        const rating = ratingOf(item);
        const stars = element('div', 'stars', rating ? rating.toFixed(1) + ' ★' : 'Unrated');
        stars.setAttribute('aria-label', rating ? `${rating} out of 5 stars` : 'Unrated');
        const comment = element('blockquote', '', publicText(item.comment || item.comments) || 'No written comment.');
        comment.style.whiteSpace = 'pre-wrap';
        comment.style.overflowWrap = 'anywhere';
        const name = element('p', 'mt-2 mb-0 fw-bold', displayName(item));
        name.style.overflowWrap = 'anywhere';
        const avatar = document.createElement('img');
        avatar.src = '../assets/images/testimonial-avatar.svg';
        avatar.alt = '';
        avatar.width = 48;
        avatar.height = 48;
        avatar.className = 'testimonial-avatar';
        const identity = element('div', 'testimonial-identity', '');
        const details = element('div', '', '');
        details.append(stars, name);
        identity.append(avatar, details);
        card.append(identity, comment);
        grid.append(card);
      });
      status.textContent = visible.length ? '' : 'No approved testimonials yet.';
    } catch {
      status.textContent = 'Testimonials could not be loaded. Please try again.';
      retry.hidden = false;
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', load);
  load();
})();
