function createInMemoryIdempotencyStore() {
    const seen = new Set();
  
    return {
      has(eventId) {
        return seen.has(eventId);
      },
      add(eventId) {
        seen.add(eventId);
      },
      clear() {
        seen.clear();
      },
    };
  }
  
  // Production swap idea:
  // Redis: SET event_id 1 NX EX <ttlSeconds>
  module.exports = { createInMemoryIdempotencyStore };