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

test("deriveLoanCards skips missing loanInfos arrays and empty rows", () => {
  const cards = deriveLoanCards([
    {
      totalCount: 1,
      loanInfos: [undefined as unknown as never]
    },
    {
      totalCount: 0,
      loanInfos: undefined as unknown as never
    },
    {
      totalCount: 1,
      loanInfos: [
        {
          loan: {
            address: "loan-2",
            borrower: "borrower-2",
            closed: false
          },
          amount: {
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalAmount: 1_000_000
          },
          ledgers: [
            {
              strategy: "strategy",
              principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              principalDue: 1_000_000,
              principalRepaid: 0
            }
          ]
        }
      ]
    }
  ] as unknown as Array<{ totalCount: number; loanInfos: never[] }>);

  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.address, "loan-2");
});

test("deriveLoanCards reads live paginated items response shape", () => {
  const cards = deriveLoanCards({
    items: [
      {
        loan: {
          address: "4MubyVWsyGApGwVRLR9JJUUwWmza4UMvvqwaWijyGYxP",
          borrower: "4mYiLNQ41BCkBXy5dEg4aWXqScbsa8c7c9hLhFRKoESz",
          closed: false
        },
        ledgers: [
          {
            status: 2,
            strategy: "31SYcsSWdDfvGa9hqgdnce2euXHT7u9fSJzcKehxX9qs",
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalDue: 50_000_000,
            principalRepaid: 0,
            interestOutstanding: 1000,
            apy: 144_800,
            endTime: 1_778_421_186
          }
        ],
        collateral: [
          {
            assetMint: "So11111111111111111111111111111111111111112",
            amount: 1_488_179
          }
        ]
      }
    ]
  });

  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.address, "4MubyVWsyGApGwVRLR9JJUUwWmza4UMvvqwaWijyGYxP");
  assert.equal(cards[0]?.principalAmountUi, 50);
  assert.equal(cards[0]?.outstandingInterestUi, 0.001);
  assert.equal(cards[0]?.collateralSummary, "0.001 SOL");
  assert.equal(cards[0]?.canRepay, true);
  assert.equal(cards[0]?.canWithdrawCollateral, false);
  assert.equal(cards[0]?.canClose, false);
});

test("deriveLoanCards gates management actions in the safe sequence", () => {
  const [collateralReadyCard] = deriveLoanCards({
    items: [
      {
        loan: {
          address: "loan-with-collateral",
          borrower: "borrower",
          closed: false
        },
        ledgers: [
          {
            strategy: "strategy",
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalDue: 50_000_000,
            principalRepaid: 50_000_000,
            interestOutstanding: 0
          }
        ],
        collateral: [
          {
            assetMint: "So11111111111111111111111111111111111111112",
            amount: 1_000_000
          }
        ]
      },
      {
        loan: {
          address: "loan-without-collateral",
          borrower: "borrower",
          closed: false
        },
        ledgers: [
          {
            strategy: "strategy",
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalDue: 50_000_000,
            principalRepaid: 50_000_000,
            interestOutstanding: 0
          }
        ],
        collateral: []
      }
    ]
  });

  assert.equal(collateralReadyCard?.canRepay, false);
  assert.equal(collateralReadyCard?.canWithdrawCollateral, true);
  assert.equal(collateralReadyCard?.canClose, false);
});

test("deriveLoanCards hides settled loans with no debt and no collateral", () => {
  const cards = deriveLoanCards({
    items: [
      {
        loan: {
          address: "settled-loan",
          borrower: "borrower",
          closed: false
        },
        ledgers: [
          {
            strategy: "strategy",
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalDue: 50_000_000,
            principalRepaid: 50_000_000,
            interestOutstanding: 0
          }
        ],
        collateral: []
      }
    ]
  });

  assert.equal(cards.length, 0);
});

test("deriveLoanCards hides Loopscale dust records below the actionable USD threshold", () => {
  const cards = deriveLoanCards({
    items: [
      {
        loan: {
          address: "dust-loan",
          borrower: "borrower",
          closed: false
        },
        principalUsd: 0.000105984683,
        collateralUsd: 0.00018361251426355,
        ledgers: [
          {
            strategy: "strategy",
            principalMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            principalDue: 50_000_000,
            principalRepaid: 49_999_894,
            interestOutstanding: 0
          }
        ],
        collateral: [
          {
            assetMint: "So11111111111111111111111111111111111111112",
            amount: 2_179
          }
        ]
      }
    ]
  });

  assert.equal(cards.length, 0);
});
