import { useState } from "react";
import { getCachedProductionUsers } from "@/actions/cache/get-cached-production-users";
import { getCachedUsersList } from "@/actions/cache/get-cached-users-list";
import { Menu } from "@/components/(clean-code)/menu";
import { timeout } from "@/lib/timeout";
import { formatISO } from "date-fns";
import { CheckCircle, MoreVertical, Truck, UserPlus } from "lucide-react";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";

import { BatchMenuAssignAll } from "./batch-menu-assign-all";
import { BatchMenuDeleteSubmissions } from "./batch-menu-delete-submissions";
import { BatchMenuSubmit } from "./batch-menu-submit";
import { useProduction, useProductionItem } from "./production-tab";

export function ProductionItemMenu({}) {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const prod = useProduction();
    const [opened, setOpened] = useState(false);
    return (
        <DropdownMenu open={opened} onOpenChange={setOpened}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <BatchMenuAssignAll
                    setOpened={setOpened}
                    itemIds={[item?.controlUid]}
                />
                <BatchMenuSubmit
                    setOpened={setOpened}
                    itemIds={[item?.controlUid]}
                />
                <BatchMenuDeleteSubmissions
                    setOpened={setOpened}
                    itemIds={[item?.controlUid]}
                />
                {/* <DropdownMenuItem>
                    <Truck className="mr-2 h-4 w-4" />
                    Mark as Delivered
                </DropdownMenuItem> */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
