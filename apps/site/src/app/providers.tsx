"use client";

import { TRPCReactProvider } from "@/trpc/client";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <NuqsAdapter>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </NuqsAdapter>
    </SessionProvider>
  );
}
