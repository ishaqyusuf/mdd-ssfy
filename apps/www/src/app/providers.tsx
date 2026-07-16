"use client";

import { ModalProvider } from "@/components/common/modal/provider";
import { NavigationLoadingBar } from "@/components/navigation-loading-bar";
import { ThemeProvider } from "@/providers/theme-provider";
import { TRPCReactProvider } from "@/trpc/client";
import { SessionProvider } from "@/lib/auth/client";
import type { AppSession } from "@/lib/auth/session";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    initialSession?: AppSession | null;
    serverTrpcUrl: string;
};
export function Providers({ children, initialSession, serverTrpcUrl }: Props) {
    return (
        <SessionProvider
            initialSession={initialSession}
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
        >
            <NuqsAdapter>
                <TRPCReactProvider serverTrpcUrl={serverTrpcUrl}>
                    <ModalProvider>
                        <ThemeProvider attribute="class" defaultTheme="light">
                            <NavigationLoadingBar />
                            {children}
                        </ThemeProvider>
                    </ModalProvider>
                </TRPCReactProvider>
            </NuqsAdapter>
        </SessionProvider>
    );
}
