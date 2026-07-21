# Inquiry form email setup

The contact form posts to a Vercel serverless function (`api/inquiry.js`)
that emails each submission to the ranch team through **Resend**.

Submissions currently go to:

- `Aalvarado@freedomhc.com`
- `jreed@freedomhc.com`

The code is ready. Two one-time steps are needed to turn on delivery.

---

## 1. Verify a sending domain in Resend

1. Create a free account at <https://resend.com>.
2. Go to **Domains → Add Domain** and add the domain you'll send *from*
   — `freedomhc.com` is easiest since you already control its DNS.
3. Add the DNS records Resend shows you (SPF / DKIM) at your DNS host and
   wait for them to verify (usually minutes).

> Until a domain is verified, Resend only lets you send test emails to your
> own account address. Verifying the domain is what allows delivery to the
> two inboxes above.

## 2. Add the API key in Vercel

1. In Resend, go to **API Keys → Create API Key** and copy it (starts with `re_`).
2. In Vercel: **Project `jranchhunts` → Settings → Environment Variables** and add:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `RESEND_API_KEY` | your `re_…` key | Production, Preview |

3. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the key is picked up.

That's it — the form is live.

---

## Optional overrides (Vercel env vars)

Set these only if you want to change the defaults; the form works without them.

| Name | Default | Purpose |
|------|---------|---------|
| `INQUIRY_FROM` | `J Ranch Hunts <noreply@freedomhc.com>` | The "from" address. Its **domain must be the one you verified** in step 1. If you verify `jranchhunts.com` instead, set this to e.g. `J Ranch Hunts <hunt@jranchhunts.com>`. |
| `INQUIRY_TO` | `Aalvarado@freedomhc.com, jreed@freedomhc.com` | Comma-separated recipients. Add or change addresses here — no code change needed. |

## How it behaves

- Each email's **reply-to** is set to the customer, so staff can reply
  straight from their inbox to reach the person who inquired.
- A hidden "honeypot" field silently drops bot spam.
- If the key is missing or Resend errors, the visitor sees a message asking
  them to call **(337) 802-1336** or text one of the ranch numbers, so no
  inquiry is silently lost.

## Testing after setup

Submit the form on the live site. If nothing arrives, check
**Vercel → your project → Logs** for the `api/inquiry` function — a missing
key logs `RESEND_API_KEY is not set`, and Resend rejections are logged with
their reason (most often an unverified `from` domain).
