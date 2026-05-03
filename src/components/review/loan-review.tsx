"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { durationLabelFromKey, getTokenByMint } from "@/lib/borrow-catalog";
import { readResponseError } from "@/lib/http";
import { deserializeLoopscaleTransaction } from "@/lib/loopscale/transaction";
import type { CreateLoanResponse, DerivedQuotePayload } from "@/lib/loopscale/types";
import {
  formatDateFromNow,
  formatDateTime,
  formatPercentFromCbps,
  formatTokenAmount,
  truncateMiddle
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineMessage } from "@/components/ui/inline-message";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

const rpcEndpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const recentLoansStorageKey = "loopscale:recent-loan-addresses";

type ReviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DerivedQuotePayload };

function formatLoanExecutionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Signing failed before the loan was created.";

  if (message.includes("403") && message.includes("Access forbidden")) {
    return `Your Solana RPC endpoint rejected transaction submission. Set NEXT_PUBLIC_SOLANA_RPC_URL to a dedicated mainnet RPC provider and try again. Current endpoint: ${rpcEndpoint}`;
  }

  return message;
}

export function LoanReview({
  principalMint,
  principalAmountRaw,
  principalAmountUi,
  durationKey,
  collateralMint,
  collateralAmountRaw,
  collateralAmountUi,
  strategy,
  apy,
  lqt
}: {
  principalMint: string;
  principalAmountRaw: string;
  principalAmountUi: number;
  durationKey: string;
  collateralMint: string;
  collateralAmountRaw: string;
  collateralAmountUi: number;
  strategy: string;
  apy: number;
  lqt: number;
}) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const principalToken = getTokenByMint(principalMint);
  const collateralToken = getTokenByMint(collateralMint);
  const [reviewState, setReviewState] = useState<ReviewState>({ status: "loading" });
  const [submitState, setSubmitState] = useState<
    | { status: "idle" }
    | { status: "signing" }
    | { status: "success"; signature: string; loanAddress: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    void (async () => {
      try {
        const wallet = publicKey?.toBase58() ?? "";
        const response = await fetch("/api/loopscale/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWallet: wallet || undefined,
            principalMint,
            principalAmountUi: principalAmountRaw,
            collateralMint,
            collateralAmountUi: collateralAmountRaw,
            durationKey
          })
        });

        if (!response.ok) {
          throw new Error(await readResponseError(response));
        }

        const data = (await response.json()) as DerivedQuotePayload;
        setReviewState({ status: "ready", data });
      } catch (error) {
        setReviewState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Could not refresh the selected route."
        });
      }
    })();
  }, [publicKey, principalMint, principalAmountRaw, collateralMint, collateralAmountRaw, durationKey]);

  async function handleCreateLoan() {
    if (!connected || !publicKey || !signTransaction) {
      setSubmitState({
        status: "error",
        message: "Connect a wallet before building and signing the loan transaction."
      });
      return;
    }

    if (reviewState.status !== "ready" || !reviewState.data.bestQuote) {
      setSubmitState({
        status: "error",
        message: "The route is not ready. Refresh the quote before trying again."
      });
      return;
    }

    setSubmitState({ status: "signing" });

    try {
      const response = await fetch("/api/loopscale/create-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          principalMint,
          principalAmountUi: principalAmountRaw,
          collateralMint,
          collateralAmountUi: collateralAmountRaw,
          durationKey,
          strategy: reviewState.data.bestQuote.strategy,
          expectedApy: reviewState.data.bestQuote.apy,
          expectedLqt: reviewState.data.bestQuote.lqt,
          quoteFingerprint: reviewState.data.quoteFingerprint,
          quoteExpiresAt: reviewState.data.expiresAt
        })
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const result = (await response.json()) as CreateLoanResponse;
      const transaction = deserializeLoopscaleTransaction(result.transaction);

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });
      await connection.confirmTransaction(signature, "confirmed");

      const existing =
        typeof window === "undefined"
          ? []
          : JSON.parse(window.localStorage.getItem(recentLoansStorageKey) ?? "[]");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          recentLoansStorageKey,
          JSON.stringify(
            [result.loanAddress, ...existing.filter((address: string) => address !== result.loanAddress)].slice(0, 10)
          )
        );
      }

      setSubmitState({
        status: "success",
        signature,
        loanAddress: result.loanAddress
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: formatLoanExecutionError(error)
      });
    }
  }

  if (!principalToken || !collateralToken) {
    return (
      <InlineMessage
        tone="error"
        title="Unsupported asset"
        message="This preview only supports the curated SPL asset set configured in the app."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="summary-strip grid md:grid-cols-3">
        <SummaryCell
          label="Borrow amount"
          value={formatTokenAmount(principalAmountUi, principalToken.symbol, 2)}
          sub="requested principal"
        />
        <SummaryCell label="Term" value={durationLabelFromKey(durationKey)} sub="fixed duration" />
        <SummaryCell
          label="Collateral"
          value={formatTokenAmount(collateralAmountUi, collateralToken.symbol, 3)}
          sub="posted asset"
        />
      </div>

      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mono-label text-mutedForeground">Confirmation</p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-foreground">
              Review and sign
            </h2>
            <p className="text-sm text-mutedForeground">
              Final check before the app builds the loan transaction.
            </p>
          </div>
          <Link
            href="/borrow"
            className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-mutedForeground transition-colors duration-150 hover:bg-surface hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>

        <div className="rounded-2xl bg-surface px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label text-mutedForeground">Borrow amount</p>
              <p className="mt-2 font-mono text-4xl font-semibold tracking-[-0.04em] text-foreground">
                {formatTokenAmount(principalAmountUi, principalToken.symbol, 2)}
              </p>
            </div>
            <div className="text-sm text-mutedForeground">
              <p>Term: {durationLabelFromKey(durationKey)}</p>
              <p className="mt-1">
                Collateral: {formatTokenAmount(collateralAmountUi, collateralToken.symbol, 3)}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {reviewState.status === "loading" ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      ) : null}

      {reviewState.status === "error" ? (
        <InlineMessage
          tone="error"
          title="Could not refresh the selected route"
          message={reviewState.message}
        />
      ) : null}

      {reviewState.status === "ready" ? (
        <>
          <Panel className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mono-label text-mutedForeground">Execution Route</p>
                <h3 className="mt-1 text-lg font-medium text-foreground">Current route</h3>
                <p className="text-sm text-mutedForeground">
                  The quote was refreshed again before execution.
                </p>
              </div>
              <Badge
                tone={
                  reviewState.data.status === "available"
                    ? "success"
                    : reviewState.data.status === "tight"
                      ? "warning"
                      : "danger"
                }
              >
                {reviewState.data.status}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SimpleStat
                label="Fixed APY"
                value={
                  reviewState.data.bestQuote
                    ? formatPercentFromCbps(reviewState.data.bestQuote.apy)
                    : formatPercentFromCbps(apy)
                }
              />
              <SimpleStat
                label="Estimated safe limit"
                value={formatTokenAmount(reviewState.data.maxBorrowableUi, principalToken.symbol)}
              />
              <SimpleStat
                label="Market route capacity"
                value={formatTokenAmount(
                  reviewState.data.marketMaxBorrowableUi,
                  principalToken.symbol
                )}
              />
              <SimpleStat
                label="Max initial LTV"
                value={
                  reviewState.data.maxLtvPercent != null
                    ? `${reviewState.data.maxLtvPercent.toFixed(2)}%`
                    : "N/A"
                }
              />
              <SimpleStat
                label="Liquidation threshold"
                value={
                  reviewState.data.bestQuote
                    ? `${(reviewState.data.bestQuote.lqt / 10_000).toFixed(2)}%`
                    : `${(lqt / 10_000).toFixed(2)}%`
                }
              />
            </div>

            <div className="rounded-xl border border-line bg-surface px-4 py-4 text-sm leading-6 text-mutedForeground">
              {reviewState.data.guidance}
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[160px_1fr] border-b border-line bg-surface px-4 py-2">
                <span className="mono-label text-mutedForeground">Field</span>
                <span className="mono-label text-mutedForeground">Value</span>
              </div>
              <KeyRow
                label="Request size usage"
                value={`${(reviewState.data.requestedSizeCoverage * 100).toFixed(0)}% of best route`}
              />
              <KeyRow
                label="Collateral value"
                value={
                  reviewState.data.collateralUsdValue != null
                    ? `$${reviewState.data.collateralUsdValue.toFixed(2)}`
                    : "Unavailable"
                }
              />
              <KeyRow label="Visible liquidity" value={formatTokenAmount(reviewState.data.availableLiquidityUi, principalToken.symbol)} />
              <KeyRow
                label="Selected strategy"
                value={truncateMiddle(reviewState.data.bestQuote?.strategy ?? strategy, 8, 8)}
              />
              <KeyRow label="Quote expires" value={formatDateTime(new Date(reviewState.data.expiresAt))} />
              <KeyRow
                label="Expected maturity"
                value={formatDateFromNow(
                  new Date(
                    Date.now() +
                      (durationKey === "1d"
                        ? 1
                        : durationKey === "1w"
                          ? 7
                          : durationKey === "1m"
                            ? 30
                            : 90) *
                        24 *
                        60 *
                        60 *
                        1000
                  )
                )}
              />
              <KeyRow
                label="Wallet"
                value={publicKey ? truncateMiddle(publicKey.toBase58()) : "Connect wallet to continue"}
              />
            </div>
          </Panel>

          {reviewState.data.warnings.length > 0 ? (
            <div className="space-y-3">
              {reviewState.data.warnings.map((warning) => (
                <InlineMessage
                  key={warning}
                  tone="warning"
                  title="Read this before signing"
                  message={warning}
                />
              ))}
            </div>
          ) : null}

          {submitState.status === "error" ? (
            <InlineMessage
              tone="error"
              title="Loan execution did not complete"
              message={submitState.message}
            />
          ) : null}

          {submitState.status === "success" ? (
            <InlineMessage
              tone="success"
              title="Loan created successfully"
              message={`Loan ${truncateMiddle(
                submitState.loanAddress,
                8,
                8
              )} is live. Transaction ${truncateMiddle(submitState.signature, 8, 8)} confirmed.`}
            />
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/borrow" className="sm:flex-1">
              <Button variant="secondary" className="w-full">
                Adjust inputs
              </Button>
            </Link>
            <Button
              className="sm:flex-1"
              onClick={handleCreateLoan}
              loading={submitState.status === "signing"}
              disabled={reviewState.status !== "ready" || reviewState.data.status === "unavailable"}
            >
              {reviewState.status === "ready" && reviewState.data.status === "unavailable"
                ? "Borrow blocked"
                : connected
                  ? "Build and sign loan"
                  : "Connect wallet to continue"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SimpleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4">
      <p className="mono-label text-mutedForeground">{label}</p>
      <p className="mt-2 font-mono text-xl text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-t border-line bg-card px-4 py-3">
      <span className="mono-label text-mutedForeground">{label}</span>
      <span className="font-mono text-sm text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="summary-cell px-5 py-5">
      <p className="mono-label text-mutedForeground">{label}</p>
      <p className="mt-2 font-mono text-2xl text-foreground">{value}</p>
      <p className="mt-1 font-mono text-[11px] text-mutedForeground">{sub}</p>
    </div>
  );
}
