import { NextRequest } from "next/server";

import { defaultCollateralMint, defaultPrincipalMint, demoWallet } from "@/lib/borrow-catalog";
import { getServerEnv } from "@/lib/env";
import { fetchDerivedQuotePayload } from "@/lib/loopscale/quote-service";
import { fetchTokenUsdPrices } from "@/lib/prices";
import { apiError, apiOk, getRequestId, logEvent } from "@/lib/server/api";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const mode = request.nextUrl.searchParams.get("mode") ?? "basic";
  const env = getServerEnv();

  if (mode !== "full") {
    return apiOk(requestId, {
      status: "ok",
      service: "loopscale-borrow-shopper",
      env: {
        loopscaleApiBaseUrl: env.LOOPSCALE_API_BASE_URL,
        quoteTtlMs: env.LOOP_QUOTE_TTL_MS,
        upstreamTimeoutMs: env.LOOPSCALE_UPSTREAM_TIMEOUT_MS
      }
    });
  }

  try {
    const [prices, quote] = await Promise.all([
      fetchTokenUsdPrices([defaultPrincipalMint, defaultCollateralMint]),
      fetchDerivedQuotePayload({
        userWallet: demoWallet,
        principalMint: defaultPrincipalMint,
        principalAmountUi: 50,
        collateralMint: defaultCollateralMint,
        collateralAmountUi: 1,
        durationKey: "1m"
      })
    ]);

    return apiOk(requestId, {
      status: "ok",
      service: "loopscale-borrow-shopper",
      dependencies: {
        loopscaleQuote: {
          status: quote.bestQuote ? "ok" : "degraded",
          quoteStatus: quote.status,
          quoteFingerprint: quote.quoteFingerprint
        },
        jupiterPrices: {
          status:
            prices[defaultPrincipalMint]?.usdPrice && prices[defaultCollateralMint]?.usdPrice
              ? "ok"
              : "degraded"
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed.";
    logEvent("error", "health.failure", {
      requestId,
      mode,
      error: message
    });
    return apiError(requestId, 503, "dependency_failure", message, true);
  }
}
