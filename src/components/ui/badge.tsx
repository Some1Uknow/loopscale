import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "mono-label inline-flex items-center rounded-md border px-2 py-1 text-[10px]",
        tone === "neutral" && "border-line bg-surface text-mutedForeground",
        tone === "success" && "border-success/20 bg-success/10 text-success",
        tone === "warning" && "border-warning/20 bg-warning/10 text-warning",
        tone === "danger" && "border-danger/20 bg-danger/10 text-danger"
      )}
    >
      {children}
    </span>
  );
}
