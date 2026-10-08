// src/lib/api/guard.ts: API route helpers for client IP and anonymous rate limiting.
import { checkRateLimit } from "@/lib/rateLimit";

// Anonymous "Try the demo" accounts are free to create, so a per-user rate limit
// alone is trivially bypassed (new anonymous uid = fresh quota). For anonymous
// callers we ALSO limit per client IP, which protects the AI keys during a public
// demo / judging window. Best-effort and per-instance, like the rest of rateLimit.ts.

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Returns a 429 Response if this anonymous caller's IP is over its budget, otherwise null. */
export function anonIpLimited(
  request: Request,
  auth: { uid: string; anonymous: boolean },
  bucket: string,
  limit = 20,
  windowMs = 60 * 60 * 1000,
): Response | null {
  if (!auth.anonymous) return null;
  const { allowed, resetInMs } = checkRateLimit(`anon-ip:${bucket}:${clientIp(request)}`, limit, windowMs);
  if (allowed) return null;
  return Response.json(
    {
      error: `The demo is rate-limited to protect shared AI quota. Try again in ${Math.ceil((resetInMs ?? 0) / 60000)} min, or create a free account.`,
    },
    { status: 429 },
  );
}
