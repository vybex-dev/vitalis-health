// tests/guard.test.ts: Tests for chat safety triage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { regionFromRequest, triageChatMessage } from "../src/lib/safety/guard";
import { anonIpLimited, clientIp } from "../src/lib/api/guard";

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/chat", { method: "POST", headers });

test("triageChatMessage: emergency message yields a notice + model addendum; benign yields neither", () => {
  const hit = triageChatMessage(req({ "accept-language": "en-IN,en;q=0.9" }), "I have crushing chest pain");
  assert.ok(hit.preamble);
  assert.match(hit.preamble!, /112/); // Indian locale -> 112, not 911
  assert.match(hit.promptAddendum, /SAFETY OVERRIDE/);

  const ok = triageChatMessage(req(), "what is a normal resting heart rate?");
  assert.equal(ok.preamble, null);
  assert.equal(ok.promptAddendum, "");
});

test("triageChatMessage: crisis messages get the supportive addendum, not a '911 now' script", () => {
  const t = triageChatMessage(req({ "accept-language": "en-GB" }), "I want to end my life");
  assert.match(t.preamble!, /999/);
  assert.match(t.preamble!, /116 123/);
  assert.match(t.promptAddendum, /mental-health crisis/);
  assert.match(t.promptAddendum, /methods of self-harm/);
});

test("regionFromRequest falls back to a safe default with no header", () => {
  assert.equal(regionFromRequest(req()).code, "US");
});

test("anonIpLimited: only throttles anonymous callers, per IP, and cannot be dodged with new uids", () => {
  const ip = { "x-forwarded-for": "203.0.113.9, 10.0.0.1" };
  assert.equal(clientIp(req(ip)), "203.0.113.9");

  // Signed-in (non-anonymous) users are never blocked by the IP limiter.
  for (let i = 0; i < 50; i++) assert.equal(anonIpLimited(req(ip), { uid: "real", anonymous: false }, "t1", 3), null);

  // Anonymous: a fresh uid each time still hits the same IP bucket.
  const results = Array.from({ length: 5 }, (_, i) => anonIpLimited(req(ip), { uid: `anon-${i}`, anonymous: true }, "t2", 3));
  assert.deepEqual(results.map((r) => r === null), [true, true, true, false, false]);
  assert.equal(results[3]!.status, 429);
});
