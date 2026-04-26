import test from "node:test";
import assert from "node:assert/strict";

import { buildQuoteFingerprint, validateCreateLoanQuote } from "@/lib/loopscale/guards";
import type { CreateLoanTransactionRequest, DerivedQuotePayload } from "@/lib/loopscale/types";

function makeQuote(overrides?: Partial<DerivedQuotePayload>): DerivedQuotePayload {
  return {
    principalMint: "principal",
    collateralMint: "collateral",
    durationKey: "1m",
    principalAmountUi: 50,
    collateralAmountUi: 1,
    requestedPrincipalBaseUnits: 50_000_000,
    requestedCollateralBaseUnits: 1_000_000_000,
    bestQuote: {
      apy: 119850,
      strategy: "strategy-1",
      collateralIdentifier: "collateral",
      ltv: 800000,
      lqt: 900000,
      amount: 5_155_429_068
    },
    marketQuotes: [],
    maxBorrowableUi: 69,
    marketMaxBorrowableUi: 5_155,
    collateralMaxBorrowableUi: 69,
    availableLiquidityUi: 248,
    requestedSizeCoverage: 0.72,
    maxLtvPercent: 80,
    liquidationThresholdPercent: 90,
    principalUsdPrice: 1,
    collateralUsdPrice: 86,
    collateralUsdValue: 86,
    limitingFactor: "collateral",
    quoteFingerprint: "",
    quotedAt: "2026-04-26T00:00:00.000Z",
    expiresAt: "2026-04-26T00:00:30.000Z",
    strategyCount: 3,
    status: "available",
    guidance: "ok",
    warnings: [],
    ...overrides
  };
}

function makeBody(overrides?: Partial<CreateLoanTransactionRequest>): CreateLoanTransactionRequest {
  return {
    wallet: "7xKX7GJ7Vnq2qnR29m5zR1q6xg9Pn9ixYj5bUsLq6N9F",
    principalMint: "principal",
    principalAmountUi: 50,
    collateralMint: "collateral",
    collateralAmountUi: 1,
    durationKey: "1m",
    strategy: "strategy-1",
    expectedApy: 119850,
    expectedLqt: 900000,
    quoteFingerprint: "",
    quoteExpiresAt: "2026-04-26T00:00:30.000Z",
    ...overrides
  };
}

test("fingerprint changes when route details change", () => {
  const a = buildQuoteFingerprint({
    principalMint: "principal",
    collateralMint: "collateral",
    durationKey: "1m",
    principalAmountUi: 50,
    collateralAmountUi: 1,
    status: "available",
    bestQuote: { strategy: "strategy-1", apy: 100, lqt: 200 },
    maxBorrowableUi: 69
  });
  const b = buildQuoteFingerprint({
    principalMint: "principal",
    collateralMint: "collateral",
    durationKey: "1m",
    principalAmountUi: 50,
    collateralAmountUi: 1,
    status: "available",
    bestQuote: { strategy: "strategy-2", apy: 100, lqt: 200 },
    maxBorrowableUi: 69
  });

  assert.notEqual(a, b);
});

test("rejects expired quote", () => {
  const quote = makeQuote();
  quote.quoteFingerprint = buildQuoteFingerprint({
    principalMint: quote.principalMint,
    collateralMint: quote.collateralMint,
    durationKey: quote.durationKey,
    principalAmountUi: quote.principalAmountUi,
    collateralAmountUi: quote.collateralAmountUi,
    status: quote.status,
    bestQuote: { strategy: "strategy-1", apy: 119850, lqt: 900000 },
    maxBorrowableUi: quote.maxBorrowableUi
  });
  const body = makeBody({
    quoteFingerprint: quote.quoteFingerprint,
    quoteExpiresAt: "2026-04-26T00:00:00.000Z"
  });

  const result = validateCreateLoanQuote({
    body,
    quote,
    nowMs: Date.parse("2026-04-26T00:00:01.000Z")
  });

  assert.equal(result?.code, "quote_expired");
});

test("rejects stale quote fingerprint", () => {
  const quote = makeQuote({
    quoteFingerprint: "a".repeat(64)
  });
  const body = makeBody({
    quoteFingerprint: "b".repeat(64),
    quoteExpiresAt: quote.expiresAt
  });

  const result = validateCreateLoanQuote({
    body,
    quote,
    nowMs: Date.parse("2026-04-26T00:00:01.000Z")
  });

  assert.equal(result?.code, "stale_quote");
});

test("accepts fresh matching quote", () => {
  const fingerprint = "c".repeat(64);
  const quote = makeQuote({
    quoteFingerprint: fingerprint
  });
  const body = makeBody({
    quoteFingerprint: fingerprint,
    quoteExpiresAt: quote.expiresAt
  });

  const result = validateCreateLoanQuote({
    body,
    quote,
    nowMs: Date.parse("2026-04-26T00:00:01.000Z")
  });

  assert.equal(result, null);
});
