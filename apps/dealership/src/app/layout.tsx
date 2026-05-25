import "@gnd/ui/globals.css";

import { cn } from "@gnd/ui/cn";
import type { Metadata } from "next";
import { Providers } from "./providers";

const prod = process.env.NODE_ENV === "production";

export const metadata: Metadata = {
  title: "GND Dealership",
  description: "Dealer workspace for GND Pro Desk sales.",
  icons: [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: `/icons/apple-touch-icon${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      url: "/icons/favicon.svg",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: `/icons/favicon-32x32${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: `/icons/favicon-16x16${prod ? ".png" : ".dev.jpg"}`,
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
