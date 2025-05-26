"use client";
import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { rndTimeout } from "@/lib/timeout";
import { AsyncFnType } from "@/types";
import { createContextFactory } from "@/utils/context-factory";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const { Provider: SessionProvider, useContext: useSession } =
    createContextFactory(() => {
        const [session, setSession] = useState<
            AsyncFnType<typeof getLoggedInProfile>
        >(null as any);
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
    });
