import { z } from "zod";

export const quoteRequestSchema = z.object({
  userWallet: z.string().min(32),
  principalMint: z.string().min(32),
  principalAmountUi: z.number().positive(),
  collateralMint: z.string().min(32),
  collateralAmountUi: z.number().positive(),
  durationKey: z.enum(["1d", "1w", "1m", "3m"])
});

export const createLoanRequestSchema = z.object({
  wallet: z.string().min(32),
  principalMint: z.string().min(32),
  principalAmountUi: z.number().positive(),
  collateralMint: z.string().min(32),
  collateralAmountUi: z.number().positive(),
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
