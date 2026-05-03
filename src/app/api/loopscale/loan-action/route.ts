import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getServerEnv } from "@/lib/env";
import { loopscaleFetch, parseJsonBody } from "@/lib/loopscale/client";
import { loanActionRequestSchema } from "@/lib/loopscale/schemas";
import type {
  LoanInfo,
  LoanInfoEnvelope,
  LoanLedger,
  LoanLockTransactionResponse,
  VersionedTransactionResponse
} from "@/lib/loopscale/types";
import {
  apiError,
  apiOk,
  getRateLimitIdentifier,
  getRequestId,
  logEvent
} from "@/lib/server/api";
import { consumeRateLimit } from "@/lib/server/rate-limit";

function unwrapLoanInfos(response: LoanInfoEnvelope[] | LoanInfoEnvelope) {
  const envelopes = Array.isArray(response) ? response : [response];
  return envelopes.flatMap((envelope) => {
    if (Array.isArray(envelope.loanInfos)) return envelope.loanInfos;
    if (Array.isArray(envelope.items)) return envelope.items;
    return [];
  });
}

function ledgerOutstandingBaseUnits(ledger: LoanLedger) {
  const principalDue = ledger.principalDue ?? ledger.principalAmount ?? 0;
  const principalRepaid = ledger.principalRepaid ?? 0;
  const interest = ledger.interestOutstanding ?? ledger.interestOwedAmount ?? 0;
  return Math.max(Math.ceil(principalDue - principalRepaid + interest), 0);
}

function findRepayableLedger(loanInfo: LoanInfo) {
  return (loanInfo.ledgers ?? []).find(
    (ledger) => ledger.strategy && ledgerOutstandingBaseUnits(ledger) > 0
  );
}

function findWithdrawableCollateral(loanInfo: LoanInfo) {
  return (loanInfo.collateral ?? []).find(
    (collateral) => collateral.assetMint && collateral.amount != null && collateral.amount > 0
  );
}

function hasRepayableDebt(loanInfo: LoanInfo) {
  return (loanInfo.ledgers ?? []).some((ledger) => ledgerOutstandingBaseUnits(ledger) > 0);
}

function hasWithdrawableCollateral(loanInfo: LoanInfo) {
  return Boolean(findWithdrawableCollateral(loanInfo));
}

function expectedLoanValues(ledger: LoanLedger) {
  if (ledger.apy == null || !ledger.lqtRatios || ledger.lqtRatios.length === 0) {
    throw new Error("Loan is missing expected loan guard values.");
  }

  return {
    expectedApy: ledger.apy,
    expectedLqt: ledger.lqtRatios
  };
}

function normalizeLoanActionResponse(
  response: LoanLockTransactionResponse | VersionedTransactionResponse
): LoanLockTransactionResponse {
  if ("message" in response && "signatures" in response) {
    return {
      transactions: [response]
    };
  }

  return response;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  try {
    const body = parseJsonBody(await request.json(), loanActionRequestSchema);
    const env = getServerEnv();
    const rate = consumeRateLimit({
      key: `loan-action:${getRateLimitIdentifier(request)}`,
      limit: env.CREATE_RATE_LIMIT_MAX,
      windowMs: env.CREATE_RATE_LIMIT_WINDOW_MS
    });

    if (!rate.allowed) {
      return apiError(
        requestId,
        429,
        "rate_limited",
        "Too many loan action requests. Wait a moment and try again.",
        true
      );
    }

    const loanResponse = await loopscaleFetch<LoanInfoEnvelope[] | LoanInfoEnvelope>({
      path: "/markets/loans/info",
      body: {
        loanAddresses: [body.loanAddress],
        page: 0,
        pageSize: 1
      }
    });
    const loanInfo = unwrapLoanInfos(loanResponse)[0];

    if (!loanInfo?.loan?.address) {
      return apiError(requestId, 404, "bad_request", "Loan was not found.");
    }

    if (loanInfo.loan.borrower !== body.wallet) {
      return apiError(requestId, 403, "bad_request", "Connected wallet does not own this loan.");
    }

    let response: LoanLockTransactionResponse;

    if (body.action === "repay") {
      const ledger = findRepayableLedger(loanInfo);
      if (!ledger?.strategy) {
        return apiError(requestId, 400, "bad_request", "No repayable ledger was found.");
      }

      response = await loopscaleFetch<LoanLockTransactionResponse>({
        path: "/markets/creditbook/repay_simple",
        headers: {
          payer: body.wallet
        },
        body: {
          loan: body.loanAddress,
          strategy: ledger.strategy,
          repayParams: {
            amount: ledgerOutstandingBaseUnits(ledger),
            ledgerIndex: ledger.ledgerIndex ?? 0,
            repayAll: true
          }
        }
      });
    } else if (body.action === "withdrawCollateral") {
      const collateral = findWithdrawableCollateral(loanInfo);
      const ledger = (loanInfo.ledgers ?? [])[0];
      if (hasRepayableDebt(loanInfo)) {
        return apiError(
          requestId,
          400,
          "bad_request",
          "Repay the outstanding loan before withdrawing collateral."
        );
      }
      if (!collateral?.assetMint || collateral.amount == null) {
        return apiError(requestId, 400, "bad_request", "No withdrawable collateral was found.");
      }

      response = normalizeLoanActionResponse(
        await loopscaleFetch<LoanLockTransactionResponse | VersionedTransactionResponse>({
          path: "/markets/creditbook/collateral/withdraw",
          headers: {
            "user-wallet": body.wallet,
            payer: body.wallet
          },
          body: {
            loan: body.loanAddress,
            collateralMint: collateral.assetMint,
            amount: collateral.amount,
            collateralIndex: collateral.index ?? 0,
            expectedLoanValues: expectedLoanValues(ledger)
          }
        })
      );
    } else {
      if (hasRepayableDebt(loanInfo)) {
        return apiError(requestId, 400, "bad_request", "Repay the outstanding loan before closing.");
      }
      if (hasWithdrawableCollateral(loanInfo)) {
        return apiError(
          requestId,
          400,
          "bad_request",
          "Withdraw remaining collateral before closing the loan."
        );
      }

      response = await loopscaleFetch<LoanLockTransactionResponse>({
        path: "/markets/creditbook/close_loan",
        headers: {
          "user-wallet": body.wallet
        },
        body: {
          loan: body.loanAddress
        }
      });
    }

    logEvent("info", "loan_action.success", {
      requestId,
      durationMs: Date.now() - startedAt,
      action: body.action,
      wallet: body.wallet,
      loanAddress: body.loanAddress,
      transactionCount: response.transactions?.length ?? 0
    });

    return apiOk(requestId, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(requestId, 400, "bad_request", "Invalid loan action request.");
    }
    const message = error instanceof Error ? error.message : "Unable to build loan action.";
    logEvent("error", "loan_action.failure", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: message
    });
    return apiError(requestId, 500, "dependency_failure", message, true);
  }
}
