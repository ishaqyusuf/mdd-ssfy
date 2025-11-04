import { Inter as FontSans } from "next/font/google";
import localFont from "next/font/local";

import "@/styles/globals.css";

import { cn } from "@gnd/ui/cn";
import { GlobalModals } from "../components/modals/global-modals";
import { TRPCReactProvider } from "@/trpc/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { StaticTrpc } from "@/components/static-trpc";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
}); // Font files can be colocated inside of `pages`
const fontHeading = localFont({
  src: "../styles/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
});
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {/*<Suspense>*/}
      {/*  <PostHogPageview />*/}
      {/*</Suspense>*/}
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontHeading.variable
        )}
      >
        <NuqsAdapter>
          <TRPCReactProvider>
            {children}
            <GlobalModals />
            <StaticTrpc />
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
