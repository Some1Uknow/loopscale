import test from "node:test";
import assert from "node:assert/strict";

import { consumeRateLimit } from "@/lib/server/rate-limit";

test("rate limiter blocks after the configured limit in a window", () => {
  const now = 1_700_000_000_000;
  const first = consumeRateLimit({
    key: "quote:test",
    limit: 2,
    windowMs: 60_000,
    now
  });
  const second = consumeRateLimit({
    key: "quote:test",
    limit: 2,
    windowMs: 60_000,
    now
  });
  const third = consumeRateLimit({
    key: "quote:test",
    limit: 2,
    windowMs: 60_000,
    now
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});
