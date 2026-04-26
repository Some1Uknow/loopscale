import { AlertCircle, CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const iconMap = {
  info: AlertCircle,
  success: CheckCircle2,
  warning: CircleAlert,
  error: CircleAlert
};

export function InlineMessage({
  tone,
  title,
  message
}: {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
}) {
  const Icon = iconMap[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "info" && "border-line bg-card/80",
        tone === "success" && "border-success/20 bg-success/10",
        tone === "warning" && "border-warning/20 bg-warning/10",
        tone === "error" && "border-danger/20 bg-danger/10"
      )}
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            tone === "info" && "text-primary",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "error" && "text-danger"
          )}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm leading-6 text-mutedForeground">{message}</p>
        </div>
      </div>
    </div>
  );
}

