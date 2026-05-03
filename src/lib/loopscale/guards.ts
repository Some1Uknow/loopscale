import { createHash } from "node:crypto";

import type { CreateLoanTransactionRequest, DerivedQuotePayload } from "@/lib/loopscale/types";

export function buildQuoteFingerprint(quote: {
  principalMint: string;
  collateralMint: string;
  durationKey: string;
  principalAmountUi: number;
  collateralAmountUi: number;
  bestQuote: {
    strategy: string;
    apy: number;
    lqt: number;
  } | null;
}) {
  const payload = JSON.stringify({
    principalMint: quote.principalMint,
    collateralMint: quote.collateralMint,
    durationKey: quote.durationKey,
    principalAmountUi: quote.principalAmountUi,
    collateralAmountUi: quote.collateralAmountUi,
    strategy: quote.bestQuote?.strategy ?? null,
    apy: quote.bestQuote?.apy ?? null,
    lqt: quote.bestQuote?.lqt ?? null
  });

  return createHash("sha256").update(payload).digest("hex");
}

export function buildQuoteTiming(nowMs: number, ttlMs: number) {
  return {
    quotedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString()
  };
}

export function isQuoteExpired(expiresAt: string, nowMs: number) {
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return true;
  return parsed <= nowMs;
}

export function validateCreateLoanQuote(input: {
  body: CreateLoanTransactionRequest;
  quote: DerivedQuotePayload;
  nowMs: number;
}) {
  if (isQuoteExpired(input.body.quoteExpiresAt, input.nowMs)) {
    return {
      status: 409,
      code: "quote_expired" as const,
      message: "The quote expired. Refresh the route and review it again before signing."
    };
  }

  if (input.quote.status === "unavailable") {
    return {
      status: 400,
      code: "unsupported_route" as const,
      message: input.quote.guidance
    };
  }

  if (!input.quote.bestQuote) {
    return {
      status: 409,
      code: "stale_quote" as const,
      message: "No matching route is currently available. Refresh the quote and try again."
    };
  }

  if (
    input.quote.bestQuote.strategy !== input.body.strategy ||
    input.quote.bestQuote.apy !== input.body.expectedApy ||
    input.quote.bestQuote.lqt !== input.body.expectedLqt ||
    input.quote.quoteFingerprint !== input.body.quoteFingerprint
  ) {
    return {
      status: 409,
      code: "stale_quote" as const,
      message: "The selected route is stale. Refresh the quote and review the latest route before signing."
    };
  }

  return null;
}
