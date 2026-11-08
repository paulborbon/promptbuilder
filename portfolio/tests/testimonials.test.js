const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'pages','testimonials.html'),'utf8');
const js=fs.readFileSync(path.join(root,'javascript','testimonials.js'),'utf8');

test('testimonials page has accessible rating, privacy consent, and status regions',()=>{
  assert.match(html,/data-page="testimonials"/);
  assert.match(html,/role="radiogroup"/);
  assert.match(html,/masked email address/);
  assert.match(html,/id="testimonialFormStatus"[^>]*role="status"/);
  assert.match(html,/id="viewTestimonials"[^>]*disabled/);
  assert.match(html,/<dialog id="testimonialDialog"/);
  assert.match(html,/id="closeTestimonials"/);
});

test('testimonial rendering uses textContent and public maskedEmail',()=>{
  assert.match(js,/node\.textContent = value/);
  assert.match(js,/dialog\?\.showModal\(\)/);
  assert.match(js,/dialog\?\.close\(\)/);
  assert.match(js,/item\.maskedEmail/);
  assert.doesNotMatch(js,/item\.email\b/);
});

test('all portfolio pages link to testimonials after Experience',()=>{
  const pages=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(f=>f.endsWith('.html')).map(f=>path.join(root,'pages',f))];
  for(const file of pages){
    const source=fs.readFileSync(file,'utf8');
    assert.match(source,/href="(?:pages\/)?testimonials\.html"/,`${path.basename(file)} lacks Testimonials navigation`);
    assert.ok(source.indexOf('experience.html')<source.indexOf('testimonials.html'),`${path.basename(file)} navigation order is incorrect`);
    assert.ok(source.indexOf('testimonials.html')<source.indexOf('skills.html'),`${path.basename(file)} navigation order is incorrect`);
  }
});
