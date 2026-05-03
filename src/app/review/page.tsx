import { AppShell } from "@/components/layout/app-shell";
import { LoanReview } from "@/components/review/loan-review";
import { InputValidationError, parseTokenAmountInput } from "@/lib/token-amounts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReviewPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const principalMint = getFirstParam(params.principalMint);
  const principalAmountRaw = getFirstParam(params.principalAmountUi);
  const durationKey = getFirstParam(params.durationKey);
  const collateralMint = getFirstParam(params.collateralMint);
  const collateralAmountRaw = getFirstParam(params.collateralAmountUi);
  const strategy = getFirstParam(params.strategy);
  const apy = Number(getFirstParam(params.apy));
  const lqt = Number(getFirstParam(params.lqt));
  let principalAmountUi = 0;
  let collateralAmountUi = 0;
  let validationMessage = "";

  if (principalMint && collateralMint && principalAmountRaw && collateralAmountRaw) {
    try {
      principalAmountUi = parseTokenAmountInput({
        value: principalAmountRaw,
        mint: principalMint,
        fieldLabel: "Borrow amount"
      }).amountUi;
      collateralAmountUi = parseTokenAmountInput({
        value: collateralAmountRaw,
        mint: collateralMint,
        fieldLabel: "Collateral amount"
      }).amountUi;
    } catch (error) {
      validationMessage =
        error instanceof InputValidationError
          ? error.message
          : "The selected borrow route was missing required inputs. Go back and start again.";
    }
  }

  if (
    validationMessage ||
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
        subtitle={
          validationMessage ||
          "The selected borrow route was missing required inputs. Go back and start again."
        }
      >
        <div className="rounded-[28px] bg-card p-6 ring-1 ring-line">
          <p className="text-sm text-mutedForeground">
            {validationMessage ||
              "This preview requires a principal, collateral, amount, term, and selected strategy."}
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
        principalAmountRaw={principalAmountRaw}
        principalAmountUi={principalAmountUi}
        durationKey={durationKey}
        collateralMint={collateralMint}
        collateralAmountRaw={collateralAmountRaw}
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
