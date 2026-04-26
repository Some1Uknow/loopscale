import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getServerEnv } from "@/lib/env";
import { parseJsonBody } from "@/lib/loopscale/client";
import { quoteRequestSchema } from "@/lib/loopscale/schemas";
import { fetchDerivedQuotePayload } from "@/lib/loopscale/quote-service";
import { apiError, apiOk, getClientIp, getRequestId, logEvent } from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const body = parseJsonBody(await request.json(), quoteRequestSchema.partial({
      userWallet: true
    }));
    const env = getServerEnv();
    const rate = consumeRateLimit({
      key: `quote:${getClientIp(request)}:${body.userWallet ?? "demo"}`,
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
    const message = error instanceof Error ? error.message : "Unable to fetch Loopscale quotes.";
    logEvent("error", "quote.failure", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: message
    });
    return apiError(requestId, 500, "dependency_failure", message, true);
  }
}
