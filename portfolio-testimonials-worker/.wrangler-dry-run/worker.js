var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/security.js
var encoder = new TextEncoder();
function maskEmail(value) {
  const [local, domain = ""] = String(value).toLowerCase().split("@"), parts = domain.split("."), host = parts.shift() || "", suffix = parts.length ? `.${parts.join(".")}` : "";
  const mask = /* @__PURE__ */ __name((text, start = 2, stars = 6) => {
    if (text.length <= 2) return `${text[0] || "*"}*`;
    const a = text.slice(0, Math.min(start, text.length - 1)), b = text.slice(-1);
    return `${a}${"*".repeat(stars)}${b}`;
  }, "mask");
  return `${mask(local)}@${mask(host, 1, 4)}${suffix}`;
}
__name(maskEmail, "maskEmail");
function validateSubmission(input) {
  const clean = /* @__PURE__ */ __name((value2, max) => String(value2 ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max), "clean");
  if (clean(input.website, 200)) throw new Error("Submission could not be accepted.");
  const value = { displayName: clean(input.displayName, 80), email: clean(input.email, 254).toLowerCase(), relationship: clean(input.relationship, 100), rating: Number(input.rating), comment: clean(input.comment, 1200) };
  if (value.displayName.length < 2) throw new Error("Please enter your name or alias.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) throw new Error("Please enter a valid email address.");
  if (value.relationship.length < 2) throw new Error("Please describe your professional relationship.");
  if (!Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5) throw new Error("Please choose a rating from 1 to 5.");
  if (value.comment.length < 20) throw new Error("Please write at least 20 characters.");
  if (input.consent !== true) throw new Error("Publication consent is required.");
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\s*(?:\.|\bdot\b)\s*(?:com|net|org|ph|io)\b)/i.test(value.comment)) throw new Error("Links and advertisements are not accepted.");
  if (/<\/?(?:script|iframe|object|embed|style)|javascript:/i.test(String(input.comment))) throw new Error("Unsupported content was detected.");
  return value;
}
__name(validateSubmission, "validateSubmission");
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomToken, "randomToken");
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(escapeHtml, "escapeHtml");

// src/responses.js
var json = /* @__PURE__ */ __name((body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } }), "json");
function cors(env, request) {
  const origin = request.headers.get("Origin") || "", allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim());
  return allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Vary": "Origin" } : {};
}
__name(cors, "cors");
function allowedOrigin(env, request) {
  const origin = request.headers.get("Origin");
  return !origin || String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).includes(origin);
}
__name(allowedOrigin, "allowedOrigin");
function page(title, body) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font:16px system-ui;background:#04131f;color:#eef8ff;max-width:720px;margin:60px auto;padding:24px}main{background:#08243a;border:1px solid #174b6b;border-radius:16px;padding:28px}blockquote{border-left:4px solid #ffc857;margin:24px 0;padding:8px 18px;white-space:pre-wrap}form{display:flex;gap:12px;flex-wrap:wrap}button{border:0;border-radius:9px;padding:12px 16px;font-weight:700;cursor:pointer}.danger{background:#b42318;color:white}</style><main><h1>${title}</h1>${body}</main></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" } });
}
__name(page, "page");

// src/email.js
async function sendApprovalEmail(env, item, rawToken, requestUrl) {
  if (!env.RESEND_API_KEY || !env.OWNER_EMAIL || !env.EMAIL_FROM) throw new Error("Approval email is not configured.");
  const reviewUrl = `${new URL(requestUrl).origin}/moderate?token=${encodeURIComponent(rawToken)}`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [env.OWNER_EMAIL], subject: `Testimonial awaiting approval from ${item.displayName}`, html: `<h2>New portfolio testimonial</h2><p><strong>Name:</strong> ${escapeHtml(item.displayName)}</p><p><strong>Email:</strong> ${escapeHtml(item.email)}</p><p><strong>Relationship:</strong> ${escapeHtml(item.relationship)}</p><p><strong>Rating:</strong> ${item.rating} / 5</p><blockquote>${escapeHtml(item.comment)}</blockquote><p><a href="${reviewUrl}">Review this testimonial</a></p><p>This secure link expires in 7 days.</p>` }) });
  if (!response.ok) {
    const details = await response.text();
    console.error("Resend rejected approval email", { status: response.status, details });
    throw new Error("Approval email could not be sent.");
  }
}
__name(sendApprovalEmail, "sendApprovalEmail");

// src/moderation.js
async function findByToken(env, rawToken) {
  if (!/^[a-f0-9]{64}$/.test(rawToken || "")) return null;
  return env.DB.prepare("SELECT * FROM testimonials WHERE moderation_token_hash=? AND status='pending' AND token_expires_at>?").bind(await sha256(rawToken), (/* @__PURE__ */ new Date()).toISOString()).first();
}
__name(findByToken, "findByToken");
function moderationPage(item, token) {
  if (!item) return page("Review testimonial", "<p>This moderation link is invalid, expired, or has already been used.</p>");
  return page("Review testimonial", `<p><strong>${escapeHtml(item.display_name)}</strong> \xB7 ${item.rating}/5</p><p>${escapeHtml(item.relationship)}</p><blockquote>${escapeHtml(item.comment)}</blockquote><p>${escapeHtml(item.email)}</p><form method="post" action="/moderate"><input type="hidden" name="token" value="${escapeHtml(token)}"><button name="action" value="approve">Approve and publish</button><button class="danger" name="action" value="reject">Reject and permanently delete</button></form>`);
}
__name(moderationPage, "moderationPage");
async function moderate(env, request) {
  const data = await request.formData(), token = String(data.get("token") || ""), action = String(data.get("action") || ""), item = await findByToken(env, token);
  if (!item) return moderationPage(null, "");
  if (action === "approve") await env.DB.prepare("UPDATE testimonials SET status='approved',approved_at=?,moderation_token_hash=? WHERE id=?").bind((/* @__PURE__ */ new Date()).toISOString(), `used:${crypto.randomUUID()}`, item.id).run();
  else if (action === "reject") await env.DB.prepare("DELETE FROM testimonials WHERE id=?").bind(item.id).run();
  else return moderationPage(item, token);
  return page("Moderation complete", `<p>${action === "approve" ? "The testimonial is now published." : "The testimonial was permanently deleted."}</p><p>You may close this page.</p>`);
}
__name(moderate, "moderate");

// src/worker.js
async function enforceRateLimit(env, request) {
  const fingerprint = await sha256(request.headers.get("CF-Connecting-IP") || "local"), now = Date.now(), windowMs = 36e5;
  const row = await env.DB.prepare("SELECT window_started_at,submission_count FROM submission_limits WHERE fingerprint=?").bind(fingerprint).first();
  if (row && now - Number(row.window_started_at) < windowMs && Number(row.submission_count) >= 5) throw new Error("Too many submissions. Please try again later.");
  if (!row || now - Number(row.window_started_at) >= windowMs) await env.DB.prepare("INSERT INTO submission_limits(fingerprint,window_started_at,submission_count) VALUES(?,?,1) ON CONFLICT(fingerprint) DO UPDATE SET window_started_at=excluded.window_started_at,submission_count=1").bind(fingerprint, now).run();
  else await env.DB.prepare("UPDATE submission_limits SET submission_count=submission_count+1 WHERE fingerprint=?").bind(fingerprint).run();
}
__name(enforceRateLimit, "enforceRateLimit");
async function publicFeed(env) {
  const result = await env.DB.prepare("SELECT id,display_name,email,relationship,rating,comment,approved_at FROM testimonials WHERE status='approved' ORDER BY approved_at DESC LIMIT 100").all();
  const items = (result.results || []).map((row) => ({ id: row.id, displayName: row.display_name, maskedEmail: maskEmail(row.email), relationship: row.relationship, rating: row.rating, comment: row.comment, approvedAt: row.approved_at }));
  return { items, count: items.length, averageRating: items.length ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : null };
}
__name(publicFeed, "publicFeed");
async function submit(env, request) {
  const headers = cors(env, request);
  if (!allowedOrigin(env, request)) return json({ error: "This website is not allowed to submit testimonials." }, 403, headers);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return json({ error: "Use JSON." }, 415, headers);
  try {
    await enforceRateLimit(env, request);
  } catch (error) {
    return json({ error: error.message }, 429, headers);
  }
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid submission." }, 400, headers);
  }
  let item;
  try {
    item = validateSubmission(input);
  } catch (error) {
    return json({ error: error.message }, 400, headers);
  }
  const duplicate = await env.DB.prepare("SELECT id FROM testimonials WHERE lower(email)=? AND lower(comment)=? AND status IN ('pending','approved') LIMIT 1").bind(item.email, item.comment.toLowerCase()).first();
  if (duplicate) return json({ error: "This testimonial has already been submitted." }, 409, headers);
  const id = crypto.randomUUID(), token = randomToken(), hash = await sha256(token), now = /* @__PURE__ */ new Date(), expires = new Date(now.getTime() + 6048e5);
  await env.DB.prepare("INSERT INTO testimonials(id,display_name,email,relationship,rating,comment,status,moderation_token_hash,token_expires_at,created_at) VALUES(?,?,?,?,?,?,'pending',?,?,?)").bind(id, item.displayName, item.email, item.relationship, item.rating, item.comment, hash, expires.toISOString(), now.toISOString()).run();
  try {
    await sendApprovalEmail(env, item, token, request.url);
  } catch {
    await env.DB.prepare("DELETE FROM testimonials WHERE id=?").bind(id).run();
    return json({ error: "The approval notification could not be sent. Please try again later." }, 503, headers);
  }
  return json({ ok: true, status: "pending" }, 202, headers);
}
__name(submit, "submit");
var worker_default = { async fetch(request, env) {
  const url = new URL(request.url), headers = cors(env, request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    if (request.method === "GET" && url.pathname === "/api/testimonials") return json(await publicFeed(env), 200, headers);
    if (request.method === "POST" && url.pathname === "/api/testimonials") return await submit(env, request);
    if (request.method === "GET" && url.pathname === "/moderate") {
      const token = url.searchParams.get("token") || "";
      return moderationPage(await findByToken(env, token), token);
    }
    if (request.method === "POST" && url.pathname === "/moderate") return moderate(env, request);
    if (request.method === "GET" && url.pathname === "/healthz") return json({ ok: true }, 200, headers);
    return json({ error: "Not found." }, 404, headers);
  } catch (error) {
    console.error("Testimonial service error", error);
    return json({ error: "The testimonial service is temporarily unavailable." }, 503, headers);
  }
} };
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
