import { AppShell } from "@/components/layout/app-shell";
import { LearnContent } from "@/components/learn/learn-content";

export default function LearnPage() {
  return (
    <AppShell
      currentPath="/learn"
      title="How this works."
      subtitle="Three short concepts that matter before you borrow."
    >
      <LearnContent />
    </AppShell>
  );
}
