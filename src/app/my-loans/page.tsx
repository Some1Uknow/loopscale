import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LoansView } from "@/components/loans/loans-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyLoansPage() {
  return (
    <AppShell
      currentPath="/my-loans"
      title="Your active loans."
      subtitle="A clean borrower view of principal, rate, maturity, and collateral."
    >
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-[28px]" />}>
        <LoansView />
      </Suspense>
    </AppShell>
  );
}
