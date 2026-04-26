import Link from "next/link";
import type { Route } from "next";

import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { cn } from "@/lib/utils";

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/borrow", label: "Borrow" },
  { href: "/my-loans", label: "My Loans" },
  { href: "/learn", label: "Learn" }
];

export function AppShell({
  title,
  subtitle,
  children,
  currentPath
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  currentPath: string;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="app-frame">
          <header className="border-b border-line px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-mono text-[13px] tracking-[0.08em] text-mutedForeground">
                    <span className="text-foreground">borrow</span>.loop
                  </p>
                  <a
                    className="mt-1 flex items-center gap-2 text-mutedForeground transition-colors duration-150 hover:text-foreground"
                    href="https://loopscale.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="mono-label text-[10px] text-mutedForeground">powered by</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="20"
                      viewBox="0 0 25 20"
                      className="h-4 w-5 text-foreground/90"
                      aria-hidden
                    >
                      <path
                        fill="currentColor"
                        d="m3.624 13.814 2.29-3.089a.276.276 0 0 1 .496.13c.7 5.244 7.825 7.121 10.99 2.724L24.654 3.8a.193.193 0 0 1 .347.115v5.724c0 .238-.076.47-.218.66l-4.061 5.467c-4.25 6.11-13.726 5.47-17.17-1.032a.87.87 0 0 1 .073-.92"
                      />
                      <path
                        fill="currentColor"
                        d="m21.29 6.19-2.303 3.107a.276.276 0 0 1-.496-.13c-.705-5.224-7.792-7.104-10.97-2.74l-4.076 5.488L.348 16.13A.193.193 0 0 1 0 16.017v-5.76c0-.237.076-.468.218-.659l3.73-5.029c4.026-6.467 13.97-5.922 17.418.706a.87.87 0 0 1-.075.916"
                      />
                    </svg>
                    <span className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
                      Loopscale
                    </span>
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <nav className="flex flex-wrap gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "mono-label rounded-md px-2.5 py-1.5 text-[10px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        currentPath === item.href
                          ? "border border-line bg-surface text-foreground"
                          : "text-mutedForeground hover:bg-surface hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <WalletConnectButton />
              </div>
            </div>
          </header>

          <main className="px-5 py-5 md:px-6 md:py-6">
            <section className="mb-6 max-w-3xl">
              <p className="mono-label text-mutedForeground">Loopscale Borrow Shopper</p>
              <h1 className="mt-2 text-balance text-[2rem] font-medium tracking-[-0.04em] text-foreground md:text-[2.35rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-mutedForeground">
                {subtitle}
              </p>
            </section>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
