"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { CommunitySearchFilter } from "./community-search-filter";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";

export function CommunityProjectHeader({}) {
    const { setParams } = useCommunityProjectParams();
    return (
        <div className="flex justify-between">
            <CommunitySearchFilter />
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    setParams({
                        openCommunityProjectId: -1,
                    });
                }}
            >
                <Icons.Add className="size-4 mr-2" />
                <span>Add Project</span>
            </Button>
        </div>
    );
}

