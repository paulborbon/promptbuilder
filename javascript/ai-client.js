window.PBAI = {
  backendUrl() { return (window.PB_CONFIG?.backendUrl || '').trim().replace(/\/$/, '') },
  async generateImage({ provider, prompt, referenceDataUrl, aspectRatio }) {
    const base = this.backendUrl();
    if (!base) throw new Error('AI generation is not available yet because the secure site service has not been configured.');
    const path = window.PB_CONFIG?.endpoints?.generateImage || '/api/ai/generate-image';
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, prompt, referenceImage: referenceDataUrl || null, aspectRatio }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Image generation failed.'); return d;
  },
  async translateDialogue({ provider, text, language }) {
    const base = this.backendUrl();
    if (!base) throw new Error('AI translation is not available yet because the secure site service has not been configured.');
    const path = window.PB_CONFIG?.endpoints?.translateDialogue || '/api/ai/translate-dialogue';
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, text, language, romanize: true }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Translation failed.'); return d;
  }
};
