// server.js (with Safe/Live toggle, seeded replay on reset)
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

let safeMode = process.env.SAFE_MODE !== '0'; // default from env; toggle at runtime
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const DB_FILE = './fixtures/db.json';
const LAST_EVENT = './fixtures/last_event.json';

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { orders: [], users: [], stats: { purchases: 0, refunds: 0 } };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function renderHome({ notice }) {
  const db = readDB();
  const modeBadge = safeMode
    ? '<span class="badge safe">SAFE MODE ON</span>'
    : '<span class="badge live">LIVE MODE</span>';

  const noticeBlock = notice
    ? (notice.kind === 'warn'
        ? `<div class="notice warn">${notice.text}</div>`
        : `<div class="notice ok">${notice.text}</div>`)
    : '';

  const toggleLabel = safeMode ? 'Switch to LIVE Mode' : 'Switch to SAFE Mode';

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Show-Ready Checkout</title>
    <link rel="stylesheet" href="/style.css"/>
  </head>
  <body>
    <div class="container">
      <h1>Show-Ready Checkout</h1>
      <p class="subtitle">Clean repo · Seed/Reset · Webhook replay ${modeBadge}</p>

      <div class="modebar">
        <form method="POST" action="/admin/toggle-mode">
          <button type="submit">${toggleLabel}</button>
        </form>
        <small class="muted">Mode toggles are in-memory; restart resets to .env</small>
      </div>

      ${noticeBlock}

      <div class="section">
        <form method="POST" action="/checkout" onsubmit="this.btn.disabled=true">
          <h3>Buy “Demo Hoodie” — $42.00</h3>
          <div class="actions">
            <button name="btn" type="submit">Checkout</button>
          </div>
        </form>
      </div>

      <div class="section">
        <div class="actions">
          <form method="POST" action="/admin/reset" onsubmit="this.r.disabled=true">
            <button name="r" type="submit">One-Click Reset</button>
          </form>
          <form method="POST" action="/admin/replay" onsubmit="this.x.disabled=true">
            <button name="x" type="submit">Golden Replay</button>
          </form>
          <form method="POST" action="/admin/refund" onsubmit="this.z.disabled=true">
            <button name="z" type="submit">Simulate Refund</button>
          </form>
        </div>
        <small class="muted">Reset clears state (but seeds a replayable event); Replay re-sends last event; Refund shows an alternate path.</small>
      </div>

      <div class="section">
        <h3>State</h3>
        <pre>${JSON.stringify(db, null, 2)}</pre>
      </div>
    </div>
  </body>
  </html>
  `;
}

// HOME
app.get('/', (req, res) => {
  const replayed = req.query.replayed;
  let notice;
  if (replayed) {
    notice =
      replayed === 'none'
        ? { kind: 'warn', text: 'Nothing to replay.' }
        : { kind: 'ok', text: `Replayed <code>${replayed}</code>.` };
  }
  res.send(renderHome({ notice }));
});

// CHECKOUT — create order and simulate success (deterministic in Safe Mode)
app.post('/checkout', (_req, res) => {
  const db = readDB();
  const order = {
    id: 'ord_' + Math.random().toString(36).slice(2, 8),
    item: 'Demo Hoodie',
    amount: 4200,
    currency: 'usd',
    status: 'pending'
  };
  db.orders.push(order);
  writeDB(db);

  // In LIVE mode we could introduce flakiness; keep it simple here.
  const event = {
    type: 'payment_intent.succeeded',
    data: { orderId: order.id, amount: order.amount, currency: order.currency, created: Date.now() }
  };
  fs.writeFileSync(LAST_EVENT, JSON.stringify(event, null, 2));
  simulateWebhook(event);

  return res.redirect('/');
});

// WEBHOOK — parity endpoint
app.post('/webhook', (req, res) => {
  simulateWebhook(req.body);
  res.json({ ok: true });
});

// ADMIN: RESET — one-click reset + seed replayable success event
app.post('/admin/reset', (_req, res) => {
  const fresh = { orders: [], users: [], stats: { purchases: 0, refunds: 0 } };
  writeDB(fresh);

  const seedEvent = {
    type: 'payment_intent.succeeded',
    data: { orderId: 'ord_seed', amount: 4200, currency: 'usd', created: Date.now() }
  };
  fs.writeFileSync(LAST_EVENT, JSON.stringify(seedEvent, null, 2));

  console.log('🔄 DB reset. Seeded a sample event for Golden Replay.');
  res.redirect('/?replayed=none');
});

// ADMIN: REPLAY — replay last event
app.post('/admin/replay', (_req, res) => {
  let t = 'none';
  if (fs.existsSync(LAST_EVENT)) {
    const event = JSON.parse(fs.readFileSync(LAST_EVENT, 'utf8'));
    simulateWebhook(event);
    t = event.type;
    console.log('✨ Replayed last webhook event:', event.type);
  } else {
    console.log('ℹ️ No last_event.json to replay.');
  }
  res.redirect('/?replayed=' + encodeURIComponent(t));
});

// ADMIN: REFUND — alternate path
app.post('/admin/refund', (_req, res) => {
  const db = readDB();
  const lastPaid = [...db.orders].reverse().find(o => o.status === 'paid');
  let t = 'none';

  if (lastPaid) {
    const event = {
      type: 'charge.refunded',
      data: { orderId: lastPaid.id, amount: lastPaid.amount, currency: lastPaid.currency, created: Date.now() }
    };
    fs.writeFileSync(LAST_EVENT, JSON.stringify(event, null, 2));
    simulateWebhook(event);
    t = event.type;
    console.log('↩️  Simulated refund for', lastPaid.id);
  } else {
    console.log('ℹ️ No paid order to refund.');
  }
  res.redirect('/?replayed=' + encodeURIComponent(t));
});

// ADMIN: TOGGLE MODE — flip Safe/Live without restart
app.post('/admin/toggle-mode', (_req, res) => {
  safeMode = !safeMode;
  console.log(`🛡️  Mode toggled → ${safeMode ? 'SAFE' : 'LIVE'}`);
  res.redirect('/');
});

// Core event handler for both success/refund
function simulateWebhook(event) {
  const db = readDB();
  if (event.type === 'payment_intent.succeeded') {
    const order = db.orders.find(o => o.id === event.data.orderId);
    if (order) {
      order.status = 'paid';
      db.stats.purchases += 1;
      writeDB(db);
      console.log('✅ Payment captured for', order.id, `(mode=${safeMode ? 'SAFE' : 'LIVE'})`);
    }
  }
  if (event.type === 'charge.refunded') {
    const order = db.orders.find(o => o.id === event.data.orderId);
    if (order) {
      order.status = 'refunded';
      db.stats.refunds += 1;
      writeDB(db);
      console.log('↩️  Refunded', order.id, `(mode=${safeMode ? 'SAFE' : 'LIVE'})`);
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Show-Ready Checkout running on http://localhost:${PORT}  (mode=${safeMode ? 'SAFE' : 'LIVE'})`)
);
