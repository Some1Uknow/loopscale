export type AssetDataInfo = {
  Spl: {
    mint: string;
  };
};

export type LoopscaleQuoteRequest = {
  userWallet: string;
  principalMint: string;
  principalAmountUi: number;
  collateralMint: string;
  collateralAmountUi: number;
  durationKey: string;
};

export type LoopscaleQuotesRequest = {
  durationType: number;
  duration: number;
  principal: string;
  limit: number;
  offset: number;
  collateral: string[];
  minPrincipalAmount?: number;
};

export type LoopscaleQuoteItem = {
  apy: number;
  ltv: number;
  liquidationThreshold: number;
  maxPrincipalAvailable: number;
  sumPrincipalAvailable: number;
};

export type LoopscaleCollateralFilter = {
  amount: number;
  assetData: AssetDataInfo;
};

export type LoopscaleMaxQuoteRequest = {
  durationType: number;
  duration: number;
  principalMint: string;
  collateralFilter: LoopscaleCollateralFilter[];
};

export type LoopscaleMaxQuote = {
  apy: number;
  strategy: string;
  collateralIdentifier: string;
  ltv: number;
  lqt: number;
  amount: number;
};

export type DerivedQuotePayload = {
  principalMint: string;
  collateralMint: string;
  durationKey: string;
  principalAmountUi: number;
  collateralAmountUi: number;
  requestedPrincipalBaseUnits: number;
  requestedCollateralBaseUnits: number;
  bestQuote: LoopscaleMaxQuote | null;
  marketQuotes: LoopscaleQuoteItem[];
  maxBorrowableUi: number;
  marketMaxBorrowableUi: number;
  collateralMaxBorrowableUi: number | null;
  availableLiquidityUi: number;
  requestedSizeCoverage: number;
  maxLtvPercent: number | null;
  liquidationThresholdPercent: number | null;
  principalUsdPrice: number | null;
  collateralUsdPrice: number | null;
  collateralUsdValue: number | null;
  limitingFactor: "collateral" | "market" | "unknown";
  quoteFingerprint: string;
  quotedAt: string;
  expiresAt: string;
  strategyCount: number;
  status: "available" | "tight" | "unavailable";
  guidance: string;
  warnings: string[];
};

export type CreateLoanTransactionRequest = {
  wallet: string;
  principalMint: string;
  principalAmountUi: number;
  collateralMint: string;
  collateralAmountUi: number;
  durationKey: string;
  strategy: string;
  expectedApy: number;
  expectedLqt: number;
  quoteFingerprint: string;
  quoteExpiresAt: string;
};

export type VersionedTransactionSignature = {
  publicKey: string;
  signature: string;
};

export type VersionedTransactionResponse = {
  message: string;
  signatures: VersionedTransactionSignature[];
};

export type CreateLoanResponse = {
  transaction: VersionedTransactionResponse;
  loanAddress: string;
};

export type LoopscaleLoanInfoRequest = {
  borrowers: string[];
  filterType?: number;
  page?: number;
  pageSize?: number;
  sortDirection?: number;
  sortType?: number;
};

export type LoanInfoEnvelope = {
  totalCount: number;
  loanInfos: LoanInfo[];
};

export type LoanInfo = {
  loan?: {
    address?: string;
    borrower?: string;
    loanStatus?: number;
    startTime?: number;
    closed?: boolean;
  };
  loanType?: number;
  ledgers?: LoanLedger[];
  pastLedgers?: LoanLedger[];
  amount?: {
    principalAmount?: number;
    outstandingInterestAmount?: number;
    principalMint?: string;
  };
  health?: number | null;
  dueTime?: number | null;
  collateral?: Array<{
    amount?: number;
    assetMint?: string;
  }>;
  collateralData?: Array<{
    amount?: number;
    assetData?: AssetDataInfo;
  }>;
};

export type LoanLedger = {
  lender?: string;
  duration?: number;
  durationType?: number;
  apy?: number;
  principalAmount?: number;
  principalOutstandingAmount?: number;
  interestOwedAmount?: number;
  principalMint?: string;
  endTime?: number;
};

export type DerivedLoanCard = {
  address: string;
  borrower: string;
  principalSymbol: string;
  principalAmountUi: number;
  outstandingInterestUi: number;
  avgApyPercent: number | null;
  maturityDate: string | null;
  statusLabel: string;
  collateralSummary: string;
  ledgerCount: number;
};
