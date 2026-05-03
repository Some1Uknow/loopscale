import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getServerEnv } from "@/lib/env";
import { loopscaleFetch, parseJsonBody } from "@/lib/loopscale/client";
import { deriveCreateLoanPayload } from "@/lib/loopscale/derivations";
import { validateCreateLoanQuote } from "@/lib/loopscale/guards";
import { fetchDerivedQuotePayload } from "@/lib/loopscale/quote-service";
import { createLoanRequestSchema, parseCreateLoanRequest } from "@/lib/loopscale/schemas";
import type { CreateLoanResponse } from "@/lib/loopscale/types";
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
    const body = parseCreateLoanRequest(
      parseJsonBody(await request.json(), createLoanRequestSchema)
    );
    const env = getServerEnv();
    const rate = consumeRateLimit({
      key: `create:${getRateLimitIdentifier(request)}`,
      limit: env.CREATE_RATE_LIMIT_MAX,
      windowMs: env.CREATE_RATE_LIMIT_WINDOW_MS
    });

    if (!rate.allowed) {
      logEvent("warn", "create_loan.rate_limited", {
        requestId,
        ip: getClientIp(request),
        wallet: body.wallet
      });
      return apiError(
        requestId,
        429,
        "rate_limited",
        "Too many loan build requests. Wait a moment and try again.",
        true
      );
    }

    const quote = await fetchDerivedQuotePayload({
      userWallet: body.wallet,
      principalMint: body.principalMint,
      principalAmountUi: body.principalAmountUi,
      collateralMint: body.collateralMint,
      collateralAmountUi: body.collateralAmountUi,
      durationKey: body.durationKey
    });

    const quoteError = validateCreateLoanQuote({
      body,
      quote,
      nowMs: Date.now()
    });

    if (quoteError) {
      logEvent("warn", "create_loan.quote_rejected", {
        requestId,
        durationMs: Date.now() - startedAt,
        code: quoteError.code,
        wallet: body.wallet,
        principalMint: body.principalMint,
        collateralMint: body.collateralMint
      });
      return apiError(requestId, quoteError.status, quoteError.code, quoteError.message);
    }

    const loopscaleBody = deriveCreateLoanPayload(body);

    const response = await loopscaleFetch<CreateLoanResponse>({
      path: "/markets/creditbook/create",
      body: loopscaleBody,
      headers: {
        payer: body.wallet
      }
    });

    logEvent("info", "create_loan.success", {
      requestId,
      durationMs: Date.now() - startedAt,
      wallet: body.wallet,
      loanAddress: response.loanAddress
    });

    return apiOk(requestId, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(requestId, 400, "bad_request", "Invalid create-loan request.");
    }
    if (error instanceof InputValidationError) {
      return apiError(requestId, 400, "bad_request", error.message);
    }
    const message =
      error instanceof Error ? error.message : "Unable to build Loopscale loan transaction.";
    logEvent("error", "create_loan.failure", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: message
    });
    return apiError(requestId, 500, "dependency_failure", message, true);
  }
}
