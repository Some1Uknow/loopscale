import { AppShell } from "@/components/layout/app-shell";
import { LoansView } from "@/components/loans/loans-view";

export default function MyLoansPage() {
  return (
    <AppShell
      currentPath="/my-loans"
      title="Your active loans."
      subtitle="A clean borrower view of principal, rate, maturity, and collateral."
    >
      <LoansView />
    </AppShell>
  );
}
