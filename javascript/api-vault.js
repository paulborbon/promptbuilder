
window.PBVault = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(password, salt) { const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) }
  async function encrypt(data, password) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await derive(password, salt); const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data))); return JSON.stringify({ format: 'PromptBuilder-API-Vault', version: 1, kdf: 'PBKDF2-SHA256', iterations: 250000, salt: b64(salt), iv: b64(iv), ciphertext: b64(cipher) }, null, 2) }
  async function decrypt(text, password) { const v = JSON.parse(text); if (v.format !== 'PromptBuilder-API-Vault') throw new Error('Not a Prompt Builder vault'); const key = await derive(password, unb64(v.salt)); const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv) }, key, unb64(v.ciphertext)); return JSON.parse(dec.decode(plain)) }
  return { encrypt, decrypt };
})();
