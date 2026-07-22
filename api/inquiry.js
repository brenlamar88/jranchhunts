/**
 * J Ranch — inquiry form handler (Vercel Serverless Function)
 *
 * Receives a JSON POST from the contact form and emails it to the ranch
 * team via the Resend API. Uses the built-in `fetch` (Node 18+), so there
 * are no npm dependencies to install.
 *
 * Required environment variable (set in Vercel → Project → Settings → Env):
 *   RESEND_API_KEY   Your Resend API key (starts with "re_")
 *
 * Optional overrides:
 *   INQUIRY_TO       Comma-separated recipients
 *                    (default: Aalvarado@freedomhc.com, jreed@freedomhc.com)
 *   INQUIRY_FROM     Verified sender (default: "J Ranch Hunts <noreply@jranchhunts.com>")
 *                    The domain here MUST be verified in your Resend account.
 */

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Email service is not configured." });
  }

  // Vercel usually parses JSON bodies; handle strings just in case.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real users never fill this. Silently accept and drop.
  if (body.company) return res.status(200).json({ ok: true });

  const fn = String(body.fn || "").trim();
  const ln = String(body.ln || "").trim();
  const email = String(body.em || "").trim();

  if (!fn || !email || !email.includes("@")) {
    return res.status(400).json({ error: "Please include your name and a valid email." });
  }

  const to = (process.env.INQUIRY_TO || "brennan@fusepros.com") // TEMP: testing recipient (was Aalvarado@freedomhc.com, jreed@freedomhc.com)
    .split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.INQUIRY_FROM || "J Ranch Hunts <noreply@jranchhunts.com>";

  const name = [fn, ln].filter(Boolean).join(" ");
  const hunt = String(body.hunt || "").trim();

  const fields = [
    ["Name", name],
    ["Email", email],
    ["Phone", String(body.ph || "").trim()],
    ["Hunt of interest", hunt],
    ["Party size", String(body.party || "").trim()],
    ["Preferred dates", String(body.dates || "").trim()],
    ["Message", String(body.msg || "").trim()],
  ].filter(([, v]) => v);

  const rowsHtml = fields.map(([label, value]) =>
    `<tr>
       <td style="padding:8px 14px;border-bottom:1px solid #e6e0cf;color:#6f6a58;font:600 12px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;vertical-align:top">${esc(label)}</td>
       <td style="padding:8px 14px;border-bottom:1px solid #e6e0cf;color:#1c1c1c;font:400 15px/1.5 Arial,sans-serif">${esc(value).replace(/\n/g, "<br>")}</td>
     </tr>`
  ).join("");

  const html =
    `<div style="background:#0a0a0a;padding:28px">
       <table role="presentation" style="max-width:560px;margin:0 auto;background:#faf7ef;border-radius:6px;overflow:hidden;border:1px solid #e6e0cf">
         <tr><td style="background:#0a0a0a;padding:20px 22px">
           <div style="color:#c79a46;font:700 18px/1 Georgia,serif;letter-spacing:.14em;text-transform:uppercase">J RANCH</div>
           <div style="color:#b8ae96;font:600 11px/1 Arial,sans-serif;letter-spacing:.24em;margin-top:6px">NEW HUNT INQUIRY</div>
         </td></tr>
         <tr><td style="padding:6px 8px 14px">
           <table role="presentation" style="width:100%;border-collapse:collapse">${rowsHtml}</table>
         </td></tr>
         <tr><td style="padding:14px 22px 22px;color:#6f6a58;font:400 13px/1.5 Arial,sans-serif;border-top:1px solid #e6e0cf">
           Reply straight to this email to reach ${esc(name)}.
         </td></tr>
       </table>
     </div>`;

  const text =
    `New hunt inquiry\n\n` +
    fields.map(([label, value]) => `${label}: ${value}`).join("\n") +
    `\n\nReply to this email to reach ${name} (${email}).`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `New J Ranch inquiry — ${name}${hunt ? " · " + hunt : ""}`,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Resend error", r.status, detail);
      return res.status(502).json({ error: "We couldn't send your request right now." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Inquiry send failed", err);
    return res.status(502).json({ error: "We couldn't send your request right now." });
  }
}
