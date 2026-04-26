import { demoWallet, getDurationByKey, getTokenByMint } from "@/lib/borrow-catalog";
import { getServerEnv } from "@/lib/env";
import { loopscaleFetch } from "@/lib/loopscale/client";
import { deriveQuotePayload } from "@/lib/loopscale/derivations";
import type {
  DerivedQuotePayload,
  LoopscaleMaxQuote,
  LoopscaleQuoteItem,
  LoopscaleQuotesRequest
} from "@/lib/loopscale/types";
import { fetchTokenUsdPrices } from "@/lib/prices";
import { uiToBaseUnits } from "@/lib/utils";

export async function fetchDerivedQuotePayload(input: {
  userWallet?: string;
  principalMint: string;
  principalAmountUi: number;
  collateralMint: string;
  collateralAmountUi: number;
  durationKey: string;
}): Promise<DerivedQuotePayload> {
  const env = getServerEnv();
  const principal = getTokenByMint(input.principalMint);
  const collateral = getTokenByMint(input.collateralMint);
  const duration = getDurationByKey(input.durationKey);

  if (!principal || !collateral || !duration) {
    throw new Error("Unsupported principal, collateral, or duration.");
  }

  const userWallet = input.userWallet || demoWallet;

  const fullBookRequest: LoopscaleQuotesRequest = {
    durationType: duration.durationType,
    duration: duration.duration,
    principal: input.principalMint,
    limit: 8,
    offset: 0,
    collateral: [input.collateralMint],
    minPrincipalAmount: uiToBaseUnits(input.principalAmountUi, principal.decimals)
  };

  const [marketQuotes, maxQuotes, priceMap] = await Promise.all([
    loopscaleFetch<LoopscaleQuoteItem[]>({
      path: "/markets/quote",
      body: fullBookRequest,
      headers: {
        "user-wallet": userWallet
      }
    }),
    loopscaleFetch<LoopscaleMaxQuote[]>({
      path: "/markets/quote/max",
      body: {
        durationType: duration.durationType,
        duration: duration.duration,
        principalMint: input.principalMint,
        collateralFilter: [
          {
            amount: uiToBaseUnits(input.collateralAmountUi, collateral.decimals),
            assetData: {
              Spl: {
                mint: input.collateralMint
              }
            }
          }
        ]
      },
      headers: {
        "user-wallet": userWallet
      }
    }),
    fetchTokenUsdPrices([input.principalMint, input.collateralMint])
  ]);

  const bestQuote =
    maxQuotes.find((quote) => quote.collateralIdentifier === input.collateralMint) ??
    maxQuotes[0] ??
    null;

  return deriveQuotePayload({
    principalMint: input.principalMint,
    collateralMint: input.collateralMint,
    durationKey: input.durationKey,
    principalAmountUi: input.principalAmountUi,
    collateralAmountUi: input.collateralAmountUi,
    bestQuote,
    marketQuotes,
    principalUsdPrice: priceMap[input.principalMint]?.usdPrice ?? null,
    collateralUsdPrice: priceMap[input.collateralMint]?.usdPrice ?? null,
    nowMs: Date.now(),
    quoteTtlMs: env.LOOP_QUOTE_TTL_MS
  });
}
