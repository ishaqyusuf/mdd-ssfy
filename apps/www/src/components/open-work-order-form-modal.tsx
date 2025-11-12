"use client";

import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenWorkOrderFormModal() {
    const { setParams } = useCustomerServiceParams();

    return (
        <>
            <div>
                <Button
                    onClick={(e) => {
                        setParams({
                            openCustomerServiceId: -1,
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

