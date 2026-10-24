const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const portfolioScript = fs.readFileSync(
  path.join(__dirname, '..', 'javascript', 'portfolio.js'),
  'utf8'
);
const contactPage = fs.readFileSync(
  path.join(__dirname, '..', 'pages', 'contact.html'),
  'utf8'
);

assert.match(contactPage, /id="contact-form-status"[^>]*role="status"/);
assert.match(portfolioScript, /fetch\(form\.action/);
assert.match(portfolioScript, /if\s*\(!response\.ok\)/);
assert.match(portfolioScript, /form\.reset\(\)/);
assert.ok(
  portfolioScript.indexOf('if (!response.ok)') < portfolioScript.indexOf('form.reset()'),
  'The form must reset only after a successful Formspree response.'
);

console.log('Contact form success-reset checks passed.');
