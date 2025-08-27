import "@gnd/ui/globals.css";

import { cn } from "@gnd/ui/cn";

import { TRPCReactProvider } from "@/trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GlobalModals } from "@/components/modals/global-modals";
import { Header } from "@/components/header";
import { SessionProvider } from "next-auth/react";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />

      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Providers>
          {/* <NuqsAdapter>
            <TRPCReactProvider> */}
          <Header />
          {children}
          <GlobalModals />
          {/* </TRPCReactProvider>
          </NuqsAdapter> */}
        </Providers>
      </body>
    </html>
  );
}
