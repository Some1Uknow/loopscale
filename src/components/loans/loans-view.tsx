"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { FolderOpenDot, RefreshCw } from "lucide-react";

import type { DerivedLoanCard } from "@/lib/loopscale/types";
import { readResponseError } from "@/lib/http";
import { formatTokenAmount, truncateMiddle } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineMessage } from "@/components/ui/inline-message";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

export function LoansView() {
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "empty" }
    | { status: "error"; message: string }
    | { status: "success"; loans: DerivedLoanCard[] }
  >({ status: "idle" });

  async function refresh() {
    if (!publicKey) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/loopscale/my-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrower: publicKey.toBase58() })
      });
      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }
      const loans = (await response.json()) as DerivedLoanCard[];
      if (loans.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "success", loans });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load your loans."
      });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey?.toBase58()]);

  if (!connected || !publicKey) {
    return (
      <Panel>
        <InlineMessage
          tone="info"
          title="Connect your wallet to see active loans"
          message="The app will fetch your Loopscale loans and reduce them to a clean borrower view."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Borrower: <span className="font-mono">{truncateMiddle(publicKey.toBase58(), 6, 6)}</span>
          </p>
          <p className="mt-1 text-sm text-mutedForeground">
            Active loans are shown as simple cards with rate, maturity, and collateral context.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <Skeleton className="h-40 w-full rounded-[28px]" />
        </div>
      ) : null}

      {state.status === "error" ? (
        <InlineMessage
          tone="error"
          title="Could not load your loans"
          message={state.message}
        />
      ) : null}

      {state.status === "empty" ? (
        <Panel className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <FolderOpenDot className="h-10 w-10 text-mutedForeground" aria-hidden />
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">No active Loopscale loans yet</p>
              <p className="max-w-md text-sm leading-6 text-mutedForeground">
                Once you create a fixed-rate borrow, it will appear here with maturity, rate, and
                collateral context.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {state.status === "success" ? (
        <div className="space-y-4">
          {state.loans.map((loan) => (
            <Panel key={loan.address} className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-lg font-medium text-foreground tabular-nums">
                    {formatTokenAmount(loan.principalAmountUi, loan.principalSymbol)}
                  </p>
                  <p className="mt-1 text-sm text-mutedForeground">
                    {loan.collateralSummary}
                  </p>
                </div>
                <Badge tone={loan.statusLabel === "Active" ? "success" : "neutral"}>
                  {loan.statusLabel}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <LoanStat
                  label="Fixed APY"
                  value={loan.avgApyPercent != null ? `${loan.avgApyPercent.toFixed(2)}%` : "N/A"}
                />
                <LoanStat
                  label="Outstanding interest"
                  value={formatTokenAmount(loan.outstandingInterestUi, loan.principalSymbol, 3)}
                />
                <LoanStat label="Maturity" value={loan.maturityDate ?? "Unknown"} />
                <LoanStat label="Ledger count" value={String(loan.ledgerCount)} />
              </div>
              <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-sm text-mutedForeground">Loan address</p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {truncateMiddle(loan.address, 8, 8)}
                </p>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-4">
      <p className="text-xs uppercase tracking-[0.14em] text-mutedForeground">{label}</p>
      <p className="mt-2 font-mono text-lg text-foreground tabular-nums">{value}</p>
    </div>
  );
}
