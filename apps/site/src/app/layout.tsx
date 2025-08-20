import "@gnd/ui/globals.css";

import { cn } from "@gnd/ui/cn";

import { TRPCReactProvider } from "@/trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GlobalModals } from "@/components/modals/global-modals";
import { Header } from "@/components/header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />

      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <NuqsAdapter>
          <TRPCReactProvider>
            <Header />
            {children}
            <GlobalModals />
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
