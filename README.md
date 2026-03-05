# Show-Ready Checkout (Stripe-Style Demo)

A tiny, stage-safe checkout demo designed for live keynotes and integration demos. It highlights one-click reset, golden replay, safe/live toggle, and now production-style webhook guardrails.

---

## Why this exists

Demos break when state isn’t predictable or when webhooks replay. This project adds guardrails that mirror real production patterns, so demos stay reliable.

| Feature                 | Why it matters                             |
|--------------------------|-----------------------------------|
| Reset                    | Start demos from a known state    |
| Replay                   | Recover from webhook timing issues|
| Safe Mode                | Prevent risky real calls          |
| Signature Verification   | Ensure webhooks are trusted       |
| Idempotency              | Prevent double-processing         |
| CI Tests                 | Keep demo behavior stable         |

---

## Features

- **Checkout Simulation:** Creates an order and simulates `payment_intent.succeeded`.
- **One-Click Reset:** Clears state and seeds `ord_seed (pending)` plus a replayable event.
- **Golden Replay:** Replays the last event. After reset, replay marks `ord_seed` as paid.
- **Simulate Refund:** Triggers `charge.refunded` on the last paid order.
- **Safe/Live Toggle:** Switch between safe mode and live mode without restarting.
- **AJAX UI:** Keeps the state panel updated without page reloads.

---

## Quick Start

1. Install dependencies:
   ```bash
   npm install
````

2. Configure environment:

   ```bash
   cp .env.example .env
   ```

   Example `.env`:

   ```env
   SAFE_MODE=1
   PORT=3000
   WEBHOOK_SHARED_SECRET=dev_demo_secret_change_me
   ```

3. (Optional) Seed fixtures:

   ```bash
   npm run seed
   ```

4. Run the server:

   ```bash
   npm run dev
   ```

   Open:
   `http://localhost:3000`

---

## Webhook Hardening (Signature + Idempotency)

The `/webhook` endpoint now behaves like a production integration:

* Requires HMAC signature in `X-ShowReady-Signature`
* Requires `event_id`
* Ignores duplicate `event_id` (`status: duplicate_ignored`)

This prevents unauthorized calls and double-processing when webhooks replay.

---

### Local Webhook Testing

Start the server:

```bash
npm run start
```

1. Unsigned request (should fail with 401):

   ```bash
   curl -s -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"event_id":"evt_demo_bad","type":"payment_intent.succeeded","data":{"orderId":"ord_seed"}}'
   echo
   ```

   Expected:

   ```json
   {"ok":false,"error":"unauthorized"}
   ```

2. Signed request (should succeed):

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

   Expected:

   ```json
   {"ok":true,"status":"processed"}
   ```

3. Replay the same event (should return duplicate_ignored):

   ```bash
   curl -s -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -H "X-ShowReady-Signature: $SIG" \
     -d "$BODY"
   echo
   ```

   Expected:

   ```json
   {"ok":true,"status":"duplicate_ignored"}
   ```

---

## Running Tests

Run the test suite:

```bash
npm test
```

Tests ensure:

* Missing signature is rejected.
* Invalid signature is rejected.
* Valid signature is processed.
* Duplicate events are ignored.

---

## CI

GitHub Actions run on every pull request and push to main.
Workflow steps:

```bash
npm ci
npm test
```

This ensures no regressions in webhook behavior.

---

## Architecture

```
server.js
 ├── lib/webhookSignature.js     # HMAC signature verification
 ├── lib/idempotencyStore.js     # Idempotency (replay prevention)
 ├── fixtures/db.json            # Demo state storage
 └── public/                     # UI and AJAX updates
```

---

## Design Principles

* **Deterministic Demos:** State is predictable for every run.
* **Guardrails First:** Even demos enforce security and replay safety.
* **Production-Shaped:** Signatures, idempotency, and CI mirror real-world systems.

---

## Author

Katrina Finney
Software Engineer / IAM Engineer

GitHub: [https://github.com/KatrinaFinney](https://github.com/KatrinaFinney)

---

## License

ISC

