"use client";

import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { store } from "@/store";

import { ModalProvider } from "../common/modal/provider";
import { CommandProvider } from "../cmd/provider";
import { NavContext, useNavCtx } from "./layouts/site-nav";
import { ThemeProvider } from "@/providers/theme-provider";
const AppProvider = ({ children }) => {
    // similar to trpc useQuery and useSwr, get server action data from server action function geSales, await getSales()

    return (
        <SessionProvider>
            <Provider store={store}>
                <ModalProvider>
                    <ThemeProvider attribute="class" defaultTheme="light">
                        <CommandProvider>
                            <NavContext.Provider value={useNavCtx()}>
                                {children}
                            </NavContext.Provider>
                        </CommandProvider>
                    </ThemeProvider>
                </ModalProvider>
            </Provider>
        </SessionProvider>
    );
};
export default AppProvider;
