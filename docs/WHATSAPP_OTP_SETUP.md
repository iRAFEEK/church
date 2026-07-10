# WhatsApp OTP Login — Setup Runbook

How to enable phone / WhatsApp OTP sign-in for Ekklesia (Track A1).

---

## ▶️ Setup progress (updated 2026-07-10, from a live pass through the Meta console)

**Your Meta account (already exists):**
| Thing | Value |
|---|---|
| Business portfolio | **Ekklesia** (`business_id` `848833464973823`) |
| App | **ekklesia** (`app_id` `1015496931343627`, mode: In development) |
| Test number | `+1 555 666-1042` — **Phone Number ID** `1280051118519551`, **WABA** `28434036916196356` |

**✅ Decided/verified this pass**
- **Template delivery = "Copy code".** For a PWA (no native Android app) this is the only workable option: *one-tap autofill* requires an Android package name + signature hash we don't have, and *zero-tap* requires accepting WhatsApp's Business ToS + app config. Copy-code needs neither. The exact template was built in the UI: **name `otp_login`, category Authentication → One-time Passcode, language `ar` (plain Arabic, NOT `ar_EG`), security recommendation ON, 10-min validity, Copy-code button.**
- **No code change needed.** For *authentication* templates, the Cloud API button component is `sub_type:"url", index:"0"` with the OTP as its text param **even for copy-code** — which is exactly what `lib/whatsapp/otp.ts` already sends. Template (copy-code) and code (url button) are compatible.
- **Webhooks are NOT required.** Production-setup Step 2 offers a "Configure Webhooks" (Callback URL + Verify token) — that's for *receiving* messages. OTP only *sends* (Supabase → our hook → Meta). Skip it.

**⛔ The blocker (needs YOU — can't be automated)**
- **The test WABA cannot create custom templates** (Meta returns *"does not have permission to create message template"* — test accounts only allow the sample templates like `hello_world`). So the real `ar otp_login` template can only be created on a **production WABA**, which requires **registering your real church WhatsApp number** (your number + an SMS/voice verification code sent to it). That number must NOT already be on the consumer WhatsApp app.

**What's left, in order (all your actions — phone / secrets / legal):**
1. **Register the production number** — App → WhatsApp → *Step 2. Production setup* → add a real number → enter the verification code. This creates your production WABA.
2. **Create the `ar otp_login` copy-code template** on that production WABA (WhatsApp Manager → Message Templates; use the exact config above). Submit for review.
3. **Generate a permanent token** — Business Settings → System Users → new system user → assign the ekklesia app with WhatsApp permissions → Generate token (no expiry) = `WHATSAPP_ACCESS_TOKEN` (a secret).
4. **Business Verification** (Step 3) — upload your documents; raises the sending limit above the unverified cap.
5. **Supabase + Vercel** — enable the Phone provider + Send-SMS hook (section b), set the 4 env vars (section c). `WHATSAPP_PHONE_NUMBER_ID` = the **production** number's ID (not the test `1280051118519551`).

> 💡 **See the app-side flow working today without any of this:** use Supabase **test phone numbers with fixed OTPs** and leave the Cloud API env vars unset — `sendWhatsAppOtp()` logs the code in dev mode, so enter-phone → verify → session → claim works end-to-end. Meta production just swaps in real delivery later.

---

## Architecture (why this is the cheapest path)

Supabase Auth owns the whole OTP lifecycle — it **generates** the 6-digit code,
**verifies** it, and **mints the session**. We do not store codes, build a phone
provider, or pay a BSP/Twilio markup. We only **deliver** the message, via the
**Meta WhatsApp Cloud API directly**, triggered by Supabase's **Send-SMS auth
hook**.

```
Browser  ──signInWithOtp({phone})──►  Supabase Auth
                                          │ generates OTP
                                          ▼
                            POST /api/auth/sms-hook  (signed: Standard Webhooks)
                                          │ verify signature → fail closed if bad
                                          ▼
                            sendWhatsAppOtp() → Meta Graph API (auth template)
                                          ▼
Browser  ──verifyOtp({phone,token,type:'sms'})──►  Supabase Auth → session
```

Cost = Meta's authentication-conversation rate (~$0.0036/msg in Egypt). No
per-message BSP fee.

Relevant code:
- `lib/whatsapp/otp.ts` — Cloud API sender (dev-mode logging fallback)
- `lib/whatsapp/verify-hook.ts` — Standard Webhooks HMAC-SHA256 verification
- `app/api/auth/sms-hook/route.ts` — the hook endpoint (public, signature-gated)
- `components/auth/PhoneLoginForm.tsx` + `app/(auth)/login/page.tsx` — the UI

---

## (a) Meta — WhatsApp Business setup

1. **Create / use a Meta Business Account** and complete **Business
   Verification** (required for production messaging volume; lead time can be
   days — start early). The WABA should be registered with **Egypt** as the
   business country to get the local auth rate.
2. In **Meta for Developers** → create an app of type **Business** → add the
   **WhatsApp** product. This creates a test WABA.
3. **Register a phone number** to the WABA (a real number you control, not used
   on the consumer WhatsApp app). Note its **Phone number ID** (shown in the
   WhatsApp → API Setup screen — this is `WHATSAPP_PHONE_NUMBER_ID`, NOT the
   display number).
4. **Create an authentication template:**
   - WhatsApp Manager → **Message Templates** → **Create template**.
   - Category: **Authentication**.
   - Name: `otp_login` (must match `WHATSAPP_OTP_TEMPLATE`).
   - Language: **Arabic (`ar`) is MANDATORY.** ⚠️ The Send-SMS hook does not
     receive the user's app locale, so the sender (`lib/whatsapp/otp.ts`,
     `templateLanguage()`) currently **always requests the `ar` template**. If the
     `ar` version is not approved, **every OTP send fails** with a template-not-found
     error — even for English users. Create the language as exactly `ar` (not
     `ar_EG`); an English (`en`) version is optional/future-proofing only.
   - Use the standard auth-template body ("{{1}} is your verification code…")
     and enable the **Copy code** button. Meta fills both the body and the
     button from the single OTP parameter — our payload sends the code to both.
   - **Submit for review.** Auth templates are usually approved fast, but submit
     early.
5. **Get a permanent access token:** Business Settings → **System Users** →
   create a system user → assign the app with **WhatsApp** permissions →
   **Generate token** (no expiry). This is `WHATSAPP_ACCESS_TOKEN`. Treat it as
   a secret; rotate via the same screen.

## (b) Supabase — enable Phone provider + Send-SMS hook

1. Dashboard → **Authentication → Providers → Phone** → **Enable**. (You do NOT
   need to configure Twilio/Vonage credentials — the Send-SMS hook overrides the
   built-in providers.)
2. Dashboard → **Authentication → Hooks → Send SMS Hook** → **Enable**:
   - **Hook type:** HTTPS.
   - **URL:** `https://<your-app-domain>/api/auth/sms-hook`
   - Supabase generates a **signing secret** in the form `v1,whsec_<base64>`.
     Copy it into `SEND_SMS_HOOK_SECRET` (see env below). The endpoint **fails
     closed (403)** if this is unset or the signature doesn't match.
3. **Sessions (cheaper = fewer OTPs):** Authentication → Sessions / JWT settings
   → raise the **refresh-token / session expiry** (e.g. 30–90 days) and keep
   refresh-token rotation on. Longer-lived sessions mean members re-authenticate
   (and re-OTP) far less often.
4. **Staging test numbers (no real WhatsApp sends):** Authentication → Phone →
   add **test phone numbers with fixed OTPs**. Combined with leaving the Cloud
   API env vars unset on staging, you can run the full flow without spending a
   cent (the code is generated by Supabase; our sender logs it in dev mode).
5. **⚠️ OTP rate limits (REQUIRED launch gate — SEC-3).** In Auth → Rate Limits,
   set strict **per-phone** and **per-IP** OTP-send limits (e.g. a few sends per
   hour per number, modest per-IP/hour). `signInWithOtp` is called from the public
   anon endpoint, so without this an attacker can pump WhatsApp cost / "OTP-bomb"
   arbitrary numbers — the cost lands on the church. The app also passes
   `shouldCreateUser: false` on the login form so unknown numbers can't spawn junk
   accounts, but the dashboard rate limit is the primary defense. Do not enable
   phone login in production until this is set.

## (c) Environment variables

Set these in Vercel (and `.env.local` for local dev). All are also documented in
`.env.example`.

| Var | Required for live sends | Notes |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | yes | Cloud API phone-number ID (not the display number) |
| `WHATSAPP_ACCESS_TOKEN` | yes | Permanent system-user Bearer token |
| `WHATSAPP_OTP_TEMPLATE` | no (default `otp_login`) | Must match the approved template name |
| `SEND_SMS_HOOK_SECRET` | yes | `v1,whsec_<base64>` from the Supabase hook screen |

**Dev / staging:** leave `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`
**unset** → `sendWhatsAppOtp()` logs the OTP instead of calling Meta, so the flow
is fully testable with Supabase test numbers. The OTP is **never** logged once
those credentials are set.

---

## Verification checklist

- [ ] Phone provider enabled in Supabase.
- [ ] Send-SMS hook URL points at `/api/auth/sms-hook`, secret copied to env.
- [ ] `otp_login` auth template approved in **`ar`** (mandatory — the sender always requests `ar`; `en` optional).
- [ ] Permanent access token + phone-number ID set in Vercel env.
- [ ] Staging: test number + leave Cloud API creds unset → confirm OTP appears
      in logs and `verifyOtp` mints a session.
- [ ] Production smoke: real number → WhatsApp message arrives → sign-in works.
- [ ] Tamper test: hit `/api/auth/sms-hook` without a valid signature → `403`.
