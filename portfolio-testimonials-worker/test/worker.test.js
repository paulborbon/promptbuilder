import test from 'node:test';
import assert from 'node:assert/strict';
import {maskEmail, validateSubmission} from '../src/security.js';

test('maskEmail never returns the original address', () => {
  assert.equal(maskEmail('paulborbon@gmail.com'), 'pa******n@g****l.com');
  assert.equal(maskEmail('ab@mail.com'), 'a*@m****l.com');
  assert.ok(!maskEmail('paulborbon@gmail.com').includes('paulborbon'));
});

test('validateSubmission accepts clean consented feedback', () => {
  const value=validateSubmission({displayName:'Maria S.',email:'Maria@Example.com',relationship:'Former colleague',rating:5,comment:'Paul provided clear and dependable technical support.',consent:true,website:''});
  assert.equal(value.email,'maria@example.com');
  assert.equal(value.rating,5);
});

test('validateSubmission rejects links, invalid ratings, missing consent, and honeypot', () => {
  const base={displayName:'Maria S.',email:'maria@example.com',relationship:'Former colleague',rating:5,comment:'Paul provided clear and dependable technical support.',consent:true,website:''};
  assert.throws(()=>validateSubmission({...base,comment:'Visit https://spam.example.com for an amazing offer'}),/Links/);
  assert.throws(()=>validateSubmission({...base,rating:7}),/rating/);
  assert.throws(()=>validateSubmission({...base,consent:false}),/consent/);
  assert.throws(()=>validateSubmission({...base,website:'bot'}),/accepted/);
});
