"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TRPCReactProvider>
      <NuqsAdapter>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </NuqsAdapter>
    </TRPCReactProvider>
  );
}
