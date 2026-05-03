import { getDurationByKey, getTokenByMint, supportedTokens } from "@/lib/borrow-catalog";
import { buildQuoteFingerprint, buildQuoteTiming } from "@/lib/loopscale/guards";
import type {
  CreateLoanTransactionRequest,
  DerivedLoanCard,
  DerivedQuotePayload,
  LoanInfo,
  LoopscaleMaxQuote,
  LoopscaleQuoteItem
} from "@/lib/loopscale/types";
import {
  baseUnitsToUi,
  formatDateFromNow,
  formatPercentFromCbps,
  formatTokenAmount
} from "@/lib/utils";
import { uiToBaseUnitsExact } from "@/lib/token-amounts";

export function deriveQuotePayload(input: {
  principalMint: string;
  collateralMint: string;
  durationKey: string;
  principalAmountUi: number;
  collateralAmountUi: number;
  bestQuote: LoopscaleMaxQuote | null;
  marketQuotes: LoopscaleQuoteItem[];
  principalUsdPrice: number | null;
  collateralUsdPrice: number | null;
  nowMs: number;
  quoteTtlMs: number;
}): DerivedQuotePayload {
  const principalToken = getTokenByMint(input.principalMint);
  const collateralToken = getTokenByMint(input.collateralMint);

  if (!principalToken || !collateralToken) {
    throw new Error("Unsupported token in quote response.");
  }

  const requestedPrincipalBaseUnits = uiToBaseUnitsExact(
    input.principalAmountUi,
    principalToken.decimals,
    "Borrow amount"
  );
  const requestedCollateralBaseUnits = uiToBaseUnitsExact(
    input.collateralAmountUi,
    collateralToken.decimals,
    "Collateral amount"
  );

  const bestQuoteAmount = input.bestQuote?.amount ?? 0;
  const topMarketQuote = input.marketQuotes[0];
  const availableLiquidityRaw = topMarketQuote?.sumPrincipalAvailable ?? bestQuoteAmount;
  const marketMaxBorrowableUi = baseUnitsToUi(bestQuoteAmount, principalToken.decimals);
  const availableLiquidityUi = baseUnitsToUi(availableLiquidityRaw, principalToken.decimals);
  const maxLtvPercent = input.bestQuote ? input.bestQuote.ltv / 10_000 : null;
  const liquidationThresholdPercent = input.bestQuote ? input.bestQuote.lqt / 10_000 : null;
  const collateralUsdValue =
    input.collateralUsdPrice != null ? input.collateralAmountUi * input.collateralUsdPrice : null;
  const collateralMaxBorrowableUi =
    collateralUsdValue != null &&
    input.principalUsdPrice != null &&
    maxLtvPercent != null &&
    input.principalUsdPrice > 0
      ? (collateralUsdValue * (maxLtvPercent / 100)) / input.principalUsdPrice
      : null;
  const maxBorrowableUi =
    collateralMaxBorrowableUi != null
      ? Math.min(marketMaxBorrowableUi, collateralMaxBorrowableUi)
      : marketMaxBorrowableUi;
  const requestedSizeCoverage =
    maxBorrowableUi > 0 ? Math.min(input.principalAmountUi / maxBorrowableUi, 1.5) : 0;
  const limitingFactor =
    collateralMaxBorrowableUi == null
      ? "unknown"
      : collateralMaxBorrowableUi <= marketMaxBorrowableUi
        ? "collateral"
        : "market";

  let status: DerivedQuotePayload["status"] = "available";
  let guidance =
    "Your request fits within both current market liquidity and the estimated collateral-backed borrow limit.";
  const warnings: string[] = [];

  if (collateralMaxBorrowableUi == null || input.principalUsdPrice == null) {
    status = "unavailable";
    guidance =
      "The app could not verify collateral-backed borrow capacity for this request, so execution is blocked.";
    warnings.push("Refresh the quote and try again. If pricing is still unavailable, do not trust the route.");
  } else if (!input.bestQuote || input.principalAmountUi > maxBorrowableUi) {
    status = "unavailable";
    if (collateralMaxBorrowableUi != null && input.principalAmountUi > collateralMaxBorrowableUi) {
      guidance =
        "This borrow request exceeds the estimated amount your posted collateral can support.";
      warnings.push("Add more collateral or lower the borrow amount before continuing.");
    } else {
      guidance =
        "Current visible liquidity cannot fully satisfy this borrow size for the selected term.";
      warnings.push("Lower the borrow amount, add collateral, or shorten the term.");
    }
  } else if (requestedSizeCoverage > 0.8) {
    status = "tight";
    guidance =
      "Your request is near the edge of the current safe borrow limit. Price or capacity can move before you sign.";
    warnings.push("If market depth or token prices shift before you sign, the route may no longer fit.");
  }

  if (input.marketQuotes.length > 1 && input.bestQuote) {
    const secondQuote = input.marketQuotes[1];
    if (secondQuote && secondQuote.apy > input.bestQuote.apy + 15_000) {
      warnings.push(
        `The next visible route is materially more expensive (${formatPercentFromCbps(secondQuote.apy)}), so size slippage matters.`
      );
    }
  }

  const quoteFingerprint = buildQuoteFingerprint({
    principalMint: input.principalMint,
    collateralMint: input.collateralMint,
    durationKey: input.durationKey,
    principalAmountUi: input.principalAmountUi,
    collateralAmountUi: input.collateralAmountUi,
    bestQuote: input.bestQuote
      ? {
          strategy: input.bestQuote.strategy,
          apy: input.bestQuote.apy,
          lqt: input.bestQuote.lqt
        }
      : null
  });
  const { quotedAt, expiresAt } = buildQuoteTiming(input.nowMs, input.quoteTtlMs);

  return {
    principalMint: input.principalMint,
    collateralMint: input.collateralMint,
    durationKey: input.durationKey,
    principalAmountUi: input.principalAmountUi,
    collateralAmountUi: input.collateralAmountUi,
    requestedPrincipalBaseUnits,
    requestedCollateralBaseUnits,
    bestQuote: input.bestQuote,
    marketQuotes: input.marketQuotes,
    maxBorrowableUi,
    marketMaxBorrowableUi,
    collateralMaxBorrowableUi,
    availableLiquidityUi,
    requestedSizeCoverage,
    maxLtvPercent,
    liquidationThresholdPercent,
    principalUsdPrice: input.principalUsdPrice,
    collateralUsdPrice: input.collateralUsdPrice,
    collateralUsdValue,
    limitingFactor,
    quoteFingerprint,
    quotedAt,
    expiresAt,
    strategyCount: input.marketQuotes.length,
    status,
    guidance,
    warnings
  };
}

export function deriveCreateLoanPayload(input: CreateLoanTransactionRequest) {
  const principalToken = getTokenByMint(input.principalMint);
  const collateralToken = getTokenByMint(input.collateralMint);
  const duration = getDurationByKey(input.durationKey);

  if (!principalToken || !collateralToken || !duration) {
    throw new Error("Invalid create loan payload.");
  }

  return {
    borrower: input.wallet,
    depositCollateral: [
      {
        collateralAmount: uiToBaseUnitsExact(
          input.collateralAmountUi,
          collateralToken.decimals,
          "Collateral amount"
        ),
        collateralAssetData: {
          Spl: {
            mint: input.collateralMint
          }
        }
      }
    ],
    principalRequested: [
      {
        ledgerIndex: 0,
        principalAmount: uiToBaseUnitsExact(
          input.principalAmountUi,
          principalToken.decimals,
          "Borrow amount"
        ),
        principalMint: input.principalMint,
        strategy: input.strategy,
        durationIndex: duration.durationIndex,
        expectedLoanValues: {
          expectedApy: input.expectedApy,
          expectedLqt: Array.from({ length: 5 }, () => input.expectedLqt)
        }
      }
    ]
  };
}

export function deriveLoanCards(
  envelopes:
    | Array<{ totalCount: number; loanInfos: LoanInfo[] }>
    | { totalCount: number; loanInfos: LoanInfo[] }
): DerivedLoanCard[] {
  const normalized = Array.isArray(envelopes) ? envelopes : [envelopes];

  return normalized
    .flatMap((envelope) => envelope.loanInfos)
    .map((loanInfo) => {
      const address = loanInfo.loan?.address ?? "unknown";
      const borrower = loanInfo.loan?.borrower ?? "unknown";
      const principalMint =
        loanInfo.amount?.principalMint ?? loanInfo.ledgers?.[0]?.principalMint ?? supportedTokens[0].mint;
      const principalToken = getTokenByMint(principalMint) ?? supportedTokens[0];
      const principalAmountUi = baseUnitsToUi(
        loanInfo.amount?.principalAmount ?? 0,
        principalToken.decimals
      );
      const outstandingInterestUi = baseUnitsToUi(
        loanInfo.amount?.outstandingInterestAmount ?? 0,
        principalToken.decimals
      );

      const ledgers = loanInfo.ledgers ?? [];
      const averageApy =
        ledgers.length > 0
          ? ledgers.reduce((sum, ledger) => sum + (ledger.apy ?? 0), 0) / ledgers.length / 10_000
          : null;

      const latestEndTime = ledgers
        .map((ledger) => ledger.endTime ?? 0)
        .sort((a, b) => b - a)[0];

      const collateralItems =
        loanInfo.collateral && loanInfo.collateral.length > 0
          ? loanInfo.collateral.map((collateral) => ({
              amount: collateral.amount,
              mint: collateral.assetMint
            }))
          : loanInfo.collateralData?.map((collateral) => ({
              amount: collateral.amount,
              mint: collateral.assetData?.Spl?.mint
            })) ?? [];

      const collateralSummary =
        collateralItems.length > 0
          ? collateralItems
              .map((collateral) => {
                const token = collateral.mint ? getTokenByMint(collateral.mint) : undefined;
                if (!token || collateral.amount == null) return "Custom collateral";
                return formatTokenAmount(
                  baseUnitsToUi(collateral.amount, token.decimals),
                  token.symbol,
                  3
                );
              })
              .join(" · ")
          : "No collateral details returned";

      return {
        address,
        borrower,
        principalSymbol: principalToken.symbol,
        principalAmountUi,
        outstandingInterestUi,
        avgApyPercent: averageApy,
        maturityDate: latestEndTime ? formatDateFromNow(new Date(latestEndTime * 1000)) : null,
        statusLabel: loanInfo.loan?.closed ? "Closed" : "Active",
        collateralSummary,
        ledgerCount: ledgers.length
      };
    });
}
