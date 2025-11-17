# Show-Ready Checkout (Stripe-style Demo)

A tiny, **stage-safe** checkout demo designed for live keynotes & tours.  
It highlights **one-click Reset**, **Golden Replay**, and a **Safe/Live** toggle so the story keeps moving—even if Wi-Fi or timing gets spicy.

**Links**  
- 🎥 Loom walkthrough (**2:30**): https://www.loom.com/share/2bbf6c4d24db47f79bed83fa9c9869f2  
- 💻 Repo: https://github.com/KatrinaFinney/show-ready-checkout

---

## Why this is useful

- **Predictable timing** — Deterministic state makes rehearsals match showtime.  
- **Instant recovery** — Golden Replay re-sends the last good event if something hiccups (very useful).  
- **Safety rail** — Safe Mode prevents risky/real calls while demoing integrations (also very useful).  
- **No page jump** — AJAX updates keep the camera and audience focused on the State panel.

---

## Features

- **Checkout** → creates an order and simulates a successful payment (`payment_intent.succeeded`).  
- **One-Click Reset** → clears DB **and seeds** `ord_seed (pending)` **plus** a replayable success event.  
- **Golden Replay** → replays the last event; after Reset this will mark `ord_seed` as **paid**.  
- **Simulate Refund** → triggers `charge.refunded` on the last paid order (alternate path).  
- **Safe/Live Toggle** → flip at runtime without restart; logs show current mode.  
- **AJAX UI** → POSTs return JSON and update the **State** panel in place (no full-page reload).

---

## Quick start

```bash
# 1) Install
npm install

# 2) Configure env (Safe Mode on by default)
cp .env.example .env
# in .env you can set:
# SAFE_MODE=1
# PORT=3000

# 3) Seed local fixtures (optional helper script)
npm run seed

# 4) Run the app
npm run dev
# open http://localhost:3000
