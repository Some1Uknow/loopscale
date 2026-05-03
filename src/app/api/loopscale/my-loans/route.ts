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

    const borrowerLookup: LoopscaleLoanInfoRequest = {
      borrowers: [body.borrower],
      page: 0,
      pageSize: 100,
      sortDirection: 1,
      sortType: 2
    };

    const lookups: Promise<LoanInfoEnvelope[] | LoanInfoEnvelope>[] = [
      loopscaleFetch<LoanInfoEnvelope[] | LoanInfoEnvelope>({
        path: "/markets/loans/info",
        body: borrowerLookup
      })
    ];

    if (body.loanAddresses && body.loanAddresses.length > 0) {
      lookups.push(
        loopscaleFetch<LoanInfoEnvelope[] | LoanInfoEnvelope>({
          path: "/markets/loans/info",
          body: {
            loanAddresses: body.loanAddresses,
            page: 0,
            pageSize: body.loanAddresses.length,
            sortDirection: 1,
            sortType: 2
          }
        })
      );
    }

    const responses = await Promise.all(lookups);
    const loans = Array.from(
      new Map(
        responses
          .flatMap((response) => deriveLoanCards(response))
          .map((loan) => [loan.address, loan])
      ).values()
    );
    logEvent("info", "my_loans.success", {
      requestId,
      durationMs: Date.now() - startedAt,
      borrower: body.borrower,
      count: loans.length,
      requestedLoanAddresses: body.loanAddresses?.length ?? 0
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
