import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getServerEnv } from "@/lib/env";
import { parseJsonBody } from "@/lib/loopscale/client";
import { parseQuoteRequest, quoteRequestSchema } from "@/lib/loopscale/schemas";
import { fetchDerivedQuotePayload } from "@/lib/loopscale/quote-service";
import {
  apiError,
  apiOk,
  getClientIp,
  getRateLimitIdentifier,
  getRequestId,
  logEvent
} from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { InputValidationError } from "@/lib/token-amounts";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const body = parseQuoteRequest(parseJsonBody(await request.json(), quoteRequestSchema));
    const env = getServerEnv();
    const rate = consumeRateLimit({
      key: `quote:${getRateLimitIdentifier(request)}`,
      limit: env.QUOTE_RATE_LIMIT_MAX,
      windowMs: env.QUOTE_RATE_LIMIT_WINDOW_MS
    });

    if (!rate.allowed) {
      logEvent("warn", "quote.rate_limited", {
        requestId,
        ip: getClientIp(request),
        wallet: body.userWallet ?? "demo"
      });
      return apiError(
        requestId,
        429,
        "rate_limited",
        "Too many quote requests. Wait a moment and try again.",
        true
      );
    }

    const payload = await fetchDerivedQuotePayload(body);
    logEvent("info", "quote.success", {
      requestId,
      durationMs: Date.now() - startedAt,
      principalMint: body.principalMint,
      collateralMint: body.collateralMint,
      status: payload.status,
      quoteFingerprint: payload.quoteFingerprint
    });

    return apiOk(requestId, payload);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(requestId, 400, "bad_request", "Invalid quote request.");
    }
    if (error instanceof InputValidationError) {
      return apiError(requestId, 400, "bad_request", error.message);
    }
    const message = error instanceof Error ? error.message : "Unable to fetch Loopscale quotes.";
    logEvent("error", "quote.failure", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: message
    });
    return apiError(requestId, 500, "dependency_failure", message, true);
  }
}
