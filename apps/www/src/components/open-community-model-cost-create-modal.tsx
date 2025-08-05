"use client";

import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCommunitModelCostCreateModal() {
    const { setParams } = useCommunityModelCostParams();

    return (
        <>
            <div>
                <Button
                    onClick={(e) => {
                        setParams({
                            createModelCost: true,
                        });
                    }}
                >
                    <Icons.Add className="mr-2" />
                    New
                </Button>
            </div>
        </>
    );
}

