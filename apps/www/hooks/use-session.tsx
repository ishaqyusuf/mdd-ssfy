"use client";
import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { rndTimeout } from "@/lib/timeout";
import { AsyncFnType } from "@/types";
import { createContextFactory } from "@/utils/context-factory";
import exp from "constants";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

const context = createContext(null as any);
export const SessionProvider = ({ children }) => {
    const session = useSessionFactory();
    return <context.Provider value={session}>{children}</context.Provider>;
};
export const useSession = () => {
    const session = useContext<Type>(context);
    return session;
};
type Type = AsyncFnType<typeof getLoggedInProfile>;
export const useSessionFactory = () => {
    const [session, setSession] = useState<Type>(null as any);
    const path = usePathname();
    useEffect(() => {
        if (session) return;
        (async () => {
            await rndTimeout();
            const data = await getLoggedInProfile();
            setSession(data);
        })();
    }, [path, session]);
    return session;
};
