import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import crypto from "crypto";

// server.js is CommonJS, so import default and destructure
import serverModule from "../server.js";
const { app } = serverModule;

// Create the same signature the server expects: sha256=<hex(hmac(rawBody))>
function signJsonBody(body, secret) {
  const payload = JSON.stringify(body);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(payload))
    .digest("hex");
  return `sha256=${digest}`;
}

describe("webhook hardening", () => {
  const secret = "test_secret";
  const originalLog = console.log;

  beforeEach(() => {
    // Known secret for every test
    process.env.WEBHOOK_SHARED_SECRET = secret;

    // Keep CI/test output clean
    console.log = () => {};
  });

  afterEach(() => {
    // Restore logging after each test
    console.log = originalLog;
  });

  it("rejects missing signature (401)", async () => {
    const body = {
      event_id: "evt_1",
      type: "payment_intent.succeeded",
      data: { orderId: "ord_seed" },
    };

    const res = await request(app).post("/webhook").send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("unauthorized");
  });

  it("rejects invalid signature (401)", async () => {
    const body = {
      event_id: "evt_2",
      type: "payment_intent.succeeded",
      data: { orderId: "ord_seed" },
    };

    const res = await request(app)
      .post("/webhook")
      .set("X-ShowReady-Signature", "sha256=deadbeef")
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("unauthorized");
  });

  it("accepts valid signature (200 processed)", async () => {
    const body = {
      event_id: "evt_3",
      type: "payment_intent.succeeded",
      data: { orderId: "ord_seed" },
    };

    const sig = signJsonBody(body, secret);

    const res = await request(app)
      .post("/webhook")
      .set("X-ShowReady-Signature", sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe("processed");
  });

  it("ignores duplicate event_id (200 duplicate_ignored)", async () => {
    const body = {
      event_id: "evt_dup",
      type: "payment_intent.succeeded",
      data: { orderId: "ord_seed" },
    };

    const sig = signJsonBody(body, secret);

    const first = await request(app)
      .post("/webhook")
      .set("X-ShowReady-Signature", sig)
      .send(body);

    const second = await request(app)
      .post("/webhook")
      .set("X-ShowReady-Signature", sig)
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(first.body.status).toBe("processed");

    expect(second.status).toBe(200);
    expect(second.body.ok).toBe(true);
    expect(second.body.status).toBe("duplicate_ignored");
  });
});