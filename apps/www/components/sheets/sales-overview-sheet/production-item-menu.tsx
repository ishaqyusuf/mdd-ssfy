import { useState } from "react";
import { MoreVertical } from "lucide-react";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { BatchMenuAssignAll } from "./batch-menu-assign-all";
import { BatchMenuDeleteAssignments } from "./batch-menu-delete-assignments";
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
                <BatchMenuDeleteAssignments
                    setOpened={setOpened}
                    itemIds={[item?.controlUid]}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
