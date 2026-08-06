// Best-effort in-memory rate limiter. Serverless functions on Vercel are
// stateless between cold starts and can run as multiple concurrent
// instances, so this is NOT a hard guarantee — for strict multi-instance
// rate limiting, back this with Upstash Redis or Firestore counters
// instead. It's still useful as a cheap first line of defense against
// accidental client-side loops burning through API quota.

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}
