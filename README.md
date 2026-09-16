> Updated builder: see [REDESIGN-README.md](REDESIGN-README.md). The notes below describe the retained surrounding website.

# Prompt Builder — Beta Version

Paul Borbon branded Prompt Builder and digital workspace, prepared for GitHub Pages.

## Included in this Beta Version
- Prompt Builder workflow with theme/type/scene logic, pacing, camera, lighting, audio, negative prompts, exact multilingual dialogue, review, copy, and save/export.
- Expanded cinematography workflow; see REDESIGN-README.md for the current builder features.
- Branding landing page with the main navigation buttons positioned below the branding image so they do not cover the tagline.
- Service section including SEO and File & Data Organization.
- Central Site References directory with Maven Website Builder as the first reference.
- Site Reference Submission form with optional pricing, billing interval, currency, commission, commission type, promotional image, and notes. Subject: `For site reference`.
- Website Designer Inquiry form. Subject: `Maven Website Builder Inquiry`.
- Global Report Issue and Feedback links.
- Support form with optional screenshots. Subject: `Tech Support`.
- 1–5 star feedback with testimonial permission and display-name preference.
- Testimonials page designed to show approved testimonials only.
- Security & Privacy feature section.
- Support This Project page using Local: GCash/Maya and International: Wise.
- Payment assets display cropped QR codes only; public usernames/phone numbers from the original screenshots are not printed on the page.
- Global Home, Save, Light/Dark, Support, Report Issue, and Feedback controls.
- Information-icon tooltip bug fixed globally: the injected `i` is excluded from the field label, preventing text such as `Full Namei` or `Email Addressi`.
- Full terminology pass for Email Address, Website Design, File & Data Organization, Microsoft 365, API, SEO, OpenAI, Gemini, and Beta Version labels.

## Secure backend is intentionally not configured yet
GitHub Pages is static and must not contain email-provider secrets or AI API keys. The package ships with:

`javascript/config.js` → `backendUrl: ""`

The front end will work for prompt building, local saving, project export, and payment QR display. Online referral/support/feedback/site-reference submissions, global visitor count, public testimonials, and server-side AI calls become active after a secure backend URL is configured.

When ready for the next step, deploy the backend first and then configure its public HTTPS base URL in `javascript/config.js`. See `backend-samples/README.md`.

## Payment privacy
Only cropped QR-code images are included in the public payment page. Do not publish PINs, OTPs, passwords, recovery codes, card numbers, API keys, or private login credentials.

## GitHub Pages
Upload the entire contents of this folder to the repository root, preserving the folders exactly. `index.html` must remain at the repository root.
