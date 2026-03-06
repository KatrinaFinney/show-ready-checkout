# Show-Ready Checkout (Stripe-Style Demo)

A tiny, **stage-safe checkout demo** designed for live keynotes and integration walkthroughs.

It demonstrates how to build a reliable demo environment with deterministic state, replayable webhook events, and production-style webhook guardrails.

Key capabilities include:

- One-click Reset for deterministic demos
- Golden Replay to resend the last webhook event
- Safe/Live toggle for runtime safety
- Webhook signature verification
- Idempotent event handling
- CI tests to prevent regressions

The goal is simple: **make demos impossible to break.**

---

# Webhook hardening (signature + idempotency)

The `/webhook` endpoint now behaves like a production integration:

- Requires HMAC signature in `X-ShowReady-Signature`
- Requires `event_id`
- Ignores duplicate `event_id` safely (`status: duplicate_ignored`)

---

# Links

🎥 Loom walkthrough  
https://www.loom.com/share/2bbf6c4d24db47f79bed83fa9c9869f2

💻 Repo  
https://github.com/KatrinaFinney/show-ready-checkout

---

# Why this exists

Live demos often fail because:

- APIs retry events
- webhook events replay
- network timing changes
- demo state drifts from rehearsals

This project adds demo guardrails that mirror real production patterns.

| Feature | Purpose |
|-------|-------|
| Reset | deterministic demo start |
| Replay | recover from missed webhook events |
| Safe Mode | prevent risky real calls |
| Signature verification | ensure webhook authenticity |
| Idempotency | prevent duplicate event processing |
| CI tests | keep demo behavior stable |

---

# Features

### Checkout simulation
Creates an order and simulates:

`payment_intent.succeeded`

### One-Click Reset
Clears the DB and seeds:

`ord_seed (pending)`

Also creates a replayable success event.

### Golden Replay
Replays the most recent webhook event so the demo can recover instantly.

### Simulate Refund
Triggers:

`charge.refunded`

for the last paid order.

### Safe / Live toggle
Switch behavior without restarting the server.

### AJAX UI
The page updates the **State panel** without reloads.

### Webhook verification
Signed requests are accepted. Unsigned requests are rejected.

### Idempotent processing
Duplicate events are safely ignored.

---

# Quick start

Install dependencies:

```bash
npm install
```

Configure environment variables:

```bash
cp .env.example .env
```

Example `.env`:

```
SAFE_MODE=1
PORT=3000
WEBHOOK_SHARED_SECRET=dev_demo_secret_change_me
```

Seed local fixtures:

```bash
npm run seed
```

Start the server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Local webhook testing

Start the server:

```bash
npm run start
```

## 1. Unsigned request (should fail)

```bash
curl -s -X POST http://localhost:3000/webhook \
 -H "Content-Type: application/json" \
 -d '{"event_id":"evt_demo_bad","type":"payment_intent.succeeded","data":{"orderId":"ord_seed"}}'
echo
```

Expected response:

```
{"ok":false,"error":"unauthorized"}
```

---

## 2. Signed request (should process)

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

```
{"ok":true,"status":"processed"}
```

---

## 3. Replay the same event

Run the same request again.

Expected response:

```
{"ok":true,"status":"duplicate_ignored"}
```

Duplicate events are safely ignored.

---

# Tests

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

# CI

GitHub Actions runs automatically on:

- every Pull Request
- every push to `main`

Workflow:

```bash
npm ci
npm test
```

This prevents webhook behavior from regressing.

---

# Architecture

```
server.js
├── lib/webhookSignature.js
├── lib/idempotencyStore.js
├── fixtures/db.json
└── public/
```

Responsibilities:

- `webhookSignature.js` → HMAC signature verification  
- `idempotencyStore.js` → replay protection  
- `fixtures/db.json` → deterministic demo state  
- `public/` → UI and AJAX updates  

---

# Design principles

### Deterministic demos
Demo state should always be predictable.

### Guardrails first
Security and replay protection should exist even in demos.

### Production-shaped behavior
Signatures, idempotency, tests, and CI mirror real integration patterns.

---

# Author

Katrina Finney  
Software Engineer / IAM Engineer

GitHub  
https://github.com/KatrinaFinney

---

# License

ISC