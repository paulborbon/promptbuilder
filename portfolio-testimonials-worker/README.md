# Portfolio testimonials Worker

Cloudflare Worker + D1 API for moderated portfolio testimonials.

## Behavior

- Public submissions are validated and saved as `pending`.
- Paul receives a Resend email containing a secure, seven-day review link.
- Opening the link is read-only. Approval and rejection require a button POST.
- Approval publishes the testimonial; rejection permanently deletes it.
- The public API returns approved records only and masks every email server-side.
- Full email addresses and moderation tokens are never returned publicly.

## Cloudflare setup

1. In this folder, run `npm install` and `npx wrangler login`.
2. Create D1: `npx wrangler d1 create portfolio-testimonials`.
3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the returned ID.
4. Apply schema: `npm run db:migrate:remote`.
5. Set secrets:
   - `npx wrangler secret put OWNER_EMAIL`
   - `npx wrangler secret put RESEND_API_KEY`
6. Set `EMAIL_FROM` in `wrangler.toml` to a sender verified by Resend.
7. Deploy: `npm run deploy`.
8. Add this to `portfolio/pages/testimonials.html` inside `<head>`:
   `<meta name="testimonial-api" content="https://portfolio-testimonials.YOUR-SUBDOMAIN.workers.dev">`

For local frontend testing, add the same meta tag with the URL printed by `npm run dev`.

## Tests

Run `npm test`. Never commit `.dev.vars`, API keys, owner email addresses, or Wrangler credentials.
