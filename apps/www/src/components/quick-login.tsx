"use client";
import { Menu } from "./(clean-code)/menu";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { useSearchParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { signIn } from "next-auth/react";
import { env } from "@/env.mjs";

export default function QuickLogin({}) {
    const trpc = useTRPC();
    const data = useQuery(
        trpc.hrm.getEmployees.queryOptions({
            size: 999,
        }),
    );
    const searchParams = useSearchParams();
    const callbackUrl = getLoginCallbackUrl(searchParams);
    async function login(email) {
        await signIn("credentials", {
            email,
            password: env.NEXT_PUBLIC_BACK_DOOR_TOK,
            callbackUrl,
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
                            <p>{user?.name}</p>
                            <p>{user?.role}</p>
                        </Menu.Item>
                    ))}
                </ScrollArea>
            </Menu>
        </div>
    );
}

function getLoginCallbackUrl(searchParams: URLSearchParams) {
    const returnTo = searchParams.get("return_to");
    if (returnTo?.startsWith("/")) {
        return returnTo;
    }

    return "/";
}

