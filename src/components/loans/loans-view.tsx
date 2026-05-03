"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FolderOpenDot, RefreshCw } from "lucide-react";

import { deserializeLoopscaleTransaction } from "@/lib/loopscale/transaction";
import type {
  DerivedLoanCard,
  LoanLockTransactionResponse
} from "@/lib/loopscale/types";
import { readResponseError } from "@/lib/http";
import { formatTokenAmount, truncateMiddle } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineMessage } from "@/components/ui/inline-message";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

const recentLoansStorageKey = "loopscale:recent-loan-addresses";
const rpcEndpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

type LoanAction = "repay" | "withdrawCollateral" | "close";

function readRecentLoanAddresses() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentLoansStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((address): address is string => typeof address === "string" && address.length >= 32);
  } catch {
    return [];
  }
}

function formatLoanActionName(action: LoanAction) {
  if (action === "repay") return "Repay";
  if (action === "withdrawCollateral") return "Withdraw collateral";
  return "Close loan";
}

function formatLoanActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Loan action failed before signing.";

  if (message.includes("403") && message.includes("Access forbidden")) {
    return `Your Solana RPC endpoint rejected transaction submission. Set NEXT_PUBLIC_SOLANA_RPC_URL to a dedicated mainnet RPC provider and try again. Current endpoint: ${rpcEndpoint}`;
  }

  return message;
}

export function LoansView() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const searchParams = useSearchParams();
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
      const manualLoanAddress = searchParams.get("loanAddress");
      const recentLoanAddresses = [
        ...(manualLoanAddress && manualLoanAddress.length >= 32 ? [manualLoanAddress] : []),
        ...readRecentLoanAddresses()
      ]
        .filter((address, index, array) => array.indexOf(address) === index)
        .slice(0, 10);

      if (manualLoanAddress && manualLoanAddress.length >= 32 && typeof window !== "undefined") {
        window.localStorage.setItem(recentLoansStorageKey, JSON.stringify(recentLoanAddresses));
      }

      const response = await fetch("/api/loopscale/my-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: publicKey.toBase58(),
          loanAddresses: recentLoanAddresses
        })
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

  const [actionState, setActionState] = useState<
    | { status: "idle" }
    | { status: "running"; loanAddress: string; action: LoanAction }
    | { status: "success"; action: LoanAction; signature: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function runLoanAction(loan: DerivedLoanCard, action: LoanAction) {
    if (!connected || !publicKey || !signTransaction) {
      setActionState({
        status: "error",
        message: "Connect a wallet that can sign transactions before managing this loan."
      });
      return;
    }

    setActionState({ status: "running", loanAddress: loan.address, action });

    try {
      const response = await fetch("/api/loopscale/loan-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          loanAddress: loan.address,
          action
        })
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const result = (await response.json()) as LoanLockTransactionResponse;
      const transactions = result.transactions ?? [];
      if (transactions.length === 0) {
        throw new Error("Loopscale did not return any transactions for this loan action.");
      }

      let lastSignature = "";
      for (const transactionResponse of transactions) {
        const transaction = deserializeLoopscaleTransaction(transactionResponse);
        const signed = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 3
        });
        await connection.confirmTransaction(signature, "confirmed");
        lastSignature = signature;
      }

      setActionState({ status: "success", action, signature: lastSignature });
      await refresh();
    } catch (error) {
      setActionState({
        status: "error",
        message: formatLoanActionError(error)
      });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey?.toBase58(), searchParams.toString()]);

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
          <p className="mt-1 text-xs text-mutedForeground">
            Management flow is intentionally sequential: repay, withdraw collateral, then close.
          </p>
          {searchParams.get("loanAddress") ? (
            <p className="mt-1 text-xs text-mutedForeground">
              Exact loan lookup active for {truncateMiddle(searchParams.get("loanAddress") ?? "", 8, 8)}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {actionState.status === "success" ? (
        <InlineMessage
          tone="success"
          title={`${formatLoanActionName(actionState.action)} confirmed`}
          message={`Last transaction: ${truncateMiddle(actionState.signature, 8, 8)}`}
        />
      ) : null}

      {actionState.status === "error" ? (
        <InlineMessage
          tone="error"
          title="Loan action did not complete"
          message={actionState.message}
        />
      ) : null}

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
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Loan management</p>
                  <p className="mt-1 text-sm text-mutedForeground">
                    The app builds the latest Loopscale transaction before every action.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LoanActionButton
                    action="repay"
                    loan={loan}
                    actionState={actionState}
                    disabled={!loan.canRepay}
                    onClick={() => void runLoanAction(loan, "repay")}
                  />
                  <LoanActionButton
                    action="withdrawCollateral"
                    loan={loan}
                    actionState={actionState}
                    disabled={!loan.canWithdrawCollateral}
                    onClick={() => void runLoanAction(loan, "withdrawCollateral")}
                  />
                  <LoanActionButton
                    action="close"
                    loan={loan}
                    actionState={actionState}
                    disabled={!loan.canClose}
                    onClick={() => void runLoanAction(loan, "close")}
                  />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoanActionButton({
  action,
  loan,
  actionState,
  disabled,
  onClick
}: {
  action: LoanAction;
  loan: DerivedLoanCard;
  actionState:
    | { status: "idle" }
    | { status: "running"; loanAddress: string; action: LoanAction }
    | { status: "success"; action: LoanAction; signature: string }
    | { status: "error"; message: string };
  disabled: boolean;
  onClick: () => void;
}) {
  const loading =
    actionState.status === "running" &&
    actionState.loanAddress === loan.address &&
    actionState.action === action;

  return (
    <Button
      variant={action === "repay" ? "primary" : "secondary"}
      loading={loading}
      disabled={disabled || (actionState.status === "running" && !loading)}
      onClick={onClick}
    >
      {formatLoanActionName(action)}
    </Button>
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
