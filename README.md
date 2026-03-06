# Show-Ready Checkout (Stripe-Style Demo)

A tiny, **stage-safe checkout demo** designed for live keynotes & tours.  
It highlights **one-click Reset**, **Golden Replay**, a **Safe/Live** toggle, and production-style webhook guardrails so the story keeps moving—even if Wi-Fi or timing gets spicy.

---

## Webhook hardening (signature + idempotency)

The `/webhook` endpoint now behaves like a production integration:

- Requires HMAC signature in `X-ShowReady-Signature`
- Requires `event_id`
- Ignores duplicate `event_id` safely (`status: duplicate_ignored`)

### Configure

```bash
cp .env.example .env
# Set WEBHOOK_SHARED_SECRET in .env
```

---

## Links

- 🎥 Loom walkthrough (**2–5 min**): https://www.loom.com/share/2bbf6c4d24db47f79bed83fa9c9869f2  
- 💻 Repo: https://github.com/KatrinaFinney/show-ready-checkout

This PR ensures webhook behavior is predictable and safe.

## Test Coverage

- **Predictable timing** — Deterministic state makes rehearsals match showtime.
- **Instant recovery** — Golden Replay re-sends the last good event if something hiccups.
- **Safety rail** — Safe Mode prevents risky/real calls while demoing integrations.
- **No page jump** — AJAX updates keep the camera and audience focused on the State panel.
- **Webhook authenticity** — Signature verification ensures events come from trusted sources.
- **Replay safety** — Idempotency prevents duplicate events from applying state twice.

- Missing signature → rejected
- Invalid signature → rejected
- Valid signature → processed
- Duplicate event → ignored

## Demo

- **Checkout** → creates an order and simulates a successful payment (`payment_intent.succeeded`).
- **One-Click Reset** → clears DB **and seeds** `ord_seed (pending)` plus a replayable success event.
- **Golden Replay** → replays the last event; after Reset this will mark `ord_seed` as **paid**.
- **Simulate Refund** → triggers `charge.refunded` on the last paid order (alternate path).
- **Safe/Live Toggle** → flip at runtime without restart; logs show current mode.
- **AJAX UI** → POSTs return JSON and update the **State** panel in place (no full-page reload).
- **Webhook verification** → signed requests accepted; unsigned requests rejected.
- **Idempotent processing** → duplicate `event_id` safely ignored.

---

## Quick start

```bash
# 1) Install
npm install

# 2) Configure env (Safe Mode on by default)
cp .env.example .env

# Example .env
# SAFE_MODE=1
# PORT=3000
# WEBHOOK_SHARED_SECRET=dev_demo_secret_change_me

# 3) Seed local fixtures (optional helper script)
npm run seed

# 4) Run the app
npm run dev

# open
http://localhost:3000
```

---

## Local webhook testing

Start the server:

```bash
npm run start
```

### 1. Unsigned request (should fail)

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_demo_bad","type":"payment_intent.succeeded","data":{"orderId":"ord_seed"}}'
echo
```

Expected response:

```json
{"ok":false,"error":"unauthorized"}
```

---

### 2. Signed request (should process)

```bash
export WEBHOOK_SHARED_SECRET="dev_demo_secret_change_me"

BODY='{"event_id":"evt_demo_1","type":"payment_intent.succeeded","data":{"orderId":"ord_seed"}}'

SIG=$(node -e "const crypto=require('crypto'); const secret=process.env.WEBHOOK_SHARED_SECRET; const body=process.argv[1]; console.log('sha256='+crypto.createHmac('sha256', secret).update(Buffer.from(body)).digest('hex'));" "$BODY")

curl -s -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-ShowReady-Signature: $SIG" \
  -d "$BODY"
echo
```

Expected response:

```json
{"ok":true,"status":"processed"}
```

---

### 3. Replay the same event

Run the same request again.

Expected response:

```json
{"ok":true,"status":"duplicate_ignored"}
```

Duplicate events are safely ignored.

---

## Tests

Run the test suite:

```bash
npm test
```

The tests verify:

- missing signature → rejected  
- invalid signature → rejected  
- valid signature → processed  
- duplicate events → ignored  

---

## CI

GitHub Actions runs automatically on:

- every Pull Request
- every push to `main`

Workflow steps:

```bash
npm ci
npm test
```

This prevents webhook behavior from regressing.

---

## Architecture

```
server.js
├── lib/webhookSignature.js
├── lib/idempotencyStore.js
├── fixtures/db.json
└── public/
```

Responsibilities:

- **webhookSignature.js** → HMAC signature verification  
- **idempotencyStore.js** → replay protection  
- **fixtures/db.json** → deterministic demo state  
- **public/** → UI and AJAX updates  

---

## Design principles

**Deterministic demos**  
Demo state should always be predictable.

**Guardrails first**  
Security and replay protection should exist even in demos.

**Production-shaped behavior**  
Signatures, idempotency, tests, and CI mirror real integration patterns.

---

## Author

Katrina Finney  
Software Engineer / IAM Engineer

GitHub: https://github.com/KatrinaFinney

---

## License

ISC
