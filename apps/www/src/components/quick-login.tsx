"use client";
import { Menu } from "./(clean-code)/menu";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoadingToast } from "@/hooks/use-loading-toast";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
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
            password: env.NEXT_PUBLIC_BACK_DOOR_TOK,
            callbackUrl: "/",
            redirect: true,
        });
    }
    return (
        <div>
            <Menu label={"Quick Login"} noSize>
                <ScrollArea className="max-h-[200px]  overflow-auto">
                    {data?.data?.data?.map((user) => (
                        <Menu.Item
                            onClick={(e) => {
                                login(user.email);
                            }}
                            key={user?.id}
                        >
                            <span>{user?.name}</span>
                        </Menu.Item>
                    ))}
                </ScrollArea>
            </Menu>
        </div>
    );
}
