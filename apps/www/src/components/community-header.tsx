"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { CommunitySearchFilter } from "./community-search-filter";

export function CommunityHeader({}) {
    const { setParams } = useInventoryParams();
    return (
        <div className="flex justify-between">
            <CommunitySearchFilter />
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    setParams({
                        productId: -1,
                    });
                }}
            >
                <Icons.Add className="size-4 mr-2" />
                <span>Add Project</span>
            </Button>
        </div>
    );
}

