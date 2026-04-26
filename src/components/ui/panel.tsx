import { cn } from "@/lib/utils";

export function Panel({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "shell-border rounded-2xl bg-card p-5 md:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}
