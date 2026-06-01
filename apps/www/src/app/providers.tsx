"use client";

import { ModalProvider } from "@/components/common/modal/provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TRPCReactProvider } from "@/trpc/client";
import { SessionProvider } from "@/lib/auth/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
};
export function Providers({ children }: Props) {
    return (
        <SessionProvider
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
        >
            <NuqsAdapter>
                <TRPCReactProvider>
                    <ModalProvider>
                        <ThemeProvider attribute="class" defaultTheme="light">
                            {children}
                        </ThemeProvider>
                    </ModalProvider>
                </TRPCReactProvider>
            </NuqsAdapter>
        </SessionProvider>
    );
}
