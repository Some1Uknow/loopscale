import test from "node:test";
import assert from "node:assert/strict";

import { deriveQuotePayload } from "@/lib/loopscale/derivations";

test("marks quote unavailable when collateral-backed limit is below request", () => {
  const quote = deriveQuotePayload({
    principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    collateralMint: "So11111111111111111111111111111111111111112",
    durationKey: "1m",
    principalAmountUi: 5000,
    collateralAmountUi: 1,
    bestQuote: {
      apy: 119850,
      strategy: "strategy-1",
      collateralIdentifier: "So11111111111111111111111111111111111111112",
      ltv: 800000,
      lqt: 900000,
      amount: 5_155_429_068
    },
    marketQuotes: [
      {
        apy: 109000,
        ltv: 800000,
        liquidationThreshold: 900000,
        maxPrincipalAvailable: 4_152_424_285,
        sumPrincipalAvailable: 5_218_979_438
      }
    ],
    principalUsdPrice: 1,
    collateralUsdPrice: 86.5,
    nowMs: 1_700_000_000_000,
    quoteTtlMs: 30_000
  });

  assert.equal(quote.status, "unavailable");
  assert.equal(quote.limitingFactor, "collateral");
  assert.ok(quote.collateralMaxBorrowableUi);
  assert.ok(quote.maxBorrowableUi < 100);
});

test("marks quote available when request fits collateral-backed limit", () => {
  const quote = deriveQuotePayload({
    principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    collateralMint: "So11111111111111111111111111111111111111112",
    durationKey: "1m",
    principalAmountUi: 50,
    collateralAmountUi: 1,
    bestQuote: {
      apy: 119850,
      strategy: "strategy-1",
      collateralIdentifier: "So11111111111111111111111111111111111111112",
      ltv: 800000,
      lqt: 900000,
      amount: 5_155_429_068
    },
    marketQuotes: [
      {
        apy: 109000,
        ltv: 800000,
        liquidationThreshold: 900000,
        maxPrincipalAvailable: 4_152_424_285,
        sumPrincipalAvailable: 5_218_979_438
      }
    ],
    principalUsdPrice: 1,
    collateralUsdPrice: 86.5,
    nowMs: 1_700_000_000_000,
    quoteTtlMs: 30_000
  });

  assert.equal(quote.status, "available");
  assert.equal(quote.limitingFactor, "collateral");
  assert.ok(quote.quoteFingerprint.length === 64);
});
