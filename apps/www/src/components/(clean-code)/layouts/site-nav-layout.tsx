"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { siteNavStore } from "../site-nav/store";
import { composeSiteNav } from "../site-nav/utils";
import { cn } from "@/lib/utils";

export default function SiteNavLayout({ children }) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const store = siteNavStore();
    useEffect(() => {
        if (!session) store.reset();
        else {
            composeSiteNav(session);
        }
    }, [session, store]);
    return <div className={cn("")}>{children}</div>;
}
