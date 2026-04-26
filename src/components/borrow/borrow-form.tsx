"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

import {
  borrowDurations,
  collateralOptions,
  defaultCollateralMint,
  defaultPrincipalMint,
  demoWallet,
  getTokenByMint,
  principalOptions
} from "@/lib/borrow-catalog";
import type { DerivedQuotePayload, LoopscaleQuoteItem } from "@/lib/loopscale/types";
import { readResponseError } from "@/lib/http";
import {
  baseUnitsToUi,
  formatPercentFromCbps,
  formatTokenAmount,
  truncateMiddle
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { InlineMessage } from "@/components/ui/inline-message";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DerivedQuotePayload }
  | { status: "error"; message: string };

export function BorrowForm() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    principalMint: defaultPrincipalMint,
    principalAmountUi: "5000",
    durationKey: "1m",
    collateralMint: defaultCollateralMint,
    collateralAmountUi: "50"
  });

  const currentWallet = publicKey?.toBase58() ?? demoWallet;
  const principalToken = getTokenByMint(form.principalMint);
  const principalSymbol = principalToken?.symbol ?? "";

  const summaryTone = useMemo(() => {
    if (quoteState.status !== "success") return "neutral";
    if (quoteState.data.status === "available") return "success";
    if (quoteState.data.status === "tight") return "warning";
    return "danger";
  }, [quoteState]);

  async function refreshQuote() {
    const principalAmount = Number(form.principalAmountUi);
    const collateralAmount = Number(form.collateralAmountUi);

    if (!(principalAmount > 0) || !(collateralAmount > 0)) {
      setQuoteState({
        status: "error",
        message: "Enter a positive borrow amount and collateral amount first."
      });
      return;
    }

    setQuoteState({ status: "loading" });
    try {
      const response = await fetch("/api/loopscale/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: currentWallet,
          principalMint: form.principalMint,
          principalAmountUi: principalAmount,
          collateralMint: form.collateralMint,
          collateralAmountUi: collateralAmount,
          durationKey: form.durationKey
        })
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const data = (await response.json()) as DerivedQuotePayload;
      setQuoteState({ status: "success", data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not fetch quotes right now.";
      setQuoteState({ status: "error", message });
    }
  }

  function handleContinue() {
    if (quoteState.status !== "success" || !quoteState.data.bestQuote) return;

    const params = new URLSearchParams({
      principalMint: form.principalMint,
      principalAmountUi: form.principalAmountUi,
      durationKey: form.durationKey,
      collateralMint: form.collateralMint,
      collateralAmountUi: form.collateralAmountUi,
      strategy: quoteState.data.bestQuote.strategy,
      apy: String(quoteState.data.bestQuote.apy),
      lqt: String(quoteState.data.bestQuote.lqt)
    });

    startTransition(() => {
      router.push(`/review?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="summary-strip grid md:grid-cols-3">
        <SummaryCell
          label="Borrow amount"
          value={formatTokenAmount(Number(form.principalAmountUi || 0), principalSymbol, 2)}
          sub="requested principal"
        />
        <SummaryCell
          label="Term"
          value={borrowDurations.find((item) => item.key === form.durationKey)?.label ?? form.durationKey}
          sub="fixed duration"
        />
        <SummaryCell
          label="Collateral"
          value={`${form.collateralAmountUi || "0"} ${getTokenByMint(form.collateralMint)?.symbol ?? ""}`}
          sub="posted asset"
        />
      </div>

      <Panel className="space-y-6">
        <div className="space-y-1">
          <p className="mono-label text-mutedForeground">Borrow Setup</p>
          <h2 className="text-xl font-medium tracking-[-0.03em] text-foreground">
            Borrow request
          </h2>
          <p className="text-sm text-mutedForeground">
            Enter the amount, term, and collateral. The app will return the best visible fixed-rate
            route first.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void refreshQuote();
          }}
        >
          <Field label="Borrow amount" required>
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={form.principalAmountUi}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    principalAmountUi: event.target.value
                  }))
                }
                placeholder="5000"
              />
              <Select
                value={form.principalMint}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    principalMint: event.target.value
                  }))
                }
              >
                {principalOptions().map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.label}
                  </option>
                ))}
              </Select>
            </div>
          </Field>

          <Field label="Term" required>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {borrowDurations.map((duration) => (
                <button
                  key={duration.key}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      durationKey: duration.key
                    }))
                  }
                  className={
                    form.durationKey === duration.key
                      ? "rounded-lg border border-primary bg-primary px-4 py-3 text-left text-sm text-primaryForeground"
                      : "rounded-lg border border-line bg-card px-4 py-3 text-left text-sm text-foreground hover:bg-surface"
                  }
                >
                  <span className="block font-medium">{duration.label}</span>
                  <span
                    className={
                      form.durationKey === duration.key
                        ? "mt-1 block text-xs text-primaryForeground/75"
                        : "mt-1 block text-xs text-mutedForeground"
                    }
                  >
                    {duration.helper}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Collateral" required>
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={form.collateralAmountUi}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    collateralAmountUi: event.target.value
                  }))
                }
                placeholder="50"
              />
              <Select
                value={form.collateralMint}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    collateralMint: event.target.value
                  }))
                }
              >
                {collateralOptions().map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.label}
                  </option>
                ))}
              </Select>
            </div>
          </Field>

          <div className="flex flex-col gap-4 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-mutedForeground">
              {connected ? (
                <>
                  Using wallet{" "}
                  <span className="font-mono text-foreground">{truncateMiddle(currentWallet)}</span>
                </>
              ) : (
                "Using a demo wallet for quote discovery until you connect your own."
              )}
            </p>
            <Button type="submit" loading={quoteState.status === "loading"}>
              Find best route
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mono-label text-mutedForeground">Route Output</p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-foreground">Best route</h2>
            <p className="text-sm text-mutedForeground">
              One answer first, then the supporting market depth.
            </p>
          </div>
          <Badge
            tone={
              summaryTone === "success"
                ? "success"
                : summaryTone === "warning"
                  ? "warning"
                  : summaryTone === "danger"
                    ? "danger"
                    : "neutral"
            }
          >
            {quoteState.status === "success"
              ? quoteState.data.status === "available"
                ? "Good fit"
                : quoteState.data.status === "tight"
                  ? "Near limit"
                  : "Unavailable"
              : "Waiting"}
          </Badge>
        </div>

        {quoteState.status === "idle" ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-sm leading-6 text-mutedForeground">
            Fill the request above and fetch a quote. You will see the cheapest visible rate,
            borrow capacity, and how close you are to the edge of available liquidity.
          </div>
        ) : null}

        {quoteState.status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
        ) : null}

        {quoteState.status === "error" ? (
          <InlineMessage
            tone="error"
            title="Could not price this request"
            message={quoteState.message}
          />
        ) : null}

        {quoteState.status === "success" ? (
          <>
            <div className="rounded-2xl bg-primary px-5 py-5 text-primaryForeground">
              <p className="mono-label text-primaryForeground/60">Best visible fixed APY</p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-4xl font-semibold tracking-[-0.04em]">
                    {quoteState.data.bestQuote
                      ? formatPercentFromCbps(quoteState.data.bestQuote.apy)
                      : "N/A"}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-primaryForeground/78">
                    {quoteState.data.guidance}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 px-4 py-3 text-sm text-primaryForeground/82">
                  Request: {formatTokenAmount(Number(form.principalAmountUi), principalSymbol, 2)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SimpleStat
                label="Estimated safe limit"
                value={formatTokenAmount(quoteState.data.maxBorrowableUi, principalSymbol)}
              />
              <SimpleStat
                label="Market route capacity"
                value={formatTokenAmount(
                  quoteState.data.marketMaxBorrowableUi,
                  principalSymbol
                )}
              />
              <SimpleStat
                label="Visible liquidity"
                value={formatTokenAmount(quoteState.data.availableLiquidityUi, principalSymbol)}
              />
              <SimpleStat
                label="Max initial LTV"
                value={
                  quoteState.data.maxLtvPercent != null
                    ? `${quoteState.data.maxLtvPercent.toFixed(2)}%`
                    : "N/A"
                }
              />
            </div>

            <div className="rounded-2xl border border-line bg-surface px-4 py-4 text-sm text-mutedForeground">
              {quoteState.data.collateralUsdValue != null &&
              quoteState.data.collateralMaxBorrowableUi != null
                ? `Your collateral is worth about $${quoteState.data.collateralUsdValue.toFixed(2)}. At the current max LTV, that supports about ${formatTokenAmount(
                    quoteState.data.collateralMaxBorrowableUi,
                    principalSymbol,
                    2
                  )}.`
                : "Collateral-backed borrow capacity could not be verified for this request."}
            </div>

            {quoteState.data.warnings.length > 0 ? (
              <div className="space-y-3">
                {quoteState.data.warnings.map((warning) => (
                  <InlineMessage
                    key={warning}
                    tone="warning"
                    title="Read this before you continue"
                    message={warning}
                  />
                ))}
              </div>
            ) : null}

            {quoteState.data.marketQuotes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="mono-label text-mutedForeground">Visible market depth</h3>
                  <span className="font-mono text-xs text-mutedForeground">
                    {quoteState.data.strategyCount} route
                    {quoteState.data.strategyCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-line">
                  <div className="grid grid-cols-[120px_1fr_1fr] border-b border-line bg-surface px-4 py-2">
                    <span className="mono-label text-mutedForeground">Route</span>
                    <span className="mono-label text-mutedForeground">Rate</span>
                    <span className="mono-label text-mutedForeground">Max fill</span>
                  </div>
                  {quoteState.data.marketQuotes.slice(0, 4).map((quote, index) => (
                    <DepthRow
                      key={`${quote.apy}-${quote.maxPrincipalAvailable}-${index}`}
                      quote={quote}
                      index={index}
                      principalMint={form.principalMint}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              onClick={handleContinue}
              disabled={!quoteState.data.bestQuote || quoteState.data.status === "unavailable"}
              loading={isPending}
            >
              Continue to review
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        ) : null}
      </Panel>
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

function DepthRow({
  quote,
  index,
  principalMint
}: {
  quote: LoopscaleQuoteItem;
  index: number;
  principalMint: string;
}) {
  const token = getTokenByMint(principalMint);
  const tokenSymbol = token?.symbol ?? "";
  const maxFillUi = token
    ? baseUnitsToUi(quote.maxPrincipalAvailable, token.decimals)
    : quote.maxPrincipalAvailable;

  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-2 border-t border-line bg-card px-4 py-3 text-sm">
      <span className="font-medium text-foreground">
        {index === 0 ? "Recommended" : `Route ${index + 1}`}
      </span>
      <span className="text-mutedForeground">
        Rate{" "}
        <span className="font-mono text-foreground">{formatPercentFromCbps(quote.apy)}</span>
      </span>
      <span className="text-mutedForeground">
        Max fill{" "}
        <span className="font-mono text-foreground">
          {formatTokenAmount(maxFillUi, tokenSymbol)}
        </span>
      </span>
    </div>
  );
}
