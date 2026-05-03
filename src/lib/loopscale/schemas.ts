import { z } from "zod";

import { parseTokenAmountInput } from "@/lib/token-amounts";

export const quoteRequestSchema = z.object({
  userWallet: z.string().min(32).optional(),
  principalMint: z.string().min(32),
  principalAmountUi: z.string().trim().min(1),
  collateralMint: z.string().min(32),
  collateralAmountUi: z.string().trim().min(1),
  durationKey: z.enum(["1d", "1w", "1m", "3m"])
});

export const createLoanRequestSchema = z.object({
  wallet: z.string().min(32),
  principalMint: z.string().min(32),
  principalAmountUi: z.string().trim().min(1),
  collateralMint: z.string().min(32),
  collateralAmountUi: z.string().trim().min(1),
  durationKey: z.enum(["1d", "1w", "1m", "3m"]),
  strategy: z.string().min(8),
  expectedApy: z.number().int().nonnegative(),
  expectedLqt: z.number().int().nonnegative(),
  quoteFingerprint: z.string().length(64),
  quoteExpiresAt: z.string().datetime()
});

export const loanInfoRequestSchema = z.object({
  borrower: z.string().min(32)
});

export function parseQuoteRequest(input: z.infer<typeof quoteRequestSchema>) {
  const principalAmount = parseTokenAmountInput({
    value: input.principalAmountUi,
    mint: input.principalMint,
    fieldLabel: "Borrow amount"
  });
  const collateralAmount = parseTokenAmountInput({
    value: input.collateralAmountUi,
    mint: input.collateralMint,
    fieldLabel: "Collateral amount"
  });

  return {
    ...input,
    principalAmountUi: principalAmount.amountUi,
    collateralAmountUi: collateralAmount.amountUi
  };
}

export function parseCreateLoanRequest(input: z.infer<typeof createLoanRequestSchema>) {
  const principalAmount = parseTokenAmountInput({
    value: input.principalAmountUi,
    mint: input.principalMint,
    fieldLabel: "Borrow amount"
  });
  const collateralAmount = parseTokenAmountInput({
    value: input.collateralAmountUi,
    mint: input.collateralMint,
    fieldLabel: "Collateral amount"
  });

  return {
    ...input,
    principalAmountUi: principalAmount.amountUi,
    collateralAmountUi: collateralAmount.amountUi
  };
}
