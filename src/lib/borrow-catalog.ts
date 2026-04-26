export type SupportedToken = {
  symbol: string;
  mint: string;
  decimals: number;
  label: string;
  kind: "principal" | "collateral" | "both";
  description: string;
};

export type BorrowDuration = {
  key: "1d" | "1w" | "1m" | "3m";
  label: string;
  durationType: 0 | 1 | 2;
  duration: number;
  durationIndex: 0 | 1 | 2 | 3;
  helper: string;
};

export const supportedTokens: SupportedToken[] = [
  {
    symbol: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    label: "USDC",
    kind: "both",
    description: "Stablecoin principal and collateral."
  },
  {
    symbol: "SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    label: "SOL",
    kind: "both",
    description: "Native Solana used frequently for borrowing and collateral."
  },
  {
    symbol: "JitoSOL",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
    label: "JitoSOL",
    kind: "collateral",
    description: "Liquid staking token collateral."
  },
  {
    symbol: "mSOL",
    mint: "mSoLzYCxHdYgdzU2nY7SoM1nGgP4Q95f8mJmDgz1oA8",
    decimals: 9,
    label: "mSOL",
    kind: "collateral",
    description: "Marinade liquid staking token collateral."
  },
  {
    symbol: "bSOL",
    mint: "bSo13r4TkiE4JQp4Xu3rF7QZzM6K8vDhT7mG59bEeW7",
    decimals: 9,
    label: "bSOL",
    kind: "collateral",
    description: "Blaze liquid staking token collateral."
  }
];

export const borrowDurations: BorrowDuration[] = [
  {
    key: "1d",
    label: "1 day",
    durationType: 0,
    duration: 1,
    durationIndex: 0,
    helper: "Best for very short working capital."
  },
  {
    key: "1w",
    label: "1 week",
    durationType: 1,
    duration: 1,
    durationIndex: 1,
    helper: "Useful for tactical liquidity needs."
  },
  {
    key: "1m",
    label: "1 month",
    durationType: 2,
    duration: 1,
    durationIndex: 2,
    helper: "Balanced term for predictable financing."
  },
  {
    key: "3m",
    label: "3 months",
    durationType: 2,
    duration: 3,
    durationIndex: 3,
    helper: "Longer runway when you want rate certainty."
  }
];

export const defaultPrincipalMint = supportedTokens.find((token) => token.symbol === "USDC")!.mint;
export const defaultCollateralMint = supportedTokens.find((token) => token.symbol === "SOL")!.mint;
export const demoWallet =
  process.env.NEXT_PUBLIC_DEMO_WALLET ?? "7xKX7GJ7Vnq2qnR29m5zR1q6xg9Pn9ixYj5bUsLq6N9F";

export function getTokenByMint(mint: string) {
  return supportedTokens.find((token) => token.mint === mint);
}

export function getDurationByKey(key: string) {
  return borrowDurations.find((duration) => duration.key === key);
}

export function durationLabelFromKey(key: string) {
  return getDurationByKey(key)?.label ?? key;
}

export function principalOptions() {
  return supportedTokens.filter((token) => token.kind === "principal" || token.kind === "both");
}

export function collateralOptions() {
  return supportedTokens.filter((token) => token.kind === "collateral" || token.kind === "both");
}
