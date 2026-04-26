import { BookLock, ChartNoAxesColumnIncreasing, ShieldCheck } from "lucide-react";

import { Panel } from "@/components/ui/panel";

const learnCards = [
  {
    icon: BookLock,
    title: "Fixed-rate vs floating-rate",
    body: "Loopscale lets you borrow against a known term and a known rate. That means your borrowing cost is set at entry instead of drifting while the market moves."
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "What determines your borrow limit",
    body: "The quote engine looks at the collateral you provide, how lenders are currently pricing that collateral, and how much principal is actually available at the term you selected."
  },
  {
    icon: ShieldCheck,
    title: "Why rate quality changes with size",
    body: "The best rate often covers only the cheapest visible slice of liquidity. If you request more than that top route can fill, the app warns you that later liquidity may cost more."
  }
];

export function LearnContent() {
  return (
    <div className="space-y-4">
      {learnCards.map((card) => (
        <Panel key={card.title} className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
            <card.icon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm leading-7 text-mutedForeground">{card.body}</p>
          </div>
        </Panel>
      ))}
    </div>
  );
}
