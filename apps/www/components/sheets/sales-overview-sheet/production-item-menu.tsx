import { getCachedUsersList } from "@/actions/cache/get-cached-users-list";
import { Menu } from "@/components/(clean-code)/menu";
import { timeout } from "@/lib/timeout";
import { CheckCircle, MoreVertical, Truck, UserPlus } from "lucide-react";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { useProductionItem } from "./production-tab";

export function ProductionItemMenu({}) {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;

    const users = useAsyncMemo(async () => {
        await timeout(100);
        return await getCachedUsersList({
            "user.role": "Production",
        });
    }, []);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Completed
                </DropdownMenuItem>
                <Menu.Item
                    Icon={UserPlus}
                    SubMenu={
                        <>
                            {users?.map((user) => (
                                <Menu.Item
                                    shortCut={90}
                                    icon="production"
                                    key={user.id}
                                >
                                    {user.name}
                                </Menu.Item>
                            ))}
                        </>
                    }
                    disabled={!item?.analytics?.assignment?.pending?.qty}
                    shortCut={`${item?.analytics?.assignment?.pending?.qty}`}
                >
                    {/* <UserPlus className="mr-2 h-4 w-4" /> */}
                    Assign All
                </Menu.Item>
                <DropdownMenuItem>
                    <Truck className="mr-2 h-4 w-4" />
                    Mark as Delivered
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
