import { AppShell } from "@/components/layout/app-shell";
import { LoanReview } from "@/components/review/loan-review";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReviewPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const principalMint = getFirstParam(params.principalMint);
  const principalAmountUi = Number(getFirstParam(params.principalAmountUi));
  const durationKey = getFirstParam(params.durationKey);
  const collateralMint = getFirstParam(params.collateralMint);
  const collateralAmountUi = Number(getFirstParam(params.collateralAmountUi));
  const strategy = getFirstParam(params.strategy);
  const apy = Number(getFirstParam(params.apy));
  const lqt = Number(getFirstParam(params.lqt));

  if (
    !principalMint ||
    !durationKey ||
    !collateralMint ||
    !strategy ||
    !(principalAmountUi > 0) ||
    !(collateralAmountUi > 0)
  ) {
    return (
      <AppShell
        currentPath="/borrow"
        title="Review route"
        subtitle="The selected borrow route was missing required inputs. Go back and start again."
      >
        <div className="rounded-[28px] bg-card p-6 ring-1 ring-line">
          <p className="text-sm text-mutedForeground">
            This preview requires a principal, collateral, amount, term, and selected strategy.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      currentPath="/borrow"
      title="Review the route before you sign."
      subtitle="This is the final confirmation step before the app builds the loan transaction."
    >
      <LoanReview
        principalMint={principalMint}
        principalAmountUi={principalAmountUi}
        durationKey={durationKey}
        collateralMint={collateralMint}
        collateralAmountUi={collateralAmountUi}
        strategy={strategy}
        apy={apy}
        lqt={lqt}
      />
    </AppShell>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
