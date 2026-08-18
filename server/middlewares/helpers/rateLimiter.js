/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Every contract route hits an RPC provider that bills per request, so an
 * unthrottled endpoint is both a cost and an availability problem. This is
 * deliberately dependency-free and per-process; in a multi-instance deployment
 * the same interface is backed by Redis (or the API gateway) instead.
 */
function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();

  // Bounded memory: drop windows that have already expired.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Slow down.',
        retryAfter,
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
  chainRateLimiter: createRateLimiter({ windowMs: 60_000, max: 60 }),
};
