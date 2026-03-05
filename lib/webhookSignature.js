const crypto = require("crypto");

/**
 * Header format: "sha256=<hex>"
 */
function computeSignature(rawBodyBuffer, secret) {
  if (!Buffer.isBuffer(rawBodyBuffer)) {
    throw new Error("rawBodyBuffer must be a Buffer");
  }
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBodyBuffer)
    .digest("hex");
  return `sha256=${digest}`;
}

function timingSafeEquals(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifySignature({ rawBodyBuffer, secret, headerValue }) {
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!headerValue) return { ok: false, reason: "missing_signature_header" };

  const expected = computeSignature(rawBodyBuffer, secret);
  const ok = timingSafeEquals(expected, headerValue);

  return ok ? { ok: true } : { ok: false, reason: "invalid_signature" };
}

module.exports = { computeSignature, verifySignature };