"use client";

import { NavContext, useNavCtx } from "@/components/_v1/layouts/site-nav";
import { CommandProvider } from "@/components/cmd/provider";
import { ModalProvider } from "@/components/common/modal/provider";
import { ZustandSessionProvider } from "@/hooks/use-session";
import { ThemeProvider } from "@/providers/theme-provider";
import { store } from "@/store";
import { TRPCReactProvider } from "@/trpc/client";
import { ReactNode } from "react";
import { Provider } from "react-redux";

import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

type Props = {
    children: ReactNode;
};
export function Providers({ children }: Props) {
    return (
        <SessionProvider>
            <NuqsAdapter>
                <TRPCReactProvider>
                    <ZustandSessionProvider>
                        <Provider store={store}>
                            <ModalProvider>
                                <ThemeProvider
                                    attribute="class"
                                    defaultTheme="light"
                                >
                                    <CommandProvider>
                                        <NavContext.Provider
                                            value={useNavCtx()}
                                        >
                                            {children}
                                        </NavContext.Provider>
                                    </CommandProvider>
                                </ThemeProvider>
                            </ModalProvider>
                        </Provider>
                    </ZustandSessionProvider>
                </TRPCReactProvider>
            </NuqsAdapter>
        </SessionProvider>
    );
}

