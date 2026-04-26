import type { Metadata } from "next";

import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Loopscale Borrow Shopper",
  description:
    "A consumer borrowing assistant for finding the best fixed-rate borrow route on Loopscale."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

