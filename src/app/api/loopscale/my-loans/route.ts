import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getServerEnv } from "@/lib/env";
import { loopscaleFetch, parseJsonBody } from "@/lib/loopscale/client";
import { deriveLoanCards } from "@/lib/loopscale/derivations";
import { loanInfoRequestSchema } from "@/lib/loopscale/schemas";
import type { LoanInfoEnvelope, LoopscaleLoanInfoRequest } from "@/lib/loopscale/types";
import {
  apiError,
  apiOk,
  getRateLimitIdentifier,
  getRequestId,
  logEvent
} from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const body = parseJsonBody(await request.json(), loanInfoRequestSchema);
    const env = getServerEnv();
    const rate = consumeRateLimit({
      key: `loans:${getRateLimitIdentifier(request)}`,
      limit: env.LOANS_RATE_LIMIT_MAX,
      windowMs: env.LOANS_RATE_LIMIT_WINDOW_MS
    });

    if (!rate.allowed) {
      return apiError(
        requestId,
        429,
        "rate_limited",
        "Too many loan lookup requests. Wait a moment and try again.",
        true
      );
    }

    const loopscaleBody: LoopscaleLoanInfoRequest = {
      borrowers: [body.borrower],
      filterType: 0,
      page: 0,
      pageSize: 50,
      sortDirection: 1,
      sortType: 1
    };

    const response = await loopscaleFetch<LoanInfoEnvelope[] | LoanInfoEnvelope>({
      path: "/markets/loans/info",
      body: loopscaleBody
    });

    const loans = deriveLoanCards(response);
    logEvent("info", "my_loans.success", {
      requestId,
      durationMs: Date.now() - startedAt,
      borrower: body.borrower,
      count: loans.length
    });
    return apiOk(requestId, loans);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(requestId, 400, "bad_request", "Invalid loan lookup request.");
    }
    const message = error instanceof Error ? error.message : "Unable to fetch Loopscale loans.";
    logEvent("error", "my_loans.failure", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: message
    });
    return apiError(requestId, 500, "dependency_failure", message, true);
  }
}
