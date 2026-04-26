import { AppShell } from "@/components/layout/app-shell";
import { BorrowForm } from "@/components/borrow/borrow-form";

export default function BorrowPage() {
  return (
    <AppShell
      currentPath="/borrow"
      title="Find the best fixed-rate borrow."
      subtitle="Enter amount, term, and collateral. The app turns Loopscale market data into one clear recommendation."
    >
      <BorrowForm />
    </AppShell>
  );
}
