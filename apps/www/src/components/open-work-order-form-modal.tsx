"use client";

import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useWorkOrderParams } from "@/hooks/use-work-order-params";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenWorkOrderFormModal() {
    const { setParams } = useWorkOrderParams();

    return (
        <>
            <div>
                <Button
                    onClick={(e) => {
                        setParams({
                            editWorkOrderId: -1,
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

