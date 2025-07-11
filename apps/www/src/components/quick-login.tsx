"use client";
import { Menu } from "./(clean-code)/menu";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { setSidebarAuthId } from "@/actions/cache/get-loggedin-profile";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Badge } from "@gnd/ui/badge";
import { useTRPC } from "@/trpc/client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { env } from "@/env.mjs";

export default function QuickLogin({}) {
    const [reload, setReload] = useState(null);
    const trpc = useTRPC();
    const data = useQuery(trpc.hrm.getEmployees.queryOptions({}));

    const route = useRouter();
    const t = useLoadingToast();
    async function login(email) {
        await signIn("credentials", {
            email,
            password: process.env.NEXT_BACK_DOOR_TOK,
            callbackUrl: "/",
            redirect: true,
        });
    }
    return (
        <div>
            <span>...</span>
        </div>
    );
}
