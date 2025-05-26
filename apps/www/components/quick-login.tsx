import { getEmployees } from "@/app/(v1)/_actions/hrm/get-employess";
import { useAsyncMemo } from "use-async-memo";
import { Menu } from "./(clean-code)/menu";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { signIn, signOut } from "next-auth/react";
import { env } from "process";
import {
    getLoggedInProfile,
    setSidebarAuthId,
} from "@/actions/cache/get-loggedin-profile";
import { useState } from "react";
import { generateRandomString } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Badge } from "@gnd/ui/badge";

export default function QuickLogin({}) {
    const [reload, setReload] = useState(null);
    const ctx = useAsyncMemo(async () => {
        const [list, profile] = await Promise.all([
            getEmployees({
                per_page: 1000,
            }),
            getLoggedInProfile(),
        ]);

        return {
            users: list?.data
                ?.sort((a, b) => a.id - b.id)
                .filter(
                    (a, i) =>
                        i ==
                        list?.data?.findIndex(
                            (b) => b?.role?.id == a?.role?.id,
                        ),
                ),
            user: list?.data?.find((a) => a.id == profile?.userId),
            profile,
        };
    }, [reload]);
    const route = useRouter();
    const t = useLoadingToast();
    async function login(e) {
        await setSidebarAuthId(e?.id, e);
        route.push("/", {});
    }
    return (
        <div>
            <Menu
                Icon={null}
                label={
                    <div className="flex gap-2">
                        <span>{ctx?.profile?.name || "Quick Login"}</span>
                        <span className="text-gray-500">
                            {ctx?.profile?.role}
                        </span>
                    </div>
                }
                noSize
            >
                <ScrollArea className="w-auto h-64">
                    {ctx?.users?.map((user) => (
                        <Menu.Item onClick={() => login(user)} key={user.id}>
                            <div className="flex flex-col w-full">
                                <div className="flex gap-4 items-center justify-between">
                                    <div className="">{user.name}</div>
                                    <Badge
                                        className="text-xs h-4"
                                        variant="outline"
                                    >
                                        {user.role?.name}
                                    </Badge>
                                </div>

                                <div className="text-xs">{user.email}</div>
                            </div>
                        </Menu.Item>
                    ))}
                </ScrollArea>
            </Menu>
        </div>
    );
}
