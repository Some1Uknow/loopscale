import test from "node:test";
import assert from "node:assert/strict";

import type { NextRequest } from "next/server";

import { getRateLimitIdentifier } from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

test.beforeEach(() => {
  resetRateLimitBuckets();
});

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

test("rate limit identifier uses only trusted client IP headers", () => {
  const forwarded = {
    headers: new Headers({
      "x-forwarded-for": "203.0.113.8, 10.0.0.2",
      "x-real-ip": "198.51.100.4"
    })
  } as NextRequest;
  const fallback = {
    headers: new Headers({
      "x-real-ip": "198.51.100.4"
    })
  } as NextRequest;

  assert.equal(getRateLimitIdentifier(forwarded), "203.0.113.8");
  assert.equal(getRateLimitIdentifier(fallback), "198.51.100.4");
});
