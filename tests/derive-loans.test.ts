import test from "node:test";
import assert from "node:assert/strict";

import { deriveLoanCards } from "@/lib/loopscale/derivations";

test("deriveLoanCards reads collateral from the documented Loopscale shape", () => {
  const cards = deriveLoanCards({
    totalCount: 1,
    loanInfos: [
      {
        loan: {
          address: "loan-1",
          borrower: "borrower-1",
          closed: false
        },
        amount: {
          principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          principalAmount: 5_000_000_000,
          outstandingInterestAmount: 25_000_000
        },
        ledgers: [
          {
            apy: 125_000,
            endTime: 1_750_000_000
          }
        ],
        collateral: [
          {
            assetMint: "So11111111111111111111111111111111111111112",
            amount: 1_250_000_000
          }
        ]
      }
    ]
  });

  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.collateralSummary, "1.25 SOL");
  assert.equal(cards[0]?.principalAmountUi, 5000);
});
